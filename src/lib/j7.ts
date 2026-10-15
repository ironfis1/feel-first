// J7 session learner: Closer and Drift nudge the visitor's mood [spec Section 4 J7, RB23, RB57, Res #10, Gap G11].

import { nudgeStep } from "../config/feel.ts";
import { clampToCircle, type MoodPoint } from "./mood.ts";

export type Reaction = "closer" | "drift";

/** Closer moves the mood 30% of the way toward the work; Drift moves it 30% away. Then clamp inside the unit circle. */
export function nudge(mood: MoodPoint, work: MoodPoint, reaction: Reaction): MoodPoint {
  const sign = reaction === "closer" ? 1 : -1;
  return clampToCircle({
    valence: mood.valence + sign * nudgeStep * (work.valence - mood.valence),
    arousal: mood.arousal + sign * nudgeStep * (work.arousal - mood.arousal),
  });
}
