import { describe, expect, it } from "vitest";
import {
  allowedNames,
  bannedPhrases,
  lineProblems,
  maxLineWords,
  midSentenceCapitals,
  sentenceCount,
  sitterNames,
} from "../../../scripts/lib/j4-rules.ts";

// High tier (docs/test-tiers.md): midSentenceCapitals and lineProblems. Medium: sentenceCount, allowedNames, sitterNames.
// The rules every J4 line must pass [spec Section 4 J4, D-033, D-034]. Pure functions; no files or network.

const emDash = String.fromCharCode(0x2014);
const words = (n: number) => Array(n).fill("calm").join(" ");
const seascape = { title: "Harbor at Dusk", artist: "Jan Toorop", subject: "seascape" };
const portrait = { title: "Portrait of Madame Roulin", artist: "Vincent van Gogh", subject: "figure" };

describe("sentenceCount", () => {
  it("counts one, two and three sentences", () => {
    expect(sentenceCount("Calm water.")).toBe(1);
    expect(sentenceCount("Calm water. Low sky.")).toBe(2);
    expect(sentenceCount("Calm water. Low sky. Grey sand.")).toBe(3);
  });

  it("ends a sentence at ., ? and !", () => {
    expect(sentenceCount("Calm? Low! Grey.")).toBe(3);
  });

  it("splits after a closing quote or parenthesis that follows the terminator", () => {
    expect(sentenceCount('He said "go." Then left.')).toBe(2);
    expect(sentenceCount("He said “go.” Then left.")).toBe(2);
    expect(sentenceCount("He said 'go.' Then left.")).toBe(2);
    expect(sentenceCount("He said ‘go.’ Then left.")).toBe(2);
    expect(sentenceCount("He said (go.) Then left.")).toBe(2);
  });

  it("counts a line with no closing punctuation as one sentence", () => {
    expect(sentenceCount("Calm water")).toBe(1);
  });

  it("gives 0 for an empty or whitespace-only line", () => {
    expect(sentenceCount("")).toBe(0);
    expect(sentenceCount("   ")).toBe(0);
  });

  it("ignores leading and trailing whitespace and runs of spaces", () => {
    expect(sentenceCount("  One.  Two.   ")).toBe(2);
  });

  it("needs whitespace after the terminator, so a decimal or a run-on does not split", () => {
    expect(sentenceCount("It costs 3.5 dollars.")).toBe(1);
    expect(sentenceCount("One.Two.")).toBe(1);
  });

  it("splits at an abbreviation (pin: St. Louis counts as two)", () => {
    expect(sentenceCount("St. Louis is far.")).toBe(2);
  });
});

