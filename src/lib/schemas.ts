// zod schemas for the data contracts (docs/testing.md, D-014).
// Data files are validated against these when they load, so a bad file fails the build.

import { z } from "zod";
import { frameFinishes, materials, printSizes, roomTypes, sizeWordToPrintSize } from "../config/feel.ts";
import { bucketKeys, type BucketKey } from "./buckets.ts";
import { inventedHeard, j2OutputSchema, normalizePhrase } from "./j2.ts";

/** The two content lanes [RB36, D-008]. */
export const lanes = ["fine-art", "poster"] as const;

/** Fixed 12-word emotion tag vocabulary [Gap G1]. */
export const emotionTags = [
  "joyful",
  "playful",
  "energized",
  "awe",
  "serene",
  "tender",
  "contemplative",
  "nostalgic",
  "wistful",
  "melancholy",
  "tense",
  "defiant",
] as const;

/** Fixed 12-subject list [Gap G1]. */
export const subjects = [
  "landscape",
  "seascape",
  "cityscape",
  "figure",
  "still life",
  "botanical",
  "animal",
  "abstract",
  "interior",
  "place",
  "graphic",
  "space",
] as const;

export const orientations = ["portrait", "landscape", "square"] as const;

/** A position on one axis of the mood field: -1 to 1 [Gap G3]. */
const axis = z.number().min(-1).max(1);

const hexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

/** The orientation a work's dimensions imply [D-016]. */
export function orientationFor(width: number, height: number): (typeof orientations)[number] {
  if (width > height) return "landscape";
  if (height > width) return "portrait";
  return "square";
}

/** Fields of one catalog work, matching the catalog.json field list [spec Section 3.2, Gap G2, D-008]. */
const workFields = {
  id: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  date: z.string().min(1),
  source: z.string().min(1),
  sourceId: z.string().min(1),
  lane: z.enum(lanes),
  imageUrl: z.url(),
  // A local path under the deployed app [D-001, D-016].
  thumbUrl: z.string().startsWith("/").min(2),
  width: z.number().positive(),
  height: z.number().positive(),
  orientation: z.enum(orientations),
  valence: axis,
  arousal: axis,
  tags: z
    .array(z.enum(emotionTags))
    .min(3)
    .max(5)
    .refine((tags) => new Set(tags).size === tags.length, "tags must be unique"),
  palette: z.array(hexColor).length(5),
  subject: z.enum(subjects),
  license: z.string().min(1),
};

const orientationMatches = (
  work: { width: number; height: number; orientation: string },
  ctx: z.RefinementCtx,
) => {
  if (work.orientation !== orientationFor(work.width, work.height)) {
    ctx.addIssue({ code: "custom", message: "orientation does not match width and height", path: ["orientation"] });
  }
};

/** An array of works with unique ids [Gap G2, D-015]. */
const catalogOf = <T extends z.ZodType<{ id: string }>>(work: T) =>
  z.array(work).superRefine((works, ctx) => {
    const seen = new Set<string>();
    works.forEach((w, index) => {
      if (seen.has(w.id)) {
        ctx.addIssue({ code: "custom", message: `duplicate id ${w.id}`, path: [index, "id"] });
      }
      seen.add(w.id);
    });
  });

/** One catalog work. Unknown fields are errors, and orientation must match the dimensions [D-016]. */
export const workSchema = z.strictObject(workFields).superRefine(orientationMatches);

/** A whole catalog file with J1's emotional fields: the M3 contract. */
export const catalogFileSchema = catalogOf(workSchema);

const { valence, arousal, tags, palette, subject, ...metadataFields } = workFields;

/** One work before J1 runs: every Section 3.2 field except valence, arousal, tags, palette and subject (M2). */
export const metadataWorkSchema = z.strictObject(metadataFields).superRefine(orientationMatches);

/** The M2 catalog file: metadata and credits, no emotional fields yet. */
export const metadataCatalogFileSchema = catalogOf(metadataWorkSchema);

/** True when the text contains an em dash, which no copy may use (CLAUDE.md writing rules). */
const emDash = String.fromCharCode(0x2014);
const noEmDash = (text: string) => !text.includes(emDash);

const positive = z.number().positive();
const effort = z.enum(["low", "medium", "high"]);

/** An object with exactly the 9 bucket keys, each holding a value of the given schema [D-027]. */
export const perBucket = <T extends z.ZodType>(value: T) =>
  z.strictObject(Object.fromEntries(bucketKeys.map((key) => [key, value])) as Record<BucketKey, T>);

