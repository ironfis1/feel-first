// J2 drafts: Claude drafts the pre-warm phrase list and the word map at build time; Scott approves both
// before deploy [spec Section 4 J2, Gap G9, D-028, docs/ai-jobs.md J2]. Run by hand.
//
//   node scripts/j2-draft.ts --video="<phrase>"   one batch request, writes data/raw/j2-draft.json for review
//   node scripts/j2-draft.ts --write              after approval, writes data/j2-wordmap.json from the draft
//
// AI output is never edited by hand: if the draft is wrong, change the prompt and re-run.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import { claudeEffort, claudeModel, roomTypes, sizeWordToPrintSize } from "../src/config/feel.ts";
import { bucketKeys, bucketOf } from "../src/lib/buckets.ts";
import { normalizePhrase } from "../src/lib/j2.ts";
import { j2WordmapFileSchema } from "../src/lib/schemas.ts";
import { type BatchRequest, liveBatchApi, runBatch } from "./lib/batch.ts";
import { hashOf, promptBetween } from "./lib/prompt.ts";

const root = path.resolve(import.meta.dirname, "..");
const draftPath = path.join(root, "data/raw/j2-draft.json");
const sizeWords = Object.keys(sizeWordToPrintSize) as (keyof typeof sizeWordToPrintSize)[];

export const phraseRange = [45, 55] as const;
export const wordRange = [140, 160] as const;
/** Fewest mood words per bucket the validator accepts; the prompt asks for 10. */
export const minWordsPerBucket = 8;

export const promptFrom = (markdown: string) => promptBetween(markdown, "j2-draft-prompt");

/** The shape of a draft. Its rules are checked by draftProblems once the shape holds. */
export const j2DraftSchema = z.strictObject({
  phrases: z.array(z.string()),
  words: z.array(z.strictObject({ word: z.string(), valence: z.number(), arousal: z.number() })),
  roomWords: z.array(z.strictObject({ word: z.string(), roomType: z.enum(roomTypes) })),
  sizeWords: z.array(z.strictObject({ word: z.string(), size: z.enum(sizeWords as [keyof typeof sizeWordToPrintSize, ...(keyof typeof sizeWordToPrintSize)[]]) })),
});
export type J2Draft = z.infer<typeof j2DraftSchema>;

export const j2DraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["phrases", "words", "roomWords", "sizeWords"],
  properties: {
    phrases: { type: "array", items: { type: "string" } },
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "valence", "arousal"],
        properties: { word: { type: "string" }, valence: { type: "number" }, arousal: { type: "number" } },
      },
    },
    roomWords: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "roomType"],
        properties: { word: { type: "string" }, roomType: { type: "string", enum: [...roomTypes] } },
      },
    },
    sizeWords: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "size"],
        properties: { word: { type: "string" }, size: { type: "string", enum: sizeWords } },
      },
    },
  },
} as const;

/** The user turn: the fixed lists the draft must use, and the video phrase. */
export function draftInput(video: string): string {
  return [
    `Room types: ${roomTypes.join(", ")}.`,
    `Size words: ${sizeWords.join(", ")}.`,
    `The demo video phrase: ${normalizePhrase(video)}`,
  ].join("\n");
}

export function j2DraftRequest(system: string, video: string): BatchRequest {
  return {
    custom_id: "j2-draft",
    params: {
      model: claudeModel,
      max_tokens: 16000,
      system,
      output_config: { effort: claudeEffort.j2, format: { type: "json_schema", schema: j2DraftJsonSchema } },
      messages: [{ role: "user", content: draftInput(video) }],
    },
  } as BatchRequest;
}

/** The draft as the word-map file, keyed by word [D-028]. */
export function wordmapFile(draft: J2Draft) {
  return j2WordmapFileSchema.parse({
    words: Object.fromEntries(draft.words.map((w) => [w.word, { valence: w.valence, arousal: w.arousal }])),
    roomTypes: Object.fromEntries(draft.roomWords.map((w) => [w.word, w.roomType])),
    sizes: Object.fromEntries(draft.sizeWords.map((w) => [w.word, w.size])),
  });
}

