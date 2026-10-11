// J2 pre-warm cache: sends each approved phrase from data/raw/j2-draft.json live, through the shared J2
// module that the runtime route also uses, and writes data/j2-cache.json [spec Section 4 J2, Res #7, Res #8].
// Run by hand after Scott approves the draft: node scripts/j2-cache.ts
//
// A phrase whose answer fails the J2 parser is retried up to 3 times. AI output is never edited by hand.

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { type J2Message, type J2Output, j2Request, normalizePhrase, parseJ2 } from "../src/lib/j2.ts";
import { j2CacheFileSchema } from "../src/lib/schemas.ts";

const root = path.resolve(import.meta.dirname, "..");
const maxAttempts = 3;

type Usage = { requests: number; input: number; output: number };

/** Asks for one phrase until the parser accepts an answer or the attempts run out. */
export async function cachePhrase(
  send: (text: string) => Promise<J2Message & { usage: { input_tokens: number; output_tokens: number } }>,
  phrase: string,
  usage: Usage,
  record: (line: object) => Promise<void> = async () => {},
): Promise<{ ok: true; value: J2Output } | { ok: false; reason: string }> {
  let reason = "not sent";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const message = await send(phrase);
    usage.requests += 1;
    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;
    await record({ phrase, attempt, message });
    const parsed = parseJ2(message, phrase);
    if (parsed.ok) return parsed;
    reason = parsed.reason;
  }
  return { ok: false, reason };
}

async function main() {
  const { draft } = JSON.parse(await readFile(path.join(root, "data/raw/j2-draft.json"), "utf8")) as { draft: { phrases: string[] } };
  if (!process.env.ANTHROPIC_API_KEY) process.loadEnvFile(".env.local");
  const client = new Anthropic();
  await mkdir(path.join(root, "data/runs"), { recursive: true });
  const recordTo = path.join(root, `data/runs/j2-cache-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  const usage: Usage = { requests: 0, input: 0, output: 0 };
  const cache: Record<string, J2Output> = {};
  const failures: string[] = [];

  for (const phrase of draft.phrases.map(normalizePhrase)) {
    const result = await cachePhrase(
      (text) => client.messages.create(j2Request(text)),
      phrase,
      usage,
      (line) => appendFile(recordTo, JSON.stringify(line) + "\n"),
    );
    if (result.ok) cache[phrase] = result.value;
    else failures.push(`${phrase}: ${result.reason}`);
  }
  console.log(`usage: ${JSON.stringify(usage)}`);
  console.log(`raw results: ${path.relative(root, recordTo)}`);
  if (failures.length) throw new Error(`${failures.length} phrases failed, cache not written:\n${failures.join("\n")}`);
  await writeFile(path.join(root, "data/j2-cache.json"), JSON.stringify(j2CacheFileSchema.parse(cache), null, 2) + "\n");
  console.log(`data/j2-cache.json: ${Object.keys(cache).length} phrases`);
}

if (import.meta.main) await main();
