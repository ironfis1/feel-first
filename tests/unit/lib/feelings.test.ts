import { describe, expect, it } from "vitest";
import { feelingWheelOrder, feelingWheelRadius } from "@/config/feel";
import type { EmotionTag } from "@/lib/catalog";
import {
  alsoShare,
  clampToWheel,
  feelingAt,
  feelingPositions,
  moodFor,
  wheelFeelingPoints,
  wheelPointFor,
  type FeelingPositions,
  type WheelPoint,
} from "@/lib/feelings";

// High tier (docs/test-tiers.md): feelingPositions, feelingAt, moodFor, wheelPointFor.
// Medium: wheelFeelingPoints, clampToWheel. The feeling wheel [D-044, D-049].

const deg = (d: number, r = 1): WheelPoint => ({ x: r * Math.cos((d * Math.PI) / 180), y: r * Math.sin((d * Math.PI) / 180) });
const angleOf = (p: WheelPoint) => (((Math.atan2(p.y, p.x) * 180) / Math.PI) + 360) % 360;

/** Positions laid out like the wheel itself: feeling i at angle 30i, radius 0.8. */
const evenPositions = Object.fromEntries(
  feelingWheelOrder.map((f, i) => [f, { valence: 0.8 * Math.cos((i * Math.PI) / 6), arousal: 0.8 * Math.sin((i * Math.PI) / 6) }]),
) as FeelingPositions;

/** A work carrying the given tags, lead first. */
const work = (valence: number, arousal: number, ...tags: EmotionTag[]) => ({ valence, arousal, tags });
/** One lead work per feeling at its even position, so every feeling has a position. */
const base = feelingWheelOrder.map((f) => work(evenPositions[f].valence, evenPositions[f].arousal, f));

describe("wheelFeelingPoints [D-049]", () => {
  const points = wheelFeelingPoints();

  it("places all 12 feelings at the configured radius, 30 degrees apart counterclockwise from the right", () => {
    expect(Object.keys(points)).toEqual([...feelingWheelOrder]);
    feelingWheelOrder.forEach((f) => {
      expect(Math.hypot(points[f].x, points[f].y)).toBeCloseTo(feelingWheelRadius, 12);
    });
    expect(points.nostalgic).toEqual({ x: feelingWheelRadius, y: 0 });
    // D-049 at radius 0.75: awe is straight up, tense straight left, wistful at 270 degrees, joyful at 30.
    expect(points.awe.x).toBeCloseTo(0, 12);
    expect(points.awe.y).toBeCloseTo(0.75, 12);
    expect(points.tense.x).toBeCloseTo(-0.75, 12);
    expect(points.tense.y).toBeCloseTo(0, 12);
    expect(points.wistful.x).toBeCloseTo(0, 12);
    expect(points.wistful.y).toBeCloseTo(-0.75, 12);
    expect(points.joyful.x).toBeCloseTo(0.6495, 4);
    expect(points.joyful.y).toBeCloseTo(0.375, 12);
  });

  it("agrees with feelingAt: each painted light names its own feeling, with no second one", () => {
    for (const f of feelingWheelOrder) expect(feelingAt(points[f])).toEqual({ main: f, also: null });
  });
});

describe("feelingPositions [D-044]", () => {
  it("has all 12 feelings", () => {
    expect(Object.keys(feelingPositions(base))).toEqual([...feelingWheelOrder]);
  });

  it("is the mean of the works that carry the feeling as their lead tag", () => {
    const works = [...base.filter((w) => w.tags[0] !== "joyful"), work(0.2, 0.4, "joyful", "awe"), work(0.6, -0.2, "joyful")];
    const p = feelingPositions(works).joyful;
    expect(p.valence).toBeCloseTo(0.4, 12);
    expect(p.arousal).toBeCloseTo(0.1, 12);
  });

  it("is not diluted by works that carry the feeling later in their tags", () => {
    const works = [...base.filter((w) => w.tags[0] !== "awe"), work(0.5, 0.5, "awe"), work(-0.9, -0.9, "tense", "awe")];
    expect(feelingPositions(works).awe).toEqual({ valence: 0.5, arousal: 0.5 });
  });

  it("falls back to every work that carries a feeling that leads none", () => {
    const works = [...base.filter((w) => w.tags[0] !== "wistful"), work(-0.2, -0.4, "tense", "wistful"), work(-0.6, 0, "serene", "joyful", "wistful")];
    const p = feelingPositions(works).wistful;
    expect(p.valence).toBeCloseTo(-0.4, 12);
    expect(p.arousal).toBeCloseTo(-0.2, 12);
  });

  it("gives a single lead work's own point, and keeps feelings independent of each other", () => {
    const positions = feelingPositions(base);
    for (const f of feelingWheelOrder) expect(positions[f]).toEqual(evenPositions[f]);
  });

  it("throws when no work carries a feeling", () => {
    expect(() => feelingPositions(base.filter((w) => w.tags[0] !== "defiant"))).toThrow("no work carries the feeling defiant");
    expect(() => feelingPositions([])).toThrow("no work carries the feeling nostalgic");
  });
});

