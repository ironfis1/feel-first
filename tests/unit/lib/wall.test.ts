import { describe, expect, it } from "vitest";
import { frameWidthIn, matWidthIn, photoScale, printSizes, roomTypes, wallSceneHeightIn, wallSceneReferenceWidthIn, wallScenes, wallView, type MaterialId } from "@/config/feel";
import { framedOuterInches } from "@/lib/pricing";
import { chooseFrame, hangBottomIn, hungInches, photoPixelsPerInch, printInches, sceneFor, scenePixelsPerInch, wallSpanIn } from "@/lib/wall";

// High tier (docs/test-tiers.md): printInches, hungInches, scenePixelsPerInch, chooseFrame, photoPixelsPerInch.
// Medium: sceneFor, wallSpanIn, hangBottomIn. Functional gates: true-scale math, D-062 scene mapping, the D-072
// photo bounds. Decisions: D-062, D-070, D-071, D-072, D-073.

const portrait = { width: 1600, height: 2000 };
const landscape = { width: 2000, height: 1500 };
const square = { width: 1800, height: 1800 };
const border = 2 * (matWidthIn + frameWidthIn);

describe("sceneFor [D-062, D-070]", () => {
  it("gives the bed for the bedroom, the desk for the office, and the sofa for every other room type", () => {
    const want: Record<string, string> = { bedroom: "bed", office: "desk" };
    for (const t of roomTypes) expect(sceneFor(t)).toBe(want[t] ?? "sofa");
  });

  it("gives the sofa when no room type was described", () => {
    expect(sceneFor(null)).toBe("sofa");
    expect(sceneFor(undefined)).toBe("sofa");
  });
});

describe("printInches", () => {
  it("keeps every size upright for a portrait or square work, as the Piece preview does", () => {
    for (const p of printSizes) {
      expect(printInches(portrait, p.id)).toEqual({ width: p.widthIn, height: p.heightIn });
      expect(printInches(square, p.id)).toEqual({ width: p.widthIn, height: p.heightIn });
    }
  });

  it("turns every size on its side for a landscape work", () => {
    for (const p of printSizes) expect(printInches(landscape, p.id)).toEqual({ width: p.heightIn, height: p.widthIn });
  });
});

describe("hungInches [Res #41, Gap G28]", () => {
  it("is the print alone for paper and canvas", () => {
    for (const p of printSizes) {
      for (const m of ["paper", "canvas"] as MaterialId[]) {
        expect(hungInches(portrait, p.id, m)).toEqual(printInches(portrait, p.id));
        expect(hungInches(landscape, p.id, m)).toEqual(printInches(landscape, p.id));
      }
    }
  });

  it("adds the mat and frame on every side for a framed print, matching the price's outer size", () => {
    expect(border).toBe(6.5);
    for (const p of printSizes) {
      expect(hungInches(portrait, p.id, "framed")).toEqual(framedOuterInches(p.id));
      expect(hungInches(landscape, p.id, "framed")).toEqual({ width: p.heightIn + border, height: p.widthIn + border });
    }
  });
});

describe("wallSpanIn and scenePixelsPerInch [D-071]", () => {
  it("shows the narrow span below 640px and the full span from 640px", () => {
    expect(wallSpanIn(0)).toBe(wallView.narrowWidthIn);
    expect(wallSpanIn(639)).toBe(100);
    expect(wallSpanIn(640)).toBe(144);
    expect(wallSpanIn(1440)).toBe(144);
  });

  it("is the stage width over the span", () => {
    expect(scenePixelsPerInch(1440, 144)).toBe(10);
    expect(scenePixelsPerInch(390, 100)).toBe(3.9);
    expect(scenePixelsPerInch(0, 144)).toBe(0);
  });

  it("draws each scene's furniture and every print, framed and unframed, at one shared scale", () => {
    const ppi = scenePixelsPerInch(1000, wallSpanIn(1440));
    for (const scene of wallScenes) {
      // The furniture is its true width on the same wall.
      expect(wallSceneReferenceWidthIn[scene] * ppi).toBeCloseTo((1000 * wallSceneReferenceWidthIn[scene]) / 144, 9);
      for (const p of printSizes) {
        const framed = hungInches(portrait, p.id, "framed");
        const paper = hungInches(portrait, p.id, "paper");
        expect(framed.width * ppi).toBeCloseTo(((p.widthIn + border) * 1000) / 144, 9);
        expect(paper.height * ppi).toBeCloseTo((p.heightIn * 1000) / 144, 9);
        // A 24-inch-wide framed print beside an 84-inch sofa keeps their real ratio on screen.
        expect((framed.width * ppi) / (wallSceneReferenceWidthIn[scene] * ppi)).toBeCloseTo((p.widthIn + border) / wallSceneReferenceWidthIn[scene], 9);
      }
    }
  });
});

