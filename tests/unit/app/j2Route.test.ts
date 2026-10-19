import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cacheData from "../../../data/j2-cache.json";
import { describePlaceholder, j2RateLimit, j2TimeoutMs } from "@/config/feel";
import { j2OutputSchema, j2Request } from "@/lib/j2";
import { interpretWords } from "@/lib/wordmap";

// High tier (docs/test-tiers.md, Triage 2026-10-19): the POST handler. Medium: clientIp, reply and the lazy
// client. Functional gate: the J2 route, all five paths (cache, live, timeout, API error including a spend limit
// and a malformed response, rate limited) plus oversized, malformed, extra-key and invalid-JSON bodies, each with
// its body and x-j2-source header [D-064, D-065, D-066, D-075]. The SDK module is mocked; nothing reaches Anthropic.

const create = vi.fn();
const constructed = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
    constructor() {
      constructed();
    }
  },
}));

const KEY = "sk-ant-test-sentinel-do-not-leak";
const novel = "a calm grey harbor at dusk";
const liveBody = { valence: -0.2, arousal: -0.5, roomType: null, size: null, heard: ["calm", "harbor"] };
const modelReply = (body: unknown, stop_reason = "end_turn") => ({ stop_reason, content: [{ type: "text", text: JSON.stringify(body) }] });

let POST: (request: Request) => Promise<Response>;
let log: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  // A fresh module per test, so the rate limiter and the client start empty.
  vi.resetModules();
  create.mockReset();
  constructed.mockReset();
  process.env.ANTHROPIC_API_KEY = KEY;
  log = vi.spyOn(console, "log").mockImplementation(() => {});
  ({ POST } = await import("@/app/api/j2/route"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
});

const post = (body: unknown, headers: Record<string, string> = {}, raw = false) =>
  POST(new Request("http://localhost/api/j2", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: raw ? (body as string) : JSON.stringify(body) }));

/** The response's status, source header, cache header and JSON body, after checking the key appears nowhere. */
async function read(res: Response) {
  const text = await res.text();
  const headers = [...res.headers.entries()].flat().join(" ");
  expect(text.includes(KEY) || headers.includes(KEY) || headers.includes("ANTHROPIC_API_KEY")).toBe(false);
  return { status: res.status, source: res.headers.get("x-j2-source"), cache: res.headers.get("cache-control"), body: JSON.parse(text) as unknown };
}

describe("POST /api/j2: requests the describe box never sends [D-065]", () => {
  it("answers 400, a null body and x-j2-source fallback, without calling the model", async () => {
    const bad = [
      post("{not json", {}, true),
      post({ text: "a".repeat(201) }),
      post({ text: "calm", bag: [] }),
      post({ words: "calm" }),
      post({ text: "" }),
      post(["calm"]),
    ];
    for (const res of await Promise.all(bad)) {
      expect(await read(res)).toEqual({ status: 400, source: "fallback", cache: "no-store", body: null });
    }
    expect(create).not.toHaveBeenCalled();
  });
});

