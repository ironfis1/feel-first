"use client";

// Round 0, Direction B: Print Room (D-004). Local review only.

import Image from "next/image";
import { useCallback, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { roomPageSizePerLane, thresholdPrompt } from "@/config/feel";
import { clampToCircle, moodFromKey, moodFromPointer, reviewHang, roomNameOf, type Mood, type ReviewWork } from "../_shared/review";
import s from "./b.module.css";

const lerp = (x: number, y: number, t: number) => x + (y - x) * t;

/** The disc itself carries the color map; the point's ripples carry arousal as motion [Res #21]. */
function pointVars(p: Mood): CSSProperties {
  const tv = (p.v + 1) / 2;
  const ta = (p.a + 1) / 2;
  return {
    "--x": `${50 + p.v * 50}%`,
    "--y": `${50 - p.a * 50}%`,
    "--accent": `hsl(${lerp(222, 388, tv) % 360} ${lerp(30, 88, ta)}% ${lerp(34, 52, tv)}%)`,
    "--ripple": `${lerp(4.2, 0.9, ta).toFixed(2)}s`,
  } as CSSProperties;
}

function Disc({ mood, onMove, size }: { mood: Mood; onMove: (p: Mood) => void; size: "large" | "small" }) {
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
      className={size === "large" ? s.disc : s.discSmall}
      style={pointVars(mood)}
      role="slider"
      tabIndex={0}
      aria-label="Mood field. Arrow keys move the point."
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
      <span className={s.hairV} aria-hidden />
      <span className={s.hairH} aria-hidden />
      <span className={s.point} aria-hidden>
        <span className={s.rippleA} />
        <span className={s.rippleB} />
      </span>
    </div>
  );
}

export function DirectionB({ works }: { works: ReviewWork[] }) {
  const [mood, setMood] = useState<Mood>({ v: 0, a: 0 });
  const [view, setView] = useState<"threshold" | "room">("threshold");
  const [pages, setPages] = useState(1);
  const [demoted, setDemoted] = useState<Set<string>>(new Set());

  const move = useCallback((p: Mood) => setMood(p), []);
  const hang = useMemo(() => reviewHang(works, mood, roomPageSizePerLane * pages, demoted), [works, mood, pages, demoted]);

  const nudge = (w: ReviewWork, dir: 1 | -1) => {
    setMood((p) => clampToCircle({ v: p.v + dir * 0.3 * (w.v - p.v), a: p.a + dir * 0.3 * (w.a - p.a) }));
    if (dir === -1) setDemoted((d) => new Set(d).add(w.id));
  };

  if (view === "threshold") {
    return (
      <main className={`${s.root} ${s.threshold}`} style={pointVars(mood)}>
        <div className={s.discWrap}>
          <Disc mood={mood} onMove={move} size="large" />
        </div>
        <div className={s.side}>
          <p className={s.prompt}>{thresholdPrompt}</p>
          <button className={s.solidButton} onClick={() => setView("room")}>
            Hang the room <span aria-hidden>→</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`${s.root} ${s.room}`} style={pointVars(mood)}>
      <header className={s.bar}>
        <Disc mood={mood} onMove={setMood} size="small" />
        <h1 className={s.roomName}>{roomNameOf(mood)}</h1>
        <form className={s.describe} onSubmit={(e) => e.preventDefault()}>
          <label className={s.srOnly} htmlFor="describe-b">
            Describe a moment
          </label>
          <input id="describe-b" className={s.input} placeholder="Describe a moment: sunday coffee while it rains" autoComplete="off" />
          <button className={s.solidButton} type="submit">
            Hang
          </button>
        </form>
      </header>

      <ol className={s.grid}>
        {hang.map((w, i) => (
          <li key={w.id} className={s.cell}>
            <div className={s.mat}>
              <span className={s.index}>{String(i + 1).padStart(2, "0")}</span>
              <Image src={w.thumbUrl} alt={`${w.title}, ${w.artist}`} width={w.thumbW} height={w.thumbH} unoptimized priority={i < 6} sizes="(max-width: 640px) 45vw, 22vw" />
            </div>
            <p className={s.title}>{w.title}</p>
            <p className={s.meta}>
              {w.artist}, {w.date}
            </p>
            <div className={s.reacts}>
              <button className={s.lineButton} onClick={() => nudge(w, 1)}>
                Closer
              </button>
              <button className={s.lineButton} onClick={() => nudge(w, -1)}>
                Drift
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className={s.more}>
        <button className={s.lineButton} onClick={() => setPages((n) => n + 1)}>
          Show more
        </button>
      </div>
    </main>
  );
}
