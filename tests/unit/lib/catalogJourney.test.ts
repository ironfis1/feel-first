import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { feelingWheelOrder } from "@/config/feel";
import { bucketKeys } from "@/lib/buckets";
import { getAllWorks, getCopyLines, getFeelingPositions, getWorkCards } from "@/lib/catalog";

// Medium tier (docs/test-tiers.md): getFeelingPositions, getCopyLines, getWorkCards.
// Functional gate: the catalog module contract (docs/testing.md). Vitest points data/catalog.json at the fixture;
// data/copy.json is the committed file.

const root = path.resolve(import.meta.dirname, "../../..");
const copy = JSON.parse(readFileSync(path.join(root, "data/copy.json"), "utf8")) as Record<string, Record<string, string>>;

describe("getFeelingPositions [D-044, D-049]", () => {
  it("has the 12 feelings in wheel order, each a finite point on the field", () => {
    const positions = getFeelingPositions();
    expect(Object.keys(positions)).toEqual([...feelingWheelOrder]);
    for (const p of Object.values(positions)) {
      for (const v of [p.valence, p.arousal]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is computed once and frozen", () => {
    expect(getFeelingPositions()).toBe(getFeelingPositions());
    expect(Object.isFrozen(getFeelingPositions())).toBe(true);
  });
});

describe("getCopyLines [Res #9, D-042, D-053]", () => {
  it("gives a work with copy its nine lines, one per bucket", () => {
    const id = Object.keys(copy)[0];
    const lines = getCopyLines(id)!;
    expect(Object.keys(lines).sort()).toEqual([...bucketKeys].sort());
    expect(lines).toEqual(copy[id]);
  });

  it("gives undefined for a work with no copy yet, an unknown id, or a prototype name", () => {
    expect(getCopyLines("w-9999")).toBeUndefined();
    expect(getCopyLines("fx-0001")).toBeUndefined();
    expect(getCopyLines("constructor")).toBeUndefined();
    expect(getCopyLines("__proto__")).toBeUndefined();
  });
});

describe("getWorkCards", () => {
  const cards = getWorkCards();
  const all = getAllWorks();
  const fields = ["arousal", "artist", "date", "height", "id", "lane", "thumbUrl", "title", "valence", "width"];

  it("has one card per work, in ascending catalog id order", () => {
    expect(cards.map((c) => c.id)).toEqual(all.map((w) => w.id));
  });

  it("carries exactly the ten fields the Room and Bag need, with the work's values", () => {
    cards.forEach((card, i) => {
      expect(Object.keys(card).sort()).toEqual(fields);
      for (const f of fields) expect(card[f as keyof typeof card]).toEqual(all[i][f as keyof (typeof all)[number]]);
    });
  });

  it("is a fresh array, not the frozen catalog", () => {
    expect(cards).not.toBe(all);
    expect(Object.isFrozen(cards)).toBe(false);
  });
});
