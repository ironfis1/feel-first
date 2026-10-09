// The data/raw/{source}.json format every ingest script writes, and the merge step reads.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { lanes } from "../../../src/lib/schemas.ts";
import { minLongEdge } from "./curation.ts";

export const sourceKeys = ["aic", "met", "rijks", "jpl", "loc"] as const;
export type SourceKey = (typeof sourceKeys)[number];

/** Institution names as credited on the Piece screen [Gap G33]. */
export const sourceNames: Record<SourceKey, string> = {
  aic: "Art Institute of Chicago",
  met: "The Metropolitan Museum of Art",
  rijks: "Rijksmuseum",
  jpl: "NASA Jet Propulsion Laboratory",
  loc: "Library of Congress",
};

/** One work a source offered that passed the curation rules (D-002, D-020, D-021). */
export const rawWorkSchema = z
  .strictObject({
    sourceId: z.string().min(1),
    title: z.string().min(1),
    artist: z.string().min(1),
    date: z.string().min(1),
    lane: z.enum(lanes),
    /** Full-size image at the institution [D-001]. */
    imageUrl: z.url(),
    /** Where the thumbnail is downloaded from before resizing [D-001]. */
    thumbSourceUrl: z.url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    license: z.string().min(1),
    /** Position in the source's own quality order; lower is better [D-020]. */
    rank: z.number().int().nonnegative(),
    /** Subject group used only to spread picks [D-020]. */
    group: z.string().min(1),
  })
  .refine((w) => Math.max(w.width, w.height) >= minLongEdge, "image below the long-edge minimum");

export type RawWork = z.infer<typeof rawWorkSchema>;

export const skipSchema = z.strictObject({
  sourceId: z.string().min(1),
  title: z.string(),
  reason: z.string().min(1),
});

export type Skip = z.infer<typeof skipSchema>;

export const rawFileSchema = z.strictObject({
  sourceKey: z.enum(sourceKeys),
  source: z.string().min(1),
  fetchedAt: z.iso.datetime(),
  works: z.array(rawWorkSchema),
  skips: z.array(skipSchema),
});

export type RawFile = z.infer<typeof rawFileSchema>;

const rawDir = path.resolve(import.meta.dirname, "../../../data/raw");

/** Validates and writes data/raw/{source}.json, then prints a one-line summary. */
export async function writeRaw(sourceKey: SourceKey, works: RawWork[], skips: Skip[]): Promise<void> {
  const file = rawFileSchema.parse({
    sourceKey,
    source: sourceNames[sourceKey],
    fetchedAt: new Date().toISOString(),
    works,
    skips,
  });
  await mkdir(rawDir, { recursive: true });
  const target = path.join(rawDir, `${sourceKey}.json`);
  await writeFile(target, JSON.stringify(file, null, 2) + "\n");
  console.log(`${sourceKey}: ${works.length} works kept, ${skips.length} skipped -> ${path.relative(process.cwd(), target)}`);
}
