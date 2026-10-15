import { describe, expect, it } from "vitest";
import { nudgeStep, roomPageSizePerLane } from "@/config/feel";
import { bucketKeys } from "@/lib/buckets";
import { getWorkCards, type Lane } from "@/lib/catalog";
import { hang, rankLane, type Rankable } from "@/lib/j3";
import { nudge } from "@/lib/j7";

// High tier (docs/test-tiers.md): rankLane, hang and nudge.
// Functional gates: J3 ranking and interleave, J7 nudge and clamp [Res #5, Res #23, Res #37, Gap G10, Gap G11, Gap G22].

const w = (id: string, lane: Lane, valence: number, arousal: number): Rankable => ({ id, lane, valence, arousal });
const ids = (list: readonly { id: string }[]) => list.map((x) => x.id);
const origin = { valence: 0, arousal: 0 };

/** n works per lane, spread along the valence axis so distance from the origin rises with the index. */
function lanes(n: number, posters = n): Rankable[] {
  const out: Rankable[] = [];
  for (let i = 0; i < n; i++) out.push(w(`f${String(i).padStart(2, "0")}`, "fine-art", i / 100, 0));
  for (let i = 0; i < posters; i++) out.push(w(`p${String(i).padStart(2, "0")}`, "poster", -i / 100, 0));
  return out;
}

describe("rankLane [Res #23, Gap G10]", () => {
  const works = [w("b", "poster", 0.5, 0), w("a", "poster", 0.1, 0), w("c", "fine-art", 0, 0), w("d", "poster", -0.3, 0)];

  it("ranks only the requested lane, nearest first", () => {
    expect(ids(rankLane(works, "poster", origin))).toEqual(["a", "d", "b"]);
    expect(ids(rankLane(works, "fine-art", origin))).toEqual(["c"]);
  });

  it("breaks ties at equal distance by ascending id, compared as plain strings", () => {
    const tied = [w("a2", "poster", 0.2, 0), w("a10", "poster", -0.2, 0), w("a1", "poster", 0, 0.2)];
    expect(ids(rankLane(tied, "poster", origin))).toEqual(["a1", "a10", "a2"]);
  });

  it("moves drifted works to the end of their lane, in the order they were drifted", () => {
    expect(ids(rankLane(works, "poster", origin, ["a", "d"]))).toEqual(["b", "a", "d"]);
    expect(ids(rankLane(works, "poster", origin, ["d", "a"]))).toEqual(["b", "d", "a"]);
  });

  it("lists a work drifted twice once, and ignores drifted ids from another lane or none", () => {
    expect(ids(rankLane(works, "poster", origin, ["a", "c", "zz", "a"]))).toEqual(["d", "b", "a"]);
  });

  it("gives the drift order when every work is drifted", () => {
    expect(ids(rankLane(works, "poster", origin, ["b", "d", "a"]))).toEqual(["b", "d", "a"]);
  });

  it("gives [] for an empty lane and does not mutate its inputs", () => {
    const drifted = ["a"];
    const copy = structuredClone(works);
    expect(rankLane([], "poster", origin)).toEqual([]);
    rankLane(works, "poster", origin, drifted);
    expect(works).toEqual(copy);
    expect(drifted).toEqual(["a"]);
  });
});

