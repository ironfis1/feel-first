// The Metropolitan Museum of Art ingest (docs/asset-sources.md, D-017, D-020).
// Run by hand: node scripts/ingest/met.ts

import { capPerArtist, contentProblem, fineArtGroup, sizeProblem } from "./lib/curation.ts";
import { createClient, SourceRefused } from "./lib/http.ts";
import { imageSize, type Size } from "./lib/imageSize.ts";
import { type RawWork, type Skip, writeRaw } from "./lib/raw.ts";

/** Eligible works to collect; more than the 100 used, so shortfalls elsewhere can be filled [Gap G21]. */
export const target = 180;

/**
 * Departments that hold wall art, taking turns so none dominates [D-020]: European Paintings,
 * Drawings and Prints, The American Wing, Asian Art, Modern and Contemporary Art.
 */
export const departmentIds = [11, 9, 1, 6, 21];

/** Wall-art classifications [D-020]. */
export const classifications = ["Paintings", "Prints", "Drawings"];

/** Some departments leave classification blank and name the object instead (American Wing: "Painting"). */
const wallArtObjectName = /(painting|print|drawing|watercolou?r|woodcut|etching|engraving|lithograph)s?/i;

/** True for paintings, prints and drawings [D-020]. */
export const isWallArt = (object: Pick<MetObject, "classification" | "objectName">) =>
  classifications.includes(object.classification) || wallArtObjectName.test(object.objectName ?? "");

const base = "https://collectionapi.metmuseum.org/public/collection";

/** The Met's own quality signal is its highlight flag [D-020]. /v1.1/search replaced /search [D-017]. */
export function searchUrl(departmentId: number, offset = 0, limit = 500): string {
  return `${base}/v1.1/search?departmentId=${departmentId}&isHighlight=true&hasImages=true&offset=${offset}&limit=${limit}`;
}

export const objectUrl = (objectId: number) => `${base}/v1/objects/${objectId}`;

/** Takes one id from each list in turn: a, b, c, a, b, c, and so on. Duplicates keep their first place. */
export function interleave(lists: readonly (readonly number[])[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const id = list[i];
      if (id !== undefined && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

export interface MetObject {
  objectID: number;
  isPublicDomain: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  creditLine: string;
  classification: string;
  objectName: string;
  tags: { term: string }[] | null;
}

/** The reason to skip an object before its image is checked, or null if it may be used. */
export function screen(object: MetObject): string | null {
  if (!object.isPublicDomain) return "not public domain";
  if (!isWallArt(object)) return `not wall art: ${object.classification || object.objectName || "unclassified"}`;
  if (!object.primaryImage || !object.primaryImageSmall) return "no image";
  return contentProblem([object.title, object.objectName, ...(object.tags ?? []).map((t) => t.term)]);
}

/** Builds the raw work once the image size is known, or returns the reason to skip. */
export function toRawWork(object: MetObject, size: Size | null, rank: number): RawWork | string {
  if (!size) return "image size could not be read";
  const small = sizeProblem(size.width, size.height);
  if (small) return small;
  const title = object.title.trim() || "Untitled";
  return {
    sourceId: String(object.objectID),
    title,
    artist: object.artistDisplayName.trim() || "Unknown artist",
    date: object.objectDate.trim() || "Undated",
    lane: "fine-art",
    imageUrl: object.primaryImage,
    thumbSourceUrl: object.primaryImageSmall,
    width: size.width,
    height: size.height,
    license: object.creditLine.trim() ? `Public domain (CC0). ${object.creditLine.trim()}` : "Public domain (CC0)",
    rank,
    group: fineArtGroup([title, object.objectName, ...(object.tags ?? []).map((t) => t.term)]),
  };
}

async function main() {
  // The Met publishes 80 requests a second, but its firewall blocked about 8 a second on 2026-10-09 [D-017].
  const client = createClient({ minIntervalMs: 1000 });
  const lists: number[][] = [];
  for (const departmentId of departmentIds) {
    const result = await client.json<{ total: number; objectIDs: number[] | null }>(searchUrl(departmentId));
    lists.push(result.objectIDs ?? []);
    console.log(`met department ${departmentId}: ${result.total} highlights with images`);
  }
  const ids = interleave(lists);
  const eligible: RawWork[] = [];
  const skips: Skip[] = [];
  let capped = capPerArtist(eligible);
  for (const [rank, id] of ids.entries()) {
    if (capped.kept.length >= target) break;
    let title = "";
    try {
      const object = await client.json<MetObject>(objectUrl(id));
      title = object.title ?? "";
      const problem = screen(object);
      const work = problem ?? toRawWork(object, imageSize(await client.head(object.primaryImage)), rank);
      if (typeof work === "string") skips.push({ sourceId: String(id), title, reason: work });
      else {
        eligible.push(work);
        capped = capPerArtist(eligible);
      }
    } catch (error) {
      if (error instanceof SourceRefused) throw error;
      skips.push({ sourceId: String(id), title, reason: `record could not be read: ${(error as Error).message}` });
    }
    if ((rank + 1) % 20 === 0) console.log(`met: ${capped.kept.length} kept of ${rank + 1} checked`);
  }
  await writeRaw("met", capped.kept.slice(0, target), [...skips, ...capped.skips]);
}

if (import.meta.main) await main();
