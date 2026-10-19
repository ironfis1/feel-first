// J8 signals generator: computes four findings from data/signals-seed.json, has Claude write each finding's
// sentence and business action at build time, and writes data/signals.json [spec Section 3.11, Section 4 J8].
// Run by hand after scripts/j8-seed.ts. Spends money only with --write.
//
//   node scripts/j8.ts --figures            print the computed findings and figures (no model call)
//   node scripts/j8.ts --write              send the 4 findings to Claude in one batch, then write data/signals.json
//   node scripts/j8.ts --write --resume=ID  re-attach to a batch already submitted
//   node scripts/j8.ts --replay=FILE        rebuild data/signals.json from a recorded run in data/runs (no model call)
//
// Every number in a finding's text and action must be one of its figures, and every figure is recomputed
// from the seed file. AI output is never edited by hand: if a sentence is wrong, change the prompt and re-run.
// The one change made in code is thousands separators in whole numbers, so 20000 reads 20,000 on screen.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type { z } from "zod";
import { claudeEffort, claudeModel, frameFinishes, roomNames } from "../src/config/feel.ts";
import { bucketKeys, type BucketKey, bucketOf } from "../src/lib/buckets.ts";
import { catalogFileSchema, findingKinds, signalsFileSchema, signalsSeedFileSchema } from "../src/lib/schemas.ts";
import { type BatchRequest, liveBatchApi, runBatch } from "./lib/batch.ts";
import { findingProblems } from "./lib/j8-rules.ts";
import { hashOf, promptBetween } from "./lib/prompt.ts";

const root = path.resolve(import.meta.dirname, "..");

type Work = z.infer<typeof catalogFileSchema>[number];
type SeedFile = z.infer<typeof signalsSeedFileSchema>;
export type SignalsFile = z.infer<typeof signalsFileSchema>;
type Kind = (typeof findingKinds)[number];

/** A finding before Claude writes its words: what it is about and the figures it may cite. */
export type Draft = { kind: Kind; bucket: BucketKey; group?: string; figures: Record<string, number> };

/** A group must have at least this many views in a segment before its lift counts, so a rack is not built on noise. */
export const minGroupViews = 300;

const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;
const pct = (part: number, whole: number) => round((100 * part) / whole, 1);

/** Sessions, views, adds and catalog works per bucket [D-029]. */
export function bucketFigures(seedFile: SeedFile, catalog: readonly Work[]) {
  const figures = Object.fromEntries(bucketKeys.map((k) => [k, { sessions: 0, views: 0, adds: 0, works: 0 }])) as Record<
    BucketKey,
    { sessions: number; views: number; adds: number; works: number }
  >;
  for (const s of seedFile.sessions) {
    figures[s.bucket].sessions += 1;
    figures[s.bucket].views += s.views.length;
    figures[s.bucket].adds += s.adds.length;
  }
  for (const w of catalog) figures[bucketOf(w.valence, w.arousal)].works += 1;
  return figures;
}

