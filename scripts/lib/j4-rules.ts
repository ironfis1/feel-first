// The rules every J4 "why this found you" line must pass [spec Section 4 J4, docs/ai-jobs.md J4, D-033].
// The banned-phrase list lives only here: scripts/j4.ts appends it to the prompt and checks lines against it.

/** Generic phrasing a thoughtful curator would not use. Matched whole-word and case-insensitively. */
export const bannedPhrases = [
  "captivating",
  "captivates",
  "evoke",
  "evokes",
  "evoked",
  "evoking",
  "evocative",
  "evokes emotion",
  "stunning",
  "breathtaking",
  "masterpiece",
  "timeless",
  "mesmerizing",
  "awe-inspiring",
  "invites you",
  "speaks to",
  "resonates",
  "a testament to",
  "tapestry",
  "symphony of",
  "delve",
  "showcases",
  "perfect for",
  "must-have",
  "elevate",
  "elevates",
  "a sense of",
  "truly",
  "nestled",
] as const;

const emDash = String.fromCharCode(0x2014);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bannedPattern = new RegExp(`(?<![\\p{L}-])(?:${bannedPhrases.map(escape).join("|")})(?![\\p{L}-])`, "iu");

/** Sentences in a line: text ending at ., ? or ! followed by a space or the end. */
export function sentenceCount(line: string): number {
  return line
    .trim()
    .split(/(?<=[.?!])["'”’)]*\s+/u)
    .filter((part) => part.trim().length > 0).length;
}

/** Capitalized words that do not start a sentence, with any trailing possessive removed. */
export function midSentenceCapitals(line: string): string[] {
  const words: string[] = [];
  const pattern = /[\p{L}\p{N}'’-]+/gu;
  let sentenceStart = true;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const between = line.slice(last, match.index);
    if (/[.?!:]\s*["'“‘(]*\s*$/u.test(between) && last > 0) sentenceStart = true;
    const word = match[0].replace(/['’]s$/u, "");
    if (!sentenceStart && /^\p{Lu}/u.test(word)) words.push(word);
    sentenceStart = false;
    last = match.index + match[0].length;
  }
  return words;
}

/** Words a line may capitalize mid-sentence: the artist's name, and the title unless the work is a figure (D-033). */
export function allowedNames(work: { title: string; artist: string; subject: string }): Set<string> {
  const source = work.subject === "figure" ? work.artist : `${work.artist} ${work.title}`;
  return new Set([...source.matchAll(/[\p{L}\p{N}'’-]+/gu)].map((m) => m[0].replace(/['’]s$/u, "").toLowerCase()));
}

/** Title words of figure works that describe rather than name the sitter. */
const figureTitleWords = new Set(["portrait", "self-portrait", "of", "the", "a", "an", "and", "with", "in", "young", "old", "woman", "man", "girl", "boy", "lady", "gentleman", "mother", "child", "study", "head", "figure", "bust"]);

/**
 * Capitalized title words of a figure work that are not the artist's: usually the sitter's name, rejected
 * anywhere in a line, including at the start of a sentence where the mid-sentence check cannot see it.
 */
export function sitterNames(work: { title: string; artist: string; subject: string }): Set<string> {
  if (work.subject !== "figure") return new Set();
  const artist = allowedNames({ ...work, title: "" });
  const words = [...work.title.matchAll(/[\p{L}\p{N}'’-]+/gu)].map((m) => m[0].replace(/['’]s$/u, ""));
  return new Set(words.filter((w) => /^\p{Lu}/u.test(w) && !artist.has(w.toLowerCase()) && !figureTitleWords.has(w.toLowerCase())));
}

/** Every reason a line breaks the J4 rules; an empty list means it passes. */
export function lineProblems(line: string, work: { title: string; artist: string; subject: string }): string[] {
  const problems: string[] = [];
  const text = line.trim();
  if (!text) return ["empty line"];
  if (sentenceCount(text) > 2) problems.push("more than two sentences");
  if (text.includes(emDash)) problems.push("em dash");
  if (text.includes("!")) problems.push("exclamation point");
  const banned = text.match(bannedPattern);
  if (banned) problems.push(`banned phrase "${banned[0]}"`);
  const allowed = allowedNames(work);
  const names = midSentenceCapitals(text).filter((word) => !allowed.has(word.toLowerCase()));
  if (names.length) problems.push(`name not from the artist or title: ${[...new Set(names)].join(", ")}`);
  const sitters = sitterNames(work);
  const named = [...text.matchAll(/[\p{L}\p{N}'’-]+/gu)].map((m) => m[0].replace(/['’]s$/u, "")).filter((w) => sitters.has(w));
  if (named.length) problems.push(`names the sitter: ${[...new Set(named)].join(", ")}`);
  return problems;
}
