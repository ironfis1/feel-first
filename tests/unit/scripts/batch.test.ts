import { mkdtemp, readFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type { MessageBatchIndividualResponse } from "@anthropic-ai/sdk/resources/messages/batches";
import { parseJ1 } from "../../../scripts/j1.ts";

// High tier for runBatch, Medium for waitForEnd and liveBatchApi (docs/test-tiers.md).
// The Batches API is a stub; recorded results are replayed from tests/fixtures/anthropic. Nothing reaches the network.

// The SDK constructor is replaced, so liveBatchApi never builds a real client.
const sdk = vi.hoisted(() => ({ batches: { tag: "stub batches" }, constructed: 0 }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { batches: sdk.batches };
    constructor() {
      sdk.constructed++;
    }
  },
}));

const { liveBatchApi, runBatch, waitForEnd } = await import("../../../scripts/lib/batch.ts");
type BatchApi = import("../../../scripts/lib/batch.ts").BatchApi;
type BatchRequest = import("../../../scripts/lib/batch.ts").BatchRequest;

type Recorded = { attempt: number; batch: string; custom_id: string; result: MessageBatchIndividualResponse["result"] };
const replay = (name: string): Recorded[] =>
  readFileSync(path.resolve(import.meta.dirname, `../../fixtures/anthropic/${name}.jsonl`), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

const request = (custom_id: string): BatchRequest => ({ custom_id, params: { model: "m", max_tokens: 1, messages: [] } });
const item = (custom_id: string, result: MessageBatchIndividualResponse["result"]): MessageBatchIndividualResponse => ({ custom_id, result });

const message = (text: string, usage: Partial<Message["usage"]> = {}): Message =>
  ({
    id: `msg-${text}`,
    type: "message",
    role: "assistant",
    model: "m",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2, cache_creation_input_tokens: 3, ...usage },
  }) as Message;
const ok = (text: string, usage?: Partial<Message["usage"]>) => ({ type: "succeeded" as const, message: message(text, usage) });
const errored = (type: string) => ({ type: "errored" as const, error: { type: "error", error: { type, message: "x" } } }) as MessageBatchIndividualResponse["result"];

/** A stub API that answers each created batch with the next list of results. */
function stubApi(rounds: MessageBatchIndividualResponse[][]) {
  const created: string[][] = [];
  const resultsFor: string[] = [];
  let n = 0;
  const byBatch = new Map<string, MessageBatchIndividualResponse[]>();
  const api: BatchApi = {
    create: vi.fn(async ({ requests }: { requests: BatchRequest[] }) => {
      created.push(requests.map((r) => r.custom_id));
      const id = `batch-${++n}`;
      byBatch.set(id, rounds[n - 1] ?? []);
      return { id };
    }),
    retrieve: vi.fn(async () => ({ processing_status: "ended", request_counts: {} })),
    results: vi.fn(async (id: string) => {
      resultsFor.push(id);
      const list = byBatch.get(id) ?? rounds[0] ?? [];
      return (async function* () {
        yield* list;
      })();
    }),
  };
  return { api, created, resultsFor };
}

/** Accepts text "ok..." and rejects anything else with a reason naming it. */
const parseText = (m: Message) => {
  const text = m.content[0].type === "text" ? m.content[0].text : "";
  return text.startsWith("ok") ? ({ ok: true, value: text } as const) : ({ ok: false, reason: `bad ${text}` } as const);
};

const quiet = { log: () => {}, sleep: async () => {} };