/** The four findings and their figures, all computed from the seed file and the catalog. */
export function computeDrafts(seedFile: SeedFile, catalog: readonly Work[]): Draft[] {
  const byId = new Map(catalog.map((w) => [w.id, w]));
  const buckets = bucketFigures(seedFile, catalog);
  const totalViews = bucketKeys.reduce((n, k) => n + buckets[k].views, 0);
  const totalAdds = bucketKeys.reduce((n, k) => n + buckets[k].adds, 0);
  const catalogRate = totalAdds / totalViews;
  const catalogPickPct = pct(totalAdds, totalViews);

  // 1. Rack candidate: the poster subject group with the highest lift in one segment.
  // Lift = the segment's pick rate for the group divided by the catalog-average pick rate [Gap G27].
  const cells = new Map<string, { bucket: BucketKey; group: string; views: number; adds: number }>();
  const cell = (bucket: BucketKey, group: string) => {
    const key = `${bucket}|${group}`;
    if (!cells.has(key)) cells.set(key, { bucket, group, views: 0, adds: 0 });
    return cells.get(key)!;
  };
  for (const s of seedFile.sessions) {
    for (const id of s.views) {
      const w = byId.get(id)!;
      if (w.lane === "poster") cell(s.bucket, w.subject).views += 1;
    }
    for (const line of s.adds) {
      const w = byId.get(line.id)!;
      if (w.lane === "poster") cell(s.bucket, w.subject).adds += 1;
    }
  }
  const rack = [...cells.values()]
    .filter((c) => c.views >= minGroupViews)
    .sort((x, y) => y.adds / y.views - x.adds / x.views || (x.bucket + x.group < y.bucket + y.group ? -1 : 1))[0];
  const rackWorks = catalog.filter((w) => w.lane === "poster" && w.subject === rack.group).length;

  // 2. Attach pattern: the segment whose adds are most often framed, and its leading frame finish.
  const framedBy = Object.fromEntries(bucketKeys.map((k) => [k, { adds: 0, framed: 0, finishes: {} as Record<string, number> }]));
  let framedAll = 0;
  for (const s of seedFile.sessions) {
    for (const line of s.adds) {
      const f = framedBy[s.bucket];
      f.adds += 1;
      if (line.frame) {
        f.framed += 1;
        framedAll += 1;
        f.finishes[line.frame] = (f.finishes[line.frame] ?? 0) + 1;
      }
    }
  }
  const attach = bucketKeys
    .filter((k) => framedBy[k].adds >= 100)
    .sort((x, y) => framedBy[y].framed / framedBy[y].adds - framedBy[x].framed / framedBy[x].adds)[0];
  const finishes = framedBy[attach].finishes;
  const topFinish = [...frameFinishes].sort((x, y) => (finishes[y] ?? 0) - (finishes[x] ?? 0))[0];

  // 3. Under-converting segment: the lowest pick rate against the catalog average.
  // A bucket with no views or no sessions has no rate, so it is left out rather than sorted as NaN.
  const under = bucketKeys
    .filter((k) => buckets[k].views > 0)
    .sort((x, y) => buckets[x].adds / buckets[x].views - buckets[y].adds / buckets[y].views)[0];

  // 4. Licensing gap: the fewest catalog works per expected session [Gap G27].
  const gap = bucketKeys
    .filter((k) => buckets[k].sessions > 0)
    .sort((x, y) => buckets[x].works / buckets[x].sessions - buckets[y].works / buckets[y].sessions)[0];

  const drafts: Draft[] = [
    {
      kind: "rack-candidate",
      bucket: rack.bucket,
      group: `${rack.group} posters`,
      figures: {
        lift: round(rack.adds / rack.views / catalogRate, 1),
        groupPickRatePct: pct(rack.adds, rack.views),
        catalogPickRatePct: catalogPickPct,
        groupViews: rack.views,
        groupAdds: rack.adds,
        groupWorks: rackWorks,
      },
    },
    {
      kind: "attach-pattern",
      bucket: attach,
      group: `${topFinish} frame`,
      figures: {
        framedSharePct: pct(framedBy[attach].framed, framedBy[attach].adds),
        catalogFramedSharePct: pct(framedAll, totalAdds),
        topFinishSharePct: pct(finishes[topFinish] ?? 0, framedBy[attach].framed),
        segmentAdds: framedBy[attach].adds,
      },
    },
    {
      kind: "under-converting",
      bucket: under,
      figures: {
        pickRatePct: pct(buckets[under].adds, buckets[under].views),
        catalogPickRatePct: catalogPickPct,
        lift: round(buckets[under].adds / buckets[under].views / catalogRate, 2),
        sessions: buckets[under].sessions,
      },
    },
    {
      kind: "licensing-gap",
      bucket: gap,
      figures: {
        works: buckets[gap].works,
        sessions: buckets[gap].sessions,
        worksPer1000Sessions: round((1000 * buckets[gap].works) / buckets[gap].sessions, 1),
        perSessions: 1000,
        catalogWorksPer1000Sessions: round((1000 * catalog.length) / seedFile.sessionCount, 1),
      },
    },
  ];
  // Every finding may cite the size of the dataset.
  return drafts.map((d) => ({ ...d, figures: { ...d.figures, totalSessions: seedFile.sessionCount } }));
}

