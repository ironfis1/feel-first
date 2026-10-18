"use client";

// Wall [spec Section 5.4, docs/ai-jobs.md J5]: the current selection at true scale on a preset wall, beside a sofa,
// a bed or a desk drawn in code, on one of five wall paints (D-071), or on the visitor's own wall photo with a
// manual scale (D-067, D-072). The default scene follows the described room type (D-062, D-070). With no piece
// chosen yet, the Room's first work hangs at the Piece defaults (D-069). The frame can be changed here (D-073);
// a bag line is created only by Add to bag [Gap G20], which then opens the Bag (D-077). The size can be changed here
// too (D-076), and the photo button opens the file chooser at once (D-078).

import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  frameFinishes,
  materials,
  photoCopy,
  pieceDefaults,
  printSizes,
  sizeWordToPrintSize,
  wallColors,
  wallScenes,
  wallView,
  type FrameFinish,
  type WallColor,
  type WallScene,
} from "@/config/feel";
import { lineKey } from "@/lib/bag";
import type { WorkCard } from "@/lib/catalog";
import { moodFor, type FeelingPositions } from "@/lib/feelings";
import { hang } from "@/lib/j3";
import { formatPrice, frameFor, priceOf } from "@/lib/pricing";
import { chooseFrame, hangBottomIn, hungInches, printInches, sceneFor, scenePixelsPerInch, wallSpanIn } from "@/lib/wall";
import { ScreenNav } from "../ScreenNav";
import { useSession, type Selection } from "../session/Session";
import { finishFill, HungPrint, useWidths } from "./Hung";
import { PhotoWall } from "./PhotoWall";
import { SceneObject } from "./Scenes";
import c from "@/styles/controls.module.css";
import s from "./Wall.module.css";

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
const paint = (name: string) => `var(--wall-${name.replace(" ", "-")})`;

export function Wall({ works, positions }: { works: readonly WorkCard[]; positions: FeelingPositions }) {
  const session = useSession();
  const { point, drifted, described, bag } = session;
  const selection: Selection = session.selection ?? {
    workId: hang(works, moodFor(point, positions), 1, drifted)[0].id,
    size: described?.size ? sizeWordToPrintSize[described.size] : pieceDefaults.size,
    material: pieceDefaults.material,
    finish: pieceDefaults.frame,
  };
  const work = works.find((w) => w.id === selection.workId)!;
  const [scene, setScene] = useState<WallScene>(sceneFor(described?.roomType));
  const [color, setColor] = useState<WallColor>("plaster");
  // The visitor's wall photo as an object URL, revoked when it is replaced or the visitor leaves [D-067].
  const [photo, setPhoto] = useState<string | null>(null);
  const [stageRef, widths] = useWidths();
  const router = useRouter();
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo]);
  const choosePhoto = (file: File | undefined) => file && setPhoto(URL.createObjectURL(file));

  const span = wallSpanIn(widths.window);
  const ppi = scenePixelsPerInch(widths.stage, span);
  const frame = frameFor(selection.material, selection.finish);
  const hung = hungInches(work, selection.size, selection.material);
  const print = printInches(work, selection.size);
  const size = printSizes.find((p) => p.id === selection.size)!;
  const choice = { workId: work.id, size: selection.size, material: selection.material, frame };
  const inBag = bag.some((l) => l.key === lineKey(choice));

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

        {photo ? (
          <PhotoWall key={photo} url={photo} work={work} hung={hung} print={print} frame={frame} onChoose={choosePhoto} onLeave={() => setPhoto(null)} />
        ) : (
          <div>
            <div
              ref={stageRef}
              className={s.stage}
              style={{ aspectRatio: `${span} / ${wallView.heightIn}`, maxWidth: `calc(72vh * ${span / wallView.heightIn})`, "--wall": paint(color) } as CSSProperties}
              data-scene={scene}
              data-ppi={ppi.toFixed(4)}
            >
              {widths.stage > 0 && (
                <>
                  <SceneObject scene={scene} ppi={ppi} className={s.object} />
                  <div className={s.piece} style={{ width: hung.width * ppi, height: hung.height * ppi, bottom: hangBottomIn(scene, hung.height) * ppi }}>
                    <HungPrint work={work} ppi={ppi} frame={frame} print={print} />
                  </div>
                </>
              )}
              <span className={s.light} aria-hidden />
            </div>
            <label className={`${c.text} ${s.photoLink}`}>
              {photoCopy.choose}
              <input className={s.file} type="file" accept="image/*" onChange={(e) => choosePhoto(e.target.files?.[0])} />
            </label>
          </div>
        )}

        <section className={s.choices} aria-label="Your wall">
          {!photo && (
            <>
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
                    <span className={s.swatch} style={{ background: paint(wc) }} aria-hidden />
                    {cap(wc)}
                  </button>
                ))}
              </Choices>
            </>
          )}
          <Choices label="Size">
            {printSizes.map((p) => (
              <button key={p.id} className={s.choice} aria-pressed={selection.size === p.id} onClick={() => session.select({ ...selection, size: p.id })}>
                {p.widthIn} x {p.heightIn} in <span className={s.price}>{formatPrice(priceOf(p.id, selection.material))}</span>
              </button>
            ))}
          </Choices>
          <Choices label="Frame">
            {[...frameFinishes, null].map((f: FrameFinish | null) => (
              <button key={f ?? "none"} className={s.choice} aria-pressed={frame === f} onClick={() => session.select(chooseFrame(selection, f))}>
                {f && <span className={s.swatch} style={{ background: finishFill(f) }} aria-hidden />}
                {f ? cap(f) : "No frame"}
              </button>
            ))}
          </Choices>
        </section>

        <div className={s.buy}>
          <p className={s.total}>{formatPrice(priceOf(selection.size, selection.material))}</p>
          <button
            className={c.pill}
            onClick={() => {
              if (!inBag) session.addToBag(choice);
              router.push("/bag");
            }}
          >
            {inBag ? "In your bag" : "Add to bag"}
          </button>
        </div>
      </div>
    </main>
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
