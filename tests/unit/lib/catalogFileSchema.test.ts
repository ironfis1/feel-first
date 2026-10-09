import { describe, expect, it } from "vitest";
import { catalogFileSchema } from "@/lib/schemas";
import { validWork } from "../../fixtures/works";

// High tier (docs/test-tiers.md). Gap G2, D-015.

const works = (...ids: string[]) => ids.map((id) => validWork({ id }));
const issues = (input: unknown) =>
  catalogFileSchema.safeParse(input).error?.issues.map((i) => ({ message: i.message, path: i.path })) ?? [];

describe("catalogFileSchema", () => {
  it("accepts an empty file, one work, and works with distinct ids", () => {
    expect(issues([])).toEqual([]);
    expect(issues(works("a"))).toEqual([]);
    expect(issues(works("a", "b"))).toEqual([]);
  });

  it("rejects a duplicate id at the second occurrence [D-015]", () => {
    expect(issues(works("a", "a"))).toEqual([{ message: "duplicate id a", path: [1, "id"] }]);
  });

  it("reports every repeat when an id appears three times", () => {
    expect(issues(works("a", "a", "a")).map((i) => i.path)).toEqual([
      [1, "id"],
      [2, "id"],
    ]);
  });

  it("catches duplicates that are not adjacent", () => {
    expect(issues(works("a", "b", "a")).map((i) => i.path)).toEqual([[2, "id"]]);
  });

  it("compares ids exactly, so case and spacing make different ids", () => {
    expect(issues(works("a", "A", "a "))).toEqual([]);
  });

  it("rejects a duplicate even when the other fields differ", () => {
    const file = [validWork({ id: "a" }), validWork({ id: "a", title: "Another", lane: "poster" })];
    expect(issues(file).map((i) => i.message)).toEqual(["duplicate id a"]);
  });

  it("points an invalid work's issue at its position in the file", () => {
    const file = [validWork({ id: "a" }), validWork({ id: "b", valence: 2 })];
    expect(issues(file).map((i) => i.path)).toEqual([[1, "valence"]]);
  });

  it("rejects a file that is not an array", () => {
    expect(catalogFileSchema.safeParse(validWork()).success).toBe(false);
  });
});
