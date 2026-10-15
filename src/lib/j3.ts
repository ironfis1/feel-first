// J3 matcher: ranks each lane by Euclidean distance from the visitor's mood and interleaves the lanes
// [spec Section 4 J3, RB20, RB53, Res #5, Res #23, Res #37, Gap G10, Gap G22].

import { roomPageSizePerLane } from "../config/feel.ts";
import type { Lane } from "./catalog.ts";
import { distance, type MoodPoint } from "./mood.ts";

/** The fields J3 reads from a work. */
export type Rankable = { id: string; lane: Lane; valence: number; arousal: number };

/**
 * One lane ranked nearest first; ties break by ascending catalog ID [Res #23].
 * Drifted works go to the end of their lane, in the order they were drifted [Gap G10, Gap G22].
 */
export function rankLane<W extends Rankable>(works: readonly W[], lane: Lane, mood: MoodPoint, drifted: readonly string[] = []): W[] {
  const inLane = works.filter((w) => w.lane === lane);
  const demoted = new Set(drifted);
  const ranked = inLane
    .filter((w) => !demoted.has(w.id))
    .map((w) => ({ w, d: distance(mood, w) }))
    .sort((x, y) => x.d - y.d || (x.w.id < y.w.id ? -1 : x.w.id > y.w.id ? 1 : 0))
    .map((x) => x.w);
  const byId = new Map(inLane.map((w) => [w.id, w]));
  const tail = drifted.filter((id, i) => byId.has(id) && drifted.indexOf(id) === i).map((id) => byId.get(id)!);
  return [...ranked, ...tail];
}

/**
 * The Room hang: the nearest `pages` x 6 works from each lane, interleaved with a poster at position 1
 * [Res #5, Res #37, Gap G22]. When one lane runs out, the other continues alone.
 */
export function hang<W extends Rankable>(works: readonly W[], mood: MoodPoint, pages: number, drifted: readonly string[] = []): W[] {
  const n = roomPageSizePerLane * Math.max(1, Math.floor(pages));
  const posters = rankLane(works, "poster", mood, drifted).slice(0, n);
  const art = rankLane(works, "fine-art", mood, drifted).slice(0, n);
  const out: W[] = [];
  for (let i = 0; i < n; i++) {
    if (posters[i]) out.push(posters[i]);
    if (art[i]) out.push(art[i]);
  }
  return out;
}
