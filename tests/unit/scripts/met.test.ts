import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { interleave } from "../../../scripts/ingest/lib/curation.ts";
import { rawWorkSchema } from "../../../scripts/ingest/lib/raw.ts";
import {
  classifications,
  departmentIds,
  isWallArt,
  type MetObject,
  objectUrl,
  screen,
  searchUrl,
  toRawWork,
} from "../../../scripts/ingest/met.ts";

// Contract tests against recorded Met responses (docs/testing.md functional gate).
const recorded = JSON.parse(readFileSync("tests/fixtures/ingest/met.json", "utf8")) as {
  search: { total: number; objectIDs: number[] };
  objects: MetObject[];
};
const [wheatField, repose, lakeGeorge, mural] = recorded.objects;
const variant = (overrides: Partial<MetObject>) => ({ ...wheatField, ...overrides });

describe("Met URLs [D-017, D-020]", () => {
  it("searches highlights with images on the v1.1 endpoint", () => {
    expect(searchUrl(11)).toBe(
      "https://collectionapi.metmuseum.org/public/collection/v1.1/search?departmentId=11&isHighlight=true&hasImages=true&offset=0&limit=500",
    );
    expect(objectUrl(436535)).toBe("https://collectionapi.metmuseum.org/public/collection/v1/objects/436535");
    expect(departmentIds).toEqual([11, 9, 1, 6, 21]);
    expect(classifications).toEqual(["Paintings", "Prints", "Drawings"]);
  });
});

describe("Met screen on recorded objects", () => {
  it("accepts a classified painting and blank-classification paintings", () => {
    expect(screen(wheatField)).toBeNull();
    expect(screen(repose)).toBeNull();
    expect(screen(lakeGeorge)).toBeNull();
  });

  it("rejects a work that is not public domain before anything else", () => {
    expect(screen(mural)).toBe("not public domain");
  });

  it("rejects objects that are not wall art, naming what they are", () => {
    expect(screen({ ...mural, isPublicDomain: true })).toBe("not wall art: Glass");
    expect(screen(variant({ classification: "", objectName: "Vase" }))).toBe("not wall art: Vase");
    expect(screen(variant({ classification: "", objectName: "" }))).toBe("not wall art: unclassified");
  });

  it("needs both image sizes", () => {
    expect(screen(variant({ primaryImage: "" }))).toBe("no image");
    expect(screen(variant({ primaryImageSmall: "" }))).toBe("no image");
  });

  it("screens the title, object name and tags, and copes with no tags", () => {
    expect(screen(variant({ tags: [{ term: "Nudes" }] }))).toBe('nudity: matched "nudes"');
    expect(screen(variant({ title: "Battle Scene" }))).toBe('violence: matched "battle"');
    expect(screen(variant({ tags: null }))).toBeNull();
  });
});

describe("Met isWallArt", () => {
  it.each(["Painting", "Print", "Woodblock print", "Drawings", "Watercolor", "Etching"])("accepts %s by object name", (objectName) => {
    expect(isWallArt({ classification: "", objectName })).toBe(true);
  });

  it.each(["Blueprint", "Imprint", "Footprint", "Vase", "Armor"])("rejects %s", (objectName) => {
    expect(isWallArt({ classification: "", objectName })).toBe(false);
  });
});

describe("Met toRawWork", () => {
  it("builds the recorded painting's record", () => {
    const work = toRawWork(wheatField, { width: 4000, height: 3184 }, 7);
    expect(work).toEqual({
      sourceId: "436535",
      title: "Wheat Field with Cypresses",
      artist: "Vincent van Gogh",
      date: "1889",
      lane: "fine-art",
      imageUrl: wheatField.primaryImage,
      thumbSourceUrl: wheatField.primaryImageSmall,
      width: 4000,
      height: 3184,
      license: "Public domain (CC0). Purchase, The Annenberg Foundation Gift, 1993",
      rank: 7,
      group: "landscape",
    });
    expect(rawWorkSchema.safeParse(work).success).toBe(true);
  });

  it("skips an unreadable or small image", () => {
    expect(toRawWork(wheatField, null, 0)).toBe("image size could not be read");
    expect(toRawWork(wheatField, { width: 1000, height: 800 }, 0)).toMatch(/^image too small/);
  });

  it("falls back for missing credits, including a null title", () => {
    const work = toRawWork(variant({ title: null, artistDisplayName: "", objectDate: null, creditLine: null, tags: null }), { width: 2000, height: 1500 }, 0);
    expect(typeof work !== "string" && [work.title, work.artist, work.date, work.license]).toEqual(["Untitled", "Unknown artist", "Undated", "Public domain (CC0)"]);
  });
});

describe("interleave (Met and Rijksmuseum candidate order)", () => {
  it("takes one from each list in turn, with uneven lengths", () => {
    expect(interleave([[1, 2, 3], [10], [20, 21]])).toEqual([1, 10, 20, 2, 21, 3]);
  });

  it("keeps a repeated id only at its first place", () => {
    expect(interleave([[1, 2], [2, 3]])).toEqual([1, 2, 3]);
  });

  it("handles no lists, empty lists and a single list", () => {
    expect(interleave([])).toEqual([]);
    expect(interleave([[], []])).toEqual([]);
    expect(interleave([[4, 5]])).toEqual([4, 5]);
  });
});