/** The tunable values in src/config/feel.ts [spec Section 7, Gap G18]. */
export const configSchema = z
  .object({
    workingName: z.string().min(1),
    contactEmail: z.email(),
    linkedInUrl: z.url(),
    claudeModel: z.string().min(1),
    claudeEffort: z.strictObject({ j1: effort, j2: effort, j4: effort, j8: effort }),
    roomPageSizePerLane: z.number().int().positive(),
    nudgeStep: z.number().gt(0).lt(1),
    driftBehavior: z.literal("end-of-lane"),
    bucketCutPoints: z.tuple([axis, axis]).refine(([low, high]) => low < high, "cut points must ascend"),
    roomNames: perBucket(z.string().trim().min(1).refine(noEmDash, "no em dash")),
    fingerprintTagCount: z.number().int().min(1).max(3),
    j2TimeoutMs: z.number().int().positive(),
    j2RateLimit: z.object({ calls: z.number().int().positive(), windowMs: z.number().int().positive() }),
    j2ClientTimeoutMs: z.number().int().positive(),
    describeMaxChars: z.number().int().positive(),
    roomTypes: z.array(z.string().min(1)).min(1),
    sizeWordToPrintSize: z.object({ small: z.string(), medium: z.string(), large: z.string() }),
    printSizes: z
      .array(z.object({ id: z.string(), widthIn: positive, heightIn: positive, basePrice: positive }))
      .min(1),
    materials: z.object({
      paper: z.object({ label: z.string().min(1), baseMultiplier: positive }),
      canvas: z.object({ label: z.string().min(1), baseMultiplier: positive }),
      framed: z.object({
        label: z.string().min(1),
        baseMultiplier: positive,
        framedFlat: positive,
        framedPerPerimeterInch: positive,
      }),
    }),
    frameFinishes: z.array(z.string().min(1)).min(1),
    shippingFlat: positive,
    frameWidthIn: positive,
    matWidthIn: positive,
    wallColors: z.array(z.string().min(1)).min(1),
    wallScenes: z.array(z.string().min(1)).min(1),
    defaultWallScene: z.string(),
    wallSceneReferenceWidthIn: z.record(z.string(), positive),
    thresholdPrompt: z.string().min(1).refine(noEmDash, "no em dash"),
    costLine: z.object({ days: z.number().int().positive().nullable(), dollars: z.number().nonnegative().nullable() }),
    showCostLine: z.boolean(),
  })
  .superRefine((config, ctx) => {
    const sizeIds = new Set(config.printSizes.map((size) => size.id));
    for (const [word, sizeId] of Object.entries(config.sizeWordToPrintSize)) {
      if (!sizeIds.has(sizeId)) {
        ctx.addIssue({ code: "custom", message: `size word ${word} maps to unknown size ${sizeId}`, path: ["sizeWordToPrintSize", word] });
      }
    }
    // The browser must outwait the server, or a slow live answer would be thrown away [D-065].
    if (config.j2ClientTimeoutMs <= config.j2TimeoutMs) {
      ctx.addIssue({ code: "custom", message: "client timeout must exceed the server timeout", path: ["j2ClientTimeoutMs"] });
    }
    if (!config.wallScenes.includes(config.defaultWallScene)) {
      ctx.addIssue({ code: "custom", message: "default wall scene is not a wall scene", path: ["defaultWallScene"] });
    }
    for (const scene of config.wallScenes) {
      if (!(scene in config.wallSceneReferenceWidthIn)) {
        ctx.addIssue({ code: "custom", message: `no reference width for ${scene}`, path: ["wallSceneReferenceWidthIn", scene] });
      }
    }
    // The cost line stays hidden until N and X are filled, never estimated [Res #40, Gap G31].
    if (config.showCostLine && (config.costLine.days === null || config.costLine.dollars === null)) {
      ctx.addIssue({ code: "custom", message: "cost line shown before N and X are filled", path: ["showCostLine"] });
    }
  });

// ---------------------------------------------------------------------------
// Milestone 3 files
// ---------------------------------------------------------------------------

/** The five fields J1 adds to each work [spec Section 3.2, Gap G1]. Also the J1 response contract. */
export const j1FieldsSchema = z.strictObject({ valence, arousal, tags, palette, subject });

/** A catalog file with any J1 fields removed, so scripts that need only the M2 metadata read it before and after the J1 merge. */
export function withoutJ1(catalogJson: unknown): unknown {
  if (!Array.isArray(catalogJson)) return catalogJson;
  const j1Keys = Object.keys(j1FieldsSchema.shape);
  return catalogJson.map((w: Record<string, unknown>) => Object.fromEntries(Object.entries(w).filter(([key]) => !j1Keys.includes(key))));
}


/** One "why this found you" line: non-empty and free of em dashes. J4's fuller checks live in its validator. */
const curatorLine = z.string().trim().min(1).refine(noEmDash, "no em dash");

/** copy.json: each work id maps to its 9 lines, one per mood bucket [Res #9, Gap G2, D-027]. */
export const copyFileSchema = z.record(z.string().min(1), perBucket(curatorLine));