/** Plain words for each mood segment, matching the J4 prompt's descriptions. */
export const segmentWords: Record<BucketKey, string> = {
  "heavy-calm": "heavy and calm: somber, quiet, still",
  "mid-calm": "calm: restful, even, unhurried",
  "bright-calm": "bright and calm: light, gentle, warm, at rest",
  "heavy-mid": "heavy: grave, weighty, thoughtful",
  "mid-mid": "in the middle: balanced, steady, everyday",
  "bright-mid": "bright: warm, hopeful, easy",
  "heavy-charged": "heavy and charged: dramatic, stormy, tense",
  "mid-charged": "charged: restless, alert, full of energy",
  "bright-charged": "bright and charged: joyful, lively, exuberant",
};

const kindWords: Record<Kind, string> = {
  "rack-candidate": "retail rack candidate: a group of posters picked far above the catalog average in one mood segment",
  "attach-pattern": "frame attach pattern: how often one mood segment adds a frame, and which finish it picks",
  "under-converting": "under-converting mood segment: the segment whose sessions add the fewest works to the bag per work viewed",
  "licensing-gap": "licensing gap: the mood segment with the fewest catalog works per expected session",
};

const figureWords: Record<string, string> = {
  lift: "segment pick rate divided by catalog-average pick rate",
  groupPickRatePct: "pick rate of the group in this segment, percent of views added to the bag",
  catalogPickRatePct: "catalog-average pick rate, percent",
  groupViews: "views of the group in this segment",
  groupAdds: "adds of the group in this segment",
  groupWorks: "posters in the group",
  framedSharePct: "percent of this segment's adds that were framed",
  catalogFramedSharePct: "percent of all adds that were framed",
  topFinishSharePct: "percent of this segment's framed adds using the leading finish",
  segmentAdds: "adds in this segment",
  pickRatePct: "this segment's pick rate, percent",
  sessions: "sessions in this segment",
  works: "catalog works in this segment",
  worksPer1000Sessions: "catalog works per 1,000 sessions in this segment",
  perSessions: "the 1,000 in per 1,000 sessions",
  catalogWorksPer1000Sessions: "catalog works per 1,000 sessions across the whole catalog",
  totalSessions: "simulated sessions in the dataset",
};

/** The user text for one finding. */
export function draftText(d: Draft): string {
  return [
    `Kind: ${kindWords[d.kind]}`,
    `Mood segment: ${roomNames[d.bucket]} (${segmentWords[d.bucket]})`,
    ...(d.group ? [`Group: ${d.group}`] : []),
    "Figures:",
    ...Object.entries(d.figures).map(([name, value]) => `- ${name} = ${value} (${figureWords[name] ?? name})`),
  ].join("\n");
}

export const j8JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["text", "action"],
  properties: { text: { type: "string" }, action: { type: "string" } },
};

/** One batch request per finding, keyed by its kind. */
export function j8Request(d: Draft, system: string): BatchRequest {
  return {
    custom_id: d.kind,
    params: {
      model: claudeModel,
      max_tokens: 2000,
      system,
      output_config: { effort: claudeEffort.j8, format: { type: "json_schema", schema: j8JsonSchema } },
      messages: [{ role: "user", content: draftText(d) }],
    },
  };
}

/** Puts thousands separators into whole numbers of four or more digits, leaving decimals and numbers already separated alone. */
export function withThousands(text: string): string {
  return text.replace(/(?<![\d.,])\d{4,}(?!\d|[.,]\d)/g, (n) => Number(n).toLocaleString("en-US"));
}

/** Accepts a response only if it is complete JSON with a text and an action that both pass the J8 rules. */
export function parseJ8(
  message: Pick<Message, "stop_reason" | "content">,
  figures: Record<string, number>,
): { ok: true; value: { text: string; action: string } } | { ok: false; reason: string } {
  if (message.stop_reason !== "end_turn") return { ok: false, reason: `stop reason ${message.stop_reason}` };
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return { ok: false, reason: "no text block" };
  let json: unknown;
  try {
    json = JSON.parse(block.text);
  } catch {
    return { ok: false, reason: "malformed JSON" };
  }
  const out = (typeof json === "object" && json !== null ? json : {}) as { text?: unknown; action?: unknown };
  if (typeof out.text !== "string" || typeof out.action !== "string") return { ok: false, reason: "text and action must be strings" };
  const problems = [
    ...findingProblems(out.text, figures).map((p) => `text: ${p}`),
    ...findingProblems(out.action, figures).map((p) => `action: ${p}`),
  ];
  if (problems.length) return { ok: false, reason: problems.join("; ") };
  return { ok: true, value: { text: withThousands(out.text.trim()), action: withThousands(out.action.trim()) } };
}

