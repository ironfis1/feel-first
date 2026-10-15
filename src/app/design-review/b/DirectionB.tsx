"use client";

// Round 2, Direction B: Print Room on the feeling wheel (D-004, D-044, D-045). Local review only.

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import { nudgeStep, roomPageSizePerLane, thresholdPrompt } from "@/config/feel";
import { FeelingWheel, feelingAt, feelingColor, feelingSentence, wheelPaint, wheelPositions, wheelPointFor, j3Mood, type Positions } from "../_shared/feelings";
import { clampToCircle, reviewHang, roomNameOf, type Mood, type ReviewWork } from "../_shared/review";
import s from "./b.module.css";

const lerp = (x: number, y: number, t: number) => x + (y - x) * t;

/** The disc carries the feeling colors; the point's ripples carry arousal as motion [Res #21]. */
function pointVars(p: Mood, color: string): CSSProperties {
  const ta = (p.a + 1) / 2;
  return {
    "--x": `${50 + p.v * 50}%`,
    "--y": `${50 - p.a * 50}%`,
    "--accent": color,
    "--ripple": `${lerp(4.2, 0.9, ta).toFixed(2)}s`,
  } as CSSProperties;
}

function Disc({ mood, onMove, size }: { mood: Mood; onMove: (p: Mood) => void; size: "large" | "small" }) {
  // Feeling colors printed on paper.
  const paint = useMemo(() => wheelPaint(wheelPositions(), "radial-gradient(circle, #fbf8f2 0%, #ece6da 100%)", "e6", 32), []);
  return (
    <FeelingWheel
      mood={mood}
      onMove={onMove}
     
      className={size === "large" ? s.disc : s.discSmall}
      style={{ ...paint, ...pointVars(mood, feelingColor[feelingAt(mood).main]) }}
    >
      <span className={s.hairV} aria-hidden />
      <span className={s.hairH} aria-hidden />
      <span className={s.point} aria-hidden>
        <span className={s.rippleA} />
        <span className={s.rippleB} />
      </span>
    </FeelingWheel>
  );
}

export function DirectionB({ works, positions }: { works: ReviewWork[]; positions: Positions }) {
  const [mood, setMood] = useState<Mood>({ v: 0, a: 0 });
  const [touched, setTouched] = useState(false);
  const [view, setView] = useState<"threshold" | "room">("threshold");
  const [pages, setPages] = useState(1);
  const [demoted, setDemoted] = useState<Set<string>>(new Set());

  const feel = feelingAt(mood);
  const j3 = useMemo(() => j3Mood(mood, positions), [mood, positions]);
  const vars = pointVars(mood, feelingColor[feel.main]);
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

  if (view === "threshold") {
    return (
      <main className={`${s.root} ${s.threshold}`} style={vars}>
        <div className={s.discWrap}>
          <Disc mood={mood} onMove={move} size="large" />
        </div>
        <div className={s.side}>
          <p className={s.prompt}>{thresholdPrompt}</p>
          <div className={s.naming} aria-live="polite">
            <p key={feel.main} className={s.feeling}>
              {touched ? feel.main : " "}
            </p>
            <p className={s.also}>{touched && feel.also ? `a little ${feel.also}` : " "}</p>
          </div>
          <button className={s.solidButton} onClick={() => setView("room")}>
            Hang the room <span aria-hidden>→</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={`${s.root} ${s.room}`} style={vars}>
      <header className={s.head}>
        <div className={s.headText}>
          <p className={s.eyebrow}>{roomNameOf(j3)}</p>
          <h1 key={feel.main} className={s.roomFeeling}>
            {feel.main}
            {feel.also && <span className={s.roomAlso}>a little {feel.also}</span>}
          </h1>
          <p className={s.sentence}>{feelingSentence[feel.main]}</p>
          <form className={s.describe} onSubmit={(e) => e.preventDefault()}>
            <label className={s.srOnly} htmlFor="describe-b">
              Or describe the moment
            </label>
            <input id="describe-b" className={s.input} placeholder="Or describe the moment: sunday coffee while it rains" autoComplete="off" />
            <button className={s.solidButton} type="submit">
              Hang
            </button>
          </form>
        </div>
        <Disc mood={mood} onMove={setMood} size="small" />
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
