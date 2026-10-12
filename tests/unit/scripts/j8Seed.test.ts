import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { frameFinishes, printSizes } from "@/config/feel";
import { bucketKeys } from "@/lib/buckets";
import { catalogFileSchema, signalsSeedFileSchema } from "@/lib/schemas";
import { moodShares, mulberry32, pick, posterAffinity, propensity, seedFileText, simulate } from "../../../scripts/j8-seed.ts";
import { validWork } from "../../fixtures/works.ts";

// High tier (docs/test-tiers.md): mulberry32, pick, simulate. Medium: seedFileText.
// The golden checks for seed 20261008 live in j8Determinism.test.ts.

type Work = z.infer<typeof catalogFileSchema>[number];

const fixtureCatalog = catalogFileSchema.parse(
  JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../data/fixtures/catalog.fixture.json"), "utf8")),
);

const work = (id: string, lane: Work["lane"], subject: Work["subject"], valence: number, arousal: number) =>
  validWork({ id, lane, subject, valence, arousal }) as unknown as Work;

/** A generator that returns the given values in turn. */
const stub = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const draws = (random: () => number, n: number) => Array.from({ length: n }, () => random());

describe("mulberry32 [D-029, A10]", () => {
  it("gives the recorded first five values for seed 20261008", () => {
    expect(draws(mulberry32(20261008), 5)).toEqual([
      0.9406747838947922, 0.49959295336157084, 0.03098052437417209, 0.2070265905931592, 0.7408745891880244,
    ]);
  });

  it("stays in [0, 1) with a mean near 0.5", () => {
    const values = draws(mulberry32(20261008), 10_000);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.02);
  });

  it("repeats a sequence for the same seed and differs for another seed", () => {
    expect(draws(mulberry32(42), 20)).toEqual(draws(mulberry32(42), 20));
    expect(draws(mulberry32(43), 20)).not.toEqual(draws(mulberry32(42), 20));
  });

  it("keeps two generators independent", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const interleaved = [a(), b(), b(), a(), b(), a()];
    expect([interleaved[0], interleaved[3], interleaved[5]]).toEqual(draws(mulberry32(7), 3));
    expect([interleaved[1], interleaved[2], interleaved[4]]).toEqual(draws(mulberry32(7), 3));
  });

  it("coerces the seed to an unsigned 32-bit integer", () => {
    expect(draws(mulberry32(-1), 5)).toEqual(draws(mulberry32(4294967295), 5));
    expect(draws(mulberry32(2 ** 32 + 5), 5)).toEqual(draws(mulberry32(5), 5));
  });
});

describe("pick", () => {
  it("returns the first index for 0 and the last for a draw just under 1", () => {
    expect(pick([1, 1, 1], stub(0))).toBe(0);
    expect(pick([1, 1, 1], stub(0.999999))).toBe(2);
  });

  it("sends a draw exactly on a cumulative boundary to the next index", () => {
    expect(pick([2, 2], stub(0.5))).toBe(1);
    expect(pick([2, 2], stub(0.4999))).toBe(0);
    expect(pick([1, 1, 2], stub(0.5))).toBe(2);
    expect(pick([1, 1, 2], stub(0.4999))).toBe(1);
  });

  it("accepts weights that do not sum to 1", () => {
    expect(pick([2, 6], stub(0.25))).toBe(1);
    expect(pick([2, 6], stub(0.24))).toBe(0);
  });

  it("never chooses a zero-weight entry when others have weight", () => {
    const random = mulberry32(1);
    const chosen = new Set(Array.from({ length: 2000 }, () => pick([1, 0, 1], random)));
    expect([...chosen].sort()).toEqual([0, 2]);
    expect(pick([1, 0, 0], stub(0.999999))).toBe(0);
  });

  it("returns 0 for a single weight and the last index for a draw of exactly 1", () => {
    expect(pick([5], stub(0.7))).toBe(0);
    expect(pick([1, 1, 1], stub(1))).toBe(2);
  });

  it("returns -1 for empty weights (pin)", () => {
    expect(pick([], stub(0.5))).toBe(-1);
  });

  it("follows the weights over many draws", () => {
    const random = mulberry32(99);
    const counts = [0, 0, 0];
    for (let i = 0; i < 10_000; i++) counts[pick([1, 2, 7], random)]++;
    expect(counts[0] / 10_000).toBeCloseTo(0.1, 1);
    expect(counts[1] / 10_000).toBeCloseTo(0.2, 1);
    expect(counts[2] / 10_000).toBeCloseTo(0.7, 1);
  });
});