const printSizeIds = printSizes.map((size) => size.id) as [string, ...string[]];
const materialIds = Object.keys(materials) as [keyof typeof materials, ...(keyof typeof materials)[]];
const bucketEnum = z.enum(bucketKeys as [BucketKey, ...BucketKey[]]);

/** One simulated add-to-bag line. Only framed prints take a frame [Gap G5, Gap G28]. */
const addLineSchema = z
  .strictObject({
    id: z.string().min(1),
    size: z.enum(printSizeIds),
    material: z.enum(materialIds),
    frame: z.enum(frameFinishes).nullable(),
  })
  .refine((line) => (line.material === "framed") === (line.frame !== null), "a frame goes with framed prints only");

/** One simulated session: its mood bucket, the works it opened, and what it added to the bag [D-029]. */
const sessionSchema = z
  .strictObject({
    bucket: bucketEnum,
    views: z.array(z.string().min(1)).min(1),
    adds: z.array(addLineSchema),
  })
  .refine((s) => s.adds.every((line) => s.views.includes(line.id)), "every added work was viewed");

/** data/signals-seed.json: the seeded simulated dataset [Res #38, Gap G27, D-029]. */
export const signalsSeedFileSchema = z
  .strictObject({
    seed: z.number().int(),
    sessionCount: z.number().int().positive(),
    sessions: z.array(sessionSchema),
  })
  .refine((file) => file.sessions.length === file.sessionCount, "sessionCount must equal the number of sessions");

/**
 * Every number written in a sentence, with thousands separators removed. A minus sign counts only when it
 * does not follow a letter or digit, so "mid-1990s" reads as 1990, not -1990.
 */
export function numbersIn(text: string): number[] {
  return (text.match(/(?:(?<![\p{L}\p{N}])-)?\d[\d,]*(?:\.\d+)?/gu) ?? []).map((token) => Number(token.replace(/,/g, "")));
}

/** The four finding kinds, in screen order [spec Section 3.11]. */
export const findingKinds = ["rack-candidate", "attach-pattern", "under-converting", "licensing-gap"] as const;

const findingSchema = z
  .strictObject({
    kind: z.enum(findingKinds),
    bucket: bucketEnum,
    action: z.string().trim().min(1).refine(noEmDash, "no em dash"),
    text: z.string().trim().min(1).refine(noEmDash, "no em dash"),
    figures: z.record(z.string().min(1), z.number()),
  })
  .superRefine((finding, ctx) => {
    // Every figure in a finding comes from the seeded data [Res #38].
    const known = Object.values(finding.figures);
    for (const field of ["text", "action"] as const) {
      for (const n of numbersIn(finding[field])) {
        if (!known.includes(n)) ctx.addIssue({ code: "custom", message: `${n} in the ${field} is not one of the figures`, path: [field] });
      }
    }
  });

/** Per-bucket aggregates the findings cite [D-029]. */
const bucketFiguresSchema = z.strictObject({
  sessions: z.number().int().nonnegative(),
  views: z.number().int().nonnegative(),
  adds: z.number().int().nonnegative(),
  works: z.number().int().nonnegative(),
});

/** data/signals.json: the four J8 findings and the figures behind them [spec Section 3.11, Gap G27, D-029]. */
export const signalsFileSchema = z
  .strictObject({
    seed: z.number().int(),
    simulated: z.literal(true),
    sessionCount: z.number().int().positive(),
    buckets: perBucket(bucketFiguresSchema),
    findings: z.array(findingSchema).length(4),
  })
  .refine((file) => findingKinds.every((kind, i) => file.findings[i]?.kind === kind), "one finding of each kind, in order");

/** data/j2-cache.json: normalized phrase to real J2 output [Res #7, Res #8, docs/ai-jobs.md]. */
export const j2CacheFileSchema = z.record(z.string().min(1), j2OutputSchema).superRefine((cache, ctx) => {
  for (const [key, answer] of Object.entries(cache)) {
    if (key !== normalizePhrase(key)) ctx.addIssue({ code: "custom", message: "key is not normalized", path: [key] });
    const invented = inventedHeard(answer.heard, key);
    if (invented.length) ctx.addIssue({ code: "custom", message: `heard words not in the phrase: ${invented.join(", ")}`, path: [key, "heard"] });
  }
});

/** A single lowercase word, as the fallback splits typed text. */
const word = z.string().regex(/^[a-z']+$/, "one lowercase word");
const sizeWords = Object.keys(sizeWordToPrintSize) as [keyof typeof sizeWordToPrintSize, ...(keyof typeof sizeWordToPrintSize)[]];

/** data/j2-wordmap.json: the fallback's mood words, plus room-type and size words [Gap G7, Gap G9, D-028]. */
export const j2WordmapFileSchema = z.strictObject({
  words: z.record(word, z.strictObject({ valence, arousal })),
  roomTypes: z.record(word, z.enum(roomTypes)),
  sizes: z.record(word, z.enum(sizeWords)),
});
