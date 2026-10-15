import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogProblems, copyMayBePartial, copyProblems, seedProblems } from "../../../scripts/validate-data.ts";

// High tier (docs/test-tiers.md): the build-time gate on data/catalog.json. Medium: copyProblems and seedProblems.

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

describe("copyProblems [Gap G2]", () => {
  const ids = new Set(["w-1", "w-2", "w-3"]);

  it("accepts lines for exactly the catalog's works, whatever the values hold", () => {
    expect(copyProblems({ "w-1": {}, "w-2": null, "w-3": "odd" }, ids)).toEqual([]);
  });

  it("names how many works have no lines and the first one", () => {
    expect(copyProblems({ "w-1": {} }, ids)).toEqual(["2 works have no lines, for example w-2"]);
    expect(copyProblems({}, ids)).toEqual(["3 works have no lines, for example w-1"]);
  });

  it("names how many entries are not catalog works and the first one", () => {
    expect(copyProblems({ "w-1": {}, "w-2": {}, "w-3": {}, "w-9": {} }, ids)).toEqual(["1 entries are not catalog works, for example w-9"]);
    expect(copyProblems({ "w-8": {}, "w-9": {} }, new Set())).toEqual(["2 entries are not catalog works, for example w-8"]);
  });

  it("reports missing works before unknown entries", () => {
    expect(copyProblems({ "w-1": {}, "w-2": {}, "w-9": {} }, ids)).toEqual([
      "1 works have no lines, for example w-3",
      "1 entries are not catalog works, for example w-9",
    ]);
  });
});

describe("copyProblems, partial until the J4 full run [D-042]", () => {
  const ids = new Set(["w-1", "w-2", "w-3"]);

  it("allows missing works but still reports unknown entries", () => {
    expect(copyProblems({ "w-1": {} }, ids, true)).toEqual([]);
    expect(copyProblems({}, ids, true)).toEqual([]);
    expect(copyProblems({ "w-1": {}, "w-9": {} }, ids, true)).toEqual(["1 entries are not catalog works, for example w-9"]);
  });

  it("reports both kinds of problem when not partial", () => {
    expect(copyProblems({ "w-1": {}, "w-9": {} }, ids, false)).toEqual([
      "2 works have no lines, for example w-2",
      "1 entries are not catalog works, for example w-9",
    ]);
  });

  it("is switched off once copy.json covers every catalog work (guard for after the full run)", () => {
    const root = path.resolve(import.meta.dirname, "../../..");
    const read = (name: string) => JSON.parse(readFileSync(path.join(root, "data", name), "utf8"));
    const copy = read("copy.json") as Record<string, unknown>;
    const complete = (read("catalog.json") as { id: string }[]).every((w) => w.id in copy);
    if (complete) expect(copyMayBePartial).toBe(false);
    else expect(copyMayBePartial).toBe(true);
  });
});

describe("seedProblems [Res #38]", () => {
  const ids = new Set(["w-1", "w-2"]);
  const seed = (...views: string[][]) => ({ sessions: views.map((v) => ({ views: v })) });

  it("accepts views of catalog works only, and empty sessions", () => {
    expect(seedProblems(seed(["w-1", "w-2"], ["w-2"]), ids)).toEqual([]);
    expect(seedProblems(seed([]), ids)).toEqual([]);
    expect(seedProblems(seed(), ids)).toEqual([]);
  });

  it("counts each unknown id once, across views and sessions", () => {
    expect(seedProblems(seed(["w-1", "x-1", "x-1"], ["x-1"]), ids)).toEqual(["1 viewed ids are not catalog works, for example x-1"]);
  });

  it("names the first unknown id seen, including in a later session", () => {
    expect(seedProblems(seed(["w-1"], ["w-2", "x-2"], ["x-1"]), ids)).toEqual(["2 viewed ids are not catalog works, for example x-2"]);
  });
});

describe("prebuild gate (docs/testing.md: data files validated at build time)", () => {
  it("runs the data check before every build, locally and on Upsun", async () => {
    const { default: pkg } = await import("../../../package.json", { with: { type: "json" } });
    expect(pkg.scripts.prebuild).toBe("node scripts/validate-data.ts");
  });
});
