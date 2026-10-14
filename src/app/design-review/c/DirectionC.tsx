"use client";

// Round 1, Direction C: the feeling wheel (D-044, D-045). Local review only.

import Image from "next/image";
import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { roomPageSizePerLane, thresholdPrompt } from "@/config/feel";
import { clampToCircle, moodFromKey, moodFromPointer, reviewHang, roomNameOf, type Mood, type ReviewWork } from "../_shared/review";
import s from "./c.module.css";

type Positions = Record<string, Mood>;

/** One color per feeling. The wheel is painted from these at each feeling's position. */
const feelingColor: Record<string, string> = {
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
const feelingSentence: Record<string, string> = {
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
function feelingAt(p: Mood, pos: Positions): { main: string; also: string | null } {
  const ranked = Object.entries(pos)
    .map(([k, q]) => ({ k, d: Math.hypot(q.v - p.v, q.a - p.a) }))
    .sort((x, y) => x.d - y.d);
  const [first, second] = ranked;
  return { main: first.k, also: second.d < first.d * 1.35 + 0.02 ? second.k : null };
}

function wheelPaint(pos: Positions): CSSProperties {
  const layers = Object.entries(pos).map(
    ([k, q]) => `radial-gradient(circle at ${50 + q.v * 50}% ${50 - q.a * 50}%, ${feelingColor[k]}cc 0%, ${feelingColor[k]}00 34%)`,
  );
  return { backgroundImage: [...layers, "radial-gradient(circle, #2a2733 0%, #16151b 72%)"].join(", ") };
}

function pointVars(p: Mood, color: string): CSSProperties {
  const ta = (p.a + 1) / 2;
  return {
    "--x": `${50 + p.v * 50}%`,
    "--y": `${50 - p.a * 50}%`,
    "--feel": color,
    "--pulse": `${(6 - 4.6 * ta).toFixed(2)}s`,
  } as CSSProperties;
}

function Wheel({ mood, onMove, pos, compact }: { mood: Mood; onMove: (p: Mood) => void; pos: Positions; compact?: boolean }) {
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
  const paint = useMemo(() => wheelPaint(pos), [pos]);
  return (
    <div
      ref={ref}
      className={compact ? s.wheelCompact : s.wheel}
      style={{ ...paint, ...pointVars(mood, feelingColor[feel.main]) }}
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
      <span className={s.point} aria-hidden />
    </div>
  );
}

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

export function DirectionC({ works, positions }: { works: ReviewWork[]; positions: Positions }) {
  const [mood, setMood] = useState<Mood>({ v: 0, a: 0 });
  const [touched, setTouched] = useState(false);
  const [view, setView] = useState<"threshold" | "room">("threshold");
  const [pages, setPages] = useState(1);
  const [demoted, setDemoted] = useState<Set<string>>(new Set());

  const feel = feelingAt(mood, positions);
  const color = feelingColor[feel.main];
  const hang = useMemo(() => reviewHang(works, mood, roomPageSizePerLane * pages, demoted), [works, mood, pages, demoted]);

  const move = (p: Mood) => {
    setMood(p);
    setTouched(true);
  };
  const nudge = (w: ReviewWork, dir: 1 | -1) => {
    setMood((p) => clampToCircle({ v: p.v + dir * 0.3 * (w.v - p.v), a: p.a + dir * 0.3 * (w.a - p.a) }));
    if (dir === -1) setDemoted((d) => new Set(d).add(w.id));
  };

  const tint = { "--feel": color } as CSSProperties;

  if (view === "threshold") {
    return (
      <main className={`${s.root} ${s.threshold}`} style={tint}>
        <span className={s.wash} aria-hidden />
        <Wheel mood={mood} onMove={move} pos={positions} />
        <div className={s.naming} aria-live="polite">
          <p key={feel.main} className={s.feeling}>
            {touched ? cap(feel.main) : " "}
          </p>
          <p className={s.also}>{touched && feel.also ? `a little ${feel.also}` : " "}</p>
        </div>
        <div className={s.foot}>
          <p className={s.prompt}>{thresholdPrompt}</p>
          <button className={`${s.pill} ${touched ? s.shown : s.waiting}`} onClick={() => setView("room")} tabIndex={touched ? 0 : -1} aria-hidden={!touched}>
            Show me the room
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`${s.root} ${s.room}`} style={tint}>
      <span className={s.roomWash} aria-hidden />
      <header className={s.head}>
        <div className={s.headText}>
          <p className={s.eyebrow}>{roomNameOf(mood)}</p>
          <h1 key={feel.main} className={s.roomFeeling}>
            {cap(feel.main)}
            {feel.also && <span className={s.roomAlso}>, a little {feel.also}</span>}
          </h1>
          <p className={s.sentence}>{feelingSentence[feel.main]}</p>
          <form className={s.describe} onSubmit={(e) => e.preventDefault()}>
            <label className={s.describeLabel} htmlFor="describe-c">
              Or describe the moment
            </label>
            <div className={s.describeRow}>
              <input id="describe-c" className={s.input} placeholder="sunday coffee while it rains" autoComplete="off" />
              <button className={s.pill} type="submit">
                Hang it
              </button>
            </div>
          </form>
        </div>
        <Wheel mood={mood} onMove={setMood} pos={positions} compact />
      </header>

      <ol className={s.grid}>
        {hang.map((w, i) => (
          <li key={w.id} className={s.cell}>
            <div className={s.mat}>
              <Image src={w.thumbUrl} alt={`${w.title}, ${w.artist}`} width={w.thumbW} height={w.thumbH} unoptimized priority={i < 6} sizes="(max-width: 640px) 45vw, 30vw" />
            </div>
            <p className={s.title}>{w.title}</p>
            <p className={s.meta}>
              {w.artist}, {w.date}
            </p>
            <div className={s.reacts}>
              <button className={s.react} onClick={() => nudge(w, 1)}>
                Closer
              </button>
              <button className={s.react} onClick={() => nudge(w, -1)}>
                Drift
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className={s.more}>
        <button className={s.pill} onClick={() => setPages((n) => n + 1)}>
          Show more
        </button>
      </div>
    </main>
  );
}
