// Builds the J1 calibration review page for Scott (D-003): every tagged work on the mood field,
// 20 works sampled across the field, per-lane bucket counts, and tag and subject distributions.
// Written to review/j1-calibration.html, which is gitignored and never deployed.
// Run by hand after scripts/j1.ts: node scripts/j1-review.ts

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { arousalBands, bucketKeys, bucketOf, type BucketKey, valenceBands } from "../src/lib/buckets.ts";
import { emotionTags, lanes, subjects } from "../src/lib/schemas.ts";
import { hashOf, type J1Fields, promptFrom } from "./j1.ts";
import { sample } from "./review.ts";

const root = path.resolve(import.meta.dirname, "..");

export type Tagged = J1Fields & { id: string; title: string; artist: string; date: string; lane: (typeof lanes)[number]; thumbUrl: string };

/** How many works of each lane fall in each bucket. */
export function bucketCounts(works: readonly Tagged[]): Record<string, Record<BucketKey, number>> {
  const counts = Object.fromEntries(lanes.map((lane) => [lane, Object.fromEntries(bucketKeys.map((k) => [k, 0]))])) as Record<string, Record<BucketKey, number>>;
  for (const w of works) counts[w.lane][bucketOf(w.valence, w.arousal)] += 1;
  return counts;
}

/** How many works of each lane carry each value; tags count once per work that has them. */
export function distribution(works: readonly Tagged[], values: readonly string[], of: (w: Tagged) => readonly string[]) {
  const counts = Object.fromEntries(lanes.map((lane) => [lane, Object.fromEntries(values.map((v) => [v, 0]))])) as Record<string, Record<string, number>>;
  for (const w of works) for (const v of of(w)) counts[w.lane][v] += 1;
  return counts;
}

