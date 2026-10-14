// Slim catalog list for the Round 0 review pages, read through the catalog module [Res #28].

import { emotionTags, getAllWorks } from "@/lib/catalog";
import type { ReviewWork } from "./review";

/** Thumbnails are 640px wide, resized and never cropped [D-023]. */
const THUMB_WIDTH = 640;

export function reviewWorks(): ReviewWork[] {
  return getAllWorks().map((w) => ({
    id: w.id,
    lane: w.lane,
    title: w.title,
    artist: w.artist,
    date: w.date,
    thumbUrl: w.thumbUrl,
    thumbW: THUMB_WIDTH,
    thumbH: Math.round((THUMB_WIDTH * w.height) / w.width),
    v: w.valence,
    a: w.arousal,
  }));
}

/**
 * Where each of the 12 emotion words sits on the field (D-044): the average position of the works that carry it
 * as their strongest tag, or, for a word that leads no work, of every work that carries it.
 */
export function emotionPositions(): Record<string, { v: number; a: number }> {
  const all = getAllWorks();
  const mean = (ws: readonly { valence: number; arousal: number }[]) => ({
    v: ws.reduce((s, w) => s + w.valence, 0) / ws.length,
    a: ws.reduce((s, w) => s + w.arousal, 0) / ws.length,
  });
  const out: Record<string, { v: number; a: number }> = {};
  for (const tag of emotionTags) {
    const lead = all.filter((w) => w.tags[0] === tag);
    out[tag] = mean(lead.length ? lead : all.filter((w) => w.tags.includes(tag)));
  }
  return out;
}