/** data/signals.json from the computed drafts and Claude's words [D-029]. */
export function signalsFile(
  seedFile: SeedFile,
  catalog: readonly Work[],
  drafts: readonly Draft[],
  words: ReadonlyMap<string, { text: string; action: string }>,
): SignalsFile {
  return signalsFileSchema.parse({
    seed: seedFile.seed,
    simulated: true,
    sessionCount: seedFile.sessionCount,
    buckets: bucketFigures(seedFile, catalog),
    findings: drafts.map((d) => ({ kind: d.kind, bucket: d.bucket, action: words.get(d.kind)!.action, text: words.get(d.kind)!.text, figures: d.figures })),
  });
}

async function main() {
  const args = process.argv.slice(2);
  const catalog = catalogFileSchema.parse(JSON.parse(await readFile(path.join(root, "data/catalog.json"), "utf8")));
  const seedFile = signalsSeedFileSchema.parse(JSON.parse(await readFile(path.join(root, "data/signals-seed.json"), "utf8")));
  const drafts = computeDrafts(seedFile, catalog);
  if (args.includes("--figures")) {
    console.log(JSON.stringify(bucketFigures(seedFile, catalog), null, 1));
    for (const d of drafts) console.log(JSON.stringify(d));
    return;
  }
  const replay = args.find((a) => a.startsWith("--replay="))?.slice("--replay=".length);
  if (replay) {
    // The last successful result recorded for each kind, parsed by the same rules as a live run.
    const byKind = new Map(drafts.map((d) => [d.kind as string, d]));
    const values = new Map<string, { text: string; action: string }>();
    for (const line of (await readFile(path.resolve(root, replay), "utf8")).split("\n").filter(Boolean)) {
      const item = JSON.parse(line) as { custom_id: string; result: { type: string; message?: Message } };
      if (item.result.type !== "succeeded" || !item.result.message) continue;
      const parsed = parseJ8(item.result.message, byKind.get(item.custom_id)!.figures);
      if (parsed.ok) values.set(item.custom_id, parsed.value);
    }
    if (values.size !== drafts.length) throw new Error(`the recorded run holds ${values.size} accepted findings, not ${drafts.length}`);
    await writeFile(path.join(root, "data/signals.json"), JSON.stringify(signalsFile(seedFile, catalog, drafts, values), null, 2) + "\n");
    console.log(`data/signals.json rebuilt from ${replay}`);
    return;
  }
  if (!args.includes("--write")) throw new Error("pass --figures, --write or --replay=FILE");

  const system = promptBetween(await readFile(path.join(root, "docs/ai-jobs.md"), "utf8"), "j8-prompt");
  const requests = drafts.map((d) => j8Request(d, system));
  await mkdir(path.join(root, "data/runs"), { recursive: true });
  const recordTo = path.join(root, `data/runs/j8-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  const resume = args.find((a) => a.startsWith("--resume="))?.slice("--resume=".length);
  console.log(`J8: ${requests.length} findings, prompt ${hashOf(system)}, model ${claudeModel}, effort ${claudeEffort.j8}`);
  const byKind = new Map(drafts.map((d) => [d.kind as string, d]));
  const { values, failures, usage } = await runBatch(liveBatchApi(), requests, (message, kind) => parseJ8(message, byKind.get(kind)!.figures), {
    recordTo,
    resumeBatchId: resume,
  });
  console.log(`accepted ${values.size}, failed ${failures.size}`);
  for (const [kind, reason] of failures) console.log(`  ${kind}: ${reason}`);
  console.log(`usage: ${JSON.stringify(usage)}`);
  console.log(`raw results: ${path.relative(root, recordTo)}`);
  if (failures.size) throw new Error("not every finding was accepted; data/signals.json was not written");

  const file = signalsFile(seedFile, catalog, drafts, values);
  await writeFile(path.join(root, "data/signals.json"), JSON.stringify(file, null, 2) + "\n");
  for (const f of file.findings) console.log(`\n${f.kind} (${f.bucket})\n  ${f.text}\n  Action: ${f.action}`);
}

if (import.meta.main) await main();
