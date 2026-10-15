// J4 curator voice: a Claude batch that writes one "why this found you" line per work per mood bucket
// [spec Section 4 J4, docs/ai-jobs.md J4]. Run by hand after J1 is merged. Spends money only with --pilot or --rest.
//
//   node scripts/j4.ts --pilot              write lines for the 24 J1 pilot works
//   node scripts/j4.ts --rest               write lines for every work without a result for the current input
//   node scripts/j4.ts --rest --resume=ID   re-attach to a batch already submitted
//   node scripts/j4.ts --merge              write data/copy.json
//   node scripts/j4.ts --merge --partial    write data/copy.json from only the works with current lines (D-042)
//   node scripts/j4.ts --sample             print 20 seeded random lines for review
//
// The prompt is read from docs/ai-jobs.md, with the banned-phrase list from scripts/lib/j4-rules.ts appended.
// Results are kept in data/raw/j4.json with a hash of each work's full input (prompt, J1 fields and metadata),
// so a change to the prompt or to a work's J1 fields re-writes that work's lines.
// AI output is never edited by hand: if lines are wrong, change the prompt and re-run.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import { claudeEffort, claudeModel } from "../src/config/feel.ts";
import { bucketKeys, type BucketKey } from "../src/lib/buckets.ts";
import { catalogFileSchema, copyFileSchema, perBucket } from "../src/lib/schemas.ts";
import { pilotIds } from "./j1.ts";
import { type BatchRequest, liveBatchApi, runBatch } from "./lib/batch.ts";
import { bannedPhrases, lineProblems } from "./lib/j4-rules.ts";
import { hashOf, promptBetween } from "./lib/prompt.ts";
import { sample } from "./review.ts";
import { copyProblems } from "./validate-data.ts";

const root = path.resolve(import.meta.dirname, "..");
const resultsFile = path.join(root, "data/raw/j4.json");

/** Seed for the 20-line review sample. */
export const sampleSeed = 20261011;

export type Lines = Record<BucketKey, string>;
type Work = z.infer<typeof catalogFileSchema>[number];
type Stored = Record<string, { inputHash: string; lines: Lines }>;

/** The system prompt: the J4 prompt from docs/ai-jobs.md plus the banned list, kept in one place. */
export function systemPrompt(markdown: string): string {
  return `${promptBetween(markdown, "j4-prompt")}\n\nNever use these words or phrases: ${bannedPhrases.join(", ")}.`;
}

/** The text that goes with the image: the work's metadata and its J1 placement. */
export function workText(work: Work): string {
  return [
    `Title: ${work.title}`,
    `Artist: ${work.artist}`,
    `Date: ${work.date}`,
    `Lane: ${work.lane === "poster" ? "poster" : "fine art"}`,
    `Subject: ${work.subject}`,
    `Valence: ${work.valence}`,
    `Arousal: ${work.arousal}`,
    `Strongest feelings: ${work.tags.join(", ")}`,
  ].join("\n");
}

/** Hash of everything a work's request carries except the image, which never changes for a work. */
export const inputHash = (system: string, work: Work) => hashOf(`${system}\n---\n${workText(work)}`);

/** The structured output schema: one string per bucket. The line rules are checked after parsing. */
export const j4JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [...bucketKeys],
  properties: Object.fromEntries(bucketKeys.map((key) => [key, { type: "string" }])),
};

/** One batch request: the thumbnail, then the work's metadata and placement. */
export function j4Request(work: Work, imageBase64: string, system: string): BatchRequest {
  return {
    custom_id: work.id,
    params: {
      model: claudeModel,
      max_tokens: 4000,
      system,
      output_config: { effort: claudeEffort.j4, format: { type: "json_schema", schema: j4JsonSchema } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/webp", data: imageBase64 } },
            { type: "text", text: workText(work) },
          ],
        },
      ],
    },
  };
}

const linesSchema = perBucket(z.string());

/** Accepts a response only if it is complete, valid JSON with all 9 lines, and every line passes the J4 rules. */
export function parseJ4(
  message: Pick<Message, "stop_reason" | "content">,
  work: Pick<Work, "title" | "artist" | "subject">,
): { ok: true; value: Lines } | { ok: false; reason: string } {
  if (message.stop_reason !== "end_turn") return { ok: false, reason: `stop reason ${message.stop_reason}` };
  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") return { ok: false, reason: "no text block" };
  let json: unknown;
  try {
    json = JSON.parse(text.text);
  } catch {
    return { ok: false, reason: "malformed JSON" };
  }
  const parsed = linesSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const lines = Object.fromEntries(bucketKeys.map((key) => [key, parsed.data[key].trim()])) as Lines;
  const problems = bucketKeys.flatMap((key) => lineProblems(lines[key], work).map((p) => `${key}: ${p}`));
  if (problems.length) return { ok: false, reason: problems.join("; ") };
  return { ok: true, value: lines };
}