describe("midSentenceCapitals", () => {
  it("does not return the first word of the line", () => {
    expect(midSentenceCapitals("Water at rest")).toEqual([]);
    expect(midSentenceCapitals('"Water at rest')).toEqual([]);
  });

  it("treats a word after ., ? or ! as a new sentence", () => {
    expect(midSentenceCapitals("Calm. Water? Rest! Sky")).toEqual([]);
  });

  it("treats a word after a colon as a new sentence", () => {
    expect(midSentenceCapitals("Look: Water here")).toEqual([]);
  });

  it("treats a word after a terminator and any closing quote or bracket as a new sentence", () => {
    expect(midSentenceCapitals('He said "go." Then left')).toEqual([]);
    expect(midSentenceCapitals("He said “go.” Then left")).toEqual([]);
    expect(midSentenceCapitals("He said 'go.' Then left")).toEqual([]);
    expect(midSentenceCapitals("He said ‘go.’ Then left")).toEqual([]);
    expect(midSentenceCapitals("He left (at dawn.) Then rain")).toEqual([]);
    expect(midSentenceCapitals("He said “go” Then left")).toEqual(["Then"]);
  });

  it("never returns a quote mark as a word", () => {
    expect(midSentenceCapitals("a ' b ’ Then")).toEqual(["Then"]);
  });

  it("treats a word after a terminator and an opening quote or parenthesis as a new sentence", () => {
    expect(midSentenceCapitals('It is. "Quoted')).toEqual([]);
    expect(midSentenceCapitals("It is. “Quoted")).toEqual([]);
    expect(midSentenceCapitals("It is. ‘Quoted")).toEqual([]);
    expect(midSentenceCapitals("It is. (Paren")).toEqual([]);
  });

  it("returns a capital in the middle of a sentence", () => {
    expect(midSentenceCapitals("the water near Venice")).toEqual(["Venice"]);
  });

  it("returns a capital directly after a comma", () => {
    expect(midSentenceCapitals("calm, Venice")).toEqual(["Venice"]);
  });

  it("strips a possessive with either apostrophe", () => {
    expect(midSentenceCapitals("the Monet's light")).toEqual(["Monet"]);
    expect(midSentenceCapitals("the Monet’s light")).toEqual(["Monet"]);
  });

  it("keeps hyphenated and apostrophe words whole", () => {
    expect(midSentenceCapitals("a Self-Portrait here")).toEqual(["Self-Portrait"]);
    expect(midSentenceCapitals("we Don't stop")).toEqual(["Don't"]);
  });

  it("flags a lone I mid-sentence (pin)", () => {
    expect(midSentenceCapitals("Here I stand")).toEqual(["I"]);
  });

  it("does not return digits or lowercase words", () => {
    expect(midSentenceCapitals("light in 1888 on water")).toEqual([]);
  });

  it("returns several capitals in order, with duplicates", () => {
    expect(midSentenceCapitals("a Bob b Cy c Bob")).toEqual(["Bob", "Cy", "Bob"]);
  });

  it("gives [] for an empty string", () => {
    expect(midSentenceCapitals("")).toEqual([]);
  });

  it("does not start a sentence inside a decimal", () => {
    expect(midSentenceCapitals("costs 3.5 Dollars")).toEqual(["Dollars"]);
  });

  it("starts a new sentence only at the word right after the terminator", () => {
    expect(midSentenceCapitals("Calm. Water near Venice")).toEqual(["Venice"]);
  });

  it("keeps the sentence going when a comma follows the terminator", () => {
    expect(midSentenceCapitals("calm., Venice")).toEqual(["Venice"]);
  });

  it("starts a sentence after a terminator with no space before the next word (pin)", () => {
    expect(midSentenceCapitals("calm.Venice")).toEqual([]);
  });

  it("starts a sentence when a space separates the opening quote from the word", () => {
    expect(midSentenceCapitals('It is. " Quoted')).toEqual([]);
  });

  it("strips a possessive only at the end of a word", () => {
    expect(midSentenceCapitals("the D'souza house")).toEqual(["D'souza"]);
  });

  it("looks only at a word's first letter", () => {
    expect(midSentenceCapitals("an eBay price")).toEqual([]);
  });
});

describe("allowedNames", () => {
  const work = { title: "Mona Lisa’s Self-Portrait 1888", artist: "Van Gogh's", subject: "landscape" };

  it("includes artist and title words, lowercased, for a non-figure work", () => {
    expect(allowedNames(work)).toEqual(new Set(["van", "gogh", "mona", "lisa", "self-portrait", "1888"]));
  });

  it("includes only the artist for a figure work [D-033]", () => {
    expect(allowedNames({ ...work, subject: "figure" })).toEqual(new Set(["van", "gogh"]));
  });

  it("keeps an 's inside a name", () => {
    expect(allowedNames({ title: "Harbor", artist: "Ana D'souza", subject: "landscape" })).toEqual(new Set(["ana", "d'souza", "harbor"]));
  });
});

