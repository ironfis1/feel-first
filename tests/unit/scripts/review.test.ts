import { describe, expect, it } from "vitest";
import { reasonGroup, sample, sheetSeed, skipLogMarkdown } from "../../../scripts/review.ts";

// review.ts (Medium tier): the skip log and the seeded sample behind the contact sheet.

const skip = (sourceId: string, reason: string, title = `Title ${sourceId}`) => ({ sourceId, title, reason });

describe("skipLogMarkdown", () => {
  const log = skipLogMarkdown([
    {
      source: "Art Institute of Chicago",
      skips: [
        skip("1", "image too small: 768px on the long edge, needs 1200"),
        skip("2", "image too small: 1018px on the long edge, needs 1200"),
        skip("3", 'nudity: matched "nude"'),
        skip("4", "no image", ""),
      ],
    },
    { source: "Rijksmuseum", skips: [skip("5", "visual check: graphic violence")] },
    { source: "NASA Jet Propulsion Laboratory", skips: [] },
  ]);

  it("states the total and each source's count", () => {
    expect(log).toContain("5 in all.");
    expect(log).toContain("## Art Institute of Chicago (4)");
    expect(log).toContain("## Rijksmuseum (1)");
    expect(log).toContain("## NASA Jet Propulsion Laboratory (0)");
  });

  it("groups reasons by what comes before the colon, largest group first", () => {
    const groups = log.split("\n").filter((l) => l.startsWith("### "));
    expect(groups.slice(0, 3)).toEqual(["### image too small (2)", "### nudity (1)", "### no image (1)"]);
    expect(log).toContain("### visual check (1)");
  });

  it("lists every skip with its id and full reason, and marks a missing title", () => {
    expect(log).toContain("- Title 2 [2]: image too small: 1018px on the long edge, needs 1200");
    expect(log).toContain("- (no title) [4]: no image");
  });

  it("uses a whole reason as its group when there is no colon", () => {
    expect(reasonGroup("no image")).toBe("no image");
    expect(reasonGroup("violence: matched x")).toBe("violence");
  });
});

describe("sample", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it("gives the same 60 every run until the catalog changes", () => {
    expect(sheetSeed).toBe(20261009);
    expect(sample(items, 5, sheetSeed)).toEqual(sample(items, 5, sheetSeed));
    expect(sample(items, 5, sheetSeed)).toEqual([2, 5, 13, 8, 15]);
  });

  it("gives a different order for a different seed", () => {
    expect(sample(items, 20, 1)).not.toEqual(sample(items, 20, 2));
  });

  it("draws distinct items from the input without changing it", () => {
    const copy = [...items];
    const picked = sample(items, 20, 7);
    expect([...picked].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual(copy);
  });

  it("returns at most n, and nothing for n of 0 or an empty input", () => {
    expect(sample(items, 50, 1)).toHaveLength(20);
    expect(sample(items, 0, 1)).toEqual([]);
    expect(sample([], 5, 1)).toEqual([]);
  });
});
