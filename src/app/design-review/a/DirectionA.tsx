"use client";

// Round 3, Direction A: Nocturne on the even feeling wheel (D-004, D-044, D-045, D-049). Local review only.

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import { nudgeStep, roomPageSizePerLane, thresholdPrompt } from "@/config/feel";
import { cap, FeelingWheel, feelingAt, feelingColor, feelingSentence, wheelPaint, wheelPositions, wheelPointFor, j3Mood, type Positions } from "../_shared/feelings";
import { clampToCircle, reviewHang, roomNameOf, type Mood, type ReviewWork } from "../_shared/review";
import s from "./a.module.css";

const lerp = (x: number, y: number, t: number) => x + (y - x) * t;

/** The light takes the feeling's color; it tightens and quickens as arousal rises [Res #21]. */
function glowVars(p: Mood, color: string): CSSProperties {
  const ta = (p.a + 1) / 2;
  return {
    "--glow": color,
    "--glow-soft": `color-mix(in srgb, ${color} 20%, transparent)`,
    "--x": `${50 + p.v * 50}%`,
    "--y": `${50 - p.a * 50}%`,
    "--pulse": `${lerp(7, 1.1, ta).toFixed(2)}s`,
    "--size": `${lerp(46, 26, ta).toFixed(1)}%`,
  } as CSSProperties;
}

function Field({ mood, onMove, compact }: { mood: Mood; onMove: (p: Mood) => void; compact?: boolean }) {
  // Feelings are soft lights in the dark; the field has no edge beyond a faint ring.
  const paint = useMemo(() => wheelPaint(wheelPositions(), "radial-gradient(circle, #1a1920 0%, #0c0c10 70%)", "8c", 30), []);
  return (
    <FeelingWheel mood={mood} onMove={onMove} className={compact ? s.fieldCompact : s.field} style={glowVars(mood, feelingColor[feelingAt(mood).main])}>
      <span className={s.lights} style={paint} aria-hidden />
      <span className={s.ring} aria-hidden />
      <span className={s.light} aria-hidden />
    </FeelingWheel>
  );
}

export function DirectionA({ works, positions }: { works: ReviewWork[]; positions: Positions }) {
  const [mood, setMood] = useState<Mood>({ v: 0, a: 0 });
  const [touched, setTouched] = useState(false);
  const [view, setView] = useState<"threshold" | "entering" | "room">("threshold");
  const [pages, setPages] = useState(1);
  const [demoted, setDemoted] = useState<Set<string>>(new Set());

  const feel = feelingAt(mood);
  const j3 = useMemo(() => j3Mood(mood, positions), [mood, positions]);
  const vars = glowVars(mood, feelingColor[feel.main]);
  const hang = useMemo(() => reviewHang(works, j3, roomPageSizePerLane * pages, demoted), [works, j3, pages, demoted]);

  const move = (p: Mood) => {
    setMood(p);
    setTouched(true);
  };
  const nudge = (w: ReviewWork, dir: 1 | -1) => {
    // Closer and Drift move the J3 mood, then the wheel point follows it (D-049).
    setMood(wheelPointFor(clampToCircle({ v: j3.v + dir * nudgeStep * (w.v - j3.v), a: j3.a + dir * nudgeStep * (w.a - j3.a) }), positions));
    if (dir === -1) setDemoted((d) => new Set(d).add(w.id));
  };
  const enter = () => {
    setView("entering");
    window.setTimeout(() => setView("room"), 650);
  };

  if (view !== "room") {
    return (
      <main className={`${s.root} ${s.threshold} ${view === "entering" ? s.entering : ""}`} style={vars}>
        <span className={s.wash} aria-hidden />
        <Field mood={mood} onMove={move} />
        <div className={s.naming} aria-live="polite">
          <p key={feel.main} className={s.feeling}>
            {touched ? cap(feel.main) : " "}
          </p>
          <p className={s.also}>{touched && feel.also ? `a little ${feel.also}` : " "}</p>
        </div>
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
    <main className={`${s.root} ${s.room}`} style={vars}>
      <span className={s.roomWash} aria-hidden />
      <header className={s.roomHead}>
        <div className={s.roomTitle}>
          <p className={s.eyebrow}>{roomNameOf(j3)}</p>
          <h1 key={feel.main} className={s.roomFeeling}>
            {cap(feel.main)}
            {feel.also && <span className={s.roomAlso}>, a little {feel.also}</span>}
          </h1>
          <p className={s.sentence}>{feelingSentence[feel.main]}</p>
          <form className={s.describe} onSubmit={(e) => e.preventDefault()}>
            <label className={s.describeLabel} htmlFor="describe-a">
              Or describe the moment
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
