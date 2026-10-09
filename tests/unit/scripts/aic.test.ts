import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type AicPage, artworkTypes, parsePage, searchUrl } from "../../../scripts/ingest/aic.ts";
import { rawWorkSchema } from "../../../scripts/ingest/lib/raw.ts";

// Contract tests against one recorded AIC response (docs/testing.md functional gate).
const recorded = JSON.parse(readFileSync("tests/fixtures/ingest/aic.json", "utf8")) as AicPage;

const art = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: "Harbor",
  artist_title: "A. Painter",
  artist_display: "A. Painter (French, 1840-1900)",
  date_display: "1880",
  image_id: "img-1",
  is_public_domain: true,
  credit_line: "Gift of a Donor",
  subject_titles: ["harbors"],
  term_titles: ["oil on canvas"],
  thumbnail: { width: 3000, height: 2000, alt_text: "Boats in a harbor." },
  ...overrides,
});
const page = (...data: ReturnType<typeof art>[]) =>
  ({ pagination: { total_pages: 1, current_page: 1 }, data, config: { iiif_url: "https://iiif.test/2" } }) as AicPage;
const one = (overrides: Record<string, unknown> = {}) => parsePage(page(art(overrides)), 0);

describe("AIC searchUrl", () => {
  it("asks for public-domain wall-art types in AIC's quality order [D-017, D-020]", () => {
    const url = new URL(searchUrl(3));
    const params = JSON.parse(url.searchParams.get("params") as string);
    expect(url.origin + url.pathname).toBe("https://api.artic.edu/api/v1/artworks/search");
    expect(params.query.bool.must).toEqual([
      { term: { is_public_domain: true } },
      { terms: { "artwork_type_title.keyword": ["Painting", "Print", "Drawing and Watercolor"] } },
    ]);
    expect(artworkTypes).toEqual(["Painting", "Print", "Drawing and Watercolor"]);
    expect(params.sort).toEqual([{ boost_rank: "asc" }, { has_not_been_viewed_much: "asc" }, { id: "asc" }]);
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("requests every field parsePage reads", () => {
    const fields = new URL(searchUrl(1)).searchParams.get("fields")?.split(",") ?? [];
    for (const f of ["id", "title", "artist_title", "artist_display", "date_display", "image_id", "is_public_domain", "credit_line", "subject_titles", "term_titles", "thumbnail"]) {
      expect(fields).toContain(f);
    }
  });
});

describe("AIC parsePage on the recorded response", () => {
  const { works, skips } = parsePage(recorded, 0);

  it("keeps or skips every recorded work, and every kept work fits the raw schema", () => {
    expect(works.length + skips.length).toBe(recorded.data.length);
    expect(works.length).toBe(19);
    for (const w of works) expect(rawWorkSchema.safeParse(w).success).toBe(true);
  });

  it("builds the first record's credits and image addresses", () => {
    expect(works[0]).toEqual({
      sourceId: "28560",
      title: "The Bedroom",
      artist: "Vincent van Gogh",
      date: "1889",
      lane: "fine-art",
      imageUrl: "https://www.artic.edu/iiif/2/6644829f-f292-c5c4-a73c-0356a6fdbf0d/full/1686,/0/default.jpg",
      thumbSourceUrl: "https://www.artic.edu/iiif/2/6644829f-f292-c5c4-a73c-0356a6fdbf0d/full/843,/0/default.jpg",
      width: 12614,
      height: 9875,
      license: "Public domain. Helen Birch Bartlett Memorial Collection",
      rank: 0,
      group: "interior",
    });
  });

  it("logs each skip with its reason", () => {
    expect(skips).toContainEqual({ sourceId: "4", title: "Priest and Boy", reason: "image too small: 768px on the long edge, needs 1200" });
    expect(skips.map((s) => s.reason)).toContain('nudity: matched "nude"');
  });

  it("keeps an em dash in a source title [D-022]", () => {
    expect(works.some((w) => w.title.includes(String.fromCharCode(0x2014)))).toBe(true);
  });
});

describe("AIC parsePage rules", () => {
  it("checks public domain first, then image, then size, then content", () => {
    expect(one({ is_public_domain: false, image_id: null, title: "Nude" }).skips[0].reason).toBe("not public domain");
    expect(one({ image_id: null, title: "Nude" }).skips[0].reason).toBe("no image");
    expect(one({ thumbnail: { width: 1000 }, title: "Nude" }).skips[0].reason).toBe("image size not given by the source");
    expect(one({ thumbnail: { width: 1199, height: 900 }, title: "Nude" }).skips[0].reason).toMatch(/^image too small/);
    expect(one({ title: "Nude" }).skips[0].reason).toBe('nudity: matched "nude"');
  });

  it("screens the subjects and the image description too", () => {
    expect(one({ subject_titles: ["battle scenes", "battle"] }).skips[0].reason).toBe('violence: matched "battle"');
    expect(one({ thumbnail: { width: 3000, height: 2000, alt_text: "A naked figure." } }).skips[0].reason).toBe('nudity: matched "naked"');
  });

  it("falls back for missing credits", () => {
    const w = one({ title: "  ", artist_title: null, artist_display: "Unknown maker\nFrance", date_display: null, credit_line: null }).works[0];
    expect([w.title, w.artist, w.date, w.license]).toEqual(["Untitled", "Unknown maker", "Undated", "Public domain"]);
    expect(one({ artist_title: null, artist_display: null }).works[0].artist).toBe("Unknown artist");
  });

  it("never asks IIIF for more than the image has, and records the source size", () => {
    const w = one({ thumbnail: { width: 800, height: 1300 } }).works[0];
    expect(w.imageUrl).toBe("https://iiif.test/2/img-1/full/800,/0/default.jpg");
    expect(w.thumbSourceUrl).toBe("https://iiif.test/2/img-1/full/800,/0/default.jpg");
    expect([w.width, w.height]).toEqual([800, 1300]);
  });

  it("numbers ranks from startRank, counting skipped works", () => {
    const { works } = parsePage(page(art({ id: 1, is_public_domain: false }), art({ id: 2 })), 40);
    expect(works.map((w) => w.rank)).toEqual([41]);
  });
});
