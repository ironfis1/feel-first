// Points on the mood field: valence from -1 (heavy) to +1 (bright), arousal from -1 (calm) to +1 (charged) [RB18, Gap G3].

export type MoodPoint = { valence: number; arousal: number };

/** The center of the field: the neutral start for every session [Gap G23, D-040]. */
export const centerMood: MoodPoint = Object.freeze({ valence: 0, arousal: 0 });

/** Euclidean distance between two points on the field [RB53, Res #23]. */
export function distance(a: MoodPoint, b: MoodPoint): number {
  return Math.hypot(a.valence - b.valence, a.arousal - b.arousal);
}

/** Pulls a point back inside the field's unit circle, keeping its direction [Gap G11]. */
export function clampToCircle(p: MoodPoint): MoodPoint {
  const r = Math.hypot(p.valence, p.arousal);
  return r <= 1 ? p : { valence: p.valence / r, arousal: p.arousal / r };
}
