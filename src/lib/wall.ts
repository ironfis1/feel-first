// J5 Wall reader: true-scale math for the preset scenes and photo mode, no AI [spec Section 5.4, docs/ai-jobs.md J5].

import {
  defaultWallScene,
  frameWidthIn,
  matWidthIn,
  photoScale,
  roomTypeScenes,
  wallHang,
  wallSceneHeightIn,
  wallView,
  type FrameFinish,
  type MaterialId,
  type PrintSizeId,
  type RoomType,
  type WallScene,
} from "../config/feel.ts";
import { printSize } from "./pricing.ts";

/** The default scene for a described room type: bed for the bedroom, desk for the office, the sofa otherwise [D-062]. */
export function sceneFor(roomType: RoomType | null | undefined): WallScene {
  return (roomType && roomTypeScenes[roomType]) || defaultWallScene;
}

type Shape = { width: number; height: number };

/** The print's width and height in inches, turned to the work's orientation, as the Piece preview turns it. */
export function printInches(work: Shape, size: PrintSizeId): Shape {
  const p = printSize(size);
  const long = Math.max(p.widthIn, p.heightIn);
  const short = Math.min(p.widthIn, p.heightIn);
  return work.width > work.height ? { width: long, height: short } : { width: short, height: long };
}

/** What hangs on the wall, in inches: the print, plus the mat and frame on every side for a framed print [Res #41, Gap G28]. */
export function hungInches(work: Shape, size: PrintSizeId, material: MaterialId): Shape {
  const print = printInches(work, size);
  if (material !== "framed") return print;
  const border = 2 * (matWidthIn + frameWidthIn);
  return { width: print.width + border, height: print.height + border };
}

/** The span of preset wall shown, in inches: narrower on a phone-width window so the piece is not tiny. */
export function wallSpanIn(viewportWidthPx: number): number {
  return viewportWidthPx < wallView.narrowBelowPx ? wallView.narrowWidthIn : wallView.widthIn;
}

/** Pixels per inch on the preset wall: the stage width over the span of wall it shows. */
export function scenePixelsPerInch(stageWidthPx: number, spanIn: number): number {
  return stageWidthPx / spanIn;
}

/** Height of the bottom edge of the hung piece above the floor, in inches: centered at eye level, clear of the furniture. */
export function hangBottomIn(scene: WallScene, hungHeightIn: number): number {
  return Math.max(wallHang.centerIn - hungHeightIn / 2, wallSceneHeightIn[scene] + wallHang.gapAboveIn);
}

/**
 * A frame choice on the Wall [D-073]. A finish makes the print framed with that finish. "No frame" (null) turns a
 * framed print into a paper print and leaves paper or canvas as they are. The finish is kept for a later return.
 */
export function chooseFrame<T extends { material: MaterialId; finish: FrameFinish }>(selection: T, finish: FrameFinish | null): T {
  if (finish) return { ...selection, material: "framed", finish };
  return selection.material === "framed" ? { ...selection, material: "paper" } : selection;
}

export type PhotoScale = { ok: true; pixelsPerInch: number } | { ok: false; reason: "length" | "line" };

/**
 * Photo-mode scale from the line the visitor drew and the length they entered [Res #12, D-072]: pixels per inch of
 * the photo as shown. Rejects a length outside the accepted range, then a line too short to measure.
 */
export function photoPixelsPerInch(lineLengthPx: number, lengthIn: number): PhotoScale {
  if (!Number.isFinite(lengthIn) || lengthIn < photoScale.minLengthIn || lengthIn > photoScale.maxLengthIn) return { ok: false, reason: "length" };
  if (!(lineLengthPx >= photoScale.minLinePx)) return { ok: false, reason: "line" };
  return { ok: true, pixelsPerInch: lineLengthPx / lengthIn };
}
