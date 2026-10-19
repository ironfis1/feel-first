import { describe, expect, it, vi } from "vitest";
import { describeMaxChars, j2ClientTimeoutMs } from "@/config/feel";
import { describeMoment } from "@/lib/describe";
import { interpretWords } from "@/lib/wordmap";

// High tier (docs/test-tiers.md, Triage 2026-10-19): describeMoment. Functional gate: the client fallback
// [D-065]: a route error, a non-J2 body and a request past 5 seconds each answer from the word map, with no
// error reaching the visitor. The send is exactly { "text" }. fetch is a stub; nothing leaves the test.

const text = "calm grey harbor";
const routeBody = { valence: -0.2, arousal: -0.5, roomType: "office", size: "small", heard: ["calm", "harbor"] };
const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
const fetchOf = (impl: (...args: Parameters<typeof fetch>) => Promise<Response>) => vi.fn(impl) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

describe("describeMoment: the send [D-065]", () => {
  it("posts exactly { text } as JSON to the J2 route, with an abort signal", async () => {
    const f = fetchOf(async () => ok(routeBody));
    await describeMoment(text, f);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/j2");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({ text });
    expect(Object.keys(JSON.parse(init.body as string))).toEqual(["text"]);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("cuts text over 200 characters to 200 before sending", async () => {
    const f = fetchOf(async () => ok(routeBody));
    await describeMoment("calm ".repeat(60), f);
    const sent = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string).text as string;
    expect(sent).toHaveLength(describeMaxChars);
    expect(sent).toBe("calm ".repeat(60).slice(0, 200));
  });

  it("sends nothing for empty or whitespace-only text, and answers null", async () => {
    const f = fetchOf(async () => ok(routeBody));
    expect(await describeMoment("", f)).toBeNull();
    expect(await describeMoment("  \n\t", f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

describe("describeMoment: the answer", () => {
  it("returns a valid J2 body from the route as it is", async () => {
    expect(await describeMoment(text, fetchOf(async () => ok(routeBody)))).toEqual(routeBody);
  });

  it("answers from the word map on a route error status", async () => {
    for (const status of [400, 500, 503]) {
      expect(await describeMoment(text, fetchOf(async () => ok(routeBody, status)))).toEqual(interpretWords(text));
    }
  });

  it("answers from the word map on a non-J2 body, including the route's null and an extra key", async () => {
    for (const body of [null, {}, "calm", { ...routeBody, valence: 2 }, { ...routeBody, bag: [] }]) {
      expect(await describeMoment(text, fetchOf(async () => ok(body)))).toEqual(interpretWords(text));
    }
  });

  it("answers from the word map on a network error or an unreadable body", async () => {
    expect(await describeMoment(text, fetchOf(async () => Promise.reject(new TypeError("Failed to fetch"))))).toEqual(interpretWords(text));
    const unreadable = { ok: true, status: 200, json: async () => Promise.reject(new SyntaxError("Unexpected token")) } as unknown as Response;
    expect(await describeMoment(text, fetchOf(async () => unreadable))).toEqual(interpretWords(text));
  });

  it("answers from the word map when the route has not answered within the timeout, aborting the request", async () => {
    // AbortSignal.timeout runs on Node's own timers, which fake timers do not reach, so a short real timeout stands in.
    let signal: AbortSignal | undefined;
    const f = fetchOf(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init!.signal!;
          signal.addEventListener("abort", () => reject(signal!.reason));
        }),
    );
    expect(await describeMoment(text, f, 30)).toEqual(interpretWords(text));
    expect(signal?.aborted).toBe(true);
  });

  it("times out at j2ClientTimeoutMs by default, 5 seconds", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await describeMoment(text, fetchOf(async () => ok(routeBody)));
    expect(timeout).toHaveBeenCalledWith(j2ClientTimeoutMs);
    expect(j2ClientTimeoutMs).toBe(5000);
    timeout.mockRestore();
  });

  it("answers null on every failing path when no mood word is heard [D-052]", async () => {
    const quiet = "sunday coffee pot";
    expect(await describeMoment(quiet, fetchOf(async () => ok(null, 400)))).toBeNull();
    expect(await describeMoment(quiet, fetchOf(async () => Promise.reject(new TypeError("offline"))))).toBeNull();
  });
});
