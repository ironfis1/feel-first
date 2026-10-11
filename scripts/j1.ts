// J1 affect tagger: a Claude vision batch that places every work on the mood field [spec Section 4 J1].
// Run by hand. Spends money only with --pilot or --rest.
//
//   node scripts/j1.ts --pilot              tag the 24 pilot works
//   node scripts/j1.ts --rest               tag every work without a result for the current prompt
//   node scripts/j1.ts --rest --resume=ID   re-attach to a batch already submitted
//   node scripts/j1.ts --merge              write the J1 fields into data/catalog.json
//
// The prompt is read from docs/ai-jobs.md. Results are kept in data/raw/j1.json with a hash of the
// prompt that produced them, so a prompt change re-tags everything and old answers are never mixed in.
// AI output is never edited by hand: if results are wrong, change the prompt and re-run.
// scripts/merge.ts rebuilds data/catalog.json from the raw sources without J1 fields; run --merge again after it.

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { claudeEffort, claudeModel } from "../src/config/feel.ts";
import { catalogFileSchema, emotionTags, j1FieldsSchema, metadataCatalogFileSchema, subjects, withoutJ1 } from "../src/lib/schemas.ts";
import { type BatchRequest, liveBatchApi, runBatch } from "./lib/batch.ts";
import { hashOf, promptBetween } from "./lib/prompt.ts";

const root = path.resolve(import.meta.dirname, "..");
const resultsFile = path.join(root, "data/raw/j1.json");

/** 12 works per lane, spread across sources and likely subjects (Step 2 pilot). */
export const pilotIds = [
  // Art Institute of Chicago, the Met, Rijksmuseum: 4 each
  "w-0004", "w-0017", "w-0028", "w-0052",
  "w-0108", "w-0133", "w-0136", "w-0139",
  "w-0201", "w-0203", "w-0232", "w-0237",
  // NASA JPL: 3; Library of Congress WPA: 9
  "w-0302", "w-0310", "w-0313",
  "w-0325", "w-0326", "w-0329", "w-0331", "w-0367", "w-0391", "w-0503", "w-0552", "w-0566",
];

export type J1Fields = ReturnType<typeof j1FieldsSchema.parse>;
type Stored = Record<string, { promptHash: string; fields: J1Fields }>;

/** The J1 prompt: the text between the j1-prompt markers in docs/ai-jobs.md. */
export const promptFrom = (markdown: string) => promptBetween(markdown, "j1-prompt");

export { hashOf };

/** The structured output schema. Counts, ranges, uniqueness and hex format are checked after parsing. */
export const j1JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["valence", "arousal", "tags", "palette", "subject"],
  properties: {
    valence: { type: "number" },
    arousal: { type: "number" },
    tags: { type: "array", items: { type: "string", enum: [...emotionTags] } },
    palette: { type: "array", items: { type: "string" } },
    subject: { type: "string", enum: [...subjects] },
  },
};

type WorkInfo = { id: string; title: string; artist: string; date: string; thumbUrl: string };

/** One batch request: the thumbnail, then the title, artist and date as context. */
export function j1Request(work: WorkInfo, imageBase64: string, prompt: string): BatchRequest {
  return {
    custom_id: work.id,
    params: {
      model: claudeModel,
      max_tokens: 4000,
      system: prompt,
      output_config: { effort: claudeEffort.j1, format: { type: "json_schema", schema: j1JsonSchema } },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/webp", data: imageBase64 } },
            { type: "text", text: `Title: ${work.title}\nArtist: ${work.artist}\nDate: ${work.date}` },
          ],
        },
      ],
    },
  };
}

