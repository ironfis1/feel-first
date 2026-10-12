import { describe, expect, it } from "vitest";
import { emotionTags, j1FieldsSchema, subjects, withoutJ1 } from "@/lib/schemas";
import { validWork } from "../../fixtures/works";

// High tier for j1FieldsSchema, Medium for withoutJ1 (docs/test-tiers.md). Spec Section 3.2, Gap G1.

const fields = {
  valence: 0.2,
  arousal: -0.4,
  tags: ["serene", "tender", "awe"],
  palette: ["#112233", "#445566", "#778899", "#aabbcc", "#ddeeff"],
  subject: "landscape",
};
const accepts = (overrides: Record<string, unknown>) => j1FieldsSchema.safeParse({ ...fields, ...overrides }).success;
const paths = (overrides: Record<string, unknown>) =>
  j1FieldsSchema.safeParse({ ...fields, ...overrides }).error?.issues.map((i) => i.path.join(".")) ?? [];

describe("j1FieldsSchema", () => {
  it("accepts a valid set of fields", () => {
    expect(paths({})).toEqual([]);
  });

  it.each(Object.keys(fields))("rejects fields missing %s", (key) => {
    const input: Record<string, unknown> = { ...fields };
    delete input[key];
    expect(j1FieldsSchema.safeParse(input).error?.issues.map((i) => i.path.join("."))).toEqual([key]);
  });

  it("rejects an extra key", () => {
    expect(accepts({ mood: "calm" })).toBe(false);
  });

  it.each(["valence", "arousal"])("bounds %s to -1 through 1 inclusive", (axis) => {
    expect(accepts({ [axis]: -1 })).toBe(true);
    expect(accepts({ [axis]: 1 })).toBe(true);
    expect(paths({ [axis]: 1.0001 })).toEqual([axis]);
    expect(paths({ [axis]: -1.0001 })).toEqual([axis]);
    expect(paths({ [axis]: Number.NaN })).toEqual([axis]);
    expect(paths({ [axis]: "0.5" })).toEqual([axis]);
  });

  it("takes three to five tags", () => {
    expect(paths({ tags: ["awe", "tense"] })).toEqual(["tags"]);
    expect(accepts({ tags: ["awe", "tense", "serene"] })).toBe(true);
    expect(accepts({ tags: ["awe", "tense", "serene", "joyful", "playful"] })).toBe(true);
    expect(paths({ tags: ["awe", "tense", "serene", "joyful", "playful", "wistful"] })).toEqual(["tags"]);
  });

  it("rejects duplicate tags with the uniqueness message", () => {
    expect(j1FieldsSchema.safeParse({ ...fields, tags: ["awe", "serene", "awe"] }).error?.issues.map((i) => i.message)).toEqual(["tags must be unique"]);
  });

  it("accepts every tag and subject in the fixed lists and nothing else", () => {
    expect(emotionTags).toHaveLength(12);
    expect(subjects).toHaveLength(12);
    for (let i = 0; i < emotionTags.length; i += 3) expect(accepts({ tags: emotionTags.slice(i, i + 3) })).toBe(true);
    for (const subject of subjects) expect(accepts({ subject })).toBe(true);
    expect(paths({ tags: ["awe", "tense", "Serene"] })).toEqual(["tags.2"]);
    expect(paths({ subject: "portrait" })).toEqual(["subject"]);
  });

  it("takes exactly five colors", () => {
    expect(paths({ palette: fields.palette.slice(0, 4) })).toEqual(["palette"]);
    expect(paths({ palette: [...fields.palette, "#000000"] })).toEqual(["palette"]);
  });

  it.each(["#abc", "#aabbcc", "#ABC", "#A1b2C3"])("accepts the color %s", (color) => {
    expect(accepts({ palette: [color, "#000", "#000", "#000", "#000"] })).toBe(true);
  });

  it.each(["red", "#abcd", "#gggggg", "abc", "#aabbcc0", " #abc"])("rejects the color %j", (color) => {
    expect(paths({ palette: ["#000", "#000", color, "#000", "#000"] })).toEqual(["palette.2"]);
  });

});

describe("withoutJ1", () => {
  const work = validWork();
  const metadataKeys = Object.keys(work).filter((k) => !(k in fields));

  it("removes the five J1 keys and keeps every other key", () => {
    const [stripped] = withoutJ1([work]) as Record<string, unknown>[];
    expect(Object.keys(stripped)).toEqual(metadataKeys);
    expect(stripped).toEqual(Object.fromEntries(metadataKeys.map((k) => [k, work[k]])));
  });

  it("leaves a metadata-only catalog unchanged", () => {
    const metadata = [Object.fromEntries(metadataKeys.map((k) => [k, work[k]]))];
    expect(withoutJ1(metadata)).toEqual(metadata);
  });

  it("returns a non-array input as is", () => {
    const input = { works: [work] };
    expect(withoutJ1(input)).toBe(input);
    expect(withoutJ1(null)).toBe(null);
  });

  it("does not change the input", () => {
    const input = [validWork()];
    withoutJ1(input);
    expect(input).toEqual([validWork()]);
  });

  it("throws on a null element (pin: there is no guard)", () => {
    expect(() => withoutJ1([null])).toThrow(TypeError);
  });
});