describe("POST /api/j2: the five answer paths", () => {
  it("cache: the demo phrase answers 200 from the cache with no model call [D-037]", async () => {
    const out = await read(await post({ text: describePlaceholder }));
    expect(out).toEqual({ status: 200, source: "cache", cache: "no-store", body: (cacheData as Record<string, unknown>)[describePlaceholder] });
    expect(j2OutputSchema.safeParse(out.body).success).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("live: a novel phrase answers from the model with the J2 request and transport options", async () => {
    create.mockResolvedValue(modelReply(liveBody));
    expect(await read(await post({ text: novel }))).toEqual({ status: 200, source: "live", cache: "no-store", body: liveBody });
    expect(create).toHaveBeenCalledTimes(1);
    const [request, options] = create.mock.calls[0];
    expect(request).toEqual(j2Request(novel));
    expect(options).toMatchObject({ maxRetries: 0, timeout: j2TimeoutMs });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("builds the client once across calls", async () => {
    create.mockResolvedValue(modelReply(liveBody));
    await post({ text: novel });
    await post({ text: "calm tide" });
    expect(constructed).toHaveBeenCalledTimes(1);
  });

  it("timeout: a model slower than the server timeout answers from the word map", async () => {
    vi.useFakeTimers();
    create.mockReturnValue(new Promise(() => {}));
    const pending = post({ text: novel });
    await vi.advanceTimersByTimeAsync(j2TimeoutMs);
    expect(await read(await pending)).toEqual({ status: 200, source: "fallback", cache: "no-store", body: interpretWords(novel) });
    expect(create.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("API error: an outage, a spend-limit error and a malformed response all answer 200 from the word map", async () => {
    const spendLimit = Object.assign(new Error("400 Your credit balance is too low to access the Anthropic API"), { status: 400, type: "invalid_request_error" });
    const failures = [
      () => create.mockRejectedValue(Object.assign(new Error("529 overloaded"), { status: 529 })),
      () => create.mockRejectedValue(spendLimit),
      () => create.mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "text", text: '{"valence": 0.2, "arousal"' }] }),
      () => create.mockResolvedValue(modelReply(liveBody, "max_tokens")),
    ];
    for (const fail of failures) {
      fail();
      expect(await read(await post({ text: novel }))).toEqual({ status: 200, source: "fallback", cache: "no-store", body: interpretWords(novel) });
    }
  });

  it("rate limited: past the live limit for one IP, the word map answers and the model is not called [D-064]", async () => {
    create.mockResolvedValue(modelReply(liveBody));
    const ip = { "x-client-ip": "203.0.113.7" };
    for (let i = 0; i < j2RateLimit.calls; i++) expect((await read(await post({ text: novel }, ip))).source).toBe("live");
    expect(await read(await post({ text: novel }, ip))).toEqual({ status: 200, source: "fallback", cache: "no-store", body: interpretWords(novel) });
    expect(create).toHaveBeenCalledTimes(j2RateLimit.calls);
    // A cached phrase still answers from the cache for the same IP.
    expect((await read(await post({ text: describePlaceholder }, ip))).source).toBe("cache");
  });

  it("a fallback that hears no mood word answers a JSON null with source fallback [D-075]", async () => {
    create.mockRejectedValue(new Error("down"));
    expect(await read(await post({ text: "sunday coffee pot" }))).toEqual({ status: 200, source: "fallback", cache: "no-store", body: null });
  });
});

describe("clientIp, through the rate limit", () => {
  /** Uses up one IP's live calls, so the next request shows whether it was counted as that IP. */
  async function exhaust(headers: Record<string, string>) {
    create.mockResolvedValue(modelReply(liveBody));
    for (let i = 0; i < j2RateLimit.calls; i++) await post({ text: novel }, headers);
  }
  const sourceFor = async (headers: Record<string, string>) => (await read(await post({ text: novel }, headers))).source;

  it("prefers x-client-ip over x-forwarded-for", async () => {
    await exhaust({ "x-client-ip": "a" });
    expect(await sourceFor({ "x-client-ip": "a", "x-forwarded-for": "b" })).toBe("fallback");
    expect(await sourceFor({ "x-client-ip": "b", "x-forwarded-for": "a" })).toBe("live");
  });

  it("takes the last, trimmed x-forwarded-for entry", async () => {
    await exhaust({ "x-client-ip": "a" });
    expect(await sourceFor({ "x-forwarded-for": "9.9.9.9,  a " })).toBe("fallback");
    expect(await sourceFor({ "x-forwarded-for": "a, 9.9.9.9" })).toBe("live");
    // With three entries, the last is the one the router added, not the second.
    expect(await sourceFor({ "x-forwarded-for": "8.8.8.8, 7.7.7.7, a" })).toBe("fallback");
    expect(await sourceFor({ "x-forwarded-for": "8.8.8.8, a, 7.7.7.7" })).toBe("live");
  });

  it("counts a request with no IP header, or an empty forwarded header, as unknown", async () => {
    await exhaust({});
    expect(await sourceFor({ "x-forwarded-for": "" })).toBe("fallback");
    expect(await sourceFor({ "x-forwarded-for": " , " })).toBe("fallback");
    expect(await sourceFor({ "x-client-ip": "someone" })).toBe("live");
  });
});

describe("reply: the log line", () => {
  it("logs the answer path and a fallback's kind of failure, never the text, the IP or the error message [D-082]", async () => {
    create.mockResolvedValue(modelReply(liveBody));
    await post({ text: novel }, { "x-client-ip": "203.0.113.7" });
    await post({ text: describePlaceholder });
    await post({ text: "a".repeat(201) });
    create.mockRejectedValue(Object.assign(new Error("401 invalid x-api-key sk-ant-secret"), { status: 401 }));
    await post({ text: novel }, { "x-client-ip": "203.0.113.7" });
    expect(log.mock.calls).toEqual([["j2 live"], ["j2 cache"], ["j2 fallback: refused body"], ["j2 fallback: api error 401"]]);
  });
});
