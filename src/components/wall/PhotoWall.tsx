"use client";

// Wall photo mode [spec Section 5.4, J5, Res #12]: the visitor chooses a photo of their own wall (file upload only),
// drags a line across something they know the size of and enters its length, which sets pixels per inch. No wall
// detection. The photo is shown from an object URL that is revoked when it is replaced or the visitor leaves; it is
// never sent anywhere or held in the session store (D-067). The length range is D-072.

import { useEffect, useState, type KeyboardEvent, type PointerEvent } from "react";
import { photoCopy, type FrameFinish } from "@/config/feel";
import type { WorkCard } from "@/lib/catalog";
import { photoPixelsPerInch } from "@/lib/wall";
import { HungPrint, useWidths } from "./Hung";
import c from "@/styles/controls.module.css";
import s from "./Wall.module.css";

type Pt = { x: number; y: number };
type Line = { a: Pt; b: Pt };
type Shape = { width: number; height: number };

/** A fresh line across the middle of the photo, so keyboard visitors have one to adjust. Points are fractions of the photo. */
const startLine: Line = { a: { x: 0.35, y: 0.5 }, b: { x: 0.65, y: 0.5 } };
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

type Props = { work: WorkCard; hung: Shape; print: Shape; frame: FrameFinish | null; onLeave: () => void };

export function PhotoWall({ work, hung, print, frame, onLeave }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<Shape | null>(null);
  const [line, setLine] = useState<Line>(startLine);
  const [drawing, setDrawing] = useState(false);
  const [length, setLength] = useState("");
  // The last scale that passed, as a fraction of the stage width per inch, so it survives a resize [D-072].
  const [applied, setApplied] = useState<number | null>(null);
  const [stageRef, widths] = useWidths();

  // The object URL lives only as long as this photo is on screen [D-067].
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const stageW = widths.stage;
  const stageH = photoSize ? (stageW * photoSize.height) / photoSize.width : 0;
  const linePx = (l: Line) => Math.hypot((l.b.x - l.a.x) * stageW, (l.b.y - l.a.y) * stageH);
  const check = (l: Line, text: string) => (text.trim() === "" ? null : photoPixelsPerInch(linePx(l), Number(text)));
  const apply = (l: Line, text: string) => {
    const scale = check(l, text);
    if (scale?.ok) setApplied(scale.pixelsPerInch / stageW);
  };

  const result = check(line, length);
  const note = result && !result.ok ? (result.reason === "length" ? photoCopy.outOfRange : photoCopy.shortLine) : "";
  const ppi = applied === null ? null : applied * stageW;

  const choose = (file: File | undefined) => {
    if (!file) return;
    setUrl(URL.createObjectURL(file));
    setPhotoSize(null);
    setLine(startLine);
    setApplied(null);
  };

  const at = (e: PointerEvent<HTMLDivElement>): Pt => {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: clamp01((e.clientX - box.left) / box.width), y: clamp01((e.clientY - box.top) / box.height) };
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = at(e);
    setLine({ a: p, b: p });
    setDrawing(true);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!drawing) return;
    const b = at(e);
    setLine((l) => ({ ...l, b }));
  };
  const up = () => {
    setDrawing(false);
    apply(line, length);
  };
  /** Arrow keys move one end of the line: 2px a step, 20px with Shift. */
  const nudge = (end: "a" | "b") => (e: KeyboardEvent) => {
    const step = (e.shiftKey ? 20 : 2) / stageW;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -(step * stageW) / stageH], ArrowDown: [0, (step * stageW) / stageH] }[e.key];
    if (!d) return;
    e.preventDefault();
    const next = { ...line, [end]: { x: clamp01(line[end].x + d[0]), y: clamp01(line[end].y + d[1]) } };
    setLine(next);
    apply(next, length);
  };

  return (
    <div className={s.photoMode}>
      <div className={s.photoBar}>
        <label className={c.pill}>
          {url ? photoCopy.another : photoCopy.choose}
          <input className={s.file} type="file" accept="image/*" onChange={(e) => choose(e.target.files?.[0])} />
        </label>
        <button className={c.text} onClick={onLeave}>
          {photoCopy.preset}
        </button>
      </div>
      <p className={s.note}>{photoCopy.stays}</p>

      {url && (
        <>
          <div ref={stageRef} className={s.photoStage} style={photoSize ? { aspectRatio: `${photoSize.width} / ${photoSize.height}` } : undefined} data-ppi={ppi?.toFixed(4) ?? ""}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the visitor's own photo from an object URL, never uploaded */}
            <img className={s.photo} src={url} alt="Your wall" onLoad={(e) => setPhotoSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} />
            {photoSize && stageW > 0 && (
              <>
                {ppi !== null && (
                  <div className={s.photoPiece} style={{ width: hung.width * ppi, height: hung.height * ppi }}>
                    <HungPrint work={work} ppi={ppi} frame={frame} print={print} />
                  </div>
                )}
                <div className={s.draw} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                  <svg className={s.measure} width={stageW} height={stageH} aria-hidden>
                    <line x1={line.a.x * stageW} y1={line.a.y * stageH} x2={line.b.x * stageW} y2={line.b.y * stageH} />
                  </svg>
                </div>
                {(["a", "b"] as const).map((end) => (
                  <button
                    key={end}
                    className={s.handle}
                    style={{ left: line[end].x * stageW, top: line[end].y * stageH }}
                    aria-label={end === "a" ? "Start of the line" : "End of the line"}
                    onKeyDown={nudge(end)}
                  />
                ))}
              </>
            )}
          </div>
          <p className={s.note}>{photoCopy.howTo}</p>
          <div className={s.length}>
            <label className={s.lengthLabel} htmlFor="photo-length">
              {photoCopy.lengthLabel}
            </label>
            <input
              id="photo-length"
              className={s.lengthInput}
              type="number"
              inputMode="decimal"
              step="any"
              value={length}
              onChange={(e) => {
                setLength(e.target.value);
                apply(line, e.target.value);
              }}
            />
          </div>
          <p className={s.quiet} role="status">
            {note}
          </p>
        </>
      )}
    </div>
  );
}
