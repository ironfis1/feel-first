import { describe, expect, it } from "vitest";
import { z } from "zod";
import { bucketKeys } from "@/lib/buckets";
import { j2CacheFileSchema, j2WordmapFileSchema, perBucket } from "@/lib/schemas";

// High tier for j2CacheFileSchema, Medium for j2WordmapFileSchema and perBucket (docs/test-tiers.md).
// J2 data files [Res #7, Gap G7, Gap G9, D-028].

const answer = (overrides: Record<string, unknown> = {}) => ({
  valence: 0.45,
  arousal: -0.6,
  roomType: "bedroom",
  size: "large",
  heard: ["slow", "bedroom"],
  ...overrides,
});
const cacheIssues = (cache: unknown) => j2CacheFileSchema.safeParse(cache).error?.issues ?? [];

describe("j2CacheFileSchema", () => {
  it("accepts a normalized key with a valid answer", () => {
    expect(cacheIssues({ "a slow sunday in the bedroom, something large": answer() })).toEqual([]);
  });

  it("rejects a key with uppercase or doubled spaces, at that key", () => {
    expect(cacheIssues({ "Slow bedroom": answer() }).map((i) => [i.path, i.message])).toEqual([[["Slow bedroom"], "key is not normalized"]]);
    expect(cacheIssues({ "slow  bedroom": answer() }).map((i) => [i.path, i.message])).toEqual([[["slow  bedroom"], "key is not normalized"]]);
    expect(cacheIssues({ " slow bedroom": answer() }).map((i) => [i.path, i.message])).toEqual([[[" slow bedroom"], "key is not normalized"]]);
  });

  it("rejects a heard word that is not in the key, with the path", () => {
    expect(cacheIssues({ "slow bedroom": answer({ heard: ["slow", "storm", "night"] }) }).map((i) => [i.path, i.message])).toEqual([
      [["slow bedroom", "heard"], "heard words not in the phrase: storm, night"],
    ]);
  });

  it("rejects an invalid answer", () => {
    expect(cacheIssues({ "slow bedroom": answer({ valence: 1.5 }) }).map((i) => i.path)).toEqual([["slow bedroom", "valence"]]);
    expect(cacheIssues({ "slow bedroom": answer({ heard: [] }) }).map((i) => i.path)).toEqual([["slow bedroom", "heard"]]);
  });

  it("rejects an empty key", () => {
    expect(cacheIssues({ "": answer({ heard: ["x"] }) }).map((i) => i.path)).toEqual([[""]]);
  });

  it("accepts an empty cache, and does not require the video phrase (pin; data file test checks it)", () => {
    expect(cacheIssues({})).toEqual([]);
  });
});

describe("j2WordmapFileSchema", () => {
  const map = (overrides: Record<string, unknown> = {}) => ({
    words: { calm: { valence: 0.1, arousal: -0.7 } },
    roomTypes: { den: "living room" },
    sizes: { big: "large" },
    ...overrides,
  });
  const ok = (overrides: Record<string, unknown>) => j2WordmapFileSchema.safeParse(map(overrides)).success;

  it("accepts lowercase word keys, with apostrophes", () => {
    expect(ok({})).toBe(true);
    expect(ok({ words: { "don't": { valence: -1, arousal: 1 } }, roomTypes: { "kid's": "nursery" }, sizes: { "o'": "small" } })).toBe(true);
  });

  it.each(["Calm", "sun-lit", "70s", "two words", "café", ""])("rejects the key %j in every section", (key) => {
    expect(ok({ words: { [key]: { valence: 0, arousal: 0 } } })).toBe(false);
    expect(ok({ roomTypes: { [key]: "office" } })).toBe(false);
    expect(ok({ sizes: { [key]: "small" } })).toBe(false);
  });

  it("keeps mood values inside -1 to 1", () => {
    expect(ok({ words: { calm: { valence: -1, arousal: 1 } } })).toBe(true);
    expect(ok({ words: { calm: { valence: -1.01, arousal: 0 } } })).toBe(false);
    expect(ok({ words: { calm: { valence: 0, arousal: 1.01 } } })).toBe(false);
    expect(ok({ words: { calm: { valence: 0, arousal: 0, extra: 1 } } })).toBe(false);
  });

  it("rejects an unknown room type or size", () => {
    expect(ok({ roomTypes: { den: "garage" } })).toBe(false);
    expect(ok({ sizes: { big: "huge" } })).toBe(false);
    expect(ok({ sizes: { big: "30x40" } })).toBe(false);
  });

  it("rejects an extra or missing top-level key", () => {
    expect(ok({ phrases: [] })).toBe(false);
    const noSizes: Record<string, unknown> = map();
    delete noSizes.sizes;
    expect(j2WordmapFileSchema.safeParse(noSizes).success).toBe(false);
  });

  it("accepts empty maps (pin)", () => {
    expect(j2WordmapFileSchema.safeParse({ words: {}, roomTypes: {}, sizes: {} }).success).toBe(true);
  });
});

describe("perBucket [D-027]", () => {
  const schema = perBucket(z.number().int());
  const all = (value: unknown) => Object.fromEntries(bucketKeys.map((k) => [k, value]));

  it("has exactly the nine bucket keys", () => {
    expect(Object.keys(schema.shape)).toEqual([...bucketKeys]);
    expect(schema.safeParse(all(3)).success).toBe(true);
  });

  it("rejects a missing bucket at its key", () => {
    const value = all(3);
    delete value["mid-mid"];
    expect(schema.safeParse(value).error?.issues.map((i) => i.path)).toEqual([["mid-mid"]]);
  });

  it("rejects an extra key", () => {
    expect(schema.safeParse({ ...all(3), "mid-warm": 3 }).success).toBe(false);
  });

  it("applies the value schema to every bucket", () => {
    for (const key of bucketKeys) {
      expect(schema.safeParse({ ...all(3), [key]: 2.5 }).error?.issues.map((i) => i.path)).toEqual([[key]]);
    }
  });
});
