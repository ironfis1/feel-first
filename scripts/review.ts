// Builds Scott's review materials (M2): a readable skip log and a contact sheet of 60 random works.
// Written to review/, which is gitignored and never deployed.
// Run by hand after scripts/thumbs.ts: node scripts/review.ts

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { metadataCatalogFileSchema } from "../src/lib/schemas.ts";
import { rawFileSchema, type Skip, sourceKeys, sourceNames } from "./ingest/lib/raw.ts";
import { loadVisualSkips } from "./merge.ts";

const root = path.resolve(import.meta.dirname, "..");
const reviewDir = path.join(root, "review");

/** Contact sheet size, and a fixed seed so the same 60 come back until the catalog changes. */
export const sheetSize = 60;
export const sheetSeed = 20261009;

/** Groups skips by reason, with numbers and wording stripped so "image too small: 768px" and "...: 1018px" group together. */
export const reasonGroup = (reason: string) => reason.split(":")[0].trim();

export function skipLogMarkdown(bySource: { source: string; skips: Skip[] }[]): string {
  const total = bySource.reduce((n, s) => n + s.skips.length, 0);
  const lines = [`# Skip log`, ``, `Every work a source offered and the scripts did not use, with the reason (D-002, D-021). ${total} in all.`, ``];
  for (const { source, skips } of bySource) {
    lines.push(`## ${source} (${skips.length})`, ``);
    const groups = new Map<string, Skip[]>();
    for (const skip of skips) groups.set(reasonGroup(skip.reason), [...(groups.get(reasonGroup(skip.reason)) ?? []), skip]);
    for (const [group, items] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
      lines.push(`### ${group} (${items.length})`, ``);
      for (const s of items) lines.push(`- ${s.title || "(no title)"} [${s.sourceId}]: ${s.reason}`);
      lines.push(``);
    }
  }
  return lines.join("\n");
}

/** A small seeded shuffle (mulberry32), so the sample is random but repeatable. */
export function sample<T>(items: readonly T[], n: number, seed: number): T[] {
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function contactSheetHtml(
  works: readonly { id: string; title: string; artist: string; date: string; source: string; license: string; lane: string; thumbUrl: string; imageUrl: string }[],
  totals: { fineArt: number; posters: number },
): string {
  const fineArt = works.filter((w) => w.lane === "fine-art").length;
  const cards = works
    .map(
      (w) => `<figure class="${w.lane}"><a href="${escape(w.imageUrl)}"><img src="../public${escape(w.thumbUrl)}" alt="${escape(w.title)}" loading="lazy"></a>
<figcaption><b>${escape(w.title)}</b><br>${escape(w.artist)}, ${escape(w.date)}<br>${escape(w.source)}<br><small>${escape(w.license)}</small><br><small>${w.id} · ${w.lane}</small></figcaption></figure>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contact sheet</title>
<style>
body { font: 14px/1.4 system-ui, sans-serif; margin: 16px; background: #f4f2ee; color: #222; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
figure { margin: 0; background: #fff; padding: 8px; border-top: 4px solid #8a8; }
figure.poster { border-top-color: #c84; }
img { width: 100%; height: auto; display: block; }
figcaption { margin-top: 6px; }
</style></head><body>
<h1>Contact sheet: ${works.length} random works</h1>
<p>Catalog: ${totals.fineArt} fine art, ${totals.posters} posters. This sample: ${fineArt} fine art (green), ${works.length - fineArt} posters (orange). Click an image for the full-size file at the source.</p>
<div class="grid">
${cards}
</div></body></html>
`;
}

async function main() {
  await mkdir(reviewDir, { recursive: true });
  const bySource: { source: string; skips: Skip[] }[] = [];
  const visual = await loadVisualSkips();
  for (const key of sourceKeys) {
    const file = path.join(root, "data/raw", `${key}.json`);
    if (!existsSync(file)) continue;
    const raw = rawFileSchema.parse(JSON.parse(await readFile(file, "utf8")));
    const visualSkips = visual
      .filter((v) => v.sourceKey === key)
      .map((v) => ({ sourceId: v.sourceId, title: v.title, reason: `visual check: ${v.reason}` }));
    bySource.push({ source: sourceNames[key], skips: [...raw.skips, ...visualSkips] });
  }
  await writeFile(path.join(reviewDir, "skip-log.md"), skipLogMarkdown(bySource));
  const catalog = metadataCatalogFileSchema.parse(JSON.parse(await readFile(path.join(root, "data/catalog.json"), "utf8")));
  const totals = {
    fineArt: catalog.filter((w) => w.lane === "fine-art").length,
    posters: catalog.filter((w) => w.lane === "poster").length,
  };
  await writeFile(path.join(reviewDir, "contact-sheet.html"), contactSheetHtml(sample(catalog, sheetSize, sheetSeed), totals));
  console.log(`review/skip-log.md and review/contact-sheet.html written`);
}

if (import.meta.main) await main();
