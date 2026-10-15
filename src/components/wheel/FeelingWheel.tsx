"use client";

// The feeling wheel [D-044, D-049, design-system.md]: the 12 feelings as soft colored lights, the visitor's point
// as a glow. Pointer, touch and arrow keys move the point; dragging never scrolls the page.

import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { feelingWheelOrder } from "@/config/feel";
import { clampToWheel, feelingAt, wheelFeelingPoints, type WheelPoint } from "@/lib/feelings";
import s from "./FeelingWheel.module.css";

const feelingPoints = wheelFeelingPoints();

/** Each feeling's light at its place on the wheel, over the dark ground. Percentages are rounded so server and client match. */
const paint: CSSProperties = {
  backgroundImage: [
    ...feelingWheelOrder.map((f) => {
      const p = feelingPoints[f];
      return `radial-gradient(circle at ${(50 + p.x * 50).toFixed(2)}% ${(50 - p.y * 50).toFixed(2)}%, color-mix(in srgb, var(--feel-${f}) 55%, transparent) 0%, transparent 30%)`;
    }),
    "radial-gradient(circle, var(--c-field) 0%, var(--c-night) 70%)",
  ].join(", "),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where a wheel point sits inside the element, as CSS percentages. */
export function placeAt(p: WheelPoint): CSSProperties {
  return { "--x": `${(50 + p.x * 50).toFixed(2)}%`, "--y": `${(50 - p.y * 50).toFixed(2)}%` } as CSSProperties;
}

/** The light is larger and slower when calm, tighter and quicker when charged [Res #21]. */
function lightVars(p: WheelPoint): CSSProperties {
  const t = (p.y + 1) / 2;
  return { ...placeAt(p), "--pulse": `${lerp(7, 1.1, t).toFixed(2)}s`, "--size": `${lerp(46, 26, t).toFixed(1)}%` } as CSSProperties;
}

/** A point from a pointer position inside the wheel's box. Up is charged, right is bright. */
function pointFromPointer(e: PointerEvent, rect: DOMRect): WheelPoint {
  const r = Math.min(rect.width, rect.height) / 2;
  return clampToWheel({ x: (e.clientX - rect.left - rect.width / 2) / r, y: -(e.clientY - rect.top - rect.height / 2) / r });
}

const keySteps: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

/** One arrow-key step; Shift takes a larger step. Null for any other key. */
export function pointFromKey(p: WheelPoint, key: string, big: boolean): WheelPoint | null {
  const d = keySteps[key];
  if (!d) return null;
  const step = big ? 0.2 : 0.05;
  return clampToWheel({ x: p.x + d[0] * step, y: p.y + d[1] * step });
}

/** The painted wheel with no point and no control, for the Piece fingerprint. Children are placed marks. */
export function WheelFace({ className, children, label }: { className?: string; children?: ReactNode; label: string }) {
  return (
    <div className={`${s.wheel} ${className ?? ""}`} role="img" aria-label={label}>
      <span className={s.lights} style={paint} aria-hidden />
      <span className={s.ring} aria-hidden />
      {children}
    </div>
  );
}

type Props = {
  point: WheelPoint;
  onMove: (p: WheelPoint) => void;
  /** Called once per completed gesture (pointer up, or each arrow-key step) with the points before and after [D-041]. */
  onGestureEnd?: (from: WheelPoint, to: WheelPoint) => void;
  compact?: boolean;
  className?: string;
};

export function FeelingWheel({ point, onMove, onGestureEnd, compact, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const from = useRef<WheelPoint | null>(null);
  const last = useRef(point);
  const feel = feelingAt(point);

  const move = (p: WheelPoint) => {
    last.current = p;
    onMove(p);
  };
  const end = () => {
    if (from.current) onGestureEnd?.(from.current, last.current);
    from.current = null;
  };
  const onKey = (e: KeyboardEvent) => {
    const next = pointFromKey(point, e.key, e.shiftKey);
    if (!next) return;
    e.preventDefault();
    move(next);
    onGestureEnd?.(point, next);
  };

  return (
    <div
      ref={ref}
      className={`${s.wheel} ${s.control} ${compact ? s.compact : s.full} ${className ?? ""}`}
      style={lightVars(point)}
      role="slider"
      tabIndex={0}
      aria-label="How you feel. Arrow keys move the light."
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={Math.round(((Math.atan2(point.y, point.x) * 180) / Math.PI + 360) % 360)}
      aria-valuetext={feel.also ? `${feel.main}, a little ${feel.also}` : feel.main}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        from.current = point;
        last.current = point;
        move(pointFromPointer(e, e.currentTarget.getBoundingClientRect()));
      }}
      onPointerMove={(e) => from.current && move(pointFromPointer(e, e.currentTarget.getBoundingClientRect()))}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKey}
    >
      <span className={s.lights} style={paint} aria-hidden />
      <span className={s.ring} aria-hidden />
      <span className={s.light} aria-hidden />
    </div>
  );
}
