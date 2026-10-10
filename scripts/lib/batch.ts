// A small Message Batches client for the build-time jobs J1, J4 and J8 [docs/ai-jobs.md].
// Submit a batch, poll until it ends, fetch the results, and re-queue every item that errored,
// expired, or failed the job's own validator. Run by hand only; the deployed app never imports it.

import { appendFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { MessageBatchIndividualResponse } from "@anthropic-ai/sdk/resources/messages/batches";

export type BatchRequest = { custom_id: string; params: MessageCreateParamsNonStreaming };

/** The three batch calls this client makes. Tests pass a stub. */
export interface BatchApi {
  create(body: { requests: BatchRequest[] }): Promise<{ id: string }>;
  retrieve(id: string): Promise<{ processing_status: string; request_counts: object }>;
  results(id: string): Promise<AsyncIterable<MessageBatchIndividualResponse>>;
}

export type Parse<T> = (message: Message, customId: string) => { ok: true; value: T } | { ok: false; reason: string };

/** Token totals across every succeeded response, accepted or not, since all of them are billed. */
export type Usage = { requests: number; input: number; output: number; cacheRead: number; cacheWrite: number };

export type RunOptions = {
  maxAttempts?: number;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  /** Every raw result is appended here as one JSON line, so a run can be audited and pilot results become fixtures. */
  recordTo?: string;
  /** Re-attach to a batch already submitted for the first attempt, for example after the script was interrupted. */
  resumeBatchId?: string;
};

export type RunResult<T> = { values: Map<string, T>; failures: Map<string, string>; usage: Usage };

/** The batch API of a client keyed from ANTHROPIC_API_KEY, read from .env.local when it is not already set. */
export function liveBatchApi(): BatchApi {
  if (!process.env.ANTHROPIC_API_KEY) process.loadEnvFile(".env.local");
  return new Anthropic().messages.batches;
}

const emptyUsage = (): Usage => ({ requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

function addUsage(total: Usage, message: Message): void {
  total.requests += 1;
  total.input += message.usage.input_tokens;
  total.output += message.usage.output_tokens;
  total.cacheRead += message.usage.cache_read_input_tokens ?? 0;
  total.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
}

/** Polls until the batch has ended. */
export async function waitForEnd(api: BatchApi, id: string, pollMs: number, sleep: (ms: number) => Promise<void>, log: (line: string) => void) {
  for (;;) {
    const batch = await api.retrieve(id);
    if (batch.processing_status === "ended") return;
    log(`batch ${id}: ${batch.processing_status}, ${JSON.stringify(batch.request_counts)}`);
    await sleep(pollMs);
  }
}

/**
 * Runs the requests as batches until every item is accepted by parse or has failed maxAttempts times.
 * Results are keyed by custom_id, never by position, since a batch returns them in any order.
 */
export async function runBatch<T>(api: BatchApi, requests: readonly BatchRequest[], parse: Parse<T>, options: RunOptions = {}): Promise<RunResult<T>> {
  const { maxAttempts = 3, pollMs = 30_000, log = console.log, recordTo, resumeBatchId } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const values = new Map<string, T>();
  const failures = new Map<string, string>();
  const usage = emptyUsage();
  let pending = [...requests];

  for (let attempt = 1; attempt <= maxAttempts && pending.length; attempt++) {
    const id = attempt === 1 && resumeBatchId ? resumeBatchId : (await api.create({ requests: pending })).id;
    log(`attempt ${attempt}: batch ${id} with ${pending.length} requests`);
    await waitForEnd(api, id, pollMs, sleep, log);

    const byId = new Map(pending.map((r) => [r.custom_id, r]));
    const retry: BatchRequest[] = [];
    for await (const item of await api.results(id)) {
      const request = byId.get(item.custom_id);
      if (!request) continue;
      byId.delete(item.custom_id);
      if (recordTo) await appendFile(recordTo, JSON.stringify({ attempt, batch: id, ...item }) + "\n");
      let reason: string;
      if (item.result.type === "succeeded") {
        addUsage(usage, item.result.message);
        const parsed = parse(item.result.message, item.custom_id);
        if (parsed.ok) {
          values.set(item.custom_id, parsed.value);
          failures.delete(item.custom_id);
          continue;
        }
        reason = parsed.reason;
      } else {
        reason = item.result.type === "errored" ? `errored: ${item.result.error.error.type}` : item.result.type;
      }
      failures.set(item.custom_id, reason);
      retry.push(request);
    }
    // A request with no result line at all is treated as failed and re-queued.
    for (const missing of byId.values()) {
      failures.set(missing.custom_id, "no result returned");
      retry.push(missing);
    }
    if (retry.length) log(`attempt ${attempt}: ${retry.length} to re-queue, for example ${retry[0].custom_id}: ${failures.get(retry[0].custom_id)}`);
    pending = retry;
  }
  return { values, failures, usage };
}