describe("runBatch", () => {
  it("keys each value by custom_id when results arrive in another order", async () => {
    const { api } = stubApi([[item("b", ok("ok-b")), item("c", ok("ok-c")), item("a", ok("ok-a"))]]);
    const { values, failures } = await runBatch(api, [request("a"), request("b"), request("c")], parseText, quiet);
    expect([...values]).toEqual([
      ["b", "ok-b"],
      ["c", "ok-c"],
      ["a", "ok-a"],
    ]);
    expect(failures.size).toBe(0);
  });

  it("keys every recorded J1 pilot result to its own work, out of request order", async () => {
    const recorded = replay("j1-pilot");
    const ids = recorded.map((r) => r.custom_id).sort();
    const { api } = stubApi([recorded.map((r) => item(r.custom_id, r.result))]);
    const { values, failures, usage } = await runBatch(api, ids.map(request), (m) => parseJ1(m), quiet);
    expect(failures.size).toBe(0);
    expect([...values.keys()]).toEqual(recorded.map((r) => r.custom_id));
    for (const r of recorded) {
      if (r.result.type !== "succeeded") throw new Error("pilot fixture holds only succeeded results");
      const text = r.result.message.content.find((b) => b.type === "text");
      expect(values.get(r.custom_id)).toEqual(JSON.parse(text?.type === "text" ? text.text : ""));
    }
    const input = recorded.reduce((sum, r) => sum + (r.result.type === "succeeded" ? r.result.message.usage.input_tokens : 0), 0);
    expect(usage.requests).toBe(24);
    expect(usage.input).toBe(input);
  });

  it("replays the three recorded J4 pilot attempts, re-queuing exactly the items that were re-queued", async () => {
    const recorded = replay("j4-pilot");
    const attempts = [1, 2, 3].map((a) => recorded.filter((r) => r.attempt === a));
    const laterIds = (a: number) => new Set(recorded.filter((r) => r.attempt > a).map((r) => r.custom_id));
    // Rejects a response exactly when the recording shows that work was sent again.
    const parse = (m: Message, id: string) => {
      const attempt = attempts.findIndex((list) => list.some((r) => r.result.type === "succeeded" && r.result.message.id === m.id)) + 1;
      return laterIds(attempt).has(id) ? ({ ok: false, reason: "rejected" } as const) : ({ ok: true, value: m.id } as const);
    };
    const { api, created } = stubApi(attempts.map((list) => list.map((r) => item(r.custom_id, r.result))));
    const ids = attempts[0].map((r) => r.custom_id);
    const { values, failures } = await runBatch(api, ids.map(request), parse, quiet);
    expect(created[0]).toEqual(ids);
    expect(new Set(created[1])).toEqual(new Set(attempts[1].map((r) => r.custom_id)));
    expect(new Set(created[2])).toEqual(new Set(attempts[2].map((r) => r.custom_id)));
    expect(failures.size).toBe(0);
    expect(values.size).toBe(ids.length);
    const last = new Map(recorded.map((r) => [r.custom_id, r.result.type === "succeeded" ? r.result.message.id : ""]));
    for (const [id, value] of values) expect(value).toBe(last.get(id));
  });

  it("ignores a result whose custom_id was not requested", async () => {
    const { api } = stubApi([[item("zzz", ok("ok-z")), item("a", ok("ok-a"))]]);
    const { values, failures, usage } = await runBatch(api, [request("a")], parseText, quiet);
    expect([...values]).toEqual([["a", "ok-a"]]);
    expect(failures.size).toBe(0);
    expect(usage.requests).toBe(1);
  });

  it("re-queues a request with no result line as 'no result returned'", async () => {
    const { api, created } = stubApi([[item("a", ok("ok-a"))], [item("b", ok("ok-b"))]]);
    const result = await runBatch(api, [request("a"), request("b")], parseText, quiet);
    expect(created).toEqual([["a", "b"], ["b"]]);
    expect([...result.values.keys()]).toEqual(["a", "b"]);
  });

  it.each([
    [errored("overloaded_error"), "errored: overloaded_error"],
    [{ type: "expired" as const }, "expired"],
    [{ type: "canceled" as const }, "canceled"],
    [ok("nope"), "bad nope"],
  ])("re-queues a failed result with its reason (%#)", async (result, reason) => {
    const { api, created } = stubApi([[item("a", result)], [item("a", result)]]);
    const { values, failures } = await runBatch(api, [request("a")], parseText, { ...quiet, maxAttempts: 2 });
    expect(created).toEqual([["a"], ["a"]]);
    expect(values.size).toBe(0);
    expect([...failures]).toEqual([["a", reason]]);
  });

  it("reports no result returned once the item is missing from every attempt", async () => {
    const { api } = stubApi([[], []]);
    const { failures } = await runBatch(api, [request("a")], parseText, { ...quiet, maxAttempts: 2 });
    expect([...failures]).toEqual([["a", "no result returned"]]);
  });

  it("submits only the failed requests on attempt 2 and clears the failure when one is accepted", async () => {
    const { api, created } = stubApi([
      [item("a", ok("ok-a")), item("b", { type: "expired" }), item("c", ok("bad"))],
      [item("b", ok("ok-b")), item("c", ok("still bad"))],
      [item("c", ok("ok-c"))],
    ]);
    const { values, failures } = await runBatch(api, ["a", "b", "c"].map(request), parseText, { ...quiet, maxAttempts: 2 });
    expect(created).toEqual([
      ["a", "b", "c"],
      ["b", "c"],
    ]);
    expect([...values]).toEqual([
      ["a", "ok-a"],
      ["b", "ok-b"],
    ]);
    expect([...failures]).toEqual([["c", "bad still bad"]]);
  });

  it("stops at three attempts by default with the item still failing", async () => {
    const { api, created } = stubApi([[item("a", { type: "expired" })], [item("a", { type: "expired" })], [item("a", { type: "canceled" })], [item("a", ok("ok-a"))]]);
    const { values, failures } = await runBatch(api, [request("a")], parseText, quiet);
    expect(created).toHaveLength(3);
    expect(values.size).toBe(0);
    expect([...failures]).toEqual([["a", "canceled"]]);
  });

  it("honours a maxAttempts of 1", async () => {
    const { api } = stubApi([[item("a", { type: "expired" })], [item("a", ok("ok-a"))]]);
    const { failures } = await runBatch(api, [request("a")], parseText, { ...quiet, maxAttempts: 1 });
    expect(api.create).toHaveBeenCalledTimes(1);
    expect([...failures]).toEqual([["a", "expired"]]);
  });

  it("stops early once nothing is pending", async () => {
    const { api } = stubApi([[item("a", ok("ok-a"))]]);
    await runBatch(api, [request("a")], parseText, { ...quiet, maxAttempts: 5 });
    expect(api.create).toHaveBeenCalledTimes(1);
  });

  it("makes no create call for an empty request list", async () => {
    const { api } = stubApi([]);
    const result = await runBatch(api, [], parseText, quiet);
    expect(api.create).not.toHaveBeenCalled();
    expect(result.values.size + result.failures.size).toBe(0);
    expect(result.usage).toEqual({ requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  });

  it("re-attaches to resumeBatchId on attempt 1 only, then creates a new batch", async () => {
    const { api, created, resultsFor } = stubApi([[item("a", ok("ok-a"))]]);
    // The resumed batch has no stored list, so the stub answers it with an expired result.
    vi.mocked(api.results).mockImplementationOnce(async () =>
      (async function* () {
        yield item("a", { type: "expired" });
      })(),
    );
    const { values } = await runBatch(api, [request("a")], parseText, { ...quiet, resumeBatchId: "old-batch" });
    expect(resultsFor).toEqual(["batch-1"]);
    expect(api.retrieve).toHaveBeenNthCalledWith(1, "old-batch");
    expect(vi.mocked(api.results).mock.calls.map((c) => c[0])).toEqual(["old-batch", "batch-1"]);
    expect(created).toEqual([["a"]]);
    expect([...values]).toEqual([["a", "ok-a"]]);
  });

  it("counts usage for every succeeded response, rejected ones included, and nothing for errored ones", async () => {
    const { api } = stubApi([
      [
        item("a", ok("ok-a", { input_tokens: 100, output_tokens: 7, cache_read_input_tokens: 4, cache_creation_input_tokens: 9 })),
        item("b", ok("bad", { input_tokens: 20, output_tokens: 3, cache_read_input_tokens: null, cache_creation_input_tokens: null })),
        item("c", errored("api_error")),
      ],
    ]);
    const { usage } = await runBatch(api, ["a", "b", "c"].map(request), parseText, { ...quiet, maxAttempts: 1 });
    expect(usage).toEqual({ requests: 2, input: 120, output: 10, cacheRead: 4, cacheWrite: 9 });
  });

  it("counts usage again on each attempt that bills", async () => {
    const { api } = stubApi([[item("a", ok("bad"))], [item("a", ok("ok-a"))]]);
    const { usage } = await runBatch(api, [request("a")], parseText, quiet);
    expect(usage).toEqual({ requests: 2, input: 20, output: 10, cacheRead: 4, cacheWrite: 6 });
  });

  it("logs each attempt and the first re-queued item with its reason", async () => {
    const lines: string[] = [];
    const { api } = stubApi([[item("a", { type: "expired" }), item("b", { type: "canceled" })], [item("a", ok("ok-a")), item("b", ok("ok-b"))]]);
    await runBatch(api, [request("a"), request("b")], parseText, { sleep: async () => {}, log: (l) => lines.push(l) });
    expect(lines).toEqual([
      "attempt 1: batch batch-1 with 2 requests",
      "attempt 1: 2 to re-queue, for example a: expired",
      "attempt 2: batch batch-2 with 2 requests",
    ]);
  });

  it("lets an error thrown by the parser propagate (pin: there is no guard)", async () => {
    const { api } = stubApi([[item("a", ok("ok-a"))]]);
    const parse = () => {
      throw new Error("parser broke");
    };
    await expect(runBatch(api, [request("a")], parse, quiet)).rejects.toThrow("parser broke");
  });

  describe("recordTo", () => {
    let dir: string;
    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), "feel-first-batch-"));
    });
    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    it("appends one JSON line per requested result per attempt, with attempt and batch", async () => {
      const recordTo = path.join(dir, "run.jsonl");
      const first = [item("a", ok("ok-a")), item("stray", ok("ok-s")), item("b", { type: "expired" })];
      const second = [item("b", ok("ok-b"))];
      const { api } = stubApi([first, second]);
      await runBatch(api, [request("a"), request("b")], parseText, { ...quiet, recordTo });
      const lines = (await readFile(recordTo, "utf8")).split("\n");
      expect(lines.at(-1)).toBe("");
      expect(lines.slice(0, -1).map((l) => JSON.parse(l))).toEqual([
        { attempt: 1, batch: "batch-1", ...first[0] },
        { attempt: 1, batch: "batch-1", ...first[2] },
        { attempt: 2, batch: "batch-2", ...second[0] },
      ]);
    });
  });
});

