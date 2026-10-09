import { beforeEach, describe, expect, it, vi } from "vitest";
import { metadataCatalogFileSchema } from "@/lib/schemas";
import type { Sourced } from "../../../scripts/merge.ts";

// High tier (docs/test-tiers.md). File reads are replaced in memory; no real files or network.
const files = new Map<string, string>();
vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
  readFile: vi.fn(async (file: string) => {
    const key = String(file).replace(/\\/g, "/").split("/").slice(-2).join("/");
    if (!files.has(key)) throw new Error(`ENOENT ${key}`);
    return files.get(key);
  }),
}));
vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
  existsSync: vi.fn((file: string) => files.has(String(file).replace(/\\/g, "/").split("/").slice(-2).join("/"))),
}));

const merge = await import("../../../scripts/merge.ts");
const { fineArtFloor, loadRaw, loadVisualSkips, perMuseum, posterTotal, selectFineArt, selectPosters, thumbName, toCatalog, withoutVisualSkips } = merge;

beforeEach(() => files.clear());

let counter = 0;
const work = (sourceKey: Sourced["sourceKey"], overrides: Partial<Sourced> = {}): Sourced => {
  counter++;
  return {
    sourceKey,
    sourceId: `${sourceKey}${counter}`,
    title: `Work ${counter}`,
    artist: "A. Painter",
    date: "1880",
    lane: sourceKey === "jpl" || sourceKey === "loc" ? "poster" : "fine-art",
    imageUrl: `https://museum.test/${counter}.jpg`,
    thumbSourceUrl: `https://museum.test/${counter}-small.jpg`,
    width: 2000,
    height: 1500,
    license: "Public domain",
    rank: counter,
    group: "landscape",
    ...overrides,
  };
};
const pool = (key: Sourced["sourceKey"], n: number) => Array.from({ length: n }, () => work(key));
const count = (list: Sourced[], key: string) => list.filter((w) => w.sourceKey === key).length;

describe("selectFineArt [Res #37, Gap G21]", () => {
  it("takes 100 from each museum, in AIC, Met, Rijksmuseum order", () => {
    expect([perMuseum, fineArtFloor]).toEqual([100, 270]);
    const picked = selectFineArt({ aic: pool("aic", 120), met: pool("met", 110), rijks: pool("rijks", 100) });
    expect([count(picked, "aic"), count(picked, "met"), count(picked, "rijks")]).toEqual([100, 100, 100]);
    expect(picked.map((w) => w.sourceKey)).toEqual([...Array(100).fill("aic"), ...Array(100).fill("met"), ...Array(100).fill("rijks")]);
  });

  it("makes up one museum's shortfall from the other two, taking turns", () => {
    const picked = selectFineArt({ aic: pool("aic", 130), met: pool("met", 130), rijks: pool("rijks", 80) });
    expect([count(picked, "aic"), count(picked, "met"), count(picked, "rijks")]).toEqual([110, 110, 80]);
    expect(new Set(picked.map((w) => w.sourceId)).size).toBe(300);
  });

  it("fills an odd shortfall exactly, with no extra work", () => {
    const picked = selectFineArt({ aic: pool("aic", 130), met: pool("met", 130), rijks: pool("rijks", 79) });
    expect([count(picked, "aic"), count(picked, "met"), count(picked, "rijks")]).toEqual([111, 110, 79]);
  });

  it("appends fill works after that museum's own picks", () => {
    const aic = pool("aic", 101);
    const picked = selectFineArt({ aic, met: pool("met", 100), rijks: pool("rijks", 99) });
    expect(picked[100]).toBe(aic[100]);
    expect(picked.slice(0, 101).every((w) => w.sourceKey === "aic")).toBe(true);
  });

  it("allows 270 works but asks for Cleveland below that", () => {
    expect(selectFineArt({ aic: pool("aic", 100), met: pool("met", 100), rijks: pool("rijks", 70) })).toHaveLength(270);
    expect(() => selectFineArt({ aic: pool("aic", 100), met: pool("met", 100), rijks: pool("rijks", 69) })).toThrow(
      "fine art has 269 works, below 270: the Cleveland Museum of Art is needed [Gap G21]",
    );
  });

  it("spreads each museum's picks across subject groups [D-020]", () => {
    const aic = [...pool("aic", 150).map((w) => ({ ...w, group: "figure" })), work("aic", { group: "seascape", rank: 999 })];
    const picked = selectFineArt({ aic, met: pool("met", 100), rijks: pool("rijks", 100) });
    expect(picked.some((w) => w.group === "seascape")).toBe(true);
  });
});

describe("selectPosters [RB38, Res #37]", () => {
  it("takes every JPL poster first, then the WPA to 300", () => {
    expect(posterTotal).toBe(300);
    const jpl = pool("jpl", 17);
    const picked = selectPosters(jpl, pool("loc", 400));
    expect(picked).toHaveLength(300);
    expect(picked.slice(0, 17)).toEqual(jpl);
  });

  it("returns fewer without error when the WPA runs short", () => {
    expect(selectPosters(pool("jpl", 17), pool("loc", 10))).toHaveLength(27);
  });

  it("takes all 300 from the WPA when there is no JPL poster, and none when JPL fills the lane", () => {
    expect(selectPosters([], pool("loc", 400))).toHaveLength(300);
    expect(count(selectPosters(pool("jpl", 301), pool("loc", 5)), "loc")).toBe(0);
  });
});

