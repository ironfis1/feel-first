// NASA JPL "Visions of the Future" ingest (docs/asset-sources.md, D-017, D-018).
// There is no API: the series is one gallery page. Full-size files sit beside the gallery images on JPL's CDN.
// Run by hand: node scripts/ingest/jpl.ts [saved-gallery.html]
// JPL's firewall challenges repeated requests, so the script makes one request to www.jpl.nasa.gov, and can
// read a saved copy of the gallery page instead. It never tries to get past a challenge.

import { readFile } from "node:fs/promises";
import { contentProblem, sizeProblem } from "./lib/curation.ts";
import { createClient, identifier } from "./lib/http.ts";
import { imageSize } from "./lib/imageSize.ts";
import { type RawWork, type Skip, writeRaw } from "./lib/raw.ts";

export const galleryUrl = "https://www.jpl.nasa.gov/galleries/visions-of-the-future/";

/** JPL's firewall refuses user agents that do not start with Mozilla/5.0; this still names us [D-017]. */
export const jplUserAgent = `Mozilla/5.0 (compatible) ${identifier}`;

/** Credit and terms from the JPL Image Use Policy [Res #18, D-017]. */
export const license = "Courtesy NASA/JPL-Caltech. Free to use under the JPL Image Use Policy; no endorsement by NASA, JPL or Caltech is implied";

/** The page credits NASA/JPL-Caltech and gives no creation dates. */
export const artist = "NASA/JPL-Caltech";
export const date = "Undated";

/** Three color versions of one design count as one poster; red is kept by default [D-018]. */
export const keepAtomicClock = "Deep Space Atomic Clock - Red";

export interface GalleryEntry {
  title: string;
  /** The 1024px gallery image, used as the thumbnail source. */
  imageUrl: string;
  /** The poster's own page, which links the full-size file. */
  pageUrl: string;
}

const decode = (text: string) =>
  text.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').trim();

/** Every poster on the gallery page, in page order. */
export function parseGallery(html: string): GalleryEntry[] {
  const pattern = /<div class="BaseGalleryImage">\s*<a[^>]*?href="([^"]+)"[^>]*?data-title="([^"]*)"[^>]*?data-url="([^"]*)"/g;
  return [...html.matchAll(pattern)].map((m) => ({ imageUrl: decode(m[1]), title: decode(m[2]), pageUrl: decode(m[3]) }));
}

/**
 * The full-size file for a gallery image: the same name under original_images/ on JPL's CDN
 * (images/mars.width-1024.jpg becomes original_images/mars.jpg, the poster page's own download link).
 */
export function fullImageFor(galleryImage: string): string | null {
  const match = galleryImage.match(/^(https:\/\/[^/]+)\/images\/(.+)\.width-\d+\.jpg$/);
  return match ? `${match[1]}/original_images/${match[2]}.jpg` : null;
}

/** Skip reason for a gallery entry before any download, or null. */
export function screen(entry: GalleryEntry): string | null {
  if (entry.title.startsWith("Deep Space Atomic Clock") && entry.title !== keepAtomicClock) {
    return `same design as the "${keepAtomicClock}" poster [D-018]`;
  }
  return contentProblem([entry.title]);
}

export function toRawWork(entry: GalleryEntry, fullImage: string, size: { width: number; height: number }, rank: number): RawWork | string {
  const small = sizeProblem(size.width, size.height);
  if (small) return small;
  return {
    sourceId: entry.pageUrl.replace(/\/+$/, "").split("/").pop() ?? entry.title,
    title: entry.title,
    artist,
    date,
    lane: "poster",
    imageUrl: fullImage,
    thumbSourceUrl: entry.imageUrl,
    width: size.width,
    height: size.height,
    license,
    rank,
    group: "space",
  };
}

async function loadGallery(client: ReturnType<typeof createClient>, savedPath?: string): Promise<string> {
  if (savedPath) return readFile(savedPath, "utf8");
  const response = await client.request(galleryUrl);
  const html = await response.text();
  if (response.status !== 200 || !html.includes("BaseGalleryImage")) {
    throw new Error(`JPL answered ${response.status} with a challenge, not the gallery. Wait, or pass a saved copy of the page.`);
  }
  return html;
}

async function main() {
  // No published limit; one request a second [D-017].
  const client = createClient({ minIntervalMs: 1000, headers: { "User-Agent": jplUserAgent } });
  const entries = parseGallery(await loadGallery(client, process.argv[2]));
  console.log(`jpl: ${entries.length} gallery entries`);
  const works: RawWork[] = [];
  const skips: Skip[] = [];
  for (const [rank, entry] of entries.entries()) {
    const sourceId = entry.pageUrl.replace(/\/+$/, "").split("/").pop() ?? entry.title;
    const skip = (reason: string) => skips.push({ sourceId, title: entry.title, reason });
    const problem = screen(entry);
    if (problem) {
      skip(problem);
      continue;
    }
    const fullImage = fullImageFor(entry.imageUrl);
    if (!fullImage) {
      skip("gallery image name does not follow the CDN pattern");
      continue;
    }
    const size = imageSize(await client.head(fullImage));
    const work = size ? toRawWork(entry, fullImage, size, rank) : "image size could not be read";
    if (typeof work === "string") skip(work);
    else works.push(work);
  }
  await writeRaw("jpl", works, skips);
}

if (import.meta.main) await main();
