// Library of Congress WPA posters ingest (docs/asset-sources.md, D-002, D-017).
// Run by hand: node scripts/ingest/loc.ts

import { contentProblem, sizeProblem } from "./lib/curation.ts";
import { posterGroup } from "./lib/groups.ts";
import { createClient, SourceRefused } from "./lib/http.ts";
import { type RawWork, type Skip, writeRaw } from "./lib/raw.ts";

export const listingUrl = (page: number, perPage = 100) =>
  `https://www.loc.gov/collections/works-progress-administration-posters/?fo=json&c=${perPage}&sp=${page}`;

/** Only items whose rights statement says this are used (docs/asset-sources.md). */
export const allowedRights = "No known restrictions";

const iiif = "https://tile.loc.gov/image-services/iiif";

interface Creator {
  role?: string;
  title?: string;
}
export interface LocResult {
  id: string;
  title: string;
  subject?: string[];
  image_url?: string[];
  item?: {
    creators?: Creator[];
    date?: string;
    rights_advisory?: string | string[];
  };
}
export interface LocListing {
  results: LocResult[];
  pagination: { current: number; total: number; next: string | null };
}

/** The LOC item number, for example 98518971 from http://www.loc.gov/item/98518971/. */
export const itemId = (result: LocResult) => result.id.replace(/\/+$/, "").split("/").pop() ?? result.id;

/**
 * The IIIF id of the archival master, worked out from a listing image path:
 * .../storage-services/service/pnp/cph/3b40000/3b49000/3b49000/3b49078_150px.jpg
 * becomes master:pnp:cph:3b40000:3b49000:3b49000:3b49078u.
 */
export function masterIiifId(imageUrls: readonly string[]): string | null {
  for (const url of imageUrls) {
    const match = url.match(/storage-services\/service\/((?:[^/]+\/)+)([a-z0-9]+?)(?:_\d+px|[a-z])?\.(?:jpg|gif)/i);
    if (match) return `master:${match[1].split("/").filter(Boolean).join(":")}:${match[2]}u`;
  }
  return null;
}

/** The poster's artist, else its sponsoring project; contributors such as playwrights are not the artist. */
export function artistOf(result: LocResult): string {
  const creators = result.item?.creators ?? [];
  const artist = creators.find((c) => /artist/i.test(c.role ?? "") && c.title?.trim());
  const sponsor = creators.find((c) => /sponsor/i.test(c.role ?? "") && c.title?.trim());
  return (artist ?? sponsor)?.title?.trim() || "Unknown artist";
}

/** The catalog date with the cataloger's square brackets removed ("[between 1936 and 1938]"). */
export const dateOf = (result: LocResult) => result.item?.date?.replace(/[[\]]/g, "").trim() || "Undated";

/** The rights statement as one string; LOC sometimes gives a list. */
export const rightsOf = (result: LocResult) => [result.item?.rights_advisory ?? []].flat().join(" ").trim();

/** Skip reason before any image request, or null. */
export function screen(result: LocResult): string | null {
  const rights = rightsOf(result);
  if (!rights.startsWith(allowedRights)) return `rights statement: ${rights || "none given"}`;
  if (!masterIiifId(result.image_url ?? [])) return "no image";
  return contentProblem([result.title, ...(result.subject ?? [])]);
}

export function toRawWork(result: LocResult, size: { width: number; height: number }, rank: number): RawWork | string {
  const small = sizeProblem(size.width, size.height);
  if (small) return small;
  const id = masterIiifId(result.image_url ?? []) as string;
  const title = result.title.trim() || "Untitled";
  return {
    sourceId: itemId(result),
    title,
    artist: artistOf(result),
    date: dateOf(result),
    lane: "poster",
    imageUrl: `${iiif}/${id}/full/full/0/default.jpg`,
    thumbSourceUrl: `${iiif}/${id}/full/843,/0/default.jpg`,
    width: size.width,
    height: size.height,
    license: `${rightsOf(result)} Library of Congress, Prints and Photographs Division, WPA Poster Collection`,
    rank,
    group: posterGroup([title, ...(result.subject ?? [])]),
  };
}

async function main() {
  // JSON API: 20 a minute, and going over blocks for an hour, so stop on any 429 [D-017].
  const api = createClient({ minIntervalMs: 3500, stopOn429: true, retries: 1 });
  // Image services: 150 a minute [D-017].
  const images = createClient({ minIntervalMs: 500, stopOn429: true, retries: 1 });
  const results: LocResult[] = [];
  for (let page = 1; ; page++) {
    const listing = await api.json<LocListing>(listingUrl(page));
    results.push(...listing.results);
    console.log(`loc listing page ${page}/${listing.pagination.total}: ${results.length} items`);
    if (!listing.pagination.next || page >= listing.pagination.total) break;
  }
  const works: RawWork[] = [];
  const skips: Skip[] = [];
  for (const [rank, result] of results.entries()) {
    const skip = (reason: string) => skips.push({ sourceId: itemId(result), title: result.title ?? "", reason });
    try {
      const problem = screen(result);
      if (problem) {
        skip(problem);
        continue;
      }
      const id = masterIiifId(result.image_url ?? []) as string;
      const response = await images.request(`${iiif}/${id}/info.json`);
      if (response.status === 404) {
        skip("no master scan; the largest image is under 1,200px");
        continue;
      }
      if (!response.ok) throw new Error(`info.json returned ${response.status}`);
      const work = toRawWork(result, (await response.json()) as { width: number; height: number }, rank);
      if (typeof work === "string") skip(work);
      else works.push(work);
    } catch (error) {
      if (error instanceof SourceRefused) throw error;
      skip(`record could not be read: ${(error as Error).message}`);
    }
    if ((rank + 1) % 50 === 0) console.log(`loc: ${works.length} kept of ${rank + 1} checked`);
  }
  await writeRaw("loc", works, skips);
}

if (import.meta.main) await main();
