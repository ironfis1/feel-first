// zod schemas for the data contracts (docs/testing.md, D-014).
// Data files are validated against these when they load, so a bad file fails the build.

import { z } from "zod";

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

/** One catalog work. Unknown fields are errors, and orientation must match the dimensions [D-016]. */
export const workSchema = z.strictObject(workFields).superRefine((work, ctx) => {
  if (work.orientation !== orientationFor(work.width, work.height)) {
    ctx.addIssue({ code: "custom", message: "orientation does not match width and height", path: ["orientation"] });
  }
});

/** A whole catalog file: an array of works with unique ids [Gap G2, D-015]. */
export const catalogFileSchema = z.array(workSchema).superRefine((works, ctx) => {
  const seen = new Set<string>();
  works.forEach((work, index) => {
    if (seen.has(work.id)) {
      ctx.addIssue({ code: "custom", message: `duplicate id ${work.id}`, path: [index, "id"] });
    }
    seen.add(work.id);
  });
});

/** True when the text contains an em dash, which no copy may use (CLAUDE.md writing rules). */
const emDash = String.fromCharCode(0x2014);
const noEmDash = (text: string) => !text.includes(emDash);

const positive = z.number().positive();

/** The tunable values in src/config/feel.ts [spec Section 7, Gap G18]. */
export const configSchema = z
  .object({
    workingName: z.string().min(1),
    contactEmail: z.email(),
    linkedInUrl: z.url(),
    claudeModel: z.string().min(1),
    roomPageSizePerLane: z.number().int().positive(),
    nudgeStep: z.number().gt(0).lt(1),
    driftBehavior: z.literal("end-of-lane"),
    bucketCutPoints: z.tuple([axis, axis]).refine(([low, high]) => low < high, "cut points must ascend"),
    fingerprintTagCount: z.number().int().min(1).max(3),
    j2TimeoutMs: z.number().int().positive(),
    j2RateLimit: z.object({ calls: z.number().int().positive(), windowMs: z.number().int().positive() }),
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
        framedPerWidthInch: positive,
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
