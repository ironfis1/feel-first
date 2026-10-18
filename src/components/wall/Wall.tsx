"use client";

// Wall [spec Section 5.4, docs/ai-jobs.md J5]: the current selection at true scale on a preset wall, beside a sofa,
// a bed or a desk drawn in code, on one of five wall colors. The default scene follows the described room type
// (D-062, D-070). With no piece chosen yet, the Room's first work hangs at the Piece defaults (D-069).

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { frameWidthIn, materials, matWidthIn, pieceDefaults, printSizes, sizeWordToPrintSize, wallColors, wallScenes, wallView, type WallColor, type WallScene } from "@/config/feel";
import type { WorkCard } from "@/lib/catalog";
import { moodFor, type FeelingPositions } from "@/lib/feelings";
import { hang } from "@/lib/j3";
import { frameFor } from "@/lib/pricing";
import { hangBottomIn, hungInches, printInches, sceneFor, scenePixelsPerInch, wallSpanIn } from "@/lib/wall";
import { ScreenNav } from "../ScreenNav";
import { useSession, type Selection } from "../session/Session";
import { SceneObject } from "./Scenes";
import c from "@/styles/controls.module.css";
import s from "./Wall.module.css";

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
const token = (name: string) => `var(--wall-${name.replace(" ", "-")})`;

/** Width of a stage element and of the window in pixels, kept current on resize. Zero until measured. */
function useWidths() {
  const ref = useRef<HTMLDivElement>(null);
  const [widths, setWidths] = useState({ stage: 0, window: 0 });
  useEffect(() => {
    const el = ref.current;
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
  }, []);
  return [ref, widths] as const;
}

export function Wall({ works, positions }: { works: readonly WorkCard[]; positions: FeelingPositions }) {
  const session = useSession();
  const { point, drifted, described } = session;
  const selection: Selection = session.selection ?? {
    workId: hang(works, moodFor(point, positions), 1, drifted)[0].id,
    size: described?.size ? sizeWordToPrintSize[described.size] : pieceDefaults.size,
    material: pieceDefaults.material,
    finish: pieceDefaults.frame,
  };
  const work = works.find((w) => w.id === selection.workId)!;
  const [scene, setScene] = useState<WallScene>(sceneFor(described?.roomType));
  const [color, setColor] = useState<WallColor>("plaster");
  const [stageRef, widths] = useWidths();

  const span = wallSpanIn(widths.window);
  const ppi = scenePixelsPerInch(widths.stage, span);
  const frame = frameFor(selection.material, selection.finish);
  const hung = hungInches(work, selection.size, selection.material);
  const size = printSizes.find((p) => p.id === selection.size)!;

  return (
    <main className={c.screen}>
      <ScreenNav />
      <div className={`${c.column} ${s.wall}`}>
        <header className={s.head}>
          <h1 className={c.title}>{work.title}</h1>
          <p className={s.byline}>
            {work.artist}, {work.date}
          </p>
          <p className={s.spec}>
            {size.widthIn} x {size.heightIn} in, {materials[selection.material].label.toLowerCase()}
            {frame ? `, ${frame} frame` : ""}
          </p>
        </header>

        <div
          ref={stageRef}
          className={s.stage}
          style={{ aspectRatio: `${span} / ${wallView.heightIn}`, maxWidth: `calc(72vh * ${span / wallView.heightIn})`, "--wall": token(color) } as CSSProperties}
          data-scene={scene}
          data-ppi={ppi.toFixed(4)}
        >
          {widths.stage > 0 && (
            <>
              <SceneObject scene={scene} ppi={ppi} className={s.object} />
              <div className={s.piece} style={{ width: hung.width * ppi, height: hung.height * ppi, bottom: hangBottomIn(scene, hung.height) * ppi }}>
                <HungPrint work={work} ppi={ppi} frame={frame} print={printInches(work, selection.size)} />
              </div>
            </>
          )}
          <span className={s.light} aria-hidden />
        </div>

        <section className={s.choices} aria-label="Your wall">
          <Choices label="Scene">
            {wallScenes.map((sc) => (
              <button key={sc} className={s.choice} aria-pressed={scene === sc} onClick={() => setScene(sc)}>
                {cap(sc)}
              </button>
            ))}
          </Choices>
          <Choices label="Wall color">
            {wallColors.map((wc) => (
              <button key={wc} className={s.choice} aria-pressed={color === wc} onClick={() => setColor(wc)}>
                <span className={s.swatch} style={{ background: token(wc) }} aria-hidden />
                {cap(wc)}
              </button>
            ))}
          </Choices>
        </section>
      </div>
    </main>
  );
}

/** The print at its true size: the frame and mat at their true widths around it when framed, the whole work inside. */
function HungPrint({ work, ppi, frame, print }: { work: WorkCard; ppi: number; frame: string | null; print: { width: number; height: number } }) {
  const art = (
    // eslint-disable-next-line @next/next/no-img-element -- local thumbnail, sized in code to true scale
    <img className={s.art} src={work.thumbUrl} alt={`${work.title}, ${work.artist}`} width={work.width} height={work.height} />
  );
  if (!frame) return <div className={s.print}>{art}</div>;
  return (
    <div className={s.frame} style={{ padding: frameWidthIn * ppi, background: `var(--finish-${frame.replace(" ", "-")})` }} data-frame={frame}>
      <div className={s.mat} style={{ padding: matWidthIn * ppi }}>
        <div className={s.print} style={{ width: print.width * ppi, height: print.height * ppi }}>
          {art}
        </div>
      </div>
    </div>
  );
}

function Choices({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.group} role="group" aria-label={label}>
      <p className={c.label}>{label}</p>
      <div className={s.options}>{children}</div>
    </div>
  );
}