describe("sitterNames", () => {
  it("is empty for a non-figure work", () => {
    expect(sitterNames({ ...portrait, subject: "landscape" })).toEqual(new Set());
  });

  it("excludes the artist's name, in any case", () => {
    expect(sitterNames({ title: "Portrait of Madame Cezanne", artist: "Paul Cezanne", subject: "figure" })).toEqual(new Set(["Madame"]));
    expect(sitterNames({ title: "Madame CEZANNE", artist: "Paul Cezanne", subject: "figure" })).toEqual(new Set(["Madame"]));
  });

  it("returns the capitalized title words that name the sitter", () => {
    expect(sitterNames({ title: "Portrait of Madame X", artist: "Someone Else", subject: "figure" })).toEqual(new Set(["Madame", "X"]));
  });

  it("excludes describing words in any case, and lowercase words", () => {
    expect(sitterNames({ title: "THE Young Woman With A Fan", artist: "Ann Lee", subject: "figure" })).toEqual(new Set(["Fan"]));
    expect(sitterNames({ title: "Self-Portrait", artist: "Ann Lee", subject: "figure" })).toEqual(new Set());
    expect(sitterNames({ title: "lady with a lute", artist: "Ann Lee", subject: "figure" })).toEqual(new Set());
  });

  it("strips a possessive and keeps the original capitalization", () => {
    expect(sitterNames({ title: "Mona Lisa's Smile", artist: "Leo", subject: "figure" })).toEqual(new Set(["Mona", "Lisa", "Smile"]));
  });

  it.each(["Head Of An Old Man", "Mother And Child", "Bust Of A Gentleman", "Lady In A Study", "Figure Of A Girl", "Boy In An Old Study"])(
    "finds no sitter in the describing title %j",
    (title) => {
      expect(sitterNames({ title, artist: "Ann Lee", subject: "figure" })).toEqual(new Set());
    },
  );

  it("keeps an 's inside a name and ignores a word that is not capitalized first", () => {
    expect(sitterNames({ title: "Portrait of Ana D'souza", artist: "Leo", subject: "figure" })).toEqual(new Set(["Ana", "D'souza"]));
    expect(sitterNames({ title: "Woman with an iPad", artist: "Leo", subject: "figure" })).toEqual(new Set());
  });
});