describe("feelingAt [D-049]", () => {
  it("names nostalgic at the untouched center, since atan2(0, 0) is 0", () => {
    expect(feelingAt({ x: 0, y: 0 })).toEqual({ main: "nostalgic", also: null });
  });

  it("names each feeling at its own angle, at any radius", () => {
    feelingWheelOrder.forEach((f, i) => {
      for (const r of [1, 0.5, 0.01]) expect(feelingAt(deg(i * 30, r))).toEqual({ main: f, also: null });
    });
  });

  it("names the second feeling as main and the first as a little, exactly halfway", () => {
    expect(feelingAt({ x: 1, y: 1 })).toEqual({ main: "playful", also: "joyful" }); // 45 degrees, share exactly 0.5
    expect(feelingAt({ x: 1, y: -1 })).toEqual({ main: "tender", also: "serene" }); // 315 degrees, share exactly 0.5
  });

  it("names a second feeling from a quarter of the way across, and not before", () => {
    expect(alsoShare).toBe(0.25);
    expect(feelingAt(deg(30 * 0.26))).toEqual({ main: "nostalgic", also: "joyful" });
    expect(feelingAt(deg(30 * 0.24))).toEqual({ main: "nostalgic", also: null });
    expect(feelingAt(deg(30 * 0.74))).toEqual({ main: "joyful", also: "nostalgic" });
    expect(feelingAt(deg(30 * 0.76))).toEqual({ main: "joyful", also: null });
    expect(feelingAt(deg(30 * 0.49))).toEqual({ main: "nostalgic", also: "joyful" });
    expect(feelingAt(deg(30 * 0.51))).toEqual({ main: "joyful", also: "nostalgic" });
  });

  it("wraps from the last feeling back to the first", () => {
    expect(feelingAt(deg(359))).toEqual({ main: "nostalgic", also: null });
    expect(feelingAt(deg(352))).toEqual({ main: "nostalgic", also: "tender" });
    expect(feelingAt(deg(340))).toEqual({ main: "tender", also: "nostalgic" });
    expect(feelingAt(deg(335))).toEqual({ main: "tender", also: null });
  });

  it("reads the lower half of the wheel, including y of -0", () => {
    expect(feelingAt(deg(-90))).toEqual({ main: "wistful", also: null });
    expect(feelingAt(deg(-120))).toEqual({ main: "contemplative", also: null });
    expect(feelingAt({ x: 1, y: -0 })).toEqual({ main: "nostalgic", also: null });
  });
});

describe("moodFor [D-049]", () => {
  it("is the neutral mood at the center", () => {
    const m = moodFor({ x: 0, y: 0 }, evenPositions);
    expect(m.valence).toBeCloseTo(0, 12);
    expect(m.arousal).toBeCloseTo(0, 12);
  });

  it("is a feeling's catalog position at its angle on the rim, and half of it at half radius", () => {
    feelingWheelOrder.forEach((f, i) => {
      const full = moodFor(deg(i * 30), evenPositions);
      expect(full.valence).toBeCloseTo(evenPositions[f].valence, 9);
      expect(full.arousal).toBeCloseTo(evenPositions[f].arousal, 9);
      const half = moodFor(deg(i * 30, 0.5), evenPositions);
      expect(half.valence).toBeCloseTo(evenPositions[f].valence / 2, 9);
      expect(half.arousal).toBeCloseTo(evenPositions[f].arousal / 2, 9);
    });
  });

  it("blends the two neighbors linearly by angle", () => {
    const positions = { ...evenPositions, joyful: { valence: 1, arousal: 0 }, playful: { valence: 0, arousal: 1 } };
    const m = moodFor({ x: 1, y: 1 }, positions); // halfway, beyond the rim
    expect(m.valence).toBeCloseTo(0.5, 12);
    expect(m.arousal).toBeCloseTo(0.5, 12);
    const quarter = moodFor(deg(37.5), positions);
    expect(quarter.valence).toBeCloseTo(0.75, 9);
    expect(quarter.arousal).toBeCloseTo(0.25, 9);
  });

  it("treats a point beyond the rim as on the rim", () => {
    expect(moodFor(deg(90, 3), evenPositions)).toEqual(moodFor(deg(90, 1), evenPositions));
  });

  it("wraps between tender and nostalgic, and is continuous across a feeling", () => {
    const positions = { ...evenPositions, tender: { valence: 0, arousal: -1 }, nostalgic: { valence: 1, arousal: 0 } };
    const m = moodFor(deg(345), positions);
    expect(m.valence).toBeCloseTo(0.5, 9);
    expect(m.arousal).toBeCloseTo(-0.5, 9);
    for (let i = 0; i < 12; i++) {
      const before = moodFor(deg(i * 30 - 0.01), evenPositions);
      const after = moodFor(deg(i * 30 + 0.01), evenPositions);
      expect(Math.hypot(before.valence - after.valence, before.arousal - after.arousal)).toBeLessThan(0.01);
    }
  });
});

