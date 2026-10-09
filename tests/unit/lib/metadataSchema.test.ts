import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { metadataCatalogFileSchema, metadataWorkSchema, workSchema } from "@/lib/schemas";
import { validWork } from "../../fixtures/works";

// High tier (docs/test-tiers.md). The M2 catalog contract: Section 3.2 minus J1's five fields.

const j1Fields = ["valence", "arousal", "tags", "palette", "subject"];
const metadataWork = (overrides: Record<string, unknown> = {}) => {
  const work = validWork(overrides);
  for (const f of j1Fields) delete work[f];
  return work;
};
const accepts = (overrides: Record<string, unknown>) => metadataWorkSchema.safeParse(metadataWork(overrides)).success;
const issues = (input: unknown) => metadataCatalogFileSchema.safeParse(input).error?.issues.map((i) => i.path) ?? [];

describe("metadataWorkSchema", () => {
  it("accepts a complete metadata work", () => {
    expect(accepts({})).toBe(true);
  });

  it("holds exactly the Section 3.2 fields without J1's five", () => {
    const full = Object.keys(workSchema.def.shape ?? {});
    const meta = Object.keys(metadataWorkSchema.def.shape ?? {});
    expect(meta.sort()).toEqual(full.filter((f) => !j1Fields.includes(f)).sort());
  });

  it.each(j1Fields)("rejects %s, which J1 adds in M3", (field) => {
    expect(metadataWorkSchema.safeParse({ ...metadataWork(), [field]: validWork()[field] }).success).toBe(false);
  });

  it.each(Object.keys(metadataWork()))("requires %s", (field) => {
    const work = metadataWork();
    delete work[field];
    expect(metadataWorkSchema.safeParse(work).success).toBe(false);
  });

  it("applies the same field rules as the full schema", () => {
    expect(accepts({ thumbUrl: "thumbs/a.webp" })).toBe(false);
    expect(accepts({ thumbUrl: "/" })).toBe(false);
    expect(accepts({ imageUrl: "not a url" })).toBe(false);
    expect(accepts({ orientation: "wide" })).toBe(false);
  });

  it("rejects an orientation that does not match the dimensions [D-016]", () => {
    expect(accepts({ width: 1800, height: 1800, orientation: "square" })).toBe(true);
    const result = metadataWorkSchema.safeParse(metadataWork({ width: 1500, height: 2000, orientation: "landscape" }));
    expect(result.error?.issues.map((i) => i.path)).toEqual([["orientation"]]);
  });
});

describe("metadataCatalogFileSchema", () => {
  const file = (...ids: string[]) => ids.map((id) => metadataWork({ id }));

  it("accepts an empty file and works with distinct ids", () => {
    expect(issues([])).toEqual([]);
    expect(issues(file("a", "b"))).toEqual([]);
  });

  it("rejects duplicate ids at each later occurrence, adjacent or not [D-015]", () => {
    expect(issues(file("a", "b", "a", "a"))).toEqual([
      [2, "id"],
      [3, "id"],
    ]);
  });

  it("points an invalid work's issue at its position, and rejects a non-array", () => {
    expect(issues([metadataWork({ id: "a" }), metadataWork({ id: "b", width: 0 })])[0][0]).toBe(1);
    expect(metadataCatalogFileSchema.safeParse(metadataWork()).success).toBe(false);
  });

  it("accepts the metadata test fixture", () => {
    const fixture = JSON.parse(readFileSync("tests/fixtures/catalog.metadata.json", "utf8"));
    expect(issues(fixture)).toEqual([]);
  });
});