/** Works to write: the pilot list, or every work without a result for its current input. */
export function worksToWrite(catalog: readonly Work[], stored: Stored, system: string, mode: "pilot" | "rest"): Work[] {
  if (mode === "pilot") return catalog.filter((w) => pilotIds.includes(w.id));
  return catalog.filter((w) => stored[w.id]?.inputHash !== inputHash(system, w));
}

/**
 * copy.json: every work's 9 lines. Throws unless every work has lines for its current input.
 * Partial (D-042, until the J4 full run): only the works with lines for their current input, and at least one.
 */
export function copyFor(catalog: readonly Work[], stored: Stored, system: string, partial = false): Record<string, Lines> {
  const current = catalog.filter((w) => stored[w.id]?.inputHash === inputHash(system, w));
  const missing = catalog.filter((w) => !current.includes(w));
  if (partial ? !current.length : missing.length) throw new Error(`${missing.length} works have no J4 lines for their current input, for example ${missing[0].id}`);
  return Object.fromEntries(current.map((w) => [w.id, stored[w.id].lines]));
}

/** n seeded random (work, bucket, line) picks from the current results. */
export function sampleLines(catalog: readonly Work[], stored: Stored, system: string, n: number, seed: number) {
  const pairs = catalog
    .filter((w) => stored[w.id]?.inputHash === inputHash(system, w))
    .flatMap((w) => bucketKeys.map((bucket) => ({ work: w, bucket, line: stored[w.id].lines[bucket] })));
  return sample(pairs, n, seed);
}

async function main() {
  const args = process.argv.slice(2);
  const system = systemPrompt(await readFile(path.join(root, "docs/ai-jobs.md"), "utf8"));
  const catalog = catalogFileSchema.parse(JSON.parse(await readFile(path.join(root, "data/catalog.json"), "utf8")));
  const stored: Stored = existsSync(resultsFile) ? JSON.parse(await readFile(resultsFile, "utf8")) : {};

  if (args.includes("--merge")) {
    const partial = args.includes("--partial");
    const copy = copyFileSchema.parse(copyFor(catalog, stored, system, partial));
    const problems = copyProblems(copy, new Set(catalog.map((w) => w.id)), partial);
    if (problems.length) throw new Error(problems.join("\n"));
    await writeFile(path.join(root, "data/copy.json"), JSON.stringify(copy, null, 2) + "\n");
    console.log(`data/copy.json: ${Object.keys(copy).length} of ${catalog.length} works, 9 lines each (prompt ${hashOf(system)})`);
    return;
  }

  if (args.includes("--sample")) {
    for (const { work, bucket, line } of sampleLines(catalog, stored, system, 20, sampleSeed)) {
      console.log(`${work.id} ${work.lane} "${work.title}" (${work.valence}, ${work.arousal}) for ${bucket}:\n  ${line}\n`);
    }
    return;
  }

  const mode = args.includes("--pilot") ? "pilot" : args.includes("--rest") ? "rest" : null;
  if (!mode) throw new Error("pass --pilot, --rest, --merge or --sample");
  const works = worksToWrite(catalog, stored, system, mode);
  if (!works.length) return console.log("nothing to write");

  const requests = await Promise.all(
    works.map(async (w) => j4Request(w, (await readFile(path.join(root, "public", w.thumbUrl))).toString("base64"), system)),
  );
  await mkdir(path.join(root, "data/runs"), { recursive: true });
  const recordTo = path.join(root, `data/runs/j4-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  const resume = args.find((a) => a.startsWith("--resume="))?.slice("--resume=".length);
  console.log(`J4 ${mode}: ${requests.length} works, prompt ${hashOf(system)}, model ${claudeModel}, effort ${claudeEffort.j4}`);

  const byId = new Map(works.map((w) => [w.id, w]));
  const { values, failures, usage } = await runBatch(liveBatchApi(), requests, (message, id) => parseJ4(message, byId.get(id)!), {
    recordTo,
    resumeBatchId: resume,
  });

  for (const [id, lines] of values) stored[id] = { inputHash: inputHash(system, byId.get(id)!), lines };
  const sorted = Object.fromEntries(Object.entries(stored).sort(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(resultsFile, JSON.stringify(sorted, null, 2) + "\n");

  console.log(`accepted ${values.size}, failed ${failures.size}`);
  for (const [id, reason] of failures) console.log(`  ${id}: ${reason}`);
  console.log(`usage: ${JSON.stringify(usage)}`);
  console.log(`raw results: ${path.relative(root, recordTo)}`);
}

if (import.meta.main) await main();
