import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { J2Message } from "@/lib/j2";
import { j2CacheFileSchema } from "@/lib/schemas";
import { cachePhrase } from "../../../scripts/j2-cache.ts";

// High tier (docs/test-tiers.md). J2 pre-warm [Res #7, Res #8]. `send` is always a stub; no test calls Anthropic.

const root = path.resolve(import.meta.dirname, "../../..");
type Sent = J2Message & { usage: { input_tokens: number; output_tokens: number } };

const phrase = "bright and bold for the living room";
const good = { valence: 0.75, arousal: 0.6, roomType: "living room", size: null, heard: ["bright", "bold", "living", "room"] };
const invented = { ...good, heard: ["bright", "bold", "living room"] };

/** A sent message with the given answer and token counts. */
const sent = (value: object, input = 10, output = 3): Sent => ({
  stop_reason: "end_turn",
  content: [{ type: "text", text: JSON.stringify(value) }],
  usage: { input_tokens: input, output_tokens: output },
});

/** A send stub that answers with each message in turn. */
const sendOf = (...messages: Sent[]) => {
  const send = vi.fn<(text: string) => Promise<Sent>>();
  for (const m of messages) send.mockResolvedValueOnce(m);
  return send;
};
const freshUsage = () => ({ requests: 0, input: 0, output: 0 });

describe("cachePhrase", () => {
  it("sends once when the first answer is accepted", async () => {
    const send = sendOf(sent(good, 860, 60));
    const usage = freshUsage();
    expect(await cachePhrase(send, phrase, usage)).toEqual({ ok: true, value: good });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(phrase);
    expect(usage).toEqual({ requests: 1, input: 860, output: 60 });
  });

  it("retries after two rejections and returns the third answer", async () => {
    const send = sendOf(sent(invented, 100, 10), sent({ ...good, valence: 2 }, 200, 20), sent(good, 300, 30));
    const usage = freshUsage();
    expect(await cachePhrase(send, phrase, usage)).toEqual({ ok: true, value: good });
    expect(send).toHaveBeenCalledTimes(3);
    expect(usage).toEqual({ requests: 3, input: 600, output: 60 });
  });

  it("gives up after three rejections with the last reason, never sending a fourth", async () => {
    const send = sendOf(sent({ ...good, valence: 2 }), sent({ ...good, valence: 2 }), sent(invented), sent(good));
    const usage = { requests: 5, input: 1000, output: 100 };
    expect(await cachePhrase(send, phrase, usage)).toEqual({ ok: false, reason: "heard words not in the text: living room" });
    expect(send).toHaveBeenCalledTimes(3);
    expect(usage).toEqual({ requests: 8, input: 1030, output: 109 });
  });

  it("records one line per attempt with phrase, attempt number and message", async () => {
    const first = sent(invented);
    const second = sent(good);
    const record = vi.fn<(line: object) => Promise<void>>().mockResolvedValue(undefined);
    await cachePhrase(sendOf(first, second), phrase, freshUsage(), record);
    expect(record.mock.calls).toEqual([[{ phrase, attempt: 1, message: first }], [{ phrase, attempt: 2, message: second }]]);
  });

  it("checks heard words against the phrase it sent", async () => {
    // "calm" is in this phrase but not in the one the answer would otherwise be checked against.
    const answer = { ...good, roomType: null, heard: ["calm"] };
    expect(await cachePhrase(sendOf(sent(answer)), "calm evening", freshUsage())).toEqual({ ok: true, value: answer });
    expect(await cachePhrase(sendOf(sent(answer), sent(answer), sent(answer)), "warm evening", freshUsage())).toEqual({
      ok: false,
      reason: "heard words not in the text: calm",
    });
  });

  it("lets a send rejection propagate (pin; no catch)", async () => {
    const send = vi.fn<(text: string) => Promise<Sent>>().mockRejectedValue(new Error("overloaded"));
    const usage = freshUsage();
    await expect(cachePhrase(send, phrase, usage)).rejects.toThrow("overloaded");
    expect(usage).toEqual({ requests: 0, input: 0, output: 0 });
  });
});

describe("cachePhrase replaying the recorded cache run [Res #7]", () => {
  type Line = { phrase: string; attempt: number; message: Sent };
  const lines = readFileSync(path.join(root, "tests/fixtures/anthropic/j2-cache.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Line);
  const committed = JSON.parse(readFileSync(path.join(root, "data/j2-cache.json"), "utf8"));

  it("rebuilds the committed data/j2-cache.json with the recorded attempts and usage", async () => {
    const usage = freshUsage();
    const cache: Record<string, unknown> = {};
    const recorded: object[] = [];
    for (const p of [...new Set(lines.map((l) => l.phrase))]) {
      const send = sendOf(...lines.filter((l) => l.phrase === p).map((l) => l.message));
      const result = await cachePhrase(send, p, usage, async (line) => void recorded.push(line));
      if (result.ok) cache[p] = result.value;
    }
    expect(j2CacheFileSchema.parse(cache)).toEqual(committed);
    expect(recorded).toEqual(lines);
    expect(usage).toEqual({
      requests: 53,
      input: lines.reduce((sum, l) => sum + l.message.usage.input_tokens, 0),
      output: lines.reduce((sum, l) => sum + l.message.usage.output_tokens, 0),
    });
  });
});
