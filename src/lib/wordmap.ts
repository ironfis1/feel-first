// The word-map interpreter: typed words to a mood point with no server call [Gap G9, D-028, D-052].
// The Room's describe box uses it in Milestone 4; the M5 J2 route imports it as its fallback, so it
// returns the J2 output shape. Matching is exact on whole words, split the way J2's "heard" check splits them.

import data from "../../data/j2-wordmap.json";
import { maxHeard, normalizePhrase, type J2Output } from "./j2.ts";
import { j2WordmapFileSchema } from "./schemas.ts";
import type { z } from "zod";

export type WordMap = z.infer<typeof j2WordmapFileSchema>;

const wordMap: WordMap = j2WordmapFileSchema.parse(data);

/** The words of a typed text: normalized as the cache keys are, curly apostrophes straightened. */
export function wordsOf(text: string): string[] {
  return normalizePhrase(text)
    .replace(/[‘’]/g, "'")
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);
}

/**
 * Reads a typed text against the word map. The mood is the unweighted mean of the distinct mood words it
 * contains; room-type and size words come from the first such word. Null when no mood word matches [D-052].
 */
export function interpretWords(text: string, map: WordMap = wordMap): J2Output | null {
  const words = [...new Set(wordsOf(text))];
  const moodWords = words.filter((w) => Object.hasOwn(map.words, w));
  if (!moodWords.length) return null;
  const sum = moodWords.reduce((s, w) => ({ valence: s.valence + map.words[w].valence, arousal: s.arousal + map.words[w].arousal }), { valence: 0, arousal: 0 });
  const roomWord = words.find((w) => Object.hasOwn(map.roomTypes, w));
  const sizeWord = words.find((w) => Object.hasOwn(map.sizes, w));
  return {
    valence: sum.valence / moodWords.length,
    arousal: sum.arousal / moodWords.length,
    roomType: roomWord ? map.roomTypes[roomWord] : null,
    size: sizeWord ? map.sizes[sizeWord] : null,
    heard: words.filter((w) => moodWords.includes(w) || w === roomWord || w === sizeWord).slice(0, maxHeard),
  };
}
