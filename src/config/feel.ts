// Every tunable value in Feel First lives here (spec Section 7, Res #10, Gap G18).
// Components import from this file. Nothing else hard-codes these values.

import type { BucketKey } from "../lib/buckets.ts";

// ---------------------------------------------------------------------------
// Identity and contact
// ---------------------------------------------------------------------------

/** Neutral working name of the experience [Gap G15, Res #26]. */
export const workingName = "Feel First";

/** Contact shown on Close and Signals [Res #29]. */
export const contactEmail = "scott@reasinger.net";

/** LinkedIn profile shown on Close and Signals [Gap G15]. */
export const linkedInUrl = "https://www.linkedin.com/in/scottreasinger/";

// ---------------------------------------------------------------------------
// AI model
// ---------------------------------------------------------------------------

/** Claude model used by J1, J2, J4 and J8 [docs/ai-jobs.md, D-006]. */
export const claudeModel = "claude-opus-5-5";

/**
 * Effort per job: how much the model thinks before answering, which sets thinking-token spend.
 * J2 runs live under a 4-second timeout, so it thinks least. Set from the M3 pilots.
 */
export const claudeEffort = {
  j1: "medium",
  j2: "low",
  j4: "low",
  j8: "medium",
} as const satisfies Record<string, "low" | "medium" | "high">;

// ---------------------------------------------------------------------------
// Room and matching (J3, J7)
// ---------------------------------------------------------------------------

/** Works shown per lane per page; the two lanes are interleaved [Res #5, refined by Res #37, Gap G18, Gap G22]. */
export const roomPageSizePerLane = 6;

/** Fraction of the distance the mood point moves on Closer (toward) or Drift (away) [Res #10, Gap G18]. */
export const nudgeStep = 0.3;

/** What Drift does to a work: it moves to the end of its own lane's ranked list for the session [Gap G10, Gap G18, Gap G22]. */
export const driftBehavior = "end-of-lane" as const;

/**
 * The feeling wheel: the 12 feelings sit evenly, 30 degrees apart, counterclockwise from valence +1,
 * in the angle order of their catalog positions [D-044, D-049].
 */
export const feelingWheelOrder = [
  "nostalgic",
  "joyful",
  "playful",
  "awe",
  "energized",
  "defiant",
  "tense",
  "melancholy",
  "contemplative",
  "wistful",
  "serene",
  "tender",
] as const;

/** Where the feelings sit on the wheel, as a fraction of its radius [D-049]. */
export const feelingWheelRadius = 0.75;

/** Mood bucket cut points on each axis, giving a 3x3 grid of equal thirds [Gap G4, Gap G18]. */
export const bucketCutPoints = [-1 / 3, 1 / 3] as const;

/** One room name per mood bucket, written once and approved by Scott on 2026-10-11 [Res #9, RB54]. */
export const roomNames = {
  "heavy-calm": "Low Light",
  "mid-calm": "Still Air",
  "bright-calm": "Morning Light",
  "heavy-mid": "Overcast",
  "mid-mid": "Plain Daylight",
  "bright-mid": "Warm Afternoon",
  "heavy-charged": "Gathering Storm",
  "mid-charged": "High Wind",
  "bright-charged": "Full Sun",
} as const satisfies Record<BucketKey, string>;

/** Number of emotion tags shown in the Piece fingerprint [Res #13]. */
export const fingerprintTagCount = 3;

// ---------------------------------------------------------------------------
// J2 mood interpreter
// ---------------------------------------------------------------------------

/** Live J2 call timeout before the word-map fallback answers [Res #7, Gap G18]. */
export const j2TimeoutMs = 4000;

/** Best-effort per-instance J2 rate limit: 20 calls per IP per hour [Gap G18]. */
export const j2RateLimit = { calls: 20, windowMs: 60 * 60 * 1000 } as const;

/** Room types J2 may return [Gap G7]. */
export const roomTypes = [
  "living room",
  "bedroom",
  "office",
  "kitchen",
  "nursery",
  "entry",
] as const;
export type RoomType = (typeof roomTypes)[number];

/** Size words J2 may return, mapped to print size ids [Gap G7]. */
export const sizeWordToPrintSize = {
  small: "12x16",
  medium: "18x24",
  large: "30x40",
} as const;
export type SizeWord = keyof typeof sizeWordToPrintSize;

// ---------------------------------------------------------------------------
// Pricing [Gap G5]
// ---------------------------------------------------------------------------

/** Print sizes in inches with their base (paper print) price in USD [Gap G5]. */
export const printSizes = [
  { id: "12x16", widthIn: 12, heightIn: 16, basePrice: 39 },
  { id: "18x24", widthIn: 18, heightIn: 24, basePrice: 69 },
  { id: "24x36", widthIn: 24, heightIn: 36, basePrice: 119 },
  { id: "30x40", widthIn: 30, heightIn: 40, basePrice: 179 },
] as const;
export type PrintSizeId = (typeof printSizes)[number]["id"];

