// Downloads and resizes catalog thumbnails into public/thumbs/ [D-001, D-002, D-023].
// Run by hand after scripts/merge.ts: node scripts/thumbs.ts

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { metadataCatalogFileSchema } from "../src/lib/schemas.ts";
import { jplUserAgent } from "./ingest/jpl.ts";
import { type Client, createClient } from "./ingest/lib/http.ts";
import { type SourceKey, sourceKeys, sourceNames } from "./ingest/lib/raw.ts";
import { loadRaw } from "./merge.ts";

const root = path.resolve(import.meta.dirname, "..");
const thumbsDir = path.join(root, "public/thumbs");

/** 640px wide WebP, resized to width and never cropped [D-002, D-023]. */
export const thumbWidth = 640;
export const webpQuality = 78;

export const sourceKeyOf = (institution: string): SourceKey | undefined =>
  sourceKeys.find((key) => sourceNames[key] === institution);

export interface ThumbJob {
  file: string;
  url: string;
  sourceKey: SourceKey;
}

/**
 * What to download and what to delete: every catalog work without a thumbnail file is a job,
 * and every file no catalog work points to is an orphan.
 */
export function plan(
  catalog: readonly { source: string; sourceId: string; thumbUrl: string }[],
  sourceUrls: ReadonlyMap<string, string>,
  existing: readonly string[],
): { jobs: ThumbJob[]; orphans: string[]; missing: string[] } {
  const wanted = new Set<string>();
  const jobs: ThumbJob[] = [];
  const missing: string[] = [];
  for (const work of catalog) {
    const file = path.posix.basename(work.thumbUrl);
    wanted.add(file);
    if (existing.includes(file)) continue;
    const sourceKey = sourceKeyOf(work.source);
    const url = sourceKey && sourceUrls.get(`${sourceKey}:${work.sourceId}`);
    if (sourceKey && url) jobs.push({ file, url, sourceKey });
    else missing.push(`${work.source} ${work.sourceId}`);
  }
  return { jobs, orphans: existing.filter((f) => f.endsWith(".webp") && !wanted.has(f)), missing };
}

/** Resizes to the thumbnail width, keeping the whole image [D-002]. */
export function resize(image: Buffer): Promise<Buffer> {
  return sharp(image).resize({ width: thumbWidth, withoutEnlargement: true }).webp({ quality: webpQuality }).toBuffer();
}

/** One polite client per source, matching each source's limits [D-017]. */
function clients(): Record<SourceKey, Client> {
  return {
    aic: createClient({ minIntervalMs: 1000 }),
    met: createClient({ minIntervalMs: 1000 }),
    rijks: createClient({ minIntervalMs: 1000 }),
    jpl: createClient({ minIntervalMs: 1000, headers: { "User-Agent": jplUserAgent } }),
    loc: createClient({ minIntervalMs: 500, stopOn429: true }),
  };
}

async function main() {
  const catalog = metadataCatalogFileSchema.parse(JSON.parse(await readFile(path.join(root, "data/catalog.json"), "utf8")));
  const sourceUrls = new Map<string, string>();
  const fullUrls = new Map<string, string>();
  for (const key of sourceKeys) {
    if (!existsSync(path.join(root, "data/raw", `${key}.json`))) continue;
    for (const w of await loadRaw(key)) {
      sourceUrls.set(`${key}:${w.sourceId}`, w.thumbSourceUrl);
      fullUrls.set(w.thumbSourceUrl, w.imageUrl);
    }
  }
  await mkdir(thumbsDir, { recursive: true });
  const { jobs, orphans, missing } = plan(catalog, sourceUrls, await readdir(thumbsDir));
  for (const name of missing) console.warn(`no thumbnail source for ${name}`);
  for (const file of orphans) await rm(path.join(thumbsDir, file));
  const byKey = clients();
  const failures: string[] = [];
  for (const [index, job] of jobs.entries()) {
    try {
      // Some LOC master files fail to scale on the server but serve at full size, so fall back
      // to the full image and resize it here (D-017 findings).
      let response = await byKey[job.sourceKey].request(job.url);
      const fullUrl = fullUrls.get(job.url);
      if (!response.ok && fullUrl) response = await byKey[job.sourceKey].request(fullUrl);
      if (!response.ok) throw new Error(`returned ${response.status}`);
      await writeFile(path.join(thumbsDir, job.file), await resize(Buffer.from(await response.arrayBuffer())));
    } catch (error) {
      failures.push(`${job.file}: ${(error as Error).message}`);
    }
    if ((index + 1) % 25 === 0) console.log(`thumbs: ${index + 1}/${jobs.length}`);
  }
  console.log(`thumbs: ${jobs.length - failures.length} written, ${orphans.length} removed, ${failures.length} failed, ${missing.length} without a source`);
  for (const failure of failures) console.warn(`failed ${failure}`);
}

if (import.meta.main) await main();