describe("lineProblems", () => {
  it("gives exactly 'empty line' for an empty or whitespace-only line", () => {
    expect(lineProblems("", seascape)).toEqual(["empty line"]);
    expect(lineProblems(" \n\t ", seascape)).toEqual(["empty line"]);
  });

  it("passes two sentences and rejects three", () => {
    expect(lineProblems("Calm water. Low sky.", seascape)).toEqual([]);
    expect(lineProblems("Calm water. Low sky. Grey sand.", seascape)).toEqual(["more than two sentences"]);
  });

  it("passes 30 words and rejects 31 with the count [D-034]", () => {
    expect(maxLineWords).toBe(30);
    expect(lineProblems(`${words(30)}.`, seascape)).toEqual([]);
    expect(lineProblems(`${words(31)}.`, seascape)).toEqual(["31 words, over 30"]);
  });

  it("counts words after trimming and across runs of whitespace", () => {
    expect(lineProblems(`  ${words(29)}   calm.  `, seascape)).toEqual([]);
  });

  it("flags an em dash and an exclamation point", () => {
    expect(lineProblems(`Calm water${emDash}low sky.`, seascape)).toEqual(["em dash"]);
    expect(lineProblems("Calm water!", seascape)).toEqual(["exclamation point"]);
  });

  it.each(bannedPhrases.filter((p) => p !== "evokes emotion"))("catches the banned phrase %s", (phrase) => {
    expect(lineProblems(`the water ${phrase} the sky.`, seascape)).toEqual([`banned phrase "${phrase}"`]);
    expect(lineProblems(`${phrase.toUpperCase()} water.`, seascape)[0]).toBe(`banned phrase "${phrase.toUpperCase()}"`);
  });

  it("reports 'evokes emotion' as 'evokes', the shorter phrase that matches first (pin)", () => {
    expect(bannedPhrases).toContain("evokes emotion");
    expect(lineProblems("the water evokes emotion here.", seascape)).toEqual(['banned phrase "evokes"']);
  });

  it("holds the full banned list", () => {
    expect(bannedPhrases).toEqual([
      "captivating", "captivates", "evoke", "evokes", "evoked", "evoking", "evocative", "evokes emotion", "stunning",
      "breathtaking", "masterpiece", "timeless", "mesmerizing", "awe-inspiring", "invites you", "speaks to", "resonates",
      "a testament to", "tapestry", "symphony of", "delve", "showcases", "perfect for", "must-have", "elevate", "elevates",
      "a sense of", "truly", "nestled",
    ]);
  });

  it("matches whole words only, with letters and hyphens as word characters", () => {
    expect(lineProblems("revoke the rule.", seascape)).toEqual([]);
    expect(lineProblems("untruly said.", seascape)).toEqual([]);
    expect(lineProblems("re-elevate it.", seascape)).toEqual([]);
    expect(lineProblems("truly-ish calm.", seascape)).toEqual([]);
    expect(lineProblems("a must-haves list.", seascape)).toEqual([]);
    expect(lineProblems("(truly) calm.", seascape)).toEqual(['banned phrase "truly"']);
  });

  it("needs the whole multi-word phrase", () => {
    expect(lineProblems("a sense of calm.", seascape)).toEqual(['banned phrase "a sense of"']);
    expect(lineProblems("sense of calm.", seascape)).toEqual([]);
  });

  it("allows mid-sentence capitals from the artist or a non-figure title", () => {
    expect(lineProblems("The water by Toorop at Dusk is calm.", seascape)).toEqual([]);
    expect(lineProblems("The water near Venice is calm.", seascape)).toEqual(["name not from the artist or title: Venice"]);
  });

  it("rejects figure title words mid-sentence unless they are the artist's [D-033]", () => {
    expect(lineProblems("A quiet face by Van Gogh.", portrait)).toEqual([]);
    expect(lineProblems("The Portrait is quiet.", portrait)).toEqual(["name not from the artist or title: Portrait"]);
  });

  it("rejects a sitter's name anywhere, including the start of a sentence", () => {
    expect(lineProblems("Roulin sits still.", portrait)).toEqual(["names the sitter: Roulin"]);
    expect(lineProblems("Calm. Roulin's hands rest.", portrait)).toEqual(["names the sitter: Roulin"]);
  });

  it("names every sitter word in the line, keeping an 's inside a name", () => {
    const work = { title: "Portrait of Ana D'souza", artist: "Leo Ray", subject: "figure" };
    expect(lineProblems("D'souza sits.", work)).toEqual(["names the sitter: D'souza"]);
    expect(lineProblems("Ana D'souza sits.", work)).toEqual(["name not from the artist or title: D'souza", "names the sitter: Ana, D'souza"]);
  });

  it("matches the sitter's name case-sensitively (pin)", () => {
    expect(lineProblems("roulin sits still.", portrait)).toEqual([]);
  });

  it("lists a repeated name once", () => {
    expect(lineProblems("Here Roulin and Roulin sit.", portrait)).toEqual([
      "name not from the artist or title: Roulin",
      "names the sitter: Roulin",
    ]);
    expect(lineProblems("the Venice and Paris and Venice light.", seascape)).toEqual(["name not from the artist or title: Venice, Paris"]);
  });

  it("returns every problem, in rule order", () => {
    const line = `Roulin. Calm${emDash}water near Venice is truly here! Three ${words(23)}`;
    expect(lineProblems(line, portrait)).toEqual([
      "more than two sentences",
      "31 words, over 30",
      "em dash",
      "exclamation point",
      'banned phrase "truly"',
      "name not from the artist or title: Venice",
      "names the sitter: Roulin",
    ]);
  });
});
