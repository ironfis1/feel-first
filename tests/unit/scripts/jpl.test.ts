import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { artist, date, fullImageFor, keepAtomicClock, license, parseGallery, screen, toRawWork } from "../../../scripts/ingest/jpl.ts";
import { rawWorkSchema } from "../../../scripts/ingest/lib/raw.ts";

// Contract tests against the recorded JPL gallery page (docs/testing.md functional gate, D-018).
const gallery = parseGallery(readFileSync("tests/fixtures/ingest/jpl-gallery.html", "utf8"));
const entry = (title: string) => ({ title, imageUrl: "https://cdn.test/images/x.width-1024.jpg", pageUrl: "https://www.jpl.nasa.gov/images/x-poster/" });

describe("JPL parseGallery on the recorded page", () => {
  it("finds all 19 gallery entries in page order", () => {
    expect(gallery).toHaveLength(19);
    expect(gallery[0]).toEqual({
      title: "The Grand Tour",
      imageUrl: "https://d2pn8kiwq2w21t.cloudfront.net/images/grand_tour.width-1024.jpg",
      pageUrl: "https://www.jpl.nasa.gov/images/the-grand-tour-jpl-travel-poster",
    });
    expect(gallery.at(-1)?.title).toBe("55 Cancri e");
  });

  it("keeps 17 after the Atomic Clock rule [D-018]", () => {
    expect(gallery.filter((e) => screen(e) === null)).toHaveLength(17);
  });
});

describe("JPL parseGallery markup", () => {
  const block = (attrs: string) => `<div class="BaseGalleryImage"><a class="x" ${attrs}>`;

  it("decodes HTML entities in titles and links", () => {
    const html = block('href="https://c.test/images/a.width-1024.jpg?x=1&amp;y=2" data-title="Earth&#x27;s &quot;Moon&quot; &amp; Mars&#39;" data-url="https://j.test/a"');
    expect(parseGallery(html)[0]).toEqual({ title: `Earth's "Moon" & Mars'`, imageUrl: "https://c.test/images/a.width-1024.jpg?x=1&y=2", pageUrl: "https://j.test/a" });
  });

  it("finds nothing on an empty page, or when the attributes come in another order", () => {
    expect(parseGallery("")).toEqual([]);
    expect(parseGallery(block('data-title="A" href="https://c.test/a.jpg" data-url="https://j.test/a"'))).toEqual([]);
  });
});

describe("JPL fullImageFor", () => {
  it("swaps the gallery size for the original file on the same CDN", () => {
    expect(fullImageFor("https://d2pn8kiwq2w21t.cloudfront.net/images/mars.width-1024.jpg")).toBe("https://d2pn8kiwq2w21t.cloudfront.net/original_images/mars.jpg");
    expect(fullImageFor("https://cdn.test/images/a.b/atomic-clock_red.width-320.jpg")).toBe("https://cdn.test/original_images/a.b/atomic-clock_red.jpg");
  });

  it("gives null for a name outside the pattern", () => {
    expect(fullImageFor("https://cdn.test/original_images/mars.jpg")).toBeNull();
    expect(fullImageFor("https://cdn.test/images/mars.jpg")).toBeNull();
  });
});

describe("JPL screen", () => {
  it("keeps the red Atomic Clock and skips the other two colors [D-018]", () => {
    expect(keepAtomicClock).toBe("Deep Space Atomic Clock - Red");
    expect(screen(entry("Deep Space Atomic Clock - Red"))).toBeNull();
    expect(screen(entry("Deep Space Atomic Clock - Blue"))).toBe('same design as the "Deep Space Atomic Clock - Red" poster [D-018]');
  });

  it("passes other posters and applies the content screen", () => {
    expect(screen(entry("Europa"))).toBeNull();
    expect(screen(entry("Battle for Mars"))).toBe('violence: matched "battle"');
  });
});

describe("JPL toRawWork", () => {
  it("builds a poster record with JPL's credit and terms [Res #18, D-017]", () => {
    const work = toRawWork(gallery[1], "https://cdn.test/original_images/mars.jpg", { width: 2607, height: 3887 }, 1);
    expect(work).toEqual({
      sourceId: "mars-jpl-travel-poster",
      title: "Mars",
      artist: "NASA/JPL-Caltech",
      date: "Undated",
      lane: "poster",
      imageUrl: "https://cdn.test/original_images/mars.jpg",
      thumbSourceUrl: gallery[1].imageUrl,
      width: 2607,
      height: 3887,
      license,
      rank: 1,
      group: "space",
    });
    expect([artist, date]).toEqual(["NASA/JPL-Caltech", "Undated"]);
    expect(license).toContain("Courtesy NASA/JPL-Caltech");
    expect(license).toContain("no endorsement by NASA, JPL or Caltech is implied");
    expect(rawWorkSchema.safeParse(work).success).toBe(true);
  });

  it("takes the source id from the page address with or without a trailing slash", () => {
    const a = toRawWork(entry("A"), "https://cdn.test/a.jpg", { width: 1200, height: 1800 }, 0);
    const b = toRawWork({ ...entry("A"), pageUrl: "https://www.jpl.nasa.gov/images/x-poster" }, "https://cdn.test/a.jpg", { width: 1200, height: 1800 }, 0);
    expect(typeof a !== "string" && typeof b !== "string" && [a.sourceId, b.sourceId]).toEqual(["x-poster", "x-poster"]);
  });

  it("skips a small image", () => {
    expect(toRawWork(entry("A"), "https://cdn.test/a.jpg", { width: 800, height: 1100 }, 0)).toMatch(/^image too small/);
  });
});
