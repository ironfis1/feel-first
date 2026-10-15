// Prices for a print: size, material and frame [spec Section 3.6, Gap G5, Gap G28, D-048].

import { frameFinishes, frameWidthIn, materials, matWidthIn, printSizes, shippingFlat, type FrameFinish, type MaterialId, type PrintSizeId } from "../config/feel.ts";

export type PrintSize = (typeof printSizes)[number];

export function printSize(id: PrintSizeId): PrintSize {
  const size = printSizes.find((s) => s.id === id);
  if (!size) throw new Error(`unknown print size ${id}`);
  return size;
}

/** Outside width and height of a framed print in inches: the print plus mat and frame on every side [Res #41, Gap G28]. */
export function framedOuterInches(id: PrintSizeId): { width: number; height: number } {
  const { widthIn, heightIn } = printSize(id);
  const border = 2 * (matWidthIn + frameWidthIn);
  return { width: widthIn + border, height: heightIn + border };
}

/** Total linear measurement of the four outside edges of the frame [D-048]. */
export function framedPerimeterInches(id: PrintSizeId): number {
  const { width, height } = framedOuterInches(id);
  return 2 * (width + height);
}

/** Rounds to cents, so sums of prices never show floating-point noise. */
const cents = (n: number) => Math.round(n * 100) / 100;

/** Price of one print in USD [Gap G5, D-048]. Frame finish never changes the price [Res #42]. */
export function priceOf(id: PrintSizeId, material: MaterialId): number {
  const base = printSize(id).basePrice;
  if (material === "framed") {
    const m = materials.framed;
    return cents(base * m.baseMultiplier + m.framedFlat + m.framedPerPerimeterInch * framedPerimeterInches(id));
  }
  return cents(base * materials[material].baseMultiplier);
}

/** Frame choice applies to framed prints only [Gap G28]. Returns the frame to record for a choice. */
export function frameFor(material: MaterialId, finish: FrameFinish | null): FrameFinish | null {
  if (material !== "framed") return null;
  return finish ?? frameFinishes[0];
}

/** Subtotal of line prices plus the flat shipping estimate; no tax [Gap G5, Res #14]. Shipping applies only to a non-empty bag. */
export function totalsOf(prices: readonly number[]): { subtotal: number; shipping: number; total: number } {
  const subtotal = cents(prices.reduce((s, p) => s + p, 0));
  const shipping = prices.length ? shippingFlat : 0;
  return { subtotal, shipping, total: cents(subtotal + shipping) };
}

/** USD for display, always with cents, so $39.00 and $62.40 line up in a list. */
export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}
