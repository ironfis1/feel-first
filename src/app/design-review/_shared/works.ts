// Slim catalog list for the Round 0 review pages, read through the catalog module [Res #28].

import { getAllWorks } from "@/lib/catalog";
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