/** Accepts a response only if it is complete, valid JSON, and inside the J1 contract (fixed lists, ranges, counts). */
export function parseJ1(message: Pick<Message, "stop_reason" | "content">): { ok: true; value: J1Fields } | { ok: false; reason: string } {
  if (message.stop_reason !== "end_turn") return { ok: false, reason: `stop reason ${message.stop_reason}` };
  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") return { ok: false, reason: "no text block" };
  let json: unknown;
  try {
    json = JSON.parse(text.text);
  } catch {
    return { ok: false, reason: "malformed JSON" };
  }
  const parsed = j1FieldsSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, value: parsed.data };
}

/** Works to tag: the pilot list, or every work without a result for the current prompt. */
export function worksToTag<T extends { id: string }>(catalog: readonly T[], stored: Stored, promptHash: string, mode: "pilot" | "rest"): T[] {
  if (mode === "pilot") return catalog.filter((w) => pilotIds.includes(w.id));
  return catalog.filter((w) => stored[w.id]?.promptHash !== promptHash);
}

/** The catalog with every work's J1 fields added. Throws unless every work has a result from the current prompt. */
export function mergeJ1<T extends { id: string }>(catalog: readonly T[], stored: Stored, promptHash: string) {
  const missing = catalog.filter((w) => stored[w.id]?.promptHash !== promptHash);
  if (missing.length) throw new Error(`${missing.length} works have no J1 result from the current prompt, for example ${missing[0].id}`);
  return catalog.map((w) => ({ ...w, ...stored[w.id].fields }));
}

async function main() {
  const args = process.argv.slice(2);
  const prompt = promptFrom(await readFile(path.join(root, "docs/ai-jobs.md"), "utf8"));
  const promptHash = hashOf(prompt);
  const catalogJson = JSON.parse(await readFile(path.join(root, "data/catalog.json"), "utf8"));
  const stored: Stored = existsSync(resultsFile) ? JSON.parse(await readFile(resultsFile, "utf8")) : {};

  if (args.includes("--merge")) {
    // A re-merge after a re-run replaces the J1 fields already in the file.
    const metadata = metadataCatalogFileSchema.parse(withoutJ1(catalogJson));
    const merged = catalogFileSchema.parse(mergeJ1(metadata, stored, promptHash));
    await writeFile(path.join(root, "data/catalog.json"), JSON.stringify(merged, null, 2) + "\n");
    console.log(`data/catalog.json: J1 fields merged for ${merged.length} works (prompt ${promptHash})`);
    return;
  }

  const mode = args.includes("--pilot") ? "pilot" : args.includes("--rest") ? "rest" : null;
  if (!mode) throw new Error("pass --pilot, --rest or --merge");
  const works = worksToTag(catalogJson as WorkInfo[], stored, promptHash, mode);
  if (!works.length) return console.log("nothing to tag");

  const requests = await Promise.all(
    works.map(async (w) => j1Request(w, (await readFile(path.join(root, "public", w.thumbUrl))).toString("base64"), prompt)),
  );
  await mkdir(path.join(root, "data/runs"), { recursive: true });
  const recordTo = path.join(root, `data/runs/j1-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  const resume = args.find((a) => a.startsWith("--resume="))?.slice("--resume=".length);
  console.log(`J1 ${mode}: ${requests.length} works, prompt ${promptHash}, model ${claudeModel}, effort ${claudeEffort.j1}`);

  const { values, failures, usage } = await runBatch(liveBatchApi(), requests, (message) => parseJ1(message), { recordTo, resumeBatchId: resume });

  for (const [id, fields] of values) stored[id] = { promptHash, fields };
  const sorted = Object.fromEntries(Object.entries(stored).sort(([a], [b]) => (a < b ? -1 : 1)));
  await writeFile(resultsFile, JSON.stringify(sorted, null, 2) + "\n");

  console.log(`accepted ${values.size}, failed ${failures.size}`);
  for (const [id, reason] of failures) console.log(`  ${id}: ${reason}`);
  console.log(`usage: ${JSON.stringify(usage)}`);
  console.log(`raw results: ${path.relative(root, recordTo)}`);
}

if (import.meta.main) await main();