describe("hang: the Room interleave [Res #5, Res #37, Gap G22]", () => {
  const corners = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const center: Record<string, number> = { heavy: -2 / 3, mid: 0, bright: 2 / 3, calm: -2 / 3, charged: 2 / 3 };

  it("hangs a poster at position 1 at every bucket center and at the four corners of the field (real fixture works)", () => {
    const cards = getWorkCards();
    const points = [
      ...bucketKeys.map((k) => ({ valence: center[k.split("-")[0]], arousal: center[k.split("-")[1]] })),
      ...corners.map(([valence, arousal]) => ({ valence, arousal })),
    ];
    for (const mood of points) {
      const room = hang(cards, mood, 1);
      expect(room[0].lane).toBe("poster");
      expect(room).toHaveLength(2 * roomPageSizePerLane);
    }
  });

  it("alternates poster, fine art, poster with exactly 6 per lane per page", () => {
    const room = hang(lanes(20), origin, 1);
    expect(room.map((x) => x.lane)).toEqual(Array.from({ length: 12 }, (_, i) => (i % 2 ? "fine-art" : "poster")));
    expect(ids(room)).toEqual(["p00", "f00", "p01", "f01", "p02", "f02", "p03", "f03", "p04", "f04", "p05", "f05"]);
  });

  it("Show more adds the next 6 per lane without reordering what is already hung", () => {
    const one = hang(lanes(20), origin, 1);
    const two = hang(lanes(20), origin, 2);
    expect(two).toHaveLength(24);
    expect(two.slice(0, 12)).toEqual(one);
    expect(ids(two.slice(12, 14))).toEqual(["p06", "f06"]);
  });

  it("floors pages and never hangs fewer than one page (pin: NaN hangs nothing; the session only ever counts up from 1)", () => {
    const one = ids(hang(lanes(20), origin, 1));
    for (const pages of [0, -1, 1.9]) expect(ids(hang(lanes(20), origin, pages))).toEqual(one);
    expect(hang(lanes(20), origin, Number.NaN)).toEqual([]);
    expect(hang(lanes(20), origin, 2.9)).toHaveLength(24);
  });

  it("continues with the other lane alone when one runs short", () => {
    expect(ids(hang(lanes(6, 2), origin, 1))).toEqual(["p00", "f00", "p01", "f01", "f02", "f03", "f04", "f05"]);
  });

  it("starts with fine art when there are no posters (pin: poster first needs a poster)", () => {
    expect(hang(lanes(3, 0), origin, 1)[0].lane).toBe("fine-art");
  });

  it("sends a drifted work to the end of its own lane, so it leaves the first page", () => {
    const room = hang(lanes(20), origin, 1, ["p00"]);
    expect(room[0].id).toBe("p01");
    expect(ids(room)).not.toContain("p00");
    expect(ids(room.filter((x) => x.lane === "fine-art"))).toEqual(["f00", "f01", "f02", "f03", "f04", "f05"]);
    const all = hang(lanes(7), origin, 2, ["p00"]);
    expect(ids(all.filter((x) => x.lane === "poster")).at(-1)).toBe("p00");
  });

  it("breaks ties by id, has no duplicates and does not mutate its input", () => {
    const tied = [w("p2", "poster", 0.1, 0), w("p1", "poster", -0.1, 0), w("f2", "fine-art", 0, 0.1), w("f1", "fine-art", 0, -0.1)];
    const copy = structuredClone(tied);
    expect(ids(hang(tied, origin, 1))).toEqual(["p1", "f1", "p2", "f2"]);
    expect(tied).toEqual(copy);
    const room = hang(getWorkCards(), { valence: 0.2, arousal: -0.3 }, 2);
    expect(new Set(ids(room)).size).toBe(room.length);
  });
});

describe("nudge: Closer and Drift [Res #10, Gap G11]", () => {
  it("reads its step from config", () => {
    expect(nudgeStep).toBe(0.3);
  });

  it("moves 30% of the way toward the work on Closer and 30% away on Drift", () => {
    const closer = nudge(origin, { valence: 1, arousal: 0 }, "closer");
    expect(closer.valence).toBeCloseTo(0.3, 12);
    expect(closer.arousal).toBeCloseTo(0, 12);
    const drift = nudge({ valence: 0.2, arousal: 0.1 }, { valence: 0.6, arousal: -0.3 }, "drift");
    expect(drift.valence).toBeCloseTo(0.08, 12);
    expect(drift.arousal).toBeCloseTo(0.22, 12);
  });

  it("moves both axes independently", () => {
    const p = nudge({ valence: -0.5, arousal: 0.5 }, { valence: 0.5, arousal: -0.5 }, "closer");
    expect(p.valence).toBeCloseTo(-0.2, 12);
    expect(p.arousal).toBeCloseTo(0.2, 12);
  });

  it("leaves the mood alone on Closer to a work at the same point", () => {
    expect(nudge({ valence: 0.4, arousal: -0.4 }, { valence: 0.4, arousal: -0.4 }, "closer")).toEqual({ valence: 0.4, arousal: -0.4 });
  });

  it("clamps a Drift that would leave the unit circle back onto it, keeping direction", () => {
    const p = nudge({ valence: 0.9, arousal: 0 }, { valence: -0.5, arousal: 0 }, "drift");
    expect(p).toEqual({ valence: 1, arousal: 0 });
    const q = nudge({ valence: 0.8, arousal: 0.6 }, { valence: 0, arousal: 0 }, "drift");
    expect(Math.hypot(q.valence, q.arousal)).toBeCloseTo(1, 12);
    expect(q.valence / q.arousal).toBeCloseTo(0.8 / 0.6, 12);
  });

  it("clamps a Closer toward a work outside the disc, and keeps a mood already on the rim", () => {
    const p = nudge({ valence: 0.9, arousal: 0 }, { valence: 2, arousal: 0 }, "closer");
    expect(p).toEqual({ valence: 1, arousal: 0 });
    const rim = nudge({ valence: 0, arousal: 1 }, { valence: 0, arousal: 1 }, "drift");
    expect(rim).toEqual({ valence: 0, arousal: 1 });
  });

  it("does not mutate its inputs", () => {
    const mood = { valence: 0.1, arousal: 0.1 };
    const work = { valence: 0.5, arousal: 0.5 };
    nudge(mood, work, "closer");
    expect(mood).toEqual({ valence: 0.1, arousal: 0.1 });
    expect(work).toEqual({ valence: 0.5, arousal: 0.5 });
  });
});
