import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describePlaceholder } from "@/config/feel";
import { inventedHeard, j2OutputSchema, maxHeard } from "@/lib/j2";
import { j2WordmapFileSchema } from "@/lib/schemas";
import { interpretWords, wordsOf, type WordMap } from "@/lib/wordmap";

// High tier (docs/test-tiers.md): wordsOf, interpretWords.
// Functional gate: the word-map interpreter, including the agreed no-match case, returning the J2 output shape [Gap G9, D-028, D-052].

const root = path.resolve(import.meta.dirname, "../../..");

const map: WordMap = {
  words: { calm: { valence: 0.4, arousal: -0.6 }, rainy: { valence: -0.3, arousal: -0.2 }, bright: { valence: 0.8, arousal: 0.2 }, "don't": { valence: -0.1, arousal: 0 } },
  roomTypes: { bedroom: "bedroom", office: "office" },
  sizes: { large: "large", small: "small" },
};

describe("wordsOf", () => {
  it("lowercases, trims and splits on anything that is not a letter, digit or apostrophe", () => {
    expect(wordsOf("  A Slow, Sunday-morning!  ")).toEqual(["a", "slow", "sunday", "morning"]);
    expect(wordsOf("room 42\tnow")).toEqual(["room", "42", "now"]);
  });

  it("straightens curly apostrophes and keeps accented letters", () => {
    expect(wordsOf("Don’t café")).toEqual(["don't", "café"]);
  });

  it("gives [] for empty or punctuation-only text", () => {
    expect(wordsOf("")).toEqual([]);
    expect(wordsOf(" ... , !")).toEqual([]);
  });

  it("splits the way the J2 heard check does: every word it returns passes inventedHeard", () => {
    const text = "Rainy, rainy NIGHT’s end... at 3am";
    expect(inventedHeard(wordsOf(text), text)).toEqual([]);
  });
});

describe("interpretWords [D-052]", () => {
  it("returns null when no mood word matches: empty text, unknown words, or only room and size words", () => {
    expect(interpretWords("", map)).toBeNull();
    expect(interpretWords("sunday coffee", map)).toBeNull();
    expect(interpretWords("a large print for the bedroom", map)).toBeNull();
  });

  it("does not match object prototype names", () => {
    expect(interpretWords("constructor toString __proto__ hasOwnProperty", map)).toBeNull();
    expect(interpretWords("constructor")).toBeNull();
  });

  it("averages the distinct mood words, counting a repeated word once", () => {
    const r = interpretWords("calm rainy calm calm", map)!;
    expect(r.valence).toBeCloseTo(0.05, 12);
    expect(r.arousal).toBeCloseTo(-0.4, 12);
    expect(interpretWords("Calm.", map)).toEqual({ valence: 0.4, arousal: -0.6, roomType: null, size: null, heard: ["calm"] });
  });

  it("takes the room type and size from the first such word", () => {
    const r = interpretWords("calm office, small; bedroom large", map)!;
    expect(r.roomType).toBe("office");
    expect(r.size).toBe("small");
  });

  it("hears only matched words, in the order typed, at most five", () => {
    expect(interpretWords("bedroom so calm and bright", map)!.heard).toEqual(["bedroom", "calm", "bright"]);
    expect(interpretWords("a large calm", map)!.heard).toEqual(["large", "calm"]);
    const many = interpretWords("calm rainy bright don't bedroom large", map)!;
    expect(many.heard).toHaveLength(maxHeard);
    expect(many.heard).toEqual(["calm", "rainy", "bright", "don't", "bedroom"]);
  });

  it("reads case, punctuation and curly apostrophes", () => {
    expect(interpretWords("DON’T!", map)!.heard).toEqual(["don't"]);
  });

  it("returns a valid J2 output whose heard words are all in the text", () => {
    const text = "Rainy, CALM, bright office; large";
    const r = interpretWords(text, map)!;
    expect(j2OutputSchema.safeParse(r).success).toBe(true);
    expect(inventedHeard(r.heard, text)).toEqual([]);
  });

  it("reads the describe box placeholder, the demo video phrase, as bedroom and large [D-037]", () => {
    const r = interpretWords(describePlaceholder)!;
    expect(r).not.toBeNull();
    expect(r.roomType).toBe("bedroom");
    expect(r.size).toBe("large");
    expect(j2OutputSchema.safeParse(r).success).toBe(true);
  });

  it("reads the committed word map by default", () => {
    const file = j2WordmapFileSchema.parse(JSON.parse(readFileSync(path.join(root, "data/j2-wordmap.json"), "utf8")));
    const word = Object.keys(file.words)[0];
    expect(interpretWords(word)).toEqual({ ...file.words[word], roomType: null, size: null, heard: [word] });
  });
});
