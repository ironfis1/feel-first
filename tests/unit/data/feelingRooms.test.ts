import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { feelingWheelOrder } from "@/config/feel";
import { feelingPositions, moodFor } from "@/lib/feelings";
import { hang } from "@/lib/j3";
import { catalogFileSchema } from "@/lib/schemas";

// D-050 gate: each feeling's Room, with the point at that feeling on the rim of the wheel, must hang at least 6
// works of its top 12 that carry the feeling in any tag. Run against the real data/catalog.json (read directly,
// since Vitest points the catalog module at the fixture) through the real J3. Reads committed data only.
//
// Per D-050, failures are reported to Scott, not tuned around. Feelings measured below 6 are marked it.fails
// with their count, so the suite stays green while the shortfall stays visible. If one starts passing,
// it.fails turns red and the mark comes off.

const root = path.resolve(import.meta.dirname, "../../..");
const works = catalogFileSchema.parse(JSON.parse(readFileSync(path.join(root, "data/catalog.json"), "utf8")));
const positions = feelingPositions(works);

/** Measured 2026-10-15 on the 600-work catalog. */
const belowSix: Partial<Record<(typeof feelingWheelOrder)[number], number>> = { nostalgic: 4, awe: 4, defiant: 5, wistful: 2 };

function countFor(i: number): number {
  const f = feelingWheelOrder[i];
  const a = (i * Math.PI) / 6;
  const top = hang(works, moodFor({ x: Math.cos(a), y: Math.sin(a) }, positions), 1).slice(0, 12);
  expect(top).toHaveLength(12);
  return top.filter((w) => w.tags.includes(f)).length;
}

describe("each feeling's Room carries the feeling [D-050]", () => {
  feelingWheelOrder.forEach((f, i) => {
    const known = belowSix[f];
    if (known === undefined) {
      it(`${f}: at least 6 of the top 12`, () => {
        expect(countFor(i)).toBeGreaterThanOrEqual(6);
      });
    } else {
      it(`${f}: known shortfall, ${known} of 12, reported under D-050`, () => {
        expect(countFor(i)).toBe(known);
      });
      it.fails(`${f}: at least 6 of the top 12 (fails, D-050)`, () => {
        expect(countFor(i)).toBeGreaterThanOrEqual(6);
      });
    }
  });
});
