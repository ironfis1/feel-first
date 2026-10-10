import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawWorkSchema } from "../../../scripts/ingest/lib/raw.ts";
import {
  artistOf,
  asArray,
  dateOf,
  iiifBaseOf,
  licenseOf,
  linkedArtUrl,
  type RijksObject,
  searchUrl,
  titleOf,
  toRawWork,
  types,
} from "../../../scripts/ingest/rijks.ts";

// Contract tests against one recorded Rijksmuseum chain: search, object, visual item, digital object, info.json.
const recorded = JSON.parse(readFileSync("tests/fixtures/ingest/rijks.json", "utf8"));

const en = { id: "http://vocab.getty.edu/aat/300388277" };
const nl = { id: "http://vocab.getty.edu/aat/300388256" };
const preferred = { id: "http://vocab.getty.edu/aat/300404670" };
type Ref = { id: string };
const name = (content: string, language: Ref | Ref[], classified_as: Ref[] = []) => ({ type: "Name", content, language, classified_as });
const maker = (en?: string, other?: string, label?: string) => ({
  notation: [...(other ? [{ "@language": "nl", "@value": other }] : []), ...(en ? [{ "@language": "en", "@value": en }] : [])],
  _label: label,
});
const pd = "https://creativecommons.org/publicdomain/mark/1.0/";
const cc0 = "https://creativecommons.org/publicdomain/zero/1.0/";
const right = (...ids: string[]) => ({ classified_as: ids.map((id) => ({ id })) });

describe("Rijksmuseum URLs [D-017]", () => {
  it("searches each wall-art type with an image", () => {
    expect(types).toEqual(["painting", "print", "drawing"]);
    expect(searchUrl("oil painting")).toBe("https://data.rijksmuseum.nl/search/collection?type=oil%20painting&imageAvailable=true");
    expect(linkedArtUrl("https://id.rijksmuseum.nl/1")).toBe("https://id.rijksmuseum.nl/1?_profile=la-framed&_mediatype=application/ld%2Bjson");
  });
});

describe("Rijksmuseum on the recorded chain", () => {
  it("reads title, artist, date, license and image", () => {
    expect(titleOf(recorded.object)).toBe("Misty Sea");
    expect(artistOf(recorded.object)).toBe("Jan Toorop");
    expect(dateOf(recorded.object)).toBe("1899");
    expect(licenseOf(recorded.visual)).toBe("Public Domain Mark 1.0");
    expect(iiifBaseOf(recorded.digital)).toBe("https://iiif.micr.io/mPymb");
  });

  it("builds a record that fits the raw schema, at 1686px wide [D-024]", () => {
    const work = toRawWork(recorded.object, "Public Domain Mark 1.0", "https://iiif.micr.io/mPymb", recorded.info, 3);
    expect(work).toMatchObject({
      sourceId: "200100988",
      imageUrl: "https://iiif.micr.io/mPymb/full/1686,/0/default.jpg",
      thumbSourceUrl: "https://iiif.micr.io/mPymb/full/843,/0/default.jpg",
      width: recorded.info.width,
      height: recorded.info.height,
      license: "Public Domain Mark 1.0. Rijksmuseum",
      rank: 3,
      lane: "fine-art",
    });
    expect(rawWorkSchema.safeParse(work).success).toBe(true);
  });
});

describe("Rijksmuseum titleOf and dateOf", () => {
  it("prefers the English preferred title, then any English title, then any title", () => {
    const names = [name("Mistige zee", nl, [preferred]), name("Sea", en), name("Misty Sea", en, [preferred])];
    expect(titleOf({ id: "x", identified_by: names })).toBe("Misty Sea");
    expect(titleOf({ id: "x", identified_by: names.slice(0, 2) })).toBe("Sea");
    expect(titleOf({ id: "x", identified_by: [names[0]] })).toBe("Mistige zee");
  });

  it("ignores blank names and identifiers, and accepts one object where a list is expected", () => {
    const object = { id: "x", identified_by: [name(" ", en), { type: "Identifier", content: "SK-1" }, name("Zee", nl)] } as RijksObject;
    expect(titleOf(object)).toBe("Zee");
    expect(titleOf({ id: "x", identified_by: name("One", en) } as RijksObject)).toBe("One");
    expect(titleOf({ id: "x" })).toBe("Untitled");
  });

  it("prefers the English date", () => {
    const object = { id: "x", produced_by: { timespan: { identified_by: [name("ca. 1650", nl), name("c. 1650", en)] } } } as RijksObject;
    expect(dateOf(object)).toBe("c. 1650");
    expect(dateOf({ id: "x" })).toBe("Undated");
  });

  it("treats one value, a list, null and undefined alike in asArray", () => {
    expect(asArray(1)).toEqual([1]);
    expect(asArray([1, 2])).toEqual([1, 2]);
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
  });
});

