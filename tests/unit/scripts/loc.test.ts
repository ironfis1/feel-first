import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawWorkSchema } from "../../../scripts/ingest/lib/raw.ts";
import {
  allowedRights,
  artistOf,
  dateOf,
  itemId,
  listingUrl,
  type LocListing,
  type LocResult,
  masterIiifId,
  rightsOf,
  screen,
  toRawWork,
} from "../../../scripts/ingest/loc.ts";

// Contract tests against one recorded LOC listing page and one master info.json (docs/testing.md functional gate).
const recorded = JSON.parse(readFileSync("tests/fixtures/ingest/loc.json", "utf8")) as {
  listing: LocListing;
  info: { width: number; height: number };
};
const [first] = recorded.listing.results;
const variant = (item: Partial<NonNullable<LocResult["item"]>>, overrides: Partial<LocResult> = {}): LocResult => ({
  ...first,
  ...overrides,
  item: { ...first.item, ...item },
});

describe("LOC listing [D-017]", () => {
  it("pages the WPA collection as JSON, 100 at a time", () => {
    expect(listingUrl(3)).toBe("https://www.loc.gov/collections/works-progress-administration-posters/?fo=json&c=100&sp=3");
    expect(allowedRights).toBe("No known restrictions");
  });

  it("passes every recorded result through the screen", () => {
    expect(recorded.listing.results.map(screen)).toEqual([null, null, null, null, null]);
  });
});

describe("LOC masterIiifId", () => {
  it("works out the master scan's IIIF id from the recorded listing image", () => {
    expect(masterIiifId(first.image_url ?? [])).toBe("master:pnp:cph:3b40000:3b49000:3b49000:3b49078u");
  });

  it.each([
    ["a sized jpg", "https://tile.loc.gov/storage-services/service/pnp/cph/3f00000/3f05000/3f05100/3f05146_150px.jpg#h=150&w=101"],
    ["a lettered jpg", "https://tile.loc.gov/storage-services/service/pnp/cph/3f00000/3f05000/3f05100/3f05146v.jpg"],
    ["a gif", "https://tile.loc.gov/storage-services/service/pnp/cph/3f00000/3f05000/3f05100/3f05146t.gif"],
    ["an unsuffixed jpg", "https://tile.loc.gov/storage-services/service/pnp/cph/3f00000/3f05000/3f05100/3f05146.jpg"],
    ["upper case", "https://tile.loc.gov/storage-services/service/pnp/cph/3f00000/3f05000/3f05100/3F05146V.JPG"],
  ])("handles %s", (_label, url) => {
    expect(masterIiifId([url])?.toLowerCase()).toBe("master:pnp:cph:3f00000:3f05000:3f05100:3f05146u");
  });

  it("uses the first matching address and gives null when none match", () => {
    expect(masterIiifId(["https://example.org/a.jpg", "https://tile.loc.gov/storage-services/service/pnp/cph/1/2/3/9z00001r.jpg"])).toBe("master:pnp:cph:1:2:3:9z00001u");
    expect(masterIiifId(["https://example.org/a.jpg"])).toBeNull();
    expect(masterIiifId([])).toBeNull();
  });
});

describe("LOC artistOf", () => {
  it("credits the sponsoring project, never a playwright, on the recorded results", () => {
    expect(artistOf(recorded.listing.results[0])).toBe("Federal Art Project");
    expect(artistOf(recorded.listing.results[1])).toBe("Federal Theatre Project (U.S.)");
  });

  it("prefers an artist over a sponsor, matching roles in any case", () => {
    const creators = [{ role: "sponsor", title: "Federal Art Project" }, { role: "Artist, designer", title: "Jane Doe" }];
    expect(artistOf(variant({ creators }))).toBe("Jane Doe");
  });

  it("ignores blank names and falls back to Unknown artist", () => {
    expect(artistOf(variant({ creators: [{ role: "artist", title: " " }, { role: "sponsor", title: "WPA" }] }))).toBe("WPA");
    expect(artistOf(variant({ creators: [{ role: "", title: "Hopwood, Avery" }] }))).toBe("Unknown artist");
    expect(artistOf(variant({ creators: undefined }))).toBe("Unknown artist");
  });
});

describe("LOC itemId, dateOf and rightsOf", () => {
  it("takes the item number with or without a trailing slash", () => {
    expect(itemId(first)).toBe("98518971");
    expect(itemId({ ...first, id: "http://www.loc.gov/item/98518971" })).toBe("98518971");
  });

  it("removes the cataloger's brackets and falls back to Undated", () => {
    expect(dateOf(first)).toBe("between 1941 and 1943");
    expect(dateOf(variant({ date: "[between 1936 and 1938]" }))).toBe("between 1936 and 1938");
    expect(dateOf(variant({ date: " " }))).toBe("Undated");
  });

  it("joins a rights statement given as a list", () => {
    expect(rightsOf(variant({ rights_advisory: ["No known restrictions on publication.", "See notes."] }))).toBe(
      "No known restrictions on publication. See notes.",
    );
  });
});

describe("LOC screen (rights gate)", () => {
  it("skips any other rights statement, or none", () => {
    expect(screen(variant({ rights_advisory: "Publication may be restricted." }))).toBe("rights statement: Publication may be restricted.");
    expect(screen(variant({ rights_advisory: undefined }))).toBe("rights statement: none given");
  });

  it("trims before checking the rights", () => {
    expect(screen(variant({ rights_advisory: "  No known restrictions on publication." }))).toBeNull();
  });

  it("checks rights, then image, then content", () => {
    expect(screen(variant({ rights_advisory: "Restricted." }, { image_url: [], title: "Minstrel show" }))).toMatch(/^rights statement/);
    expect(screen(variant({}, { image_url: [], title: "Minstrel show" }))).toBe("no image");
    expect(screen(variant({}, { title: "Minstrel show" }))).toBe('racist caricature or slur: matched "minstrel"');
    expect(screen(variant({}, { subject: ["syphilis"] }))).toBe('reads badly in a demo: matched "syphilis"');
  });
});

describe("LOC toRawWork", () => {
  it("builds the recorded poster's record from its master scan", () => {
    const work = toRawWork(first, recorded.info, 0);
    expect(work).toEqual({
      sourceId: "98518971",
      title: "Volunteer civilian defense",
      artist: "Federal Art Project",
      date: "between 1941 and 1943",
      lane: "poster",
      imageUrl: "https://tile.loc.gov/image-services/iiif/master:pnp:cph:3b40000:3b49000:3b49000:3b49078u/full/full/0/default.jpg",
      thumbSourceUrl: "https://tile.loc.gov/image-services/iiif/master:pnp:cph:3b40000:3b49000:3b49000:3b49078u/full/843,/0/default.jpg",
      width: 1196,
      height: 1536,
      license: "No known restrictions on publication. Library of Congress, Prints and Photographs Division, WPA Poster Collection",
      rank: 0,
      group: "civic and work",
    });
    expect(rawWorkSchema.safeParse(work).success).toBe(true);
  });

  it("skips a small image and falls back to Untitled", () => {
    expect(toRawWork(first, { width: 693, height: 1024 }, 0)).toMatch(/^image too small/);
    const work = toRawWork({ ...first, title: " " }, recorded.info, 0);
    expect(typeof work !== "string" && work.title).toBe("Untitled");
  });
});