describe("hangBottomIn [D-071]", () => {
  it("centers a short piece at 57 inches when that clears the furniture by 8", () => {
    expect(hangBottomIn("sofa", 16)).toBe(49);
    expect(hangBottomIn("desk", 30)).toBe(42);
  });

  it("raises a tall piece to 8 inches above the furniture", () => {
    for (const scene of wallScenes) expect(hangBottomIn(scene, 60)).toBe(wallSceneHeightIn[scene] + 8);
  });

  it("gives the same height at the tie point", () => {
    // Sofa top 34 + 8 = 42; centered bottom 57 - h/2 = 42 at h = 30.
    expect(hangBottomIn("sofa", 30)).toBe(42);
    expect(hangBottomIn("sofa", 30.5)).toBe(42);
    expect(hangBottomIn("sofa", 29.5)).toBe(42.25);
  });
});

describe("chooseFrame [D-073]", () => {
  const base = { workId: "w-1", size: "18x24" as const, finish: "black" as const };

  it("makes paper or canvas framed with the chosen finish", () => {
    expect(chooseFrame({ ...base, material: "paper" }, "brass")).toEqual({ ...base, material: "framed", finish: "brass" });
    expect(chooseFrame({ ...base, material: "canvas" }, "white")).toEqual({ ...base, material: "framed", finish: "white" });
  });

  it("swaps the finish on a framed print", () => {
    expect(chooseFrame({ ...base, material: "framed" }, "natural oak")).toEqual({ ...base, material: "framed", finish: "natural oak" });
  });

  it("turns a framed print to paper for No frame, keeping the finish for a later return", () => {
    expect(chooseFrame({ ...base, material: "framed", finish: "brass" }, null)).toEqual({ ...base, material: "paper", finish: "brass" });
  });

  it("leaves paper and canvas as they are for No frame", () => {
    const paper = { ...base, material: "paper" as const };
    const canvas = { ...base, material: "canvas" as const };
    expect(chooseFrame(paper, null)).toBe(paper);
    expect(chooseFrame(canvas, null)).toBe(canvas);
  });
});

describe("photoPixelsPerInch [Res #12, D-072]", () => {
  it("is the line length over the entered length", () => {
    expect(photoPixelsPerInch(300, 36)).toEqual({ ok: true, pixelsPerInch: 300 / 36 });
  });

  it("accepts lengths from 2 to 200 inches and rejects anything outside, or not a number", () => {
    expect(photoScale).toEqual({ minLengthIn: 2, maxLengthIn: 200, minLinePx: 20 });
    expect(photoPixelsPerInch(100, 2)).toEqual({ ok: true, pixelsPerInch: 50 });
    expect(photoPixelsPerInch(100, 200)).toEqual({ ok: true, pixelsPerInch: 0.5 });
    for (const bad of [1.99, 200.01, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(photoPixelsPerInch(100, bad)).toEqual({ ok: false, reason: "length" });
  });

  it("needs a line of at least 20 pixels", () => {
    expect(photoPixelsPerInch(20, 10)).toEqual({ ok: true, pixelsPerInch: 2 });
    expect(photoPixelsPerInch(19.99, 10)).toEqual({ ok: false, reason: "line" });
    expect(photoPixelsPerInch(Number.NaN, 10)).toEqual({ ok: false, reason: "line" });
  });

  it("reports the length first when both are wrong", () => {
    expect(photoPixelsPerInch(5, 500)).toEqual({ ok: false, reason: "length" });
  });
});
