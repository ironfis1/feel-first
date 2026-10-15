// The feeling wheel [D-044, D-049]. The visitor moves a point on a wheel where the 12 emotion words sit evenly;
// the point names a feeling, and J3 ranks by the catalog position of that feeling, blended and scaled.
// Two spaces meet here: the wheel (x right, y up, unit disc) and the mood field (valence, arousal).

import { feelingWheelOrder, feelingWheelRadius } from "../config/feel.ts";
import type { EmotionTag } from "./catalog.ts";
import type { MoodPoint } from "./mood.ts";

/** A point on the wheel, inside the unit disc. The center is the neutral start. */
export type WheelPoint = { x: number; y: number };

export type Feeling = (typeof feelingWheelOrder)[number];

/** Where each feeling sits on the mood field: its catalog position [D-044]. */
export type FeelingPositions = Record<Feeling, MoodPoint>;

const count = feelingWheelOrder.length;
const step = (2 * Math.PI) / count;

/** Each feeling's place on the wheel: the same radius, 30 degrees apart, counterclockwise from the right [D-049]. */
export function wheelFeelingPoints(): Record<Feeling, WheelPoint> {
  return Object.fromEntries(
    feelingWheelOrder.map((f, i) => [f, { x: feelingWheelRadius * Math.cos(i * step), y: feelingWheelRadius * Math.sin(i * step) }]),
  ) as Record<Feeling, WheelPoint>;
}

/**
 * Each feeling's catalog position: the average valence and arousal of the works that carry it as their lead tag,
 * or, for a feeling that leads no work, of every work that carries it [D-044].
 */
export function feelingPositions(works: readonly { valence: number; arousal: number; tags: readonly EmotionTag[] }[]): FeelingPositions {
  const mean = (list: typeof works): MoodPoint => ({
    valence: list.reduce((s, w) => s + w.valence, 0) / list.length,
    arousal: list.reduce((s, w) => s + w.arousal, 0) / list.length,
  });
  return Object.fromEntries(
    feelingWheelOrder.map((f) => {
      const lead = works.filter((w) => w.tags[0] === f);
      const any = lead.length ? lead : works.filter((w) => w.tags.includes(f));
      if (!any.length) throw new Error(`no work carries the feeling ${f}`);
      return [f, mean(any)];
    }),
  ) as FeelingPositions;
}

/** The two feelings either side of the point's angle, and the share of the way from the first to the second. */
function neighbors(p: WheelPoint): { first: Feeling; second: Feeling; share: number } {
  const turns = ((Math.atan2(p.y, p.x) + 2 * Math.PI) % (2 * Math.PI)) / step;
  const i = Math.floor(turns) % count;
  return { first: feelingWheelOrder[i], second: feelingWheelOrder[(i + 1) % count], share: turns - Math.floor(turns) };
}

/** Share of the second feeling at which the wheel names it as "a little" (design-log Round 3). */
export const alsoShare = 0.25;

/** The feeling the point's angle is nearest, and a second one when the point sits between two [D-049]. */
export function feelingAt(p: WheelPoint): { main: Feeling; also: Feeling | null } {
  const { first, second, share } = neighbors(p);
  const [main, other] = share < 0.5 ? [first, second] : [second, first];
  return { main, also: Math.min(share, 1 - share) >= alsoShare ? other : null };
}

/**
 * The mood J3 ranks by [D-049]: the catalog positions of the two feelings either side, blended linearly by angle,
 * then scaled by the point's distance from center, so the center stays the neutral mood (0, 0).
 */
export function moodFor(p: WheelPoint, positions: FeelingPositions): MoodPoint {
  const { first, second, share } = neighbors(p);
  const r = Math.min(1, Math.hypot(p.x, p.y));
  const a = positions[first];
  const b = positions[second];
  return {
    valence: r * ((1 - share) * a.valence + share * b.valence),
    arousal: r * ((1 - share) * a.arousal + share * b.arousal),
  };
}

/**
 * The wheel point whose mood lies nearest a given mood, searched a degree at a time.
 * Closer, Drift and a described moment set a mood; the visible point follows it here.
 */
export function wheelPointFor(target: MoodPoint, positions: FeelingPositions): WheelPoint {
  let best = { p: { x: 0, y: 0 }, d: Math.hypot(target.valence, target.arousal) };
  for (let deg = 0; deg < 360; deg++) {
    const unit = { x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) };
    const full = moodFor(unit, positions);
    const len2 = full.valence ** 2 + full.arousal ** 2;
    const r = Math.max(0, Math.min(1, (target.valence * full.valence + target.arousal * full.arousal) / len2));
    const d = Math.hypot(target.valence - r * full.valence, target.arousal - r * full.arousal);
    if (d < best.d) best = { p: { x: r * unit.x, y: r * unit.y }, d };
  }
  return best.p;
}

/** Keeps a wheel point inside the unit disc. */
export function clampToWheel(p: WheelPoint): WheelPoint {
  const r = Math.hypot(p.x, p.y);
  return r <= 1 ? p : { x: p.x / r, y: p.y / r };
}
