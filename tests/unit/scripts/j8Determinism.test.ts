import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { catalogFileSchema, signalsFileSchema } from "@/lib/schemas";
import { computeDrafts, bucketFigures } from "../../../scripts/j8.ts";
import { seed, seedFileText, sessionCount, simulate } from "../../../scripts/j8-seed.ts";

// Functional gate (docs/testing.md): J8 seed determinism. Seed 20261008 reproduces every Signals figure exactly.
// The real files are read with fs, because vitest aliases any import of data/catalog.json to the fixture.

const repo = (file: string) => path.resolve(import.meta.dirname, "../../..", file);
const read = (file: string) => readFileSync(repo(file), "utf8");

describe("J8 seed determinism, small fixture catalog", () => {
  it("gives the recorded output for seed 20261008", () => {
    const catalog = catalogFileSchema.parse(JSON.parse(read("data/fixtures/catalog.fixture.json")));
    const out = simulate(catalog, 20261008, 200);
    // Recorded once on 2026-10-12: 200 sessions, 1213 views, 26 adds. Any reorder of random draws changes it.
    expect(createHash("sha256").update(seedFileText(out)).digest("hex")).toBe("c3ef6010845807a973d427434f01c115d1a27d4212f0516ed0004049915d4fee");
    expect(out.sessions[0]).toEqual({ bucket: "bright-charged", views: ["fx-0014", "fx-0007", "fx-0011", "fx-0005"], adds: [] });
    expect(out.sessions.flatMap((s) => s.adds).slice(0, 3)).toEqual([
      { id: "fx-0012", size: "12x16", material: "canvas", frame: null },
      { id: "fx-0008", size: "12x16", material: "paper", frame: null },
      { id: "fx-0002", size: "18x24", material: "paper", frame: null },
    ]);
  });
});

describe("J8 seed determinism, committed data", () => {
  const catalog = catalogFileSchema.parse(JSON.parse(read("data/catalog.json")));
  // Git may check text files out with CRLF line endings on Windows; the committed bytes use LF.
  const seedText = read("data/signals-seed.json").replace(/\r\n/g, "\n");
  const seedFile = JSON.parse(seedText);
  const signals = signalsFileSchema.parse(JSON.parse(read("data/signals.json")));

  it("reproduces data/signals-seed.json byte for byte from data/catalog.json", () => {
    expect([seed, sessionCount]).toEqual([20261008, 20_000]);
    // About one second for 20,000 sessions over the 600-work catalog.
    expect(seedFileText(simulate(catalog)) === seedText).toBe(true);
    // Stryker's instrumented code runs it many times slower, so it gets a longer limit than the default.
  }, 120_000);

  it("reproduces every figure in data/signals.json", () => {
    expect(signals.seed).toBe(seedFile.seed);
    expect(signals.sessionCount).toBe(seedFile.sessionCount);
    expect(bucketFigures(seedFile, catalog)).toEqual(signals.buckets);
    const drafts = computeDrafts(seedFile, catalog);
    expect(drafts.map((d) => ({ kind: d.kind, bucket: d.bucket, figures: d.figures }))).toEqual(
      signals.findings.map((f) => ({ kind: f.kind, bucket: f.bucket, figures: f.figures })),
    );
    for (const [i, d] of drafts.entries()) expect(Object.keys(d.figures)).toEqual(Object.keys(signals.findings[i].figures));
  }, 60_000);
});
