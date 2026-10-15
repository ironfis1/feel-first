// The bag: one line per distinct work, size, material and frame; quantity fixed at 1 [spec Section 3.8, Gap G20].

import type { FrameFinish, MaterialId, PrintSizeId } from "../config/feel.ts";
import { frameFor, priceOf, totalsOf } from "./pricing.ts";

export type BagChoice = { workId: string; size: PrintSizeId; material: MaterialId; frame: FrameFinish | null };
export type BagLine = BagChoice & { key: string; price: number };

/** A line's identity: the work and its size, material and frame. Frame counts only for framed prints [Gap G20, Gap G28]. */
export function lineKey(c: BagChoice): string {
  return [c.workId, c.size, c.material, frameFor(c.material, c.frame) ?? "none"].join("|");
}

/** Adds a line. Adding a combination already in the bag leaves the bag unchanged, since quantity is fixed at 1. */
export function addLine(bag: readonly BagLine[], c: BagChoice): BagLine[] {
  const choice = { ...c, frame: frameFor(c.material, c.frame) };
  const key = lineKey(choice);
  if (bag.some((l) => l.key === key)) return [...bag];
  return [...bag, { ...choice, key, price: priceOf(c.size, c.material) }];
}

export function removeLine(bag: readonly BagLine[], key: string): BagLine[] {
  return bag.filter((l) => l.key !== key);
}

export function bagTotals(bag: readonly BagLine[]) {
  return totalsOf(bag.map((l) => l.price));
}