/** n works spread across the field: buckets taken in turn, a seeded random work from each, until n are chosen. */
export function sampleAcrossField(works: readonly Tagged[], n: number, seed: number): Tagged[] {
  const byBucket = new Map(bucketKeys.map((k) => [k, sample(works.filter((w) => bucketOf(w.valence, w.arousal) === k), works.length, seed)]));
  const picked: Tagged[] = [];
  for (let round = 0; picked.length < n && picked.length < works.length; round++) {
    for (const k of bucketKeys) {
      const w = byBucket.get(k)![round];
      if (w && picked.length < n) picked.push(w);
    }
  }
  return picked;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const thumb = (w: Tagged) => `../public${w.thumbUrl}`;
const pct = (x: number) => `${((x + 1) / 2) * 100}%`;

function countGrid(counts: Record<BucketKey, number>): string {
  // Charged row on top, so the grid reads like the field.
  const rows = [...arousalBands].reverse().map((a) => `<tr><th>${a}</th>${valenceBands.map((v) => `<td>${counts[`${v}-${a}`]}</td>`).join("")}</tr>`);
  return `<table class="grid"><tr><th></th>${valenceBands.map((v) => `<th>${v}</th>`).join("")}</tr>${rows.join("")}</table>`;
}

function distTable(title: string, counts: Record<string, Record<string, number>>, values: readonly string[]): string {
  const rows = values.map((v) => `<tr><td>${v}</td>${lanes.map((l) => `<td>${counts[l][v]}</td>`).join("")}</tr>`);
  return `<table><tr><th>${title}</th>${lanes.map((l) => `<th>${l}</th>`).join("")}</tr>${rows.join("")}</table>`;
}

export function reviewHtml(works: readonly Tagged[], promptHash: string): string {
  const dots = works
    .map(
      (w) =>
        `<img class="dot ${w.lane}" src="${esc(thumb(w))}" style="left:${pct(w.valence)};bottom:${pct(w.arousal)}" title="${esc(`${w.title} (${w.lane}) v ${w.valence} a ${w.arousal}`)}" alt="">`,
    )
    .join("");
  const samples = sampleAcrossField(works, 20, 20261010)
    .map(
      (w) => `<figure><img src="${esc(thumb(w))}" alt=""><figcaption><b>${esc(w.title)}</b><br>${esc(w.artist)}, ${esc(w.date)}<br>${w.lane}<br>
valence ${w.valence}, arousal ${w.arousal} (${bucketOf(w.valence, w.arousal)})<br>tags: ${w.tags.join(", ")}<br>subject: ${w.subject}</figcaption></figure>`,
    )
    .join("");
  const counts = bucketCounts(works);
  return `<!doctype html><html><head><meta charset="utf-8"><title>J1 calibration</title><style>
body{font:14px system-ui,sans-serif;margin:24px;background:#f6f5f2;color:#222}
.field{position:relative;width:min(90vw,860px);aspect-ratio:1;background:#fff;border:1px solid #999;margin:24px 0 40px}
.field .line{position:absolute;background:#bbb}.dot{position:absolute;width:30px;height:30px;object-fit:cover;transform:translate(-50%,50%);border:2px solid;border-radius:3px}
.dot.poster{border-color:#d2691e}.dot.fine-art{border-color:#2f6db5}.dot:hover{width:160px;height:auto;z-index:9}
.lbl{position:absolute;font-size:12px;color:#666}
.hide-poster .dot.poster,.hide-fine-art .dot.fine-art{display:none}
.samples{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
figure{margin:0;background:#fff;padding:8px;border:1px solid #ddd}figure img{width:100%;height:180px;object-fit:contain;background:#eee}
table{border-collapse:collapse;margin:8px 24px 16px 0;display:inline-table;vertical-align:top}td,th{border:1px solid #ccc;padding:4px 8px;text-align:right}
</style></head><body>
<h1>J1 calibration review</h1>
<p>${works.length} works tagged with prompt ${promptHash}. Blue border: fine art. Orange border: poster. Hover a thumbnail to enlarge it. Lines mark the bucket cuts at -1/3 and +1/3.</p>
<p><label><input type="checkbox" checked onchange="document.body.classList.toggle('hide-fine-art',!this.checked)"> fine art</label>
<label><input type="checkbox" checked onchange="document.body.classList.toggle('hide-poster',!this.checked)"> posters</label></p>
<div class="field">
<div class="line" style="left:33.33%;top:0;bottom:0;width:1px"></div><div class="line" style="left:66.67%;top:0;bottom:0;width:1px"></div>
<div class="line" style="top:33.33%;left:0;right:0;height:1px"></div><div class="line" style="top:66.67%;left:0;right:0;height:1px"></div>
<span class="lbl" style="left:4px;top:50%">heavy</span><span class="lbl" style="right:4px;top:50%">bright</span>
<span class="lbl" style="left:50%;top:4px">charged</span><span class="lbl" style="left:50%;bottom:4px">calm</span>
${dots}</div>
<h2>Works per bucket</h2>
${lanes.map((l) => `<div style="display:inline-block"><h3>${l}</h3>${countGrid(counts[l])}</div>`).join("")}
<h2>20 works sampled across the field</h2><div class="samples">${samples}</div>
<h2>Tags and subjects per lane</h2>
${distTable("tag", distribution(works, emotionTags, (w) => w.tags), emotionTags)}
${distTable("subject", distribution(works, subjects, (w) => [w.subject]), subjects)}
</body></html>`;
}

async function main() {
  const promptHash = hashOf(promptFrom(await readFile(path.join(root, "docs/ai-jobs.md"), "utf8")));
  const catalog = JSON.parse(await readFile(path.join(root, "data/catalog.json"), "utf8")) as Tagged[];
  const stored = JSON.parse(await readFile(path.join(root, "data/raw/j1.json"), "utf8")) as Record<string, { promptHash: string; fields: J1Fields }>;
  const works = catalog.filter((w) => stored[w.id]?.promptHash === promptHash).map((w) => ({ ...w, ...stored[w.id].fields }));
  await mkdir(path.join(root, "review"), { recursive: true });
  await writeFile(path.join(root, "review/j1-calibration.html"), reviewHtml(works, promptHash));
  console.log(`review/j1-calibration.html written with ${works.length} works`);
}

if (import.meta.main) await main();
