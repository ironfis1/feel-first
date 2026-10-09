import { describe, expect, it } from "vitest";
import { sortById, type Work } from "@/lib/catalog";

// Medium tier (docs/test-tiers.md). Ascending id is catalog order [Res #23, D-008].

const work = (id: string, title = id) => ({ id, title }) as Work;
const ids = (list: Work[]) => list.map((w) => w.id);

describe("sortById", () => {
  it("compares ids as plain strings, not numbers or by locale", () => {
    expect(ids(sortById([work("9"), work("10")]))).toEqual(["10", "9"]);
    expect(ids(sortById([work("b"), work("B"), work("a")]))).toEqual(["B", "a", "b"]);
    expect(ids(sortById([work("é"), work("f")]))).toEqual(["f", "é"]);
  });

  it("sorts any input order into ascending order", () => {
    expect(ids(sortById([work("c"), work("b"), work("a")]))).toEqual(["a", "b", "c"]);
    expect(ids(sortById([work("b"), work("c"), work("a")]))).toEqual(["a", "b", "c"]);
    expect(ids(sortById([work("a"), work("b"), work("c")]))).toEqual(["a", "b", "c"]);
  });

  it("returns a new array and leaves the input untouched", () => {
    const input = [work("b"), work("a")];
    const output = sortById(input);
    expect(output).not.toBe(input);
    expect(ids(input)).toEqual(["b", "a"]);
    expect(output[0]).toBe(input[1]);
  });

  it("handles empty and single-work lists", () => {
    expect(sortById([])).toEqual([]);
    expect(ids(sortById([work("a")]))).toEqual(["a"]);
  });

  it("keeps the input order of works with equal ids", () => {
    const sorted = sortById([work("b", "first"), work("a"), work("b", "second")]);
    expect(sorted.map((w) => w.title)).toEqual(["a", "first", "second"]);
  });
});
