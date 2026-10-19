// The J2 route's answer order: cache, rate limit, live call, word map [spec Section 4 J2, docs/ai-jobs.md J2].
// Server only. The route handler supplies the live call, so this file never touches the SDK or the key, and
// tests drive every path with a stub. Nothing here logs; the route logs the answer path and, for a fallback,
// the kind of failure (D-082). Neither ever holds the visitor's text or the key.

import cacheData from "../../data/j2-cache.json";
import { describeMaxChars, j2RateLimit, j2TimeoutMs } from "../config/feel.ts";
import { type J2Message, type J2Output, normalizePhrase, parseJ2 } from "./j2.ts";
import { j2CacheFileSchema } from "./schemas.ts";
import { interpretWords } from "./wordmap.ts";

/** Which path answered, reported in the x-j2-source header [D-066]. */
export type J2Source = "cache" | "live" | "fallback";

/** Why a submission fell back to the word map, for the server log only [D-082]. */
export type FallbackReason = "rate limited" | "timeout" | "rejected" | "api error" | `api error ${number}`;

/**
 * A route answer. The body is the J2 output, or null when the word map heard no mood word [D-052].
 * A fallback carries the reason the live call did not answer.
 */
export type J2Answer = { source: "cache" | "live"; body: J2Output | null } | { source: "fallback"; body: J2Output | null; reason: FallbackReason };

/** The live call: one Messages API request for the text, abandoned when the signal aborts. */
export type CallModel = (text: string, signal: AbortSignal) => Promise<J2Message>;

const cache: Record<string, J2Output> = j2CacheFileSchema.parse(cacheData);

/** The typed text from a request body, or null unless the body is exactly { "text": <1 to 200 characters> } [D-065]. */
export function readBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "text") return null;
  const text = (body as { text: unknown }).text;
  if (typeof text !== "string" || text.length > describeMaxChars || !text.trim()) return null;
  return text;
}

/**
 * Best-effort, per-instance count of live calls per IP over a sliding window [Gap G18, D-064].
 * Only the time of each call is kept, and an IP whose calls have all aged out is forgotten.
 */
export class RateLimiter {
  private calls = new Map<string, number[]>();
  constructor(
    private readonly limit: number = j2RateLimit.calls,
    private readonly windowMs: number = j2RateLimit.windowMs,
  ) {}

  /** Records a live call for the IP and returns true, or returns false when the IP is at the limit. */
  take(ip: string, now: number): boolean {
    for (const [key, times] of this.calls) {
      const recent = times.filter((t) => now - t < this.windowMs);
      if (recent.length) this.calls.set(key, recent);
      else this.calls.delete(key);
    }
    const times = this.calls.get(ip) ?? [];
    if (times.length >= this.limit) return false;
    this.calls.set(ip, [...times, now]);
    return true;
  }
}

/** The HTTP status of an API error (401, 429, 529 and so on), never its message. */
function apiError(err: unknown): FallbackReason {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" && Number.isInteger(status) ? `api error ${status}` : "api error";
}

/** The live answer, or why there is none: an API or spend-limit error, a timeout, or a response J2 rejects. */
async function live(text: string, callModel: CallModel, timeoutMs: number): Promise<{ value: J2Output } | { reason: FallbackReason }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<{ reason: FallbackReason }>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ reason: "timeout" });
    }, timeoutMs);
  });
  try {
    // Called inside a promise so a call that throws at once lands on the word map like any other failure.
    const answered = Promise.resolve()
      .then(() => callModel(text, controller.signal))
      .then(
        (message) => {
          const parsed = parseJ2(message, text);
          return parsed.ok ? { value: parsed.value } : { reason: "rejected" as const };
        },
        (err: unknown) => ({ reason: apiError(err) }),
      );
    return await Promise.race([answered, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

/** Answers one describe submission in the J2 order. Never throws; every failure lands on the word map. */
export async function answerJ2(
  text: string,
  ip: string,
  deps: { callModel: CallModel; limiter: RateLimiter; now?: number; timeoutMs?: number },
): Promise<J2Answer> {
  const cached = cache[normalizePhrase(text)];
  if (cached) return { source: "cache", body: cached };
  if (!deps.limiter.take(ip, deps.now ?? Date.now())) return { source: "fallback", body: interpretWords(text), reason: "rate limited" };
  const answer = await live(text, deps.callModel, deps.timeoutMs ?? j2TimeoutMs);
  if ("value" in answer) return { source: "live", body: answer.value };
  return { source: "fallback", body: interpretWords(text), reason: answer.reason };
}