/** Every reason a draft breaks the rules in docs/ai-jobs.md J2; an empty list means it passes. */
export function draftProblems(draft: J2Draft, video: string): string[] {
  const problems: string[] = [];
  const emDash = String.fromCharCode(0x2014);
  if (JSON.stringify(draft).includes(emDash)) problems.push("em dash");

  const phrases = draft.phrases.map(normalizePhrase);
  if (phrases.some((p, i) => p !== draft.phrases[i])) problems.push("phrases not in normalized lowercase form");
  if (new Set(phrases).size !== phrases.length) problems.push("duplicate phrases");
  if (phrases.length < phraseRange[0] || phrases.length > phraseRange[1]) problems.push(`${phrases.length} phrases, not ${phraseRange[0]} to ${phraseRange[1]}`);
  if (!phrases.includes(normalizePhrase(video))) problems.push("video phrase missing");

  const words = draft.words.map((w) => w.word);
  if (new Set(words).size !== words.length) problems.push("duplicate mood words");
  if (words.length < wordRange[0] || words.length > wordRange[1]) problems.push(`${words.length} mood words, not ${wordRange[0]} to ${wordRange[1]}`);
  const counts = Object.fromEntries(bucketKeys.map((k) => [k, 0]));
  for (const w of draft.words) if (Math.abs(w.valence) <= 1 && Math.abs(w.arousal) <= 1) counts[bucketOf(w.valence, w.arousal)] += 1;
  const thin = bucketKeys.filter((k) => counts[k] < minWordsPerBucket);
  if (thin.length) problems.push(`fewer than ${minWordsPerBucket} mood words in ${thin.map((k) => `${k} (${counts[k]})`).join(", ")}`);

  const missingRooms = roomTypes.filter((r) => !draft.roomWords.some((w) => w.roomType === r));
  if (missingRooms.length) problems.push(`no word for room types: ${missingRooms.join(", ")}`);
  const missingSizes = sizeWords.filter((s) => !draft.sizeWords.some((w) => w.word === s && w.size === s));
  if (missingSizes.length) problems.push(`size words missing: ${missingSizes.join(", ")}`);

  const all = [...words, ...draft.roomWords.map((w) => w.word), ...draft.sizeWords.map((w) => w.word)];
  const repeated = [...new Set(all.filter((w, i) => all.indexOf(w) !== i))];
  if (repeated.length) problems.push(`words in more than one list or repeated: ${repeated.join(", ")}`);

  try {
    wordmapFile(draft);
  } catch (error) {
    problems.push(`word map schema: ${(error as Error).message.slice(0, 300)}`);
  }
  return problems;
}

export function parseJ2Draft(message: Message, video: string): { ok: true; value: J2Draft } | { ok: false; reason: string } {
  if (message.stop_reason !== "end_turn") return { ok: false, reason: `stop reason ${message.stop_reason}` };
  const body = message.content.find((block) => block.type === "text");
  if (!body || body.type !== "text") return { ok: false, reason: "no text block" };
  let json: unknown;
  try {
    json = JSON.parse(body.text);
  } catch {
    return { ok: false, reason: "malformed JSON" };
  }
  // A malformed list member is a rejected draft, re-queued like any other, never a crash after the batch is paid for.
  const shape = j2DraftSchema.safeParse(json);
  if (!shape.success) return { ok: false, reason: shape.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const problems = draftProblems(shape.data, video);
  return problems.length ? { ok: false, reason: problems.join("; ") } : { ok: true, value: shape.data };
}

type DraftFile = { promptHash: string; video: string; draft: J2Draft };

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--write")) {
    const file = JSON.parse(await readFile(draftPath, "utf8")) as DraftFile;
    j2DraftSchema.parse(file.draft);
    const problems = draftProblems(file.draft, file.video);
    if (problems.length) throw new Error(`draft fails validation: ${problems.join("; ")}`);
    await writeFile(path.join(root, "data/j2-wordmap.json"), JSON.stringify(wordmapFile(file.draft), null, 2) + "\n");
    console.log(`data/j2-wordmap.json: ${file.draft.words.length} mood words, ${file.draft.roomWords.length} room words, ${file.draft.sizeWords.length} size words`);
    return;
  }

  const video = args.find((a) => a.startsWith("--video="))?.slice("--video=".length);
  if (!video) throw new Error('give the demo video phrase: --video="..."');
  const system = promptFrom(await readFile(path.join(root, "docs/ai-jobs.md"), "utf8"));
  const promptHash = hashOf(system);
  console.log(`J2 draft: prompt ${promptHash}, model ${claudeModel}, effort ${claudeEffort.j2}`);

  await mkdir(path.join(root, "data/runs"), { recursive: true });
  const recordTo = path.join(root, `data/runs/j2-draft-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  const resume = args.find((a) => a.startsWith("--resume="))?.slice("--resume=".length);
  const { values, failures, usage } = await runBatch(liveBatchApi(), [j2DraftRequest(system, video)], (message) => parseJ2Draft(message, video), {
    recordTo,
    resumeBatchId: resume,
  });
  console.log(`usage: ${JSON.stringify(usage)}`);
  console.log(`raw results: ${path.relative(root, recordTo)}`);
  const draft = values.get("j2-draft");
  if (!draft) throw new Error(`no accepted draft: ${failures.get("j2-draft")}`);
  await writeFile(draftPath, JSON.stringify({ promptHash, video: normalizePhrase(video), draft } satisfies DraftFile, null, 2) + "\n");
  console.log(`data/raw/j2-draft.json: ${draft.phrases.length} phrases, ${draft.words.length} mood words`);
}

if (import.meta.main) await main();
