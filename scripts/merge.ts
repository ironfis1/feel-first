// Merges data/raw/{source}.json into data/catalog.json (spec Section 2, Gap G21, D-020, D-021).
// Run by hand: node scripts/merge.ts

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { metadataCatalogFileSchema, orientationFor } from "../src/lib/schemas.ts";
import { pickSpread } from "./ingest/lib/curation.ts";
import { type RawWork, rawFileSchema, type SourceKey, sourceNames } from "./ingest/lib/raw.ts";

const root = path.resolve(import.meta.dirname, "..");

/** About 100 fine-art works from each museum [Res #37]. */
export const perMuseum = 100;
/** About 300 posters: every JPL poster, the remainder from the WPA [RB38, Res #37]. */
export const posterTotal = 300;
/** Cleveland is needed only if fine art falls below this [Gap G21]. */
export const fineArtFloor = 270;

export const museums = ["aic", "met", "rijks"] as const satisfies readonly SourceKey[];

export type Sourced = RawWork & { sourceKey: SourceKey };
export type CatalogRecord = z.infer<typeof metadataCatalogFileSchema>[number];

/** Works removed by the visual content check [D-021], with the reason shown in the skip log. */
export const visualSkipSchema = z.array(
  z.strictObject({ sourceKey: z.string(), sourceId: z.string(), title: z.string(), reason: z.string().min(1) }),
);
export type VisualSkip = z.infer<typeof visualSkipSchema>[number];

/**
 * About 100 per museum, spread across subject groups [D-020]. A museum short of 100 is made up
 * from the other two, taking turns [Gap G21]. Throws if fine art would fall below 270.
 */
export function selectFineArt(pools: Record<(typeof museums)[number], Sourced[]>): Sourced[] {
  const picks = Object.fromEntries(museums.map((m) => [m, pickSpread(pools[m], perMuseum)])) as Record<string, Sourced[]>;
  let shortfall = museums.reduce((sum, m) => sum + (perMuseum - picks[m].length), 0);
  if (shortfall > 0) {
    const spares = museums.map((m) => {
      const taken = new Set(picks[m].map((w) => w.sourceId));
      return pickSpread(pools[m].filter((w) => !taken.has(w.sourceId)), Infinity);
    });
    while (shortfall > 0 && spares.some((s) => s.length > 0)) {
      for (const spare of spares) {
        const next = spare.shift();
        if (next && shortfall > 0) {
          picks[next.sourceKey].push(next);
          shortfall--;
        }
      }
    }
  }
  const selected = museums.flatMap((m) => picks[m]);
  if (selected.length < fineArtFloor) {
    throw new Error(`fine art has ${selected.length} works, below ${fineArtFloor}: the Cleveland Museum of Art is needed [Gap G21]`);
  }
  return selected;
}

/** Every JPL poster, then the WPA remainder spread across subject groups [RB38, Res #37, D-002 selection note]. */
export function selectPosters(jpl: Sourced[], loc: Sourced[]): Sourced[] {
  return [...jpl, ...pickSpread(loc, posterTotal - jpl.length)];
}

/** File name of a work's thumbnail in public/thumbs/ [D-001, D-023]. */
export const thumbName = (w: { sourceKey: string; sourceId: string }) =>
  `${w.sourceKey}-${w.sourceId.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}.webp`;

/** Catalog records with zero-padded ids in selection order [D-008]: fine art first, then posters. */
export function toCatalog(selected: readonly Sourced[]): CatalogRecord[] {
  const names = new Map<string, string>();
  for (const w of selected) {
    const name = thumbName(w);
    const other = names.get(name);
    if (other) throw new Error(`${other} and ${w.sourceKey} ${w.sourceId} would share the thumbnail ${name}`);
    names.set(name, `${w.sourceKey} ${w.sourceId}`);
  }
  const width = Math.max(4, String(selected.length).length);
  return selected.map((w, index) => ({
    id: `w-${String(index + 1).padStart(width, "0")}`,
    title: w.title,
    artist: w.artist,
    date: w.date,
    source: sourceNames[w.sourceKey],
    sourceId: w.sourceId,
    lane: w.lane,
    imageUrl: w.imageUrl,
    thumbUrl: `/thumbs/${thumbName(w)}`,
    width: w.width,
    height: w.height,
    orientation: orientationFor(w.width, w.height),
    license: w.license,
  }));
}

/** Drops works the visual check removed [D-021]. */
export function withoutVisualSkips(works: readonly Sourced[], skips: readonly VisualSkip[]): Sourced[] {
  const removed = new Set(skips.map((s) => `${s.sourceKey}:${s.sourceId}`));
  return works.filter((w) => !removed.has(`${w.sourceKey}:${w.sourceId}`));
}

export async function loadRaw(key: SourceKey): Promise<Sourced[]> {
  const file = rawFileSchema.parse(JSON.parse(await readFile(path.join(root, "data/raw", `${key}.json`), "utf8")));
  if (file.sourceKey !== key) throw new Error(`data/raw/${key}.json says it holds ${file.sourceKey} works`);
  return file.works.map((w) => ({ ...w, sourceKey: key }));
}

export async function loadVisualSkips(): Promise<VisualSkip[]> {
  const file = path.join(root, "data/raw/visual-skips.json");
  return existsSync(file) ? visualSkipSchema.parse(JSON.parse(await readFile(file, "utf8"))) : [];
}

async function main() {
  const visualSkips = await loadVisualSkips();
  const load = async (key: SourceKey) => withoutVisualSkips(await loadRaw(key), visualSkips);
  const fineArt = selectFineArt({ aic: await load("aic"), met: await load("met"), rijks: await load("rijks") });
  const posters = selectPosters(await load("jpl"), await load("loc"));
  const catalog = metadataCatalogFileSchema.parse(toCatalog([...fineArt, ...posters]));
  await writeFile(path.join(root, "data/catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
  const count = (key: string) => catalog.filter((w) => w.source === sourceNames[key as SourceKey]).length;
  console.log(
    `catalog: ${catalog.length} works. Fine art ${fineArt.length} (AIC ${count("aic")}, Met ${count("met")}, Rijksmuseum ${count("rijks")}). ` +
      `Posters ${posters.length} (JPL ${count("jpl")}, WPA ${count("loc")}).`,
  );
}

if (import.meta.main) await main();
