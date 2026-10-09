import { describe, expect, it } from "vitest";
import { rawFileSchema, rawWorkSchema, sourceKeys, sourceNames } from "../../../scripts/ingest/lib/raw.ts";

// High tier (docs/test-tiers.md). The contract between the ingest scripts and the merge step.

const work = (overrides: Record<string, unknown> = {}) => ({
  sourceId: "1",
  title: "Harbor",
  artist: "A. Painter",
  date: "1880",
  lane: "fine-art",
  imageUrl: "https://museum.test/full.jpg",
  thumbSourceUrl: "https://museum.test/thumb.jpg",
  width: 2000,
  height: 1500,
  license: "Public domain",
  rank: 0,
  group: "seascape",
  ...overrides,
});
const accepts = (overrides: Record<string, unknown>) => rawWorkSchema.safeParse(work(overrides)).success;
const file = (overrides: Record<string, unknown> = {}) => ({
  sourceKey: "aic",
  source: "Art Institute of Chicago",
  fetchedAt: "2026-10-09T15:00:00.000Z",
  works: [work()],
  skips: [{ sourceId: "2", title: "", reason: "no image" }],
  ...overrides,
});

describe("rawWorkSchema", () => {
  it("accepts a complete work and rejects an unknown field", () => {
    expect(accepts({})).toBe(true);
    expect(accepts({ subject: "landscape" })).toBe(false);
  });

  it.each(Object.keys(work()))("requires %s", (field) => {
    const w: Record<string, unknown> = work();
    delete w[field];
    expect(rawWorkSchema.safeParse(w).success).toBe(false);
  });

  it.each(["sourceId", "title", "artist", "date", "license", "group"])("rejects an empty %s", (field) => {
    expect(accepts({ [field]: "" })).toBe(false);
  });

  it("requires both image addresses to be URLs", () => {
    expect(accepts({ imageUrl: "full.jpg" })).toBe(false);
    expect(accepts({ thumbSourceUrl: "/thumbs/a.webp" })).toBe(false);
  });

  it("requires whole positive dimensions, with a long edge of at least 1,200px [D-002]", () => {
    for (const bad of [0, -5, 1500.5]) expect(accepts({ width: bad })).toBe(false);
    expect(accepts({ width: 1199, height: 1199 })).toBe(false);
    expect(accepts({ width: 1200, height: 1 })).toBe(true);
    expect(accepts({ width: 1, height: 1200 })).toBe(true);
  });

  it("takes a whole rank from 0 and only the two lanes", () => {
    expect(accepts({ rank: 0 })).toBe(true);
    expect(accepts({ rank: -1 })).toBe(false);
    expect(accepts({ rank: 1.5 })).toBe(false);
    expect(accepts({ lane: "poster" })).toBe(true);
    expect(accepts({ lane: "photo" })).toBe(false);
  });
});

describe("rawFileSchema", () => {
  it("accepts a valid file, including one with no works or skips", () => {
    expect(rawFileSchema.safeParse(file()).success).toBe(true);
    expect(rawFileSchema.safeParse(file({ works: [], skips: [] })).success).toBe(true);
  });

  it("rejects an unknown source, a bad timestamp and an unknown field", () => {
    expect(rawFileSchema.safeParse(file({ sourceKey: "cleveland" })).success).toBe(false);
    expect(rawFileSchema.safeParse(file({ fetchedAt: "yesterday" })).success).toBe(false);
    expect(rawFileSchema.safeParse(file({ notes: "x" })).success).toBe(false);
  });

  it("allows a skip with no title but not one with no reason", () => {
    expect(rawFileSchema.safeParse(file({ skips: [{ sourceId: "2", title: "", reason: "" }] })).success).toBe(false);
  });
});

describe("sourceNames [Gap G33]", () => {
  it("credits each source by its institution's name", () => {
    expect(Object.keys(sourceNames)).toEqual([...sourceKeys]);
    expect(sourceNames).toEqual({
      aic: "Art Institute of Chicago",
      met: "The Metropolitan Museum of Art",
      rijks: "Rijksmuseum",
      jpl: "NASA Jet Propulsion Laboratory",
      loc: "Library of Congress",
    });
  });
});
