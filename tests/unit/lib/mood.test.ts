import { describe, expect, it } from "vitest";
import { roomNames } from "@/config/feel";
import { bucketKeys, roomNameFor } from "@/lib/buckets";
import { centerMood, clampToCircle, distance } from "@/lib/mood";

// High tier (docs/test-tiers.md): distance and clampToCircle. Medium: roomNameFor.

describe("distance [RB53, Res #23]", () => {
  it("is 0 for equal points and symmetric", () => {
    const a = { valence: 0.3, arousal: -0.2 };
    const b = { valence: -0.4, arousal: 0.5 };
    expect(distance(a, a)).toBe(0);
    expect(distance(a, b)).toBe(distance(b, a));
  });

  it("is Euclidean: a 3-4-5 offset is 5", () => {
    expect(distance({ valence: 0, arousal: 0 }, { valence: 3, arousal: 4 })).toBe(5);
    expect(distance({ valence: 1, arousal: 1 }, { valence: -2, arousal: -3 })).toBe(5);
  });
});

describe("clampToCircle [Gap G11]", () => {
  it("returns a point inside or exactly on the circle unchanged", () => {
    const inside = { valence: 0.3, arousal: 0.4 };
    expect(clampToCircle(inside)).toBe(inside);
    const on = { valence: 0.6, arousal: 0.8 };
    expect(clampToCircle(on)).toBe(on);
  });

  it("scales a point just past 1 back to length 1, keeping its direction, in all four quadrants", () => {
    for (const [v, a] of [
      [0.9, 0.6],
      [-0.9, 0.6],
      [-0.9, -0.6],
      [0.9, -0.6],
    ]) {
      const p = clampToCircle({ valence: v, arousal: a });
      expect(Math.hypot(p.valence, p.arousal)).toBeCloseTo(1, 12);
      expect(p.valence / p.arousal).toBeCloseTo(v / a, 12);
      expect(Math.sign(p.valence)).toBe(Math.sign(v));
      expect(Math.sign(p.arousal)).toBe(Math.sign(a));
    }
  });

  it("maps the field corner (1, 1) to (0.7071, 0.7071)", () => {
    const p = clampToCircle({ valence: 1, arousal: 1 });
    expect(p.valence).toBeCloseTo(Math.SQRT1_2, 10);
    expect(p.arousal).toBeCloseTo(Math.SQRT1_2, 10);
  });

  it("leaves the center alone without dividing by zero", () => {
    expect(clampToCircle(centerMood)).toEqual({ valence: 0, arousal: 0 });
  });

  it("does not mutate its input", () => {
    const p = { valence: 2, arousal: 0 };
    clampToCircle(p);
    expect(p).toEqual({ valence: 2, arousal: 0 });
  });
});

describe("roomNameFor [Res #9, Gap G4]", () => {
  const centers: Record<string, number> = { heavy: -2 / 3, mid: 0, bright: 2 / 3, calm: -2 / 3, charged: 2 / 3 };

  it("names each of the nine buckets from a point inside it", () => {
    for (const key of bucketKeys) {
      const [v, a] = key.split("-");
      expect(roomNameFor({ valence: centers[v], arousal: centers[a] })).toBe(roomNames[key]);
    }
  });

  it("gives the middle room at the origin", () => {
    expect(roomNameFor({ valence: 0, arousal: 0 })).toBe(roomNames["mid-mid"]);
  });

  it("puts a point exactly on a cut point in the middle band [D-030]", () => {
    for (const cut of [-1 / 3, 1 / 3]) {
      expect(roomNameFor({ valence: cut, arousal: 0 })).toBe(roomNames["mid-mid"]);
      expect(roomNameFor({ valence: 0, arousal: cut })).toBe(roomNames["mid-mid"]);
    }
  });

  it("moves to the neighboring band just past a cut point", () => {
    const e = 1e-9;
    expect(roomNameFor({ valence: -1 / 3 - e, arousal: 0 })).toBe(roomNames["heavy-mid"]);
    expect(roomNameFor({ valence: 1 / 3 + e, arousal: 0 })).toBe(roomNames["bright-mid"]);
    expect(roomNameFor({ valence: 0, arousal: -1 / 3 - e })).toBe(roomNames["mid-calm"]);
    expect(roomNameFor({ valence: 0, arousal: 1 / 3 + e })).toBe(roomNames["mid-charged"]);
  });
});
