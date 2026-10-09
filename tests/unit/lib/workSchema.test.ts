import { describe, expect, it } from "vitest";
import { emotionTags, subjects, workSchema } from "@/lib/schemas";
import { validWork } from "../../fixtures/works";

// High tier (docs/test-tiers.md). Spec Section 3.2, Gap G2, D-008, D-016.

const accepts = (overrides: Parameters<typeof validWork>[0]) => workSchema.safeParse(validWork(overrides)).success;

const fields = Object.keys(validWork());
const textFields = ["id", "title", "artist", "date", "source", "sourceId", "license"];

describe("workSchema", () => {
  it("accepts a complete, valid work", () => {
    expect(accepts({})).toBe(true);
  });

  it.each(fields)("rejects a work missing %s", (field) => {
    const work = validWork();
    delete work[field];
    expect(workSchema.safeParse(work).success).toBe(false);
  });

  it.each(textFields)("rejects an empty %s", (field) => {
    expect(accepts({ [field]: "" })).toBe(false);
  });

  it("rejects a field outside the Section 3.2 list [D-016]", () => {
    expect(workSchema.safeParse({ ...validWork(), artst: "typo" }).success).toBe(false);
  });

  describe("lane and orientation", () => {
    it("accepts both lanes and rejects anything else", () => {
      expect(accepts({ lane: "poster" })).toBe(true);
      expect(accepts({ lane: "fine-art" })).toBe(true);
      expect(accepts({ lane: "posters" })).toBe(false);
    });

    it("rejects an orientation outside the three values", () => {
      expect(accepts({ orientation: "wide" })).toBe(false);
    });

    it.each([
      [2000, 1500, "landscape"],
      [1500, 2000, "portrait"],
      [1800, 1800, "square"],
    ])("accepts %i x %i as %s", (width, height, orientation) => {
      expect(accepts({ width, height, orientation })).toBe(true);
    });

    it.each([
      [2000, 1500, "portrait"],
      [1500, 2000, "landscape"],
      [1800, 1800, "landscape"],
      [1801, 1800, "square"],
    ])("rejects %i x %i labeled %s [D-016]", (width, height, orientation) => {
      const result = workSchema.safeParse(validWork({ width, height, orientation }));
      expect(result.error?.issues.map((i) => i.path)).toEqual([["orientation"]]);
    });
  });

  describe("mood coordinates [Gap G3]", () => {
    it.each(["valence", "arousal"])("%s accepts the field edges -1 and 1", (axis) => {
      expect(accepts({ [axis]: -1 })).toBe(true);
      expect(accepts({ [axis]: 1 })).toBe(true);
    });

    it.each(["valence", "arousal"])("%s rejects values just outside the field, and NaN", (axis) => {
      expect(accepts({ [axis]: -1.0001 })).toBe(false);
      expect(accepts({ [axis]: 1.0001 })).toBe(false);
      expect(accepts({ [axis]: Number.NaN })).toBe(false);
    });
  });

  describe("tags [Gap G1]", () => {
    it("accepts 3, 4 or 5 tags", () => {
      expect(accepts({ tags: ["joyful", "awe", "tense"] })).toBe(true);
      expect(accepts({ tags: ["joyful", "awe", "tense", "defiant"] })).toBe(true);
      expect(accepts({ tags: ["joyful", "awe", "tense", "defiant", "serene"] })).toBe(true);
    });

    it("rejects 2 or 6 tags", () => {
      expect(accepts({ tags: ["joyful", "awe"] })).toBe(false);
      expect(accepts({ tags: ["joyful", "awe", "tense", "defiant", "serene", "tender"] })).toBe(false);
    });

    it("accepts every word in the fixed vocabulary", () => {
      for (let i = 0; i < emotionTags.length; i += 3) {
        expect(accepts({ tags: emotionTags.slice(i, i + 3) })).toBe(true);
      }
    });

    it("rejects a word outside the vocabulary", () => {
      expect(accepts({ tags: ["joyful", "awe", "happy"] })).toBe(false);
    });

    it("rejects repeated tags [D-016]", () => {
      expect(accepts({ tags: ["serene", "serene", "awe"] })).toBe(false);
    });
  });

  describe("palette", () => {
    const five = (first: string) => [first, "#445566", "#778899", "#aabbcc", "#ddeeff"];

    it("requires exactly 5 colors", () => {
      expect(accepts({ palette: five("#112233").slice(0, 4) })).toBe(false);
      expect(accepts({ palette: [...five("#112233"), "#000000"] })).toBe(false);
    });

    it.each(["#abc", "#ABCDEF", "#a1B2c3"])("accepts the hex color %s", (color) => {
      expect(accepts({ palette: five(color) })).toBe(true);
    });

    it.each(["abcdef", "#abcd", "#abcdef12", "#ggg000", " #abcdef"])("rejects %s", (color) => {
      expect(accepts({ palette: five(color) })).toBe(false);
    });
  });

  describe("subject [Gap G1]", () => {
    it.each(subjects)("accepts %s", (subject) => {
      expect(accepts({ subject })).toBe(true);
    });

    it("rejects a subject outside the list", () => {
      expect(accepts({ subject: "portrait" })).toBe(false);
    });
  });

  describe("dimensions", () => {
    it.each(["width", "height"])("%s rejects zero, negatives and text", (field) => {
      expect(accepts({ [field]: 0 })).toBe(false);
      expect(accepts({ [field]: -1 })).toBe(false);
      expect(accepts({ [field]: "2000" })).toBe(false);
    });
  });

  describe("image locations [D-001]", () => {
    it("requires imageUrl to be a URL", () => {
      expect(accepts({ imageUrl: "not a url" })).toBe(false);
    });

    it("requires thumbUrl to be a local path starting with / [D-016]", () => {
      expect(accepts({ thumbUrl: "/thumbs/a.jpg" })).toBe(true);
      expect(accepts({ thumbUrl: "thumbs/a.jpg" })).toBe(false);
      expect(accepts({ thumbUrl: "https://example.org/a.jpg" })).toBe(false);
      expect(accepts({ thumbUrl: "/" })).toBe(false);
    });
  });
});
