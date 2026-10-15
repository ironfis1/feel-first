"use client";

// Feeling wheel pieces shared by the review directions (D-044, D-045). Local only; deleted when the design is settled.

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
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

/** The nearest feeling, and a second one when the point sits between two. */
export function feelingAt(p: Mood, pos: Positions): { main: string; also: string | null } {
  const ranked = Object.entries(pos)
    .map(([k, q]) => ({ k, d: Math.hypot(q.v - p.v, q.a - p.a) }))
    .sort((x, y) => x.d - y.d);
  const [first, second] = ranked;
  return { main: first.k, also: second.d < first.d * 1.35 + 0.02 ? second.k : null };
}

/** Radial color layers, one per feeling at its position, over a base. alpha is a two-digit hex. */
export function wheelPaint(pos: Positions, base: string, alpha = "cc", reach = 34): CSSProperties {
  const layers = Object.entries(pos).map(
    ([k, q]) => `radial-gradient(circle at ${50 + q.v * 50}% ${50 - q.a * 50}%, ${feelingColor[k]}${alpha} 0%, ${feelingColor[k]}00 ${reach}%)`,
  );
  return { backgroundImage: [...layers, base].join(", ") };
}

export const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** The draggable wheel: pointer drag and arrow keys move the point. Each direction styles it. */
export function FeelingWheel({
  mood,
  onMove,
  pos,
  className,
  style,
  children,
}: {
  mood: Mood;
  onMove: (p: Mood) => void;
  pos: Positions;
  className: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const feel = feelingAt(mood, pos);
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