describe("waitForEnd", () => {
  function polling(statuses: string[]) {
    const sleeps: number[] = [];
    const lines: string[] = [];
    const api = {
      retrieve: vi.fn(async () => ({ processing_status: statuses.shift() ?? "ended", request_counts: { processing: statuses.length } })),
    } as unknown as BatchApi;
    const run = () =>
      waitForEnd(
        api,
        "batch-9",
        250,
        async (ms) => {
          sleeps.push(ms);
        },
        (l) => lines.push(l),
      );
    return { api, sleeps, lines, run };
  }

  it("returns on the first poll when the batch has ended", async () => {
    const { api, sleeps, lines, run } = polling(["ended"]);
    await run();
    expect(api.retrieve).toHaveBeenCalledTimes(1);
    expect(api.retrieve).toHaveBeenCalledWith("batch-9");
    expect(sleeps).toEqual([]);
    expect(lines).toEqual([]);
  });

  it("polls until ended, sleeping pollMs between polls and logging status and counts", async () => {
    const { api, sleeps, lines, run } = polling(["in_progress", "canceling", "ended"]);
    await run();
    expect(api.retrieve).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([250, 250]);
    expect(lines).toEqual(['batch batch-9: in_progress, {"processing":2}', 'batch batch-9: canceling, {"processing":1}']);
  });

  it("passes on a retrieve rejection", async () => {
    const api = { retrieve: vi.fn(async () => Promise.reject(new Error("503"))) } as unknown as BatchApi;
    await expect(waitForEnd(api, "b", 1, async () => {}, () => {})).rejects.toThrow("503");
  });
});

describe("liveBatchApi", () => {
  const key = "sk-test-not-a-real-key";
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.ANTHROPIC_API_KEY;
    sdk.constructed = 0;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
    vi.restoreAllMocks();
  });

  it("uses a key already set without loading .env.local, and logs nothing", async () => {
    process.env.ANTHROPIC_API_KEY = key;
    const load = vi.spyOn(process, "loadEnvFile").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(liveBatchApi()).toBe(sdk.batches);
    expect(load).not.toHaveBeenCalled();
    expect(sdk.constructed).toBe(1);
    expect([...log.mock.calls, ...error.mock.calls].flat().join(" ")).not.toContain(key);
  });

  it("loads .env.local when the key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const load = vi.spyOn(process, "loadEnvFile").mockImplementation(() => {});
    expect(liveBatchApi()).toBe(sdk.batches);
    expect(load).toHaveBeenCalledExactlyOnceWith(".env.local");
  });
});
