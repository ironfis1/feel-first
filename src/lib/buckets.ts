// The 9 mood buckets: a 3x3 grid over valence and arousal [Res #9, Gap G4].
// A bucket key is the valence band, a hyphen, then the arousal band, for example heavy-calm [D-027].

import { bucketCutPoints } from "../config/feel.ts";

/** Valence bands, from -1 (heavy) to +1 (bright) [Gap G3]. */
export const valenceBands = ["heavy", "mid", "bright"] as const;

/** Arousal bands, from -1 (calm) to +1 (charged) [Gap G3]. */
export const arousalBands = ["calm", "mid", "charged"] as const;

type ValenceBand = (typeof valenceBands)[number];
type ArousalBand = (typeof arousalBands)[number];
export type BucketKey = `${ValenceBand}-${ArousalBand}`;

/** All 9 bucket keys, calm row first, heavy to bright within each row. */
export const bucketKeys = arousalBands.flatMap((a) => valenceBands.map((v) => `${v}-${a}` as BucketKey)) as readonly BucketKey[];

/** Index 0, 1 or 2 of the third a value falls in. A value on a cut point belongs to the middle third. */
function third(value: number): 0 | 1 | 2 {
  const [low, high] = bucketCutPoints;
  if (value < low) return 0;
  if (value > high) return 2;
  return 1;
}

/** The bucket a point on the mood field falls in [Gap G4]. */
export function bucketOf(valence: number, arousal: number): BucketKey {
  return `${valenceBands[third(valence)]}-${arousalBands[third(arousal)]}`;
}
