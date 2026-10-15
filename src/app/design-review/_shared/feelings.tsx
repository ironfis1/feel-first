"use client";

// Feeling wheel pieces shared by the review directions (D-044, D-045). Local only; deleted when the design is settled.

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { feelingWheelOrder, feelingWheelRadius } from "@/config/feel";
import { moodFromKey, moodFromPointer, type Mood } from "./review";

export type Positions = Record<string, Mood>;

/** One color per feeling. Each wheel is painted from these at each feeling's position. */
export const feelingColor: Record<string, string> = {
  joyful: "#f4c64e",
  playful: "#ff8f5e",
  energized: "#ee5a36",
  awe: "#7f78f2",
  serene: "#5fc4b0",
  tender: "#eaa2b8",
  contemplative: "#5b84b1",
  nostalgic: "#c99256",
  wistful: "#a795cc",
  melancholy: "#33508f",
  tense: "#b8283c",
  defiant: "#d43d80",
};

/** Draft room sentences, one per feeling, for Scott's approval (D-045). */
export const feelingSentence: Record<string, string> = {
  joyful: "A room of bright color and easy laughter.",
  playful: "A room of bold shapes and a little mischief.",
  energized: "A room that moves, with strong color and somewhere to go.",
  awe: "A room of big skies and things larger than you.",
  serene: "A room of soft light and slow mornings.",
  tender: "A room of warm light and quiet care.",
  contemplative: "A room for slow looking and long thoughts.",
  nostalgic: "A room of old places and the people we were there.",
  wistful: "A room of faded afternoons and things just out of reach.",
  melancholy: "A room of low light that lets a sad day be a sad day.",
  tense: "A room of held breath, sharp edges and weather coming in.",
  defiant: "A room that stands its ground, loud and unafraid.",
};

const STEP = 360 / feelingWheelOrder.length;

/** Even positions on the wheel: same radius, 30 degrees apart (D-049). These paint the wheel and name the feeling. */
export function wheelPositions(): Positions {
  return Object.fromEntries(
    feelingWheelOrder.map((k, i) => {
      const rad = (i * STEP * Math.PI) / 180;
      return [k, { v: feelingWheelRadius * Math.cos(rad), a: feelingWheelRadius * Math.sin(rad) }];
    }),
  );
}

/** The two feelings either side of the point's angle, and how far the point is from the first toward the second. */
function between(p: Mood): { a: string; b: string; f: number } {
  const deg = ((Math.atan2(p.a, p.v) * 180) / Math.PI + 360) % 360;
  const i = Math.floor(deg / STEP) % feelingWheelOrder.length;
  return { a: feelingWheelOrder[i], b: feelingWheelOrder[(i + 1) % feelingWheelOrder.length], f: deg / STEP - Math.floor(deg / STEP) };
}

/** Share of the second feeling at which it is named as "a little". */
const ALSO_AT = 0.25;

/** The feeling the point's angle is nearest, and a second one when the point sits between two (D-049). */
export function feelingAt(p: Mood): { main: string; also: string | null } {
  const { a, b, f } = between(p);
  const [main, also] = f < 0.5 ? [a, b] : [b, a];
  return { main, also: Math.min(f, 1 - f) >= ALSO_AT ? also : null };
}

/**
 * The mood J3 uses (D-049): the catalog positions of the two feelings either side, blended linearly by angle,
 * then scaled by the point's distance from center, so the center stays the neutral start.
 */
export function j3Mood(p: Mood, catalog: Positions): Mood {
  const { a, b, f } = between(p);
  const r = Math.min(1, Math.hypot(p.v, p.a));
  return { v: r * ((1 - f) * catalog[a].v + f * catalog[b].v), a: r * ((1 - f) * catalog[a].a + f * catalog[b].a) };
}

/** The wheel point whose J3 mood lies nearest a catalog mood, so Closer and Drift can move the point on the wheel. */
export function wheelPointFor(target: Mood, catalog: Positions): Mood {
  let best = { p: { v: 0, a: 0 }, d: Math.hypot(target.v, target.a) };
  for (let deg = 0; deg < 360; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    const unit = { v: Math.cos(rad), a: Math.sin(rad) };
    const full = j3Mood(unit, catalog);
    const len2 = full.v * full.v + full.a * full.a;
    const r = Math.max(0, Math.min(1, (target.v * full.v + target.a * full.a) / len2));
    const d = Math.hypot(target.v - r * full.v, target.a - r * full.a);
    if (d < best.d) best = { p: { v: r * unit.v, a: r * unit.a }, d };
  }
  return best.p;
}

/** Radial color layers, one per feeling at its position, over a base. alpha is a two-digit hex. */
export function wheelPaint(pos: Positions, base: string, alpha = "cc", reach = 34): CSSProperties {
  const layers = Object.entries(pos).map(
    ([k, q]) => `radial-gradient(circle at ${(50 + q.v * 50).toFixed(2)}% ${(50 - q.a * 50).toFixed(2)}%, ${feelingColor[k]}${alpha} 0%, ${feelingColor[k]}00 ${reach}%)`,
  );
  return { backgroundImage: [...layers, base].join(", ") };
}

export const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** The draggable wheel: pointer drag and arrow keys move the point. Each direction styles it. */
export function FeelingWheel({
  mood,
  onMove,
  className,
  style,
  children,
}: {
  mood: Mood;
  onMove: (p: Mood) => void;
  className: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const feel = feelingAt(mood);
  const move = (e: PointerEvent) => ref.current && onMove(moodFromPointer(e.clientX, e.clientY, ref.current.getBoundingClientRect()));
  const onKey = (e: KeyboardEvent) => {
    const next = moodFromKey(mood, e.key, e.shiftKey);
    if (next) {
      e.preventDefault();
      onMove(next);
    }
  };
  return (
    <div
      ref={ref}
      className={className}
      style={style}
      role="slider"
      tabIndex={0}
      aria-label="How you feel. Arrow keys move the point."
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(mood.v * 100)}
      aria-valuetext={feel.also ? `${feel.main}, a little ${feel.also}` : feel.main}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => dragging.current && move(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={onKey}
    >
      {children}
    </div>
  );
}
