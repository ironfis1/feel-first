import { describe, expect, it } from "vitest";
import { bannedTerms, findingProblems, numberWords } from "../../../scripts/lib/j8-rules.ts";

// High tier (docs/test-tiers.md): findingProblems [Res #38, Res #47, Res #53, D-036].

const emDash = String.fromCharCode(0x2014);
const figures = { lift: 2.6, pickRatePct: 18.4, perSessions: 1000, totalSessions: 20000 };

describe("findingProblems", () => {
  it("passes a clean sentence that cites only figures", () => {
    expect(findingProblems("Picked at 18.4 percent, or 2.6 times the average, across 20000 sessions.", figures)).toEqual([]);
  });

  it("returns exactly ['empty'] for empty or blank text", () => {
    expect(findingProblems("", figures)).toEqual(["empty"]);
    expect(findingProblems("  \n ", figures)).toEqual(["empty"]);
  });

  it("flags an em dash and an exclamation point", () => {
    expect(findingProblems(`Calm rooms ${emDash} quiet ones.`, figures)).toEqual(["em dash"]);
    expect(findingProblems("Calm rooms sell!", figures)).toEqual(["exclamation point"]);
  });

  it("catches every banned term whole-word", () => {
    const withSixty = { ...figures, slot: 60 };
    for (const term of bannedTerms) {
      expect(findingProblems(`Think about ${term} here.`, withSixty)).toEqual([`banned term "${term}"`]);
    }
  });

  it("matches banned terms case-insensitively and only as whole words", () => {
    expect(findingProblems("Rights matter here.", figures)).toEqual(['banned term "Rights"']);
    expect(findingProblems("The copyrights expired.", figures)).toEqual([]);
    expect(findingProblems("Under these terms it sells.", figures)).toEqual(['banned term "terms"']);
    expect(findingProblems("A slotted rack.", figures)).toEqual([]);
  });

  it("catches a banned term or number word joined by a hyphen", () => {
    expect(findingProblems("A non-exclusive deal.", figures)).toEqual(['banned term "exclusive"']);
    expect(findingProblems("The rights-holder agrees.", figures)).toEqual(['banned term "rights"']);
    expect(findingProblems("Up twenty-five points.", figures)).toEqual(['number written as a word "twenty"']);
    expect(findingProblems("About two-thirds framed.", figures)).toEqual(['number written as a word "two"']);
  });

  it("accepts figure values, with or without thousands separators", () => {
    expect(findingProblems("Per 1,000 sessions.", figures)).toEqual([]);
    expect(findingProblems("Per 1000 sessions.", figures)).toEqual([]);
    expect(findingProblems("At 18.4 percent.", figures)).toEqual([]);
  });

  it("rejects numbers that are not figures, rounding slips and years included", () => {
    expect(findingProblems("At 18.5 percent.", figures)).toEqual(["numbers not in the figures: 18.5"]);
    expect(findingProblems("Since 1936, at 7 and 18.4 and 9 percent.", figures)).toEqual(["numbers not in the figures: 1936, 7, 9"]);
    expect(findingProblems("Since 1936.", { ...figures, year: 1936 })).toEqual([]);
  });

  it("reads mid-1990s as 1990 and a leading minus as negative", () => {
    expect(findingProblems("Posters from the mid-1990s sell.", figures)).toEqual(["numbers not in the figures: 1990"]);
    expect(findingProblems("Posters from the mid-1990s sell.", { ...figures, year: 1990 })).toEqual([]);
    expect(findingProblems("Down -3 points.", { ...figures, change: 3 })).toEqual(["numbers not in the figures: -3"]);
    expect(findingProblems("Down -3 points.", { ...figures, change: -3 })).toEqual([]);
  });

  it("reads 3,5 as 35 (pin)", () => {
    expect(findingProblems("About 3,5 works.", { ...figures, works: 35 })).toEqual([]);
  });

  it("rejects numbers written as words, except one", () => {
    for (const word of numberWords) {
      expect(findingProblems(`It sold ${word} times.`, figures)).toEqual([`number written as a word "${word}"`]);
    }
    expect(findingProblems("Three segments lead.", figures)).toEqual(['number written as a word "Three"']);
    expect(findingProblems("One segment leads, with one rack.", figures)).toEqual([]);
    expect(findingProblems("Tenth place, often, and halftone prints.", figures)).toEqual([]);
  });

  it("allows capitals at a sentence start and in room names, and lists others once", () => {
    expect(findingProblems("In the Low Light segment. Bright works sell.", figures)).toEqual([]);
    expect(findingProblems("Shoppers in Morning Light and Full Sun pick posters.", figures)).toEqual([]);
    expect(findingProblems("Works by Hopper and Hopper sell, as does Turner.", figures)).toEqual([
      "capitalized words that may be names: Hopper, Turner",
    ]);
  });

  it("lists every problem in rule order", () => {
    const text = `Under these terms ${emDash} three works sold 99 times to Hopper!`;
    expect(findingProblems(text, figures)).toEqual([
      "em dash",
      "exclamation point",
      'banned term "terms"',
      "numbers not in the figures: 99",
      'number written as a word "three"',
      "capitalized words that may be names: Hopper",
    ]);
  });
});
