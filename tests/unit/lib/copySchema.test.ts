import { describe, expect, it } from "vitest";
import { bucketKeys } from "@/lib/buckets";
import { copyFileSchema } from "@/lib/schemas";

// High tier (docs/test-tiers.md). copy.json contract [Res #9, Gap G2, D-027].

const emDash = String.fromCharCode(0x2014);
const nine = (line = "Calm water at dusk.") => Object.fromEntries(bucketKeys.map((key) => [key, line]));
const issues = (input: unknown) =>
  copyFileSchema.safeParse(input).error?.issues.map((i) => ({ message: i.message, path: i.path })) ?? [];

describe("copyFileSchema", () => {
  it("accepts works with nine lines each", () => {
    expect(issues({ "w-0001": nine(), "w-0002": nine("Low sky.") })).toEqual([]);
  });

  it("rejects eight or ten keys for a work", () => {
    const eight = Object.fromEntries(Object.entries(nine()).filter(([key]) => key !== "mid-mid"));
    expect(issues({ "w-0001": eight }).map((i) => i.path)).toEqual([["w-0001", "mid-mid"]]);
    expect(issues({ "w-0001": { ...nine(), extra: "Calm." } }).map((i) => i.path)).toEqual([["w-0001"]]);
  });

  it("rejects an empty or whitespace-only line", () => {
    expect(issues({ "w-0001": { ...nine(), "heavy-calm": "" } }).map((i) => i.path)).toEqual([["w-0001", "heavy-calm"]]);
    expect(issues({ "w-0001": { ...nine(), "heavy-calm": "   " } }).map((i) => i.path)).toEqual([["w-0001", "heavy-calm"]]);
  });

  it("rejects an em dash", () => {
    expect(issues({ "w-0001": { ...nine(), "bright-charged": `Calm${emDash}low.` } })).toEqual([
      { message: "no em dash", path: ["w-0001", "bright-charged"] },
    ]);
  });

  it("trims lines in the output", () => {
    expect(copyFileSchema.parse({ "w-0001": nine("  Calm water.\n") })).toEqual({ "w-0001": nine("Calm water.") });
  });

  it("rejects an empty work id", () => {
    expect(issues({ "": nine() }).map((i) => i.path)).toEqual([[""]]);
  });

  it("accepts an empty file (pin: completeness against the catalog is checked by copyProblems)", () => {
    expect(issues({})).toEqual([]);
  });
});
