// Art Institute of Chicago ingest (docs/asset-sources.md, D-017, D-019, D-020).
// Run by hand: node scripts/ingest/aic.ts

import { capPerArtist, contentProblem, fineArtGroup, sizeProblem } from "./lib/curation.ts";
import { createClient } from "./lib/http.ts";
import { type RawWork, type Skip, writeRaw } from "./lib/raw.ts";

/** Eligible works to collect; more than the 100 used, so shortfalls elsewhere can be filled [Gap G21]. */
export const target = 180;

/** Wall-art types only [D-020]. */
export const artworkTypes = ["Painting", "Print", "Drawing and Watercolor"];

const fields = [
  "id", "title", "artist_title", "artist_display", "date_display", "image_id", "is_public_domain",
  "credit_line", "artwork_type_title", "subject_titles", "term_titles", "thumbnail",
].join(",");

/**
 * One page of public-domain wall-art types in AIC's own quality order [D-020]: boosted works by
 * boost rank first, then works AIC visitors view often, then the rest.
 */
export function searchUrl(page: number, limit = 100): string {
  const params = {
    query: {
      bool: {
        must: [{ term: { is_public_domain: true } }, { terms: { "artwork_type_title.keyword": artworkTypes } }],
      },
    },
    sort: [{ boost_rank: "asc" }, { has_not_been_viewed_much: "asc" }, { id: "asc" }],
  };
  const query = new URLSearchParams({ params: JSON.stringify(params), fields, limit: String(limit), page: String(page) });
  return `https://api.artic.edu/api/v1/artworks/search?${query}`;
}

interface AicArtwork {
  id: number;
  title: string | null;
  artist_title: string | null;
  artist_display: string | null;
  date_display: string | null;
  image_id: string | null;
  is_public_domain: boolean;
  credit_line: string | null;
  subject_titles: string[] | null;
  term_titles: string[] | null;
  thumbnail: { width?: number; height?: number; alt_text?: string | null } | null;
}

export interface AicPage {
  pagination: { total_pages: number; current_page: number };
  data: AicArtwork[];
  config: { iiif_url: string };
}

/** Width of the full-size image linked from the Piece and Wall screens [D-019]. */
export const fullWidth = 1686;
/** AIC's recommended, best-cached IIIF width, used as the thumbnail source [D-017]. */
export const thumbSourceWidth = 843;

/** Applies the curation rules to one page. Ranks continue from startRank. */
export function parsePage(page: AicPage, startRank: number): { works: RawWork[]; skips: Skip[] } {
  const works: RawWork[] = [];
  const skips: Skip[] = [];
  const iiif = page.config.iiif_url;
  page.data.forEach((art, index) => {
    const title = art.title?.trim() || "Untitled";
    const skip = (reason: string) => skips.push({ sourceId: String(art.id), title, reason });
    if (!art.is_public_domain) return skip("not public domain");
    if (!art.image_id) return skip("no image");
    const width = art.thumbnail?.width;
    const height = art.thumbnail?.height;
    if (!width || !height) return skip("image size not given by the source");
    const small = sizeProblem(width, height);
    if (small) return skip(small);
    const flagged = contentProblem([title, ...(art.subject_titles ?? []), art.thumbnail?.alt_text]);
    if (flagged) return skip(flagged);
    works.push({
      sourceId: String(art.id),
      title,
      artist: art.artist_title?.trim() || art.artist_display?.split("\n")[0].trim() || "Unknown artist",
      date: art.date_display?.trim() || "Undated",
      lane: "fine-art",
      imageUrl: `${iiif}/${art.image_id}/full/${Math.min(width, fullWidth)},/0/default.jpg`,
      thumbSourceUrl: `${iiif}/${art.image_id}/full/${Math.min(width, thumbSourceWidth)},/0/default.jpg`,
      width,
      height,
      license: art.credit_line?.trim() ? `Public domain. ${art.credit_line.trim()}` : "Public domain",
      rank: startRank + index,
      group: fineArtGroup([title, ...(art.subject_titles ?? []), ...(art.term_titles ?? [])]),
    });
  });
  return { works, skips };
}

async function main() {
  // AIC: 60 requests a minute, and scrapers are asked for one a second [D-017].
  const client = createClient({ minIntervalMs: 1000 });
  const eligible: RawWork[] = [];
  const skips: Skip[] = [];
  let capped = capPerArtist(eligible);
  let rank = 0;
  for (let pageNumber = 1; capped.kept.length < target; pageNumber++) {
    const page = await client.json<AicPage>(searchUrl(pageNumber));
    const parsed = parsePage(page, rank);
    eligible.push(...parsed.works);
    skips.push(...parsed.skips);
    rank += page.data.length;
    capped = capPerArtist(eligible);
    console.log(`aic page ${pageNumber}/${page.pagination.total_pages}: ${capped.kept.length} kept`);
    if (pageNumber >= page.pagination.total_pages) break;
  }
  await writeRaw("aic", capped.kept.slice(0, target), [...skips, ...capped.skips]);
}

if (import.meta.main) await main();
