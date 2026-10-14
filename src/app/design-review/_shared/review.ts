// Round 0 design review helpers (D-004). Local only; deleted when the design is settled.
// The ordering here is a stand-in so the review rooms re-hang. The real J3 matcher is built in Part B.

import { roomNames } from "@/config/feel";
import { bucketOf } from "@/lib/buckets";

export type ReviewWork = {
  id: string;
  lane: "fine-art" | "poster";
  title: string;
  artist: string;
  date: string;
  thumbUrl: string;
  thumbW: number;
  thumbH: number;
  v: number;
  a: number;
};

export type Mood = { v: number; a: number };

/** Keeps a point inside the unit circle. */
export function clampToCircle(p: Mood): Mood {
  const r = Math.hypot(p.v, p.a);
  return r <= 1 ? p : { v: p.v / r, a: p.a / r };
}

/** Maps a pointer position inside a square element to a mood point. Up is charged. */
export function moodFromPointer(clientX: number, clientY: number, rect: DOMRect): Mood {
  const r = Math.min(rect.width, rect.height) / 2;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return clampToCircle({ v: (clientX - cx) / r, a: -(clientY - cy) / r });
}

/** Arrow-key step on the field. */
export function moodFromKey(p: Mood, key: string, big: boolean): Mood | null {
  const s = big ? 0.2 : 0.05;
  const d: Record<string, [number, number]> = {
    ArrowLeft: [-s, 0],
    ArrowRight: [s, 0],
    ArrowUp: [0, s],
    ArrowDown: [0, -s],
  };
  if (!d[key]) return null;
  return clampToCircle({ v: p.v + d[key][0], a: p.a + d[key][1] });
}

export function roomNameOf(p: Mood): string {
  return roomNames[bucketOf(p.v, p.a)];
}

/** Stand-in ordering: nearest first per lane, poster then fine art, alternating. */
export function reviewHang(works: ReviewWork[], p: Mood, perLane: number, demoted: ReadonlySet<string>): ReviewWork[] {
  const rank = (lane: ReviewWork["lane"]) =>
    works
      .filter((w) => w.lane === lane)
      .map((w) => ({ w, d: Math.hypot(w.v - p.v, w.a - p.a) + (demoted.has(w.id) ? 10 : 0) }))
      .sort((x, y) => x.d - y.d || (x.w.id < y.w.id ? -1 : 1))
      .slice(0, perLane)
      .map((x) => x.w);
  const posters = rank("poster");
  const art = rank("fine-art");
  const out: ReviewWork[] = [];
  for (let i = 0; i < perLane; i++) {
    if (posters[i]) out.push(posters[i]);
    if (art[i]) out.push(art[i]);
  }
  return out;
}
