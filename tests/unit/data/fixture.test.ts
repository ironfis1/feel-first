import { describe, expect, it } from "vitest";
import fixture from "../../../data/fixtures/catalog.fixture.json";
import { catalogFileSchema } from "@/lib/schemas";

// The fixture stands in for catalog.json in tests (data/fixtures/, M1 scope).
describe("catalog fixture file", () => {
  it("validates against the catalog file schema", () => {
    const result = catalogFileSchema.safeParse(fixture);
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it("marks every record as fixture data", () => {
    expect(fixture.every((w) => w.source === "FIXTURE")).toBe(true);
  });

  it("has works in both lanes", () => {
    expect(new Set(fixture.map((w) => w.lane))).toEqual(new Set(["fine-art", "poster"]));
  });
});
