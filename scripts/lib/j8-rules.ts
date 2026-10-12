// The rules every J8 finding sentence and action must pass [spec Section 3.11, Section 5.7, Res #38, Res #47, Res #53].
// The banned-term list lives only here.

import { roomNames } from "../../src/config/feel.ts";
import { numbersIn } from "../../src/lib/schemas.ts";
import { midSentenceCapitals } from "./j4-rules.ts";

/** Rack sizes and licensing-contract or data-rights language, matched whole-word and case-insensitively [Res #47, Res #53]. */
export const bannedTerms = [
  "60-slot",
  "60 slot",
  "slot",
  "slots",
  "contract",
  "contracts",
  "contractual",
  "royalty",
  "royalties",
  "rights",
  "agreement",
  "agreements",
  "exclusive",
  "exclusivity",
  "terms",
  "negotiate",
  "negotiation",
  "licensor",
  "licensee",
  "data-sharing",
  "data sharing",
  "raw data",
  "data ownership",
] as const;

const emDash = String.fromCharCode(0x2014);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bannedPattern = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${bannedTerms.map(escape).join("|")})(?![\\p{L}-])`, "iu");

/**
 * Numbers written as words, which would slip past the digit check. "one" is left out because it is
 * ordinary prose ("one segment"); the prompt asks for every figure in digits.
 */
export const numberWords = [
  "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
  "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred", "thousand", "million",
  "dozen", "twice", "double", "triple", "half", "quarter",
] as const;
const numberWordPattern = new RegExp(`(?<![\\p{L}-])(?:${numberWords.join("|")})(?![\\p{L}-])`, "iu");

/** Words that may be capitalized mid-sentence: the room names, which name the mood segments on screen. */
const roomNameWords = new Set(Object.values(roomNames).flatMap((name) => name.toLowerCase().split(/\s+/)));

/** Every reason a finding's text or action breaks the J8 rules; an empty list means it passes. */
export function findingProblems(text: string, figures: Record<string, number>): string[] {
  const problems: string[] = [];
  const t = text.trim();
  if (!t) return ["empty"];
  if (t.includes(emDash)) problems.push("em dash");
  if (t.includes("!")) problems.push("exclamation point");
  const banned = t.match(bannedPattern);
  if (banned) problems.push(`banned term "${banned[0]}"`);
  const known = Object.values(figures);
  const unknown = numbersIn(t).filter((n) => !known.includes(n));
  if (unknown.length) problems.push(`numbers not in the figures: ${unknown.join(", ")}`);
  const spelled = t.match(numberWordPattern);
  if (spelled) problems.push(`number written as a word "${spelled[0]}"`);
  const names = midSentenceCapitals(t).filter((w) => !roomNameWords.has(w.toLowerCase()));
  if (names.length) problems.push(`capitalized words that may be names: ${[...new Set(names)].join(", ")}`);
  return problems;
}
