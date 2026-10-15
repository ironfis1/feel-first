import { describe, expect, it } from "vitest";
import { frameFinishes, materials, printSizes, shippingFlat, type MaterialId, type PrintSizeId } from "@/config/feel";
import { addLine, bagTotals, lineKey, removeLine, type BagLine } from "@/lib/bag";
import { formatPrice, frameFor, framedOuterInches, framedPerimeterInches, priceOf, printSize, totalsOf } from "@/lib/pricing";

// High tier (docs/test-tiers.md): framedOuterInches, framedPerimeterInches, priceOf, totalsOf.
// Medium: printSize, frameFor, formatPrice, lineKey, addLine, removeLine, bagTotals.
// Functional gates: pricing for every combination against spec Section 3.6 and D-048; bag line identity, removal and totals [Gap G20].

/** Spec Section 3.6 with D-048, worked by hand: framed is base + $60 + $1.50 per inch of outer frame perimeter. */
const table: Record<PrintSizeId, Record<MaterialId, number>> = {
  "12x16": { paper: 39, canvas: 62.4, framed: 222 },
  "18x24": { paper: 69, canvas: 110.4, framed: 294 },
  "24x36": { paper: 119, canvas: 190.4, framed: 398 },
  "30x40": { paper: 179, canvas: 286.4, framed: 488 },
};
const sizeIds = printSizes.map((s) => s.id);
const materialIds = Object.keys(materials) as MaterialId[];

describe("printSize", () => {
  it("returns each configured size and throws on an unknown one", () => {
    for (const s of printSizes) expect(printSize(s.id)).toBe(s);
    expect(() => printSize("10x10" as PrintSizeId)).toThrow("unknown print size 10x10");
  });
});

describe("framed outer size and perimeter [Res #41, Gap G28, D-048]", () => {
  it("adds the 2-inch mat and 1.25-inch frame on every side, without turning the size", () => {
    expect(framedOuterInches("12x16")).toEqual({ width: 18.5, height: 22.5 });
    expect(framedOuterInches("18x24")).toEqual({ width: 24.5, height: 30.5 });
    expect(framedOuterInches("24x36")).toEqual({ width: 30.5, height: 42.5 });
    expect(framedOuterInches("30x40")).toEqual({ width: 36.5, height: 46.5 });
  });

  it("measures the perimeter as twice width plus height", () => {
    expect(framedPerimeterInches("12x16")).toBe(82);
    expect(framedPerimeterInches("18x24")).toBe(110);
    expect(framedPerimeterInches("24x36")).toBe(146);
    expect(framedPerimeterInches("30x40")).toBe(166);
  });

  it("throws on an unknown size", () => {
    expect(() => framedOuterInches("1x1" as PrintSizeId)).toThrow("unknown print size");
  });
});

describe("priceOf: every size and material against Section 3.6 [Gap G5, D-048]", () => {
  for (const size of sizeIds) {
    for (const material of materialIds) {
      it(`${size} ${material} is $${table[size][material]}`, () => {
        expect(priceOf(size, material)).toBe(table[size][material]);
      });
    }
  }

  it("has no floating-point noise in canvas prices", () => {
    expect(String(priceOf("12x16", "canvas"))).toBe("62.4");
  });

  it("throws on an unknown size", () => {
    expect(() => priceOf("9x9" as PrintSizeId, "paper")).toThrow("unknown print size");
  });
});

describe("frameFor [Gap G28, Res #42]", () => {
  it("records no frame for paper or canvas, even when a finish is passed", () => {
    expect(frameFor("paper", "brass")).toBeNull();
    expect(frameFor("canvas", "white")).toBeNull();
  });

  it("keeps a framed print's finish, defaulting to the first finish", () => {
    expect(frameFor("framed", "natural oak")).toBe("natural oak");
    expect(frameFor("framed", null)).toBe(frameFinishes[0]);
  });
});

