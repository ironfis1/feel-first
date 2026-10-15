"use client";

// Threshold [spec Section 5.1]: the feeling wheel, the feeling named beside it, the one-line prompt, and Step in.

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { thresholdPrompt } from "@/config/feel";
import { feelingAt } from "@/lib/feelings";
import { useSession } from "../session/Session";
import { FeelingWheel } from "../wheel/FeelingWheel";
import c from "@/styles/controls.module.css";
import s from "./Threshold.module.css";

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/** Milliseconds the light takes to open into the Room; matches --m-enter. */
const enterMs = 650;

export function Threshold() {
  const { point, touched, movePoint } = useSession();
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const feel = feelingAt(point);

  const enter = () => {
    // With reduced motion the Room opens at once, without the opening light.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push("/room");
    setEntering(true);
    window.setTimeout(() => router.push("/room"), enterMs);
  };

  return (
    <main className={`${s.threshold} ${entering ? s.entering : ""}`}>
      <span className={s.wash} style={{ "--wx": `${(50 + point.x * 50).toFixed(2)}%`, "--wy": `${(50 - point.y * 50).toFixed(2)}%` } as CSSProperties} aria-hidden />
      <FeelingWheel point={point} onMove={movePoint} className={s.wheel} />
      <div className={s.naming} aria-live="polite">
        <p key={feel.main} className={s.feeling}>
          {touched ? cap(feel.main) : " "}
        </p>
        <p className={s.also}>{touched && feel.also ? `a little ${feel.also}` : " "}</p>
      </div>
      <div className={s.foot}>
        <p className={s.prompt}>{thresholdPrompt}</p>
        <button className={`${c.pill} ${s.step} ${touched ? s.stepShown : ""}`} onClick={enter} tabIndex={touched ? 0 : -1} aria-hidden={!touched}>
          Step in
        </button>
      </div>
    </main>
  );
}
