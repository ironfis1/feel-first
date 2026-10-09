// Every tunable value in Feel First lives here (spec Section 7, Res #10, Gap G18).
// Components import from this file. Nothing else hard-codes these values.

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

// ---------------------------------------------------------------------------
// Room and matching (J3, J7)
// ---------------------------------------------------------------------------

/** Works shown per lane per page; the two lanes are interleaved [Res #5, refined by Res #37, Gap G18, Gap G22]. */
export const roomPageSizePerLane = 6;

/** Fraction of the distance the mood point moves on Closer (toward) or Drift (away) [Res #10, Gap G18]. */
export const nudgeStep = 0.3;

/** What Drift does to a work: it moves to the end of its own lane's ranked list for the session [Gap G10, Gap G18, Gap G22]. */
export const driftBehavior = "end-of-lane" as const;

/** Mood bucket cut points on each axis, giving a 3x3 grid of equal thirds [Gap G4, Gap G18]. */
export const bucketCutPoints = [-1 / 3, 1 / 3] as const;

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
 * Framed print is base plus a flat amount plus a per-inch amount on the print width, not the outer frame width [Gap G28].
 */
export const materials = {
  paper: { label: "Paper print", baseMultiplier: 1 },
  canvas: { label: "Canvas", baseMultiplier: 1.6 },
  framed: { label: "Framed print", baseMultiplier: 1, framedFlat: 60, framedPerWidthInch: 1.5 },
} as const;
export type MaterialId = keyof typeof materials;

/** Frame finishes, all the same price [Gap G5, upheld by Res #42]. */
export const frameFinishes = ["black", "natural oak", "white", "brass"] as const;
export type FrameFinish = (typeof frameFinishes)[number];

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