describe("wheelPointFor [D-049]", () => {
  it("returns the center for the neutral mood", () => {
    expect(wheelPointFor({ valence: 0, arousal: 0 }, evenPositions)).toEqual({ x: 0, y: 0 });
  });

  it("round-trips moods the wheel can reach, to about a degree", () => {
    for (const p of [deg(10, 0.5), deg(100, 0.9), deg(200, 0.3), deg(300, 1), deg(47, 0.7)]) {
      const target = moodFor(p, evenPositions);
      const back = moodFor(wheelPointFor(target, evenPositions), evenPositions);
      expect(Math.hypot(back.valence - target.valence, back.arousal - target.arousal)).toBeLessThan(0.02);
    }
  });

  it("puts a feeling's own position at that feeling's angle", () => {
    feelingWheelOrder.forEach((f, i) => {
      const p = wheelPointFor(evenPositions[f], evenPositions);
      const d = Math.abs(((angleOf(p) - i * 30 + 540) % 360) - 180);
      expect(d).toBeLessThanOrEqual(1);
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 6);
    });
  });

  it("clamps a mood beyond the reachable rim to radius 1, never past it", () => {
    const p = wheelPointFor({ valence: 3, arousal: 0 }, evenPositions);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(1, 12);
    expect(p).toEqual({ x: 1, y: 0 });
    for (const t of [
      { valence: -0.9, arousal: 0.9 },
      { valence: 0.2, arousal: -2 },
    ]) {
      const q = wheelPointFor(t, evenPositions);
      expect(Math.hypot(q.x, q.y)).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  it("takes the lowest degree when several are equally near", () => {
    const flat = Object.fromEntries(feelingWheelOrder.map((f) => [f, { valence: 1, arousal: 0 }])) as FeelingPositions;
    expect(wheelPointFor({ valence: 0.5, arousal: 0 }, flat)).toEqual({ x: 0.5, y: 0 });
  });

  it("stays at the center for a target opposite every feeling, with no NaN", () => {
    const flat = Object.fromEntries(feelingWheelOrder.map((f) => [f, { valence: 1, arousal: 0 }])) as FeelingPositions;
    expect(wheelPointFor({ valence: -0.5, arousal: 0 }, flat)).toEqual({ x: 0, y: 0 });
  });

  it("skips angles whose rim mood is zero length (pin: len2 of 0 gives NaN, which never wins)", () => {
    const zero = Object.fromEntries(feelingWheelOrder.map((f) => [f, { valence: 0, arousal: 0 }])) as FeelingPositions;
    expect(wheelPointFor({ valence: 0.4, arousal: 0.1 }, zero)).toEqual({ x: 0, y: 0 });
  });
});

describe("clampToWheel", () => {
  it("returns points inside and on the rim unchanged", () => {
    const inside = { x: 0.3, y: -0.2 };
    expect(clampToWheel(inside)).toBe(inside);
    const on = { x: 0.6, y: 0.8 };
    expect(clampToWheel(on)).toBe(on);
    expect(clampToWheel({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("scales a point outside back to the rim, keeping its direction", () => {
    const p = clampToWheel({ x: -3, y: 4 });
    expect(p.x).toBeCloseTo(-0.6, 12);
    expect(p.y).toBeCloseTo(0.8, 12);
  });
});