describe("Rijksmuseum artistOf", () => {
  it("prefers the English name, then any notation, then the label", () => {
    expect(artistOf({ id: "x", produced_by: { carried_out_by: [maker("Rembrandt", "Rembrandt van Rijn")] } })).toBe("Rembrandt");
    expect(artistOf({ id: "x", produced_by: { carried_out_by: [maker(undefined, "Meester")] } })).toBe("Meester");
    expect(artistOf({ id: "x", produced_by: { carried_out_by: [{ _label: "Label Maker" }] } })).toBe("Label Maker");
  });

  it("reads makers from production parts, once each, joined with commas", () => {
    const object = {
      id: "x",
      produced_by: { carried_out_by: [maker("A")], part: [{ carried_out_by: [maker("A")] }, { carried_out_by: maker("B") }] },
    } as RijksObject;
    expect(artistOf(object)).toBe("A, B");
  });

  it("drops blank names and falls back to Unknown artist", () => {
    expect(artistOf({ id: "x", produced_by: { carried_out_by: [maker(" ")] } })).toBe("Unknown artist");
    expect(artistOf({ id: "x" })).toBe("Unknown artist");
  });
});

describe("Rijksmuseum licenseOf (public domain only)", () => {
  it("accepts the Public Domain Mark and CC0, given as one object or a list", () => {
    expect(licenseOf({ subject_to: [right(pd)] })).toBe("Public Domain Mark 1.0");
    expect(licenseOf({ subject_to: { classified_as: { id: cc0 } } } as never)).toBe("CC0 1.0");
  });

  it("rejects other licenses, missing rights and near-miss addresses", () => {
    expect(licenseOf({ subject_to: [right("https://creativecommons.org/licenses/by/4.0/")] })).toBeNull();
    expect(licenseOf({ subject_to: [right("http://rightsstatements.org/vocab/InC/1.0/")] })).toBeNull();
    expect(licenseOf({})).toBeNull();
    expect(licenseOf({ subject_to: [right("http://creativecommons.org/publicdomain/mark/1.0/")] })).toBeNull();
    expect(licenseOf({ subject_to: [right("https://creativecommons.org/publicdomain/mark/1.0")] })).toBeNull();
  });

  it("rejects a work that carries a restrictive right as well as a public-domain one", () => {
    expect(licenseOf({ subject_to: [right(pd), right("https://creativecommons.org/licenses/by/4.0/")] })).toBeNull();
  });

  it("ignores classifications that are not licenses", () => {
    expect(licenseOf({ subject_to: [right("http://vocab.getty.edu/aat/300055598", pd)] })).toBe("Public Domain Mark 1.0");
  });
});

describe("Rijksmuseum iiifBaseOf and toRawWork", () => {
  it("finds the first IIIF access point, from a list or one object", () => {
    expect(iiifBaseOf({ access_point: [{ id: "https://example.org/a.jpg" }, { id: "https://iiif.micr.io/abc/full/max/0/default.jpg" }] })).toBe("https://iiif.micr.io/abc");
    expect(iiifBaseOf({ access_point: { id: "https://iiif.micr.io/xyz/info.json" } } as never)).toBe("https://iiif.micr.io/xyz");
    expect(iiifBaseOf({ access_point: [{ id: "https://example.org/a.jpg" }] })).toBeNull();
    expect(iiifBaseOf({})).toBeNull();
  });

  it("skips a small image and never asks for more than the scan's width", () => {
    expect(toRawWork(recorded.object, "CC0 1.0", "https://iiif.micr.io/a", { width: 900, height: 1100 }, 0)).toMatch(/^image too small/);
    const narrow = toRawWork(recorded.object, "CC0 1.0", "https://iiif.micr.io/a", { width: 1000, height: 1500 }, 0);
    expect(typeof narrow !== "string" && narrow.imageUrl).toBe("https://iiif.micr.io/a/full/1000,/0/default.jpg");
  });
});

describe("Rijksmuseum gaps found by mutation testing", () => {
  it("counts a name as English when English is one of several languages", () => {
    expect(titleOf({ id: "x", identified_by: [name("Zee", nl), name("Sea", [nl, en])] })).toBe("Sea");
  });

  it("prefers a preferred English title over an English title with another classification", () => {
    const other = { id: "http://vocab.getty.edu/aat/300417207" };
    expect(titleOf({ id: "x", identified_by: [name("Sea", en, [other]), name("Misty Sea", en, [other, preferred])] })).toBe("Misty Sea");
  });

  it("trims titles and dates, and skips names with no text", () => {
    const object = {
      id: "x",
      identified_by: [{ type: "Name", language: en }, name("  Misty Sea  ", en)],
      produced_by: { timespan: { identified_by: [{ type: "Name", language: en }, name(" 1899 ", en)] } },
    } as RijksObject;
    expect(titleOf(object)).toBe("Misty Sea");
    expect(dateOf(object)).toBe("1899");
  });

  it("copes with a production that has no date, and a maker with no name at all", () => {
    expect(dateOf({ id: "x", produced_by: {} })).toBe("Undated");
    expect(artistOf({ id: "x", produced_by: { carried_out_by: [{}] } })).toBe("Unknown artist");
  });

  it("treats an http rights statement as a license, so it blocks a public-domain mark", () => {
    expect(licenseOf({ subject_to: [right(pd), right("http://rightsstatements.org/vocab/InC/1.0/")] })).toBeNull();
  });

  it("only treats an address that starts with a license site as a license", () => {
    expect(licenseOf({ subject_to: [right(pd, "https://vocab.test/?see=https://creativecommons.org/licenses/by/4.0/")] })).toBe("Public Domain Mark 1.0");
  });

  it("groups the work by its title", () => {
    const work = toRawWork(recorded.object, "CC0 1.0", "https://iiif.micr.io/a", recorded.info, 0);
    expect(typeof work !== "string" && work.group).toBe("seascape");
  });
});