describe("toCatalog [spec Section 3.2, D-008]", () => {
  it("numbers works in order with zero-padded ids, and maps each field", () => {
    const w = work("met", { sourceId: "436535", title: "Wheat Field", width: 4000, height: 3184 });
    const [record] = toCatalog([w, work("loc")]);
    expect(record).toEqual({
      id: "w-0001",
      title: "Wheat Field",
      artist: "A. Painter",
      date: "1880",
      source: "The Metropolitan Museum of Art",
      sourceId: "436535",
      lane: "fine-art",
      imageUrl: w.imageUrl,
      thumbUrl: "/thumbs/met-436535.webp",
      width: 4000,
      height: 3184,
      orientation: "landscape",
      license: "Public domain",
    });
    expect(toCatalog([w, work("loc")]).map((r) => r.id)).toEqual(["w-0001", "w-0002"]);
  });

  it("widens ids beyond 9,999 works, and gives nothing for no works", () => {
    const many = Array.from({ length: 10000 }, (_, i) => work("loc", { sourceId: `x${i}` }));
    expect(toCatalog(many).at(-1)?.id).toBe("w-10000");
    expect(toCatalog(many)[0].id).toBe("w-00001");
    expect(toCatalog([])).toEqual([]);
  });

  it("sets orientation from the dimensions", () => {
    const orient = (width: number, height: number) => toCatalog([work("aic", { width, height })])[0].orientation;
    expect([orient(3000, 2000), orient(2000, 3000), orient(2000, 2000)]).toEqual(["landscape", "portrait", "square"]);
  });

  it("keeps source em dashes in credits [D-022] and fits the M2 schema with no J1 fields", () => {
    const dash = String.fromCharCode(0x2014);
    const records = toCatalog([work("aic", { title: `La Grande Jatte ${dash} 1884`, license: `Public domain ${dash} gift` })]);
    expect(records[0].title).toContain(dash);
    expect(records[0].license).toContain(dash);
    expect(metadataCatalogFileSchema.safeParse(records).success).toBe(true);
    expect(Object.keys(records[0])).not.toContain("valence");
  });

  it("fails rather than let two works share a thumbnail file", () => {
    expect(() => toCatalog([work("aic", { sourceId: "A_1" }), work("aic", { sourceId: "a-1" })])).toThrow("would share the thumbnail aic-a-1.webp");
  });
});

describe("thumbName [D-001, D-023]", () => {
  it("names a WebP by source key and a cleaned source id", () => {
    expect(thumbName({ sourceKey: "aic", sourceId: "28560" })).toBe("aic-28560.webp");
    expect(thumbName({ sourceKey: "jpl", sourceId: "Mars_JPL poster/2" })).toBe("jpl-mars-jpl-poster-2.webp");
    expect(thumbName({ sourceKey: "loc", sourceId: "a__b" })).toBe("loc-a-b.webp");
  });
});

describe("withoutVisualSkips [D-021]", () => {
  it("removes exactly the flagged source and id, keeping order", () => {
    const a = work("aic", { sourceId: "1" });
    const b = work("met", { sourceId: "1" });
    const c = work("aic", { sourceId: "2" });
    const skip = { sourceKey: "aic", sourceId: "1", title: "", reason: "graphic violence" };
    expect(withoutVisualSkips([a, b, c], [skip])).toEqual([b, c]);
    expect(withoutVisualSkips([a, b], [])).toEqual([a, b]);
    expect(withoutVisualSkips([b], [skip])).toEqual([b]);
  });
});

describe("loadRaw", () => {
  const raw = (sourceKey: string) =>
    JSON.stringify({ sourceKey, source: "x", fetchedAt: "2026-10-09T15:00:00.000Z", works: [withoutKey(work("aic"))], skips: [] });
  const withoutKey = (w: Sourced) => Object.fromEntries(Object.entries(w).filter(([k]) => k !== "sourceKey"));

  it("tags each work with its source", async () => {
    files.set("raw/aic.json", raw("aic"));
    const works = await loadRaw("aic");
    expect(works.map((w) => w.sourceKey)).toEqual(["aic"]);
  });

  it("refuses a file that says it holds another source's works", async () => {
    files.set("raw/met.json", raw("aic"));
    await expect(loadRaw("met")).rejects.toThrow("data/raw/met.json says it holds aic works");
  });

  it("refuses a file that breaks the schema", async () => {
    files.set("raw/aic.json", JSON.stringify({ sourceKey: "aic" }));
    await expect(loadRaw("aic")).rejects.toThrow();
  });
});

describe("loadVisualSkips [D-021]", () => {
  it("gives none when the visual check has written nothing", async () => {
    expect(await loadVisualSkips()).toEqual([]);
  });

  it("reads the file, and refuses unknown fields or an empty reason", async () => {
    const entry = { sourceKey: "aic", sourceId: "1", title: "T", reason: "graphic violence" };
    files.set("raw/visual-skips.json", JSON.stringify([entry]));
    expect(await loadVisualSkips()).toEqual([entry]);
    files.set("raw/visual-skips.json", JSON.stringify([{ ...entry, note: "x" }]));
    await expect(loadVisualSkips()).rejects.toThrow();
    files.set("raw/visual-skips.json", JSON.stringify([{ ...entry, reason: "" }]));
    await expect(loadVisualSkips()).rejects.toThrow();
    files.set("raw/visual-skips.json", "{oops");
    await expect(loadVisualSkips()).rejects.toThrow();
  });
});
