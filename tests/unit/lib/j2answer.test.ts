import { afterEach, describe, expect, it, vi } from "vitest";
import cacheData from "../../../data/j2-cache.json";
import { describeMaxChars, describePlaceholder, j2RateLimit, j2TimeoutMs } from "@/config/feel";
import { type J2Message, normalizePhrase } from "@/lib/j2";
import { answerJ2, type CallModel, RateLimiter, readBody } from "@/lib/j2answer";
import { j2CacheFileSchema } from "@/lib/schemas";
import { interpretWords } from "@/lib/wordmap";

// High tier (docs/test-tiers.md, Triage 2026-10-19): readBody, RateLimiter.take, the live race and answerJ2.
// Medium: the cache load. Functional gate: the J2 answer paths, cache, live, timeout, API error and rate limited,
// each with its body and source [D-064 rate limit counts live calls only, D-066 header, D-075 null fallback].
// The model is a stub; nothing reaches Anthropic.

afterEach(() => {
  vi.useRealTimers();
});

const cached = describePlaceholder;
const novel = "a calm grey harbor at dusk";
const liveBody = { valence: -0.2, arousal: -0.5, roomType: null, size: null, heard: ["calm", "harbor"] };
const message = (body: unknown, stop_reason: string | null = "end_turn"): J2Message => ({ stop_reason, content: [{ type: "text", text: JSON.stringify(body) }] });
const answers = (body: unknown = liveBody): CallModel => vi.fn(async () => message(body));
const deps = (callModel: CallModel, limiter = new RateLimiter()) => ({ callModel, limiter, now: 1000 });

describe("readBody [D-065]", () => {
  it("rejects anything that is not an object", () => {
    for (const body of [null, undefined, "text", ["text"], 7, true]) expect(readBody(body)).toBeNull();
  });

  it("rejects an extra key, a missing text key and a text that is not a string", () => {
    expect(readBody({ text: "calm", mood: [0, 0] })).toBeNull();
    expect(readBody({ words: "calm" })).toBeNull();
    expect(readBody({})).toBeNull();
    expect(readBody({ text: 5 })).toBeNull();
    expect(readBody({ text: null })).toBeNull();
  });

  it("rejects empty and whitespace-only text", () => {
    expect(readBody({ text: "" })).toBeNull();
    expect(readBody({ text: " \t\n" })).toBeNull();
  });

  it("accepts 200 characters, rejects 201, and returns the text untrimmed", () => {
    expect(readBody({ text: "a".repeat(describeMaxChars) })).toBe("a".repeat(200));
    expect(readBody({ text: "a".repeat(describeMaxChars + 1) })).toBeNull();
    expect(readBody({ text: "  calm  " })).toBe("  calm  ");
  });
});

describe("RateLimiter.take [Gap G18, D-064]", () => {
  it("defaults to the config limit: call 20 is allowed and call 21 refused", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < j2RateLimit.calls; i++) expect(limiter.take("ip", i)).toBe(true);
    expect(limiter.take("ip", 100)).toBe(false);
  });

  it("does not record a refused call", () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.take("ip", 0)).toBe(true);
    expect(limiter.take("ip", 500)).toBe(false);
    // Had the refusal at 500 counted, the IP would still be at the limit at 1000.
    expect(limiter.take("ip", 1000)).toBe(true);
  });

  it("ages a call out exactly windowMs later, and not a millisecond sooner", () => {
    const limiter = new RateLimiter(1, 1000);
    limiter.take("ip", 0);
    expect(limiter.take("ip", 999)).toBe(false);
    expect(limiter.take("ip", 1000)).toBe(true);
  });

  it("uses the default window of one hour", () => {
    const limiter = new RateLimiter(1);
    limiter.take("ip", 0);
    expect(limiter.take("ip", j2RateLimit.windowMs - 1)).toBe(false);
    expect(limiter.take("ip", j2RateLimit.windowMs)).toBe(true);
  });

  it("counts each IP separately", () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("b", 0)).toBe(true);
    expect(limiter.take("a", 1)).toBe(false);
  });

  it("forgets an IP whose calls have all aged out, and keeps the recent calls of others", () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.take("old", 0);
    limiter.take("keep", 0);
    limiter.take("keep", 900);
    limiter.take("new", 1500);
    const calls = (limiter as unknown as { calls: Map<string, number[]> }).calls;
    expect([...calls.keys()].sort()).toEqual(["keep", "new"]);
    expect(calls.get("keep")).toEqual([900]);
  });
});

