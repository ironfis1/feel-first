"use client";

// Round 1, Direction C: the feeling wheel (D-044, D-045). Local review only.

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import { roomPageSizePerLane, thresholdPrompt } from "@/config/feel";
import { cap, FeelingWheel, feelingAt, feelingColor, feelingSentence, wheelPaint, type Positions } from "../_shared/feelings";
import { clampToCircle, reviewHang, roomNameOf, type Mood, type ReviewWork } from "../_shared/review";
import s from "./c.module.css";

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
  const paint = useMemo(() => wheelPaint(pos, "radial-gradient(circle, #2a2733 0%, #16151b 72%)"), [pos]);
  return (
    <FeelingWheel mood={mood} onMove={onMove} pos={pos} className={compact ? s.wheelCompact : s.wheel} style={{ ...paint, ...pointVars(mood, feelingColor[feelingAt(mood, pos).main]) }}>
      <span className={s.point} aria-hidden />
    </FeelingWheel>
  );
}

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
