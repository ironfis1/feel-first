"use client";

// Shared by the preset wall and photo mode: the stage measurement and the print drawn at true scale [Res #41, Gap G29].

import { useEffect, useState } from "react";
import { frameWidthIn, matWidthIn, type FrameFinish } from "@/config/feel";
import type { WorkCard } from "@/lib/catalog";
import s from "./Wall.module.css";

export const finishFill = (f: FrameFinish) => `var(--finish-${f.replace(" ", "-")})`;

/** Width of a stage element and of the window in pixels, kept current on resize. Zero until measured. */
export function useWidths() {
  // A callback ref, so a stage that appears later (photo mode, once a photo is chosen) is still measured.
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [widths, setWidths] = useState({ stage: 0, window: 0 });
  useEffect(() => {
    if (!el) return;
    const measure = () => setWidths({ stage: el.clientWidth, window: window.innerWidth });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      watch.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [el]);
  return [ref, widths] as const;
}

/** The print at its true size: the frame and mat at their true widths around it when framed, the whole work inside. */
export function HungPrint({ work, ppi, frame, print }: { work: WorkCard; ppi: number; frame: FrameFinish | null; print: { width: number; height: number } }) {
  const art = (
    // eslint-disable-next-line @next/next/no-img-element -- local thumbnail, sized in code to true scale
    <img className={s.art} src={work.thumbUrl} alt={`${work.title}, ${work.artist}`} width={work.width} height={work.height} />
  );
  if (!frame) return <div className={s.print}>{art}</div>;
  return (
    <div className={s.frame} style={{ padding: frameWidthIn * ppi, background: finishFill(frame) }} data-frame={frame}>
      <div className={s.mat} style={{ padding: matWidthIn * ppi }}>
        <div className={s.print} style={{ width: print.width * ppi, height: print.height * ppi }}>
          {art}
        </div>
      </div>
    </div>
  );
}