describe("the J2 cache load", () => {
  it("parses the shipped cache, with every key already in the form normalizePhrase gives", () => {
    const cache = j2CacheFileSchema.parse(cacheData);
    for (const key of Object.keys(cache)) expect(normalizePhrase(key)).toBe(key);
  });

  it("answers the demo phrase from the cache: bedroom, large [D-037]", async () => {
    const callModel = answers();
    const out = await answerJ2(cached, "ip", deps(callModel));
    expect(out.source).toBe("cache");
    expect(out.body).toMatchObject({ roomType: "bedroom", size: "large" });
    expect(out.body).toEqual((cacheData as Record<string, unknown>)[cached]);
  });
});

describe("answerJ2: cache, rate limit, live, word map", () => {
  it("a cache hit never calls the model and never uses up the limit, in any case or spacing", async () => {
    const callModel = answers();
    const limiter = new RateLimiter(1, 1000);
    for (const text of [cached, `  ${cached.toUpperCase()}  `, cached.replace(/ /g, "   ")]) {
      expect((await answerJ2(text, "ip", { callModel, limiter, now: 0 })).source).toBe("cache");
    }
    expect(callModel).not.toHaveBeenCalled();
    expect(limiter.take("ip", 0)).toBe(true);
  });

  it("a miss answers live with the parsed output, passing the text and an open signal", async () => {
    const callModel = answers();
    expect(await answerJ2(novel, "ip", deps(callModel))).toEqual({ source: "live", body: liveBody });
    expect(callModel).toHaveBeenCalledTimes(1);
    const [text, signal] = vi.mocked(callModel).mock.calls[0];
    expect(text).toBe(novel);
    expect(signal.aborted).toBe(false);
  });

  it("an API error, a spend-limit error and a synchronous throw land on the word map", async () => {
    const spendLimit = Object.assign(new Error("400 Your credit balance is too low"), { status: 400 });
    const failures: CallModel[] = [
      vi.fn(async () => Promise.reject(new Error("529 overloaded"))),
      vi.fn(async () => Promise.reject(spendLimit)),
      vi.fn(() => {
        throw new Error("thrown at once");
      }),
    ];
    for (const callModel of failures) {
      expect(await answerJ2(novel, "ip", deps(callModel))).toEqual({ source: "fallback", body: interpretWords(novel) });
    }
  });

  it("a malformed, truncated, off-contract or invented-word response lands on the word map", async () => {
    const bad: J2Message[] = [
      { stop_reason: "end_turn", content: [{ type: "text", text: "{not json" }] },
      message(liveBody, "max_tokens"),
      message({ ...liveBody, valence: 3 }),
      message({ ...liveBody, heard: ["ocean"] }),
      { stop_reason: "end_turn", content: [] },
    ];
    for (const m of bad) {
      expect(await answerJ2(novel, "ip", deps(vi.fn(async () => m)))).toEqual({ source: "fallback", body: interpretWords(novel) });
    }
  });

  it("a call slower than the timeout lands on the word map and aborts the signal it was given", async () => {
    vi.useFakeTimers();
    let given: AbortSignal | undefined;
    const callModel: CallModel = vi.fn((_text, signal) => {
      given = signal;
      return new Promise<J2Message>(() => {});
    });
    const pending = answerJ2(novel, "ip", { ...deps(callModel), timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(49);
    expect(given?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toEqual({ source: "fallback", body: interpretWords(novel) });
    expect(given?.aborted).toBe(true);
  });

  it("uses the config timeout when none is given", async () => {
    vi.useFakeTimers();
    const pending = answerJ2(novel, "ip", deps(vi.fn(() => new Promise<J2Message>(() => {}))));
    await vi.advanceTimersByTimeAsync(j2TimeoutMs - 1);
    let done = false;
    void pending.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).source).toBe("fallback");
  });

  it("clears the timer after a live answer, leaving none pending", async () => {
    vi.useFakeTimers();
    expect((await answerJ2(novel, "ip", deps(answers()))).source).toBe("live");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("over the limit, answers from the word map without calling the model [D-064]", async () => {
    const callModel = answers();
    const limiter = new RateLimiter(1, 1000);
    expect((await answerJ2(novel, "ip", { callModel, limiter, now: 0 })).source).toBe("live");
    expect(await answerJ2(novel, "ip", { callModel, limiter, now: 10 })).toEqual({ source: "fallback", body: interpretWords(novel) });
    expect(callModel).toHaveBeenCalledTimes(1);
  });

  it("uses the clock when no time is given", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(5000);
    const limiter = new RateLimiter(5, 1000);
    const take = vi.spyOn(limiter, "take");
    await answerJ2(novel, "ip", { callModel: answers(), limiter });
    expect(take).toHaveBeenCalledWith("ip", 5000);
  });

  it("answers null from the fallback when no mood word is heard [D-075]", async () => {
    const text = "sunday coffee pot";
    expect(await answerJ2(text, "ip", deps(vi.fn(async () => Promise.reject(new Error("down")))))).toEqual({ source: "fallback", body: null });
  });
});
