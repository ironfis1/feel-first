import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { plan, resize, sourceKeyOf, thumbWidth } from "../../../scripts/thumbs.ts";
import { sourceNames } from "../../../scripts/ingest/lib/raw.ts";

// thumbs.ts: plan is High tier, resize Medium (docs/test-tiers.md). Images are made in memory.

const work = (source: string, sourceId: string, file: string) => ({ source, sourceId, thumbUrl: `/thumbs/${file}` });
const urls = new Map([
  ["aic:1", "https://aic.test/1.jpg"],
  ["met:2", "https://met.test/2.jpg"],
]);

describe("plan", () => {
  it("downloads only works without a file, using the right source and address", () => {
    const catalog = [work("Art Institute of Chicago", "1", "aic-1.webp"), work("The Metropolitan Museum of Art", "2", "met-2.webp")];
    const { jobs, orphans, missing } = plan(catalog, urls, ["aic-1.webp"]);
    expect(jobs).toEqual([{ file: "met-2.webp", url: "https://met.test/2.jpg", sourceKey: "met" }]);
    expect(orphans).toEqual([]);
    expect(missing).toEqual([]);
  });

  it("lists works it cannot find a source for", () => {
    const catalog = [work("Cleveland Museum of Art", "9", "x.webp"), work("Art Institute of Chicago", "404", "aic-404.webp")];
    expect(plan(catalog, urls, []).missing).toEqual(["Cleveland Museum of Art 9", "Art Institute of Chicago 404"]);
  });

  it("removes WebP files no work points to, and leaves other files alone", () => {
    const catalog = [work("Art Institute of Chicago", "1", "aic-1.webp")];
    expect(plan(catalog, urls, ["aic-1.webp", "old.webp", ".gitkeep", "notes.txt"]).orphans).toEqual(["old.webp"]);
  });

  it("downloads a shared file name once", () => {
    const catalog = [work("Art Institute of Chicago", "1", "same.webp"), work("The Metropolitan Museum of Art", "2", "same.webp")];
    expect(plan(catalog, urls, []).jobs).toHaveLength(2);
  });
});

describe("sourceKeyOf", () => {
  it("maps every institution name back to its key, and nothing else", () => {
    for (const [key, name] of Object.entries(sourceNames)) expect(sourceKeyOf(name)).toBe(key);
    expect(sourceKeyOf("Cleveland Museum of Art")).toBeUndefined();
  });
});

describe("resize [D-002, D-023]", () => {
  const image = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: { r: 120, g: 80, b: 40 } } }).png().toBuffer();

  it("makes a 640px-wide WebP, keeping the whole picture", async () => {
    expect(thumbWidth).toBe(640);
    for (const [w, h, expected] of [[1600, 1000, 400], [1000, 1600, 1024]] as const) {
      const meta = await sharp(await resize(await image(w, h))).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["webp", 640, expected]);
    }
  });

  it("does not enlarge a small image", async () => {
    const meta = await sharp(await resize(await image(500, 700))).metadata();
    expect([meta.width, meta.height]).toEqual([500, 700]);
  });
});