/**
 * Materials and their price rules [Gap G5].
 * Paper is the base price. Canvas is 1.6x base.
 * Framed print is base plus a flat amount plus a per-inch amount on the outer frame perimeter:
 * the print plus the mat and the frame on every side [Gap G5, Gap G28, amended by D-048].
 */
export const materials = {
  paper: { label: "Paper print", baseMultiplier: 1 },
  canvas: { label: "Canvas", baseMultiplier: 1.6 },
  framed: { label: "Framed print", baseMultiplier: 1, framedFlat: 60, framedPerPerimeterInch: 1.5 },
} as const;
export type MaterialId = keyof typeof materials;

/** Frame finishes, all the same price [Gap G5, upheld by Res #42]. */
export const frameFinishes = ["black", "natural oak", "white", "brass"] as const;
export type FrameFinish = (typeof frameFinishes)[number];

/**
 * What the Piece screen selects before the visitor chooses. A described size word overrides the size [Res #6].
 * Decided by Scott in D-054.
 */
export const pieceDefaults: { size: PrintSizeId; material: MaterialId; frame: FrameFinish } = {
  size: "18x24",
  material: "framed",
  frame: "black",
};

/** Flat shipping estimate in USD; no tax [Gap G5, Res #14]. */
export const shippingFlat = 9.95;

// ---------------------------------------------------------------------------
// Wall (J5)
// ---------------------------------------------------------------------------

/** Frame width per side in inches; framed prints only [Res #41, Gap G28]. */
export const frameWidthIn = 1.25;

/** Mat width per side in inches; framed prints only [Res #41, Gap G28]. */
export const matWidthIn = 2;

/** Wall color choices, by name only until Milestone 4 sets their values [Gap G14, D-009]. */
export const wallColors = ["plaster", "sage", "ink blue", "clay", "charcoal"] as const;
export type WallColor = (typeof wallColors)[number];

/** Wall scenes; room types without a scene use the sofa [Gap G7]. */
export const wallScenes = ["sofa", "bed", "desk"] as const;
export type WallScene = (typeof wallScenes)[number];
export const defaultWallScene: WallScene = "sofa";

/** Width in inches of each scene's scale reference object [Res #12, Gap G30]. */
export const wallSceneReferenceWidthIn: Record<WallScene, number> = {
  sofa: 84,
  bed: 60,
  desk: 60,
};

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** The one line on the Threshold [Gap G12]. */
export const thresholdPrompt = "Move the light until it feels right.";

/** The Room sentence under the feeling heading, one per feeling, approved by Scott [D-045, D-051]. */
export const feelingSentences = {
  joyful: "A room of bright color and easy laughter.",
  playful: "A room of bold shapes and a little mischief.",
  energized: "A room that moves, with strong color and somewhere to go.",
  awe: "A room of big skies and things larger than you.",
  serene: "A room of soft light and slow mornings.",
  tender: "A room of warm light and quiet care.",
  contemplative: "A room for slow looking and long thoughts.",
  nostalgic: "A room of old places and the people we were there.",
  wistful: "A room of faded afternoons and things just out of reach.",
  melancholy: "A room of low light that lets a sad day be a sad day.",
  tense: "A room of held breath, sharp edges and weather coming in.",
  defiant: "A room that stands its ground, loud and unafraid.",
} as const satisfies Record<(typeof feelingWheelOrder)[number], string>;

/** Shown under the describe box when no word of the text is in the word map [D-052]. */
export const describeNoMatch = "Nothing in that moved the light. Try a word like rainy, calm or bright.";

/** Placeholder in the describe box: the demo video phrase, which every interpreter reads [D-037]. */
export const describePlaceholder = "a slow sunday morning in the bedroom, something large";

// ---------------------------------------------------------------------------
// Cost line [spec Section 8, Res #40, Gap G31]
// ---------------------------------------------------------------------------

/**
 * The Close screen Builder Notes cost line: "Built in N days for $X in AI and hosting."
 * N and X stay null until Scott fills them from build-log.md on the day the video is recorded.
 * Never estimate them.
 */
export const costLine = {
  days: null as number | null,
  dollars: null as number | null,
};

/** The cost line stays hidden until N and X are filled [Res #40, Gap G31]. */
export const showCostLine = false;

/** Renders the cost line text with the exact wording from spec Section 6.2. */
export function costLineText(days: number, dollars: number): string {
  return `Built in ${days} days for $${dollars} in AI and hosting.`;
}