describe("totalsOf [Gap G5, Res #14]", () => {
  it("is all zero for an empty bag, with no shipping", () => {
    expect(totalsOf([])).toEqual({ subtotal: 0, shipping: 0, total: 0 });
  });

  it("adds flat shipping once, not per line", () => {
    expect(totalsOf([39])).toEqual({ subtotal: 39, shipping: shippingFlat, total: 48.95 });
    expect(totalsOf([39, 69, 222])).toEqual({ subtotal: 330, shipping: 9.95, total: 339.95 });
  });

  it("sums to whole cents with no float noise", () => {
    expect(totalsOf([0.1, 0.2])).toEqual({ subtotal: 0.3, shipping: 9.95, total: 10.25 });
    expect(totalsOf([62.4, 110.4, 190.4])).toEqual({ subtotal: 363.2, shipping: 9.95, total: 373.15 });
  });
});

describe("formatPrice [D-053]", () => {
  it("always shows dollars and cents", () => {
    expect(formatPrice(39)).toBe("$39.00");
    expect(formatPrice(62.4)).toBe("$62.40");
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("uses no thousands separator and rounds as toFixed does (pins)", () => {
    expect(formatPrice(1234.5)).toBe("$1234.50");
    expect(formatPrice(1.005)).toBe("$1.00");
  });
});

describe("bag lines [Gap G20, spec Section 3.8]", () => {
  const choice = { workId: "w-0001", size: "18x24" as const, material: "framed" as const, frame: "black" as const };

  it("adds a line with its key and price, returning a new array", () => {
    const empty: BagLine[] = [];
    const bag = addLine(empty, choice);
    expect(empty).toEqual([]);
    expect(bag).toEqual([{ ...choice, key: "w-0001|18x24|framed|black", price: 294 }]);
  });

  it("keeps one line when the same combination is added twice (quantity is fixed at 1)", () => {
    const bag = addLine([], choice);
    const again = addLine(bag, choice);
    expect(again).toEqual(bag);
    expect(again).not.toBe(bag);
  });

  it("adds a separate line for a different size, material or frame", () => {
    let bag = addLine([], choice);
    bag = addLine(bag, { ...choice, size: "12x16" });
    bag = addLine(bag, { ...choice, material: "canvas", frame: null });
    bag = addLine(bag, { ...choice, frame: "brass" });
    bag = addLine(bag, { ...choice, workId: "w-0002" });
    expect(bag).toHaveLength(5);
    expect(new Set(bag.map((l) => l.key)).size).toBe(5);
  });

  it("ignores a frame on paper, and stores the first finish for a framed print with none", () => {
    expect(lineKey({ ...choice, material: "paper", frame: "black" })).toBe(lineKey({ ...choice, material: "paper", frame: null }));
    expect(lineKey({ ...choice, material: "paper", frame: null })).toBe("w-0001|18x24|paper|none");
    const bag = addLine([], { ...choice, frame: null });
    expect(bag[0].frame).toBe(frameFinishes[0]);
    expect(bag[0].key).toBe(lineKey({ ...choice, frame: frameFinishes[0] }));
    expect(addLine([], { ...choice, material: "canvas", frame: "white" })[0]).toMatchObject({ frame: null, price: 110.4 });
  });

  it("removes exactly the given line and keeps the order of the rest", () => {
    const bag = [choice, { ...choice, size: "12x16" as const }, { ...choice, size: "30x40" as const }].reduce<BagLine[]>((b, c) => addLine(b, c), []);
    expect(removeLine(bag, bag[1].key).map((l) => l.size)).toEqual(["18x24", "30x40"]);
    expect(removeLine(bag, "no such key")).toEqual(bag);
    expect(removeLine([], "x")).toEqual([]);
  });

  it("totals the line prices as stored, plus flat shipping", () => {
    const bag = [choice, { ...choice, material: "paper" as const }, { ...choice, workId: "w-9", size: "12x16" as const, material: "canvas" as const }].reduce<BagLine[]>(
      (b, c) => addLine(b, c),
      [],
    );
    expect(bagTotals(bag)).toEqual({ subtotal: 425.4, shipping: 9.95, total: 435.35 });
    expect(bagTotals([{ ...bag[0], price: 1 }])).toEqual({ subtotal: 1, shipping: 9.95, total: 10.95 });
    expect(bagTotals([])).toEqual({ subtotal: 0, shipping: 0, total: 0 });
  });
});
