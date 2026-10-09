import { describe, expect, it } from "vitest";
import { catalogProblems } from "../../../scripts/validate-data.ts";

// High tier (docs/test-tiers.md): the build-time gate on data/catalog.json.

const works = (n: number) => Array.from({ length: n }, (_, i) => ({ thumbUrl: `/thumbs/w${i}.webp` }));
const allThere = () => true;

describe("catalogProblems [RB45, Res #16, D-001]", () => {
  it("accepts 500 to 700 works", () => {
    expect(catalogProblems(works(500), allThere)).toEqual([]);
    expect(catalogProblems(works(700), allThere)).toEqual([]);
  });

  it("names the count when it is outside 600 plus or minus 100", () => {
    expect(catalogProblems(works(499), allThere)).toEqual(["catalog has 499 works, outside 600 plus or minus 100"]);
    expect(catalogProblems(works(701), allThere)).toEqual(["catalog has 701 works, outside 600 plus or minus 100"]);
  });

  it("names how many thumbnails are missing and the first one", () => {
    const missing = new Set(["/thumbs/w3.webp", "/thumbs/w9.webp"]);
    expect(catalogProblems(works(600), (url) => !missing.has(url))).toEqual([
      "2 works have no thumbnail file, for example /thumbs/w3.webp",
    ]);
  });
});

describe("prebuild gate (docs/testing.md: data files validated at build time)", () => {
  it("runs the data check before every build, locally and on Upsun", async () => {
    const { default: pkg } = await import("../../../package.json", { with: { type: "json" } });
    expect(pkg.scripts.prebuild).toBe("node scripts/validate-data.ts");
  });
});
