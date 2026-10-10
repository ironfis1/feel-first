// J2 mood interpreter: the one prompt and output contract [spec Section 3.9, Section 4 J2].
// The M3 pre-warm script and the M5 runtime route both build their requests and parse their
// answers here, so cached answers and live answers can never drift apart.
// This module never reads the API key and never sends anything itself.

import { z } from "zod";
import { claudeEffort, claudeModel, roomTypes, sizeWordToPrintSize } from "../config/feel.ts";

const sizeWords = Object.keys(sizeWordToPrintSize) as (keyof typeof sizeWordToPrintSize)[];

/** Most words J2 may return as "heard" chips. */
export const maxHeard = 5;

/** Lowercase, trimmed, inner whitespace collapsed to one space: the cache key form [docs/ai-jobs.md]. */
export function normalizePhrase(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

const axis = z.number().min(-1).max(1);

/** What J2 returns: a mood point plus optional constraints that never filter results [Res #6, Gap G7]. */
export const j2OutputSchema = z.strictObject({
  valence: axis,
  arousal: axis,
  roomType: z.enum(roomTypes).nullable(),
  size: z.enum(sizeWords).nullable(),
  heard: z.array(z.string().min(1)).min(1).max(maxHeard),
});
export type J2Output = z.infer<typeof j2OutputSchema>;

/** The JSON schema sent as the structured output format. Ranges are checked by j2OutputSchema after parsing. */
export const j2JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["valence", "arousal", "roomType", "size", "heard"],
  properties: {
    valence: { type: "number" },
    arousal: { type: "number" },
    roomType: { anyOf: [{ type: "string", enum: [...roomTypes] }, { type: "null" }] },
    size: { anyOf: [{ type: "string", enum: sizeWords }, { type: "null" }] },
    heard: { type: "array", items: { type: "string" } },
  },
} as const;

export const j2SystemPrompt = `You place a visitor's words on a two-axis mood field for an art store that hangs its gallery by feeling.

The visitor typed a short phrase describing a feeling, a moment, or a room. Decide how art for that moment should feel to live with.

Valence runs from -1 to 1. -1 is heavy: somber, grave, dark, weighty. +1 is bright: light, warm, hopeful, sunny. 0 is neither.
Arousal runs from -1 to 1. -1 is calm: still, quiet, slow, restful. +1 is charged: energetic, intense, restless, loud. 0 is neither.
Use the whole range. A gentle everyday moment sits near the middle; a strong feeling sits far out. Give each value to two decimal places.

roomType is one of ${roomTypes.map((r) => `"${r}"`).join(", ")} when the visitor names or clearly implies that room, otherwise null.
size is one of ${sizeWords.map((s) => `"${s}"`).join(", ")} when the visitor asks for a print size, otherwise null.
heard lists 1 to ${maxHeard} words copied exactly from the visitor's text that most shaped your answer, in lowercase.

Answer with the JSON object only.`;

/** The Messages API request for one phrase. The caller adds nothing but transport options. */
export function j2Request(text: string) {
  return {
    model: claudeModel,
    max_tokens: 2000,
    system: j2SystemPrompt,
    output_config: { effort: claudeEffort.j2, format: { type: "json_schema" as const, schema: j2JsonSchema } },
    messages: [{ role: "user" as const, content: normalizePhrase(text) }],
  };
}

export type J2Parse = { ok: true; value: J2Output } | { ok: false; reason: string };

/** The fields of a Messages API response that J2 reads. */
export type J2Message = { stop_reason: string | null; content: readonly { type: string; text?: string }[] };

/**
 * Parses and checks a Messages API response for the given phrase.
 * Rejects refusals, truncation, malformed JSON, values outside the contract, and heard words the visitor did not type.
 */
export function parseJ2(message: J2Message, text: string): J2Parse {
  if (message.stop_reason !== "end_turn") return { ok: false, reason: `stop reason ${message.stop_reason}` };
  const body = message.content.find((block) => block.type === "text")?.text;
  if (body === undefined) return { ok: false, reason: "no text block" };
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { ok: false, reason: "malformed JSON" };
  }
  const parsed = j2OutputSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const invented = inventedHeard(parsed.data.heard, text);
  if (invented.length) return { ok: false, reason: `heard words not in the text: ${invented.join(", ")}` };
  return { ok: true, value: parsed.data };
}

/** Heard words that are not words of the visitor's text. Chips show only what the visitor typed. */
export function inventedHeard(heard: readonly string[], text: string): string[] {
  const words = new Set(normalizePhrase(text).split(/[^a-z0-9']+/));
  return heard.filter((word) => !words.has(word));
}
