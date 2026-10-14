"use client";

// Round 0, Direction A: Nocturne (D-004). Local review only.

import Image from "next/image";
import { useCallback, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { roomPageSizePerLane, thresholdPrompt } from "@/config/feel";
import { clampToCircle, moodFromKey, moodFromPointer, reviewHang, roomNameOf, type Mood, type ReviewWork } from "../_shared/review";
import s from "./a.module.css";

const lerp = (x: number, y: number, t: number) => x + (y - x) * t;

/** Heavy is deep violet, bright is amber; calm is soft and slow, charged is vivid and quick. Color and motion carry the meaning [Res #21]. */
function glowVars(p: Mood): CSSProperties {
  const tv = (p.v + 1) / 2;
  const ta = (p.a + 1) / 2;
  // Indigo through rose to amber, never through green.
  const hue = lerp(250, 400, tv) % 360;
  const sat = lerp(28, 92, ta);
  const light = lerp(46, 70, tv);
  return {
    "--glow": `hsl(${hue} ${sat}% ${light}%)`,
    "--glow-soft": `hsl(${hue} ${sat}% ${light}% / 0.18)`,
    "--x": `${50 + p.v * 50}%`,
    "--y": `${50 - p.a * 50}%`,
    "--pulse": `${lerp(7, 1.1, ta).toFixed(2)}s`,
    "--size": `${lerp(58, 30, ta).toFixed(1)}%`,
  } as CSSProperties;
}

function Field({ mood, onMove, compact }: { mood: Mood; onMove: (p: Mood) => void; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
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
      className={compact ? s.fieldCompact : s.field}
      style={glowVars(mood)}
      role="slider"
      tabIndex={0}
      aria-label="Mood light. Arrow keys move it."
      aria-valuemin={-100}
      aria-valuemax={100}
      aria-valuenow={Math.round(mood.v * 100)}
      aria-valuetext={roomNameOf(mood)}
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
      <span className={s.ring} aria-hidden />
      <span className={s.light} aria-hidden />
    </div>
  );
}

export function DirectionA({ works }: { works: ReviewWork[] }) {
  const [mood, setMood] = useState<Mood>({ v: 0, a: 0 });
  const [touched, setTouched] = useState(false);
  const [view, setView] = useState<"threshold" | "entering" | "room">("threshold");
  const [pages, setPages] = useState(1);
  const [demoted, setDemoted] = useState<Set<string>>(new Set());

  const move = useCallback((p: Mood) => {
    setMood(p);
    setTouched(true);
  }, []);

  const hang = useMemo(() => reviewHang(works, mood, roomPageSizePerLane * pages, demoted), [works, mood, pages, demoted]);

  const nudge = (w: ReviewWork, dir: 1 | -1) => {
    setMood((p) => clampToCircle({ v: p.v + dir * 0.3 * (w.v - p.v), a: p.a + dir * 0.3 * (w.a - p.a) }));
    if (dir === -1) setDemoted((d) => new Set(d).add(w.id));
  };

  const enter = () => {
    setView("entering");
    window.setTimeout(() => setView("room"), 650);
  };

  if (view !== "room") {
    return (
      <main className={`${s.root} ${s.threshold} ${view === "entering" ? s.entering : ""}`} style={glowVars(mood)}>
        <span className={s.wash} aria-hidden />
        <Field mood={mood} onMove={move} />
        <div className={s.foot}>
          <p className={s.prompt}>{thresholdPrompt}</p>
          <button className={`${s.step} ${touched ? s.stepShown : ""}`} onClick={enter} tabIndex={touched ? 0 : -1} aria-hidden={!touched}>
            Step in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`${s.root} ${s.room}`} style={glowVars(mood)}>
      <span className={s.roomWash} aria-hidden />
      <header className={s.roomHead}>
        <div className={s.roomTitle}>
          <h1 className={s.roomName}>{roomNameOf(mood)}</h1>
          <form className={s.describe} onSubmit={(e) => e.preventDefault()}>
            <label className={s.describeLabel} htmlFor="describe-a">
              Or describe a moment
            </label>
            <div className={s.describeRow}>
              <input id="describe-a" className={s.describeInput} placeholder="sunday coffee while it rains" autoComplete="off" />
              <button className={s.textButton} type="submit">
                Hang it
              </button>
            </div>
          </form>
        </div>
        <Field mood={mood} onMove={setMood} compact />
      </header>

      <ol className={s.hang}>
        {hang.map((w, i) => (
          <li key={w.id} className={s.work}>
            <div className={s.pic} style={{ aspectRatio: `${w.thumbW} / ${w.thumbH}` }}>
              <Image src={w.thumbUrl} alt={`${w.title}, ${w.artist}`} width={w.thumbW} height={w.thumbH} unoptimized priority={i < 4} sizes="(max-width: 640px) 90vw, 30vw" />
            </div>
            <p className={s.caption}>
              <span className={s.title}>{w.title}</span>
              <span className={s.meta}>
                {w.artist}, {w.date}
              </span>
            </p>
            <div className={s.reacts}>
              <button className={s.textButton} onClick={() => nudge(w, 1)}>
                Closer
              </button>
              <button className={s.textButton} onClick={() => nudge(w, -1)}>
                Drift
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className={s.more}>
        <button className={s.outlineButton} onClick={() => setPages((n) => n + 1)}>
          Show more
        </button>
      </div>
    </main>
  );
}
