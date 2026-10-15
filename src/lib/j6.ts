// J6 room balancer and the "feel together" summary: both read the bag's mood center
// [spec Section 3.8, Section 4 J6, Section 5.5, RB32, RB56, Res #14, Res #15, Gap G6].

import { roomNameFor } from "./buckets.ts";
import { distance, type MoodPoint } from "./mood.ts";

type Placed = { id: string; valence: number; arousal: number };

/** The unweighted average of valence and arousal across bag lines, or null for an empty bag [Gap G6]. */
export function bagCenter(lineWorks: readonly MoodPoint[]): MoodPoint | null {
  if (!lineWorks.length) return null;
  return {
    valence: lineWorks.reduce((s, w) => s + w.valence, 0) / lineWorks.length,
    arousal: lineWorks.reduce((s, w) => s + w.arousal, 0) / lineWorks.length,
  };
}

/** The room name of the bag's mood center, or null for an empty bag [RB32, Res #14]. */
export function feelTogether(lineWorks: readonly MoodPoint[]): string | null {
  const center = bagCenter(lineWorks);
  return center ? roomNameFor(center) : null;
}

/** The catalog work nearest the bag's mood center that is not in the bag; ties by ascending ID. Null for an empty bag [Res #15, Gap G6]. */
export function suggestion<W extends Placed>(catalog: readonly W[], lineWorks: readonly (MoodPoint & { id: string })[]): W | null {
  const center = bagCenter(lineWorks);
  if (!center) return null;
  const inBag = new Set(lineWorks.map((w) => w.id));
  let best: W | null = null;
  let bestD = Infinity;
  for (const w of catalog) {
    if (inBag.has(w.id)) continue;
    const d = distance(center, w);
    if (d < bestD || (d === bestD && best && w.id < best.id)) {
      best = w;
      bestD = d;
    }
  }
  return best;
}