describe("simulate assumptions (A1, A5, A6)", () => {
  it("holds the stated mood shares, propensities and poster affinities", () => {
    expect(moodShares).toEqual({
      "heavy-calm": 10,
      "mid-calm": 14,
      "bright-calm": 15,
      "heavy-mid": 8,
      "mid-mid": 18,
      "bright-mid": 13,
      "heavy-charged": 5,
      "mid-charged": 9,
      "bright-charged": 8,
    });
    expect(Object.values(moodShares).reduce((a, b) => a + b, 0)).toBe(100);
    expect(propensity).toEqual({
      "heavy-calm": 1,
      "mid-calm": 1,
      "bright-calm": 1.1,
      "heavy-mid": 0.85,
      "mid-mid": 1,
      "bright-mid": 1.15,
      "heavy-charged": 0.7,
      "mid-charged": 0.9,
      "bright-charged": 1,
    });
    expect(posterAffinity).toEqual({
      space: { "mid-charged": 1.6, "bright-charged": 1.5 },
      place: { "bright-calm": 1.6, "mid-calm": 1.3 },
      animal: { "bright-mid": 1.5 },
    });
  });
});

describe("simulate [D-029]", () => {
  const out = simulate(fixtureCatalog, 20261008, 2000);
  const laneOf = new Map(fixtureCatalog.map((w) => [w.id, w.lane]));

  it("gives the same output for the same inputs and a different one for another seed", () => {
    expect(simulate(fixtureCatalog, 20261008, 2000)).toEqual(out);
    expect(simulate(fixtureCatalog, 20261009, 2000)).not.toEqual(out);
  });

  it("ignores input catalog order and leaves the input untouched", () => {
    const reversed = [...fixtureCatalog].reverse();
    const before = structuredClone(reversed);
    expect(simulate(reversed, 20261008, 2000)).toEqual(out);
    expect(reversed).toEqual(before);
  });

  it("echoes the seed and count, and passes the seed-file schema", () => {
    expect(out.seed).toBe(20261008);
    expect(out.sessionCount).toBe(2000);
    expect(out.sessions).toHaveLength(2000);
    expect(signalsSeedFileSchema.safeParse(out).success).toBe(true);
  });

  it("opens 3 to 15 different works per session, and reaches both ends", () => {
    const lengths = out.sessions.map((s) => s.views.length);
    expect(Math.min(...lengths)).toBe(3);
    expect(Math.max(...lengths)).toBe(15);
    expect(out.sessions.every((s) => new Set(s.views).size === s.views.length)).toBe(true);
  });

  it("adds only viewed works, with a valid size and a frame only on framed prints", () => {
    const sizes: string[] = printSizes.map((s) => s.id);
    const lines = out.sessions.flatMap((s) => s.adds.map((line) => ({ line, views: s.views })));
    expect(lines.length).toBeGreaterThan(0);
    for (const { line, views } of lines) {
      expect(views).toContain(line.id);
      expect(sizes).toContain(line.size);
      if (line.material === "framed") expect(frameFinishes).toContain(line.frame);
      else expect(line.frame).toBeNull();
    }
  });

  it("gives no sessions for a count of 0", () => {
    expect(simulate(fixtureCatalog, 20261008, 0)).toEqual({ seed: 20261008, sessionCount: 0, sessions: [] });
  });

  it("skips views without error when the pool runs out", () => {
    const tiny = [work("t-1", "fine-art", "landscape", 0, 0), work("t-2", "poster", "space", 0, 0)];
    const result = simulate(tiny, 20261008, 300);
    expect(result.sessions.every((s) => s.views.length <= 2)).toBe(true);
    expect(result.sessions.some((s) => s.views.length === 2)).toBe(true);
  });

  it("runs with a one-lane catalog, viewing only that lane (pin: some sessions then open nothing)", () => {
    const fineOnly = fixtureCatalog.filter((w) => w.lane === "fine-art");
    const result = simulate(fineOnly, 20261008, 300);
    expect(result.sessions.flatMap((s) => s.views).every((id) => laneOf.get(id) === "fine-art")).toBe(true);
    expect(result.sessions.some((s) => s.views.length === 0)).toBe(true);
  });

  it("starts sessions in the A1 mood shares", () => {
    const big = simulate(fixtureCatalog, 20261008, 20_000);
    for (const key of bucketKeys) {
      const share = (100 * big.sessions.filter((s) => s.bucket === key).length) / 20_000;
      expect(Math.abs(share - moodShares[key])).toBeLessThan(1);
    }
  });

  it("chooses materials by lane, moving 10 points from paper to framed in calm moods and back in charged ones (A7)", () => {
    const big = simulate(fixtureCatalog, 20261008, 100_000);
    const tally: Record<string, { paper: number; canvas: number; framed: number; all: number }> = {};
    for (const s of big.sessions) {
      for (const line of s.adds) {
        const key = `${laneOf.get(line.id)}|${s.bucket.split("-")[1]}`;
        tally[key] ??= { paper: 0, canvas: 0, framed: 0, all: 0 };
        tally[key][line.material] += 1;
        tally[key].all += 1;
      }
    }
    const expected: Record<string, [number, number, number]> = {
      "fine-art|calm": [20, 25, 55],
      "fine-art|mid": [30, 25, 45],
      "fine-art|charged": [40, 25, 35],
      "poster|calm": [45, 10, 45],
      "poster|mid": [55, 10, 35],
      "poster|charged": [65, 10, 25],
    };
    for (const [key, [paper, canvas, framed]] of Object.entries(expected)) {
      const t = tally[key];
      expect(Math.abs((100 * t.paper) / t.all - paper)).toBeLessThan(4);
      expect(Math.abs((100 * t.canvas) / t.all - canvas)).toBeLessThan(4);
      expect(Math.abs((100 * t.framed) / t.all - framed)).toBeLessThan(4);
    }
  });

  it("applies the A6 poster affinity to posters only", () => {
    // A fine-art and a poster space work at the same point: only the poster gets the 1.6 mid-charged lift.
    const pair = [work("a-fine", "fine-art", "space", 0, 0.6), work("b-poster", "poster", "space", 0, 0.6)];
    const result = simulate(pair, 20261008, 200_000);
    const rate = (bucket: string, id: string) => {
      const sessions = result.sessions.filter((s) => s.bucket === bucket);
      const views = sessions.filter((s) => s.views.includes(id)).length;
      const adds = sessions.filter((s) => s.adds.some((line) => line.id === id)).length;
      return adds / views;
    };
    const ratio = (bucket: string) => rate(bucket, "b-poster") / rate(bucket, "a-fine");
    expect(ratio("mid-charged")).toBeGreaterThan(1.4);
    expect(ratio("mid-charged")).toBeLessThan(1.8);
    expect(ratio("mid-mid")).toBeGreaterThan(0.8);
    expect(ratio("mid-mid")).toBeLessThan(1.2);
  });

  it("always picks the last unseen work when a work has no valence (pin: NaN weights, no guard)", () => {
    const broken = [
      work("n-1", "fine-art", "landscape", 0, 0),
      { ...work("n-2", "fine-art", "landscape", 0, 0), valence: undefined as unknown as number },
      work("n-3", "fine-art", "landscape", 0, 0),
    ];
    const result = simulate(broken, 20261008, 50);
    const descending = ["n-3", "n-2", "n-1"];
    for (const s of result.sessions) expect(s.views).toEqual(descending.slice(0, s.views.length));
  });
});

describe("seedFileText", () => {
  const file = simulate(fixtureCatalog, 20261008, 25);
  const text = seedFileText(file);

  it("parses back to the input and passes the schema", () => {
    expect(JSON.parse(text)).toEqual(file);
    expect(signalsSeedFileSchema.safeParse(JSON.parse(text)).success).toBe(true);
  });

  it("writes one session per line and ends with a newline", () => {
    const lines = text.split("\n");
    expect(lines[0]).toBe('{"seed":20261008,"sessionCount":25,"sessions":[');
    expect(lines.slice(1, 26)).toEqual(file.sessions.map((s, i) => JSON.stringify(s) + (i < 24 ? "," : "")));
    expect(lines.slice(26)).toEqual(["]}", ""]);
  });

  it("gives the same string for the same input", () => {
    expect(seedFileText(simulate(fixtureCatalog, 20261008, 25))).toBe(text);
  });

  it("still parses with zero sessions", () => {
    expect(JSON.parse(seedFileText({ seed: 1, sessionCount: 0, sessions: [] }))).toEqual({ seed: 1, sessionCount: 0, sessions: [] });
  });
});
