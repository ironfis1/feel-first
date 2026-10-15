"use client";

// The Piece image and its live framed preview, drawn in code [Res #42, Gap G29]. The full-size image comes from the
// source institution (D-001) and fades in over the local thumbnail. Works are never cropped [D-002].

import { useState, type CSSProperties } from "react";
import { frameWidthIn, matWidthIn, type FrameFinish, type PrintSizeId } from "@/config/feel";
import type { Work } from "@/lib/catalog";
import { printSize } from "@/lib/pricing";
import s from "./Preview.module.css";

type Pic = Pick<Work, "title" | "artist" | "imageUrl" | "thumbUrl" | "width" | "height">;

const finishVar = (f: FrameFinish) => `var(--finish-${f.replace(" ", "-")})`;

/** The image: the thumbnail at once, the source's full-size image over it when it arrives. */
function SourceImage({ work }: { work: Pic }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={s.image}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local thumbnail under the remote full-size image */}
      <img src={work.thumbUrl} alt="" aria-hidden width={work.width} height={work.height} />
      {/* eslint-disable-next-line @next/next/no-img-element -- full-size image linked from the source institution (D-001) */}
      <img
        src={work.imageUrl}
        alt={`${work.title}, ${work.artist}`}
        width={work.width}
        height={work.height}
        referrerPolicy="no-referrer"
        className={loaded ? s.loaded : s.loading}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}

/**
 * The print as chosen. Framed: the frame and mat at their true widths relative to the print size, the print turned
 * to the work's orientation, and the whole work inside it. Paper and canvas: the work alone.
 */
export function Preview({ work, size, frame }: { work: Pic; size: PrintSizeId; frame: FrameFinish | null }) {
  if (!frame) {
    const aspect = work.width / work.height;
    return (
      <div className={s.plain} style={{ aspectRatio: `${work.width} / ${work.height}`, width: `min(100%, calc(75vh * ${aspect.toFixed(4)}))` }}>
        <SourceImage work={work} />
      </div>
    );
  }
  const p = printSize(size);
  const landscape = work.width > work.height;
  const [w, h] = landscape ? [Math.max(p.widthIn, p.heightIn), Math.min(p.widthIn, p.heightIn)] : [p.widthIn, p.heightIn];
  const outerW = w + 2 * (matWidthIn + frameWidthIn);
  const outerH = h + 2 * (matWidthIn + frameWidthIn);
  // Padding percentages are of the containing block's width: the sizer (the frame's outside width) for the
  // frame, then the frame's inside width for the mat.
  const style = { padding: `${((frameWidthIn / outerW) * 100).toFixed(3)}%`, background: finishVar(frame) } as CSSProperties;
  return (
    <div className={s.sizer} style={{ width: `min(100%, calc(75vh * ${(outerW / outerH).toFixed(4)}))` }}>
      <div className={s.frame} style={style} data-frame={frame}>
        <div className={s.mat} style={{ padding: `${((matWidthIn / (outerW - 2 * frameWidthIn)) * 100).toFixed(3)}%` }}>
          <div className={s.print} style={{ aspectRatio: `${w} / ${h}` }}>
            <SourceImage work={work} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A large close-up of one frame corner over the mat and the work's own corner [Res #42]. */
export function FrameCorner({ work, finish }: { work: Pick<Work, "thumbUrl">; finish: FrameFinish }) {
  return (
    <span className={s.corner} aria-hidden style={{ background: finishVar(finish) }}>
      <span className={s.cornerMat}>
        <span className={s.cornerArt} style={{ backgroundImage: `url(${work.thumbUrl})` }} />
      </span>
      <span className={s.mitre} />
    </span>
  );
}
