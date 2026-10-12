import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizePhrase } from "@/lib/j2";
import { catalogFileSchema, j2CacheFileSchema, j2WordmapFileSchema } from "@/lib/schemas";

// Data file gates for Milestone 3 (docs/testing.md "Data files"). The committed files are read
// with fs, because vitest aliases imports of data/catalog.json to the fixture.

const root = path.resolve(import.meta.dirname, "../../..");
const read = (file: string): unknown => JSON.parse(readFileSync(path.join(root, file), "utf8"));

describe("data/j2-cache.json [Res #7, Res #8]", () => {
  const cache = read("data/j2-cache.json");

  it("validates against the cache schema", () => {
    expect(j2CacheFileSchema.safeParse(cache).error?.issues ?? []).toEqual([]);
  });

  it("holds the demo video phrase as a cache key [D-037]", () => {
    const video = normalizePhrase("a slow sunday morning in the bedroom, something large");
    expect(Object.keys(cache as object)).toContain(video);
  });
});

describe("data/j2-wordmap.json [Gap G9, D-028, D-038]", () => {
  it("validates against the word map schema", () => {
    expect(j2WordmapFileSchema.safeParse(read("data/j2-wordmap.json")).error?.issues ?? []).toEqual([]);
  });
});

describe("data/catalog.json with J1 fields", () => {
  it("validates against the M3 catalog schema with 600 works", () => {
    const result = catalogFileSchema.safeParse(read("data/catalog.json"));
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.data).toHaveLength(600);
  });
});
