import { describe, expect, it, vi } from "vitest";
import { createClient, identifier, SourceRefused } from "../../../scripts/ingest/lib/http.ts";
import { jplUserAgent } from "../../../scripts/ingest/jpl.ts";

// Medium tier (docs/test-tiers.md). Every request is answered by a stub; nothing reaches the network.

type Answer = Response | Error;

function harness(answers: Answer[], options: Partial<Parameters<typeof createClient>[0]> = {}) {
  let clock = 0;
  const sleeps: number[] = [];
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = answers.shift();
    if (!next) throw new Error("no more answers");
    if (next instanceof Error) throw next;
    return next;
  });
  const client = createClient({
    minIntervalMs: 1000,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    ...options,
  });
  return { client, sleeps, calls, advance: (ms: number) => (clock += ms) };
}

const status = (code: number, headers: Record<string, string> = {}, body = "") => new Response(code === 204 ? null : body, { status: code, headers });

describe("createClient spacing", () => {
  it("waits out the rest of the interval between close requests, and not otherwise", async () => {
    const h = harness([status(200), status(200), status(200)]);
    await h.client.request("https://a.test/1");
    h.advance(400);
    await h.client.request("https://a.test/2");
    h.advance(5000);
    await h.client.request("https://a.test/3");
    expect(h.sleeps).toEqual([600]);
  });
});

describe("createClient retries", () => {
  it("stops at once on a 429 when the source blocks for long [D-017]", async () => {
    const h = harness([status(429)], { stopOn429: true });
    await expect(h.client.request("https://loc.test")).rejects.toBeInstanceOf(SourceRefused);
    expect(h.calls).toHaveLength(1);
  });

  it("retries a 429 after Retry-After seconds, then gives up with SourceRefused", async () => {
    const h = harness([status(429, { "retry-after": "7" }), status(429), status(429)], { retries: 2 });
    await expect(h.client.request("https://a.test")).rejects.toBeInstanceOf(SourceRefused);
    expect(h.calls).toHaveLength(3);
    expect(h.sleeps).toEqual([7000, 4000]);
  });

  it.each([["missing", {}], ["zero", { "retry-after": "0" }], ["not a number", { "retry-after": "soon" }]])(
    "backs off by doubling the interval when Retry-After is %s",
    async (_label, headers) => {
      const h = harness([status(503, headers), status(503, headers), status(200)]);
      const response = await h.client.request("https://a.test");
      expect(response.status).toBe(200);
      expect(h.sleeps).toEqual([2000, 4000]);
    },
  );

  it("sleeps a very long Retry-After in full", async () => {
    const h = harness([status(429, { "retry-after": "3600" }), status(200)]);
    await h.client.request("https://a.test");
    expect(h.sleeps).toEqual([3_600_000]);
  });

  it("hands back a 5xx that persists, so the caller can skip that one record", async () => {
    const h = harness([status(500), status(502)], { retries: 1 });
    expect((await h.client.request("https://a.test")).status).toBe(502);
    expect(h.calls).toHaveLength(2);
  });

  it("returns a 404 at once, and makes no retry with retries set to 0", async () => {
    const h = harness([status(404), status(500)], { retries: 0 });
    expect((await h.client.request("https://a.test")).status).toBe(404);
    expect((await h.client.request("https://a.test")).status).toBe(500);
    expect(h.calls).toHaveLength(2);
  });

  it("retries a network error, then rethrows it", async () => {
    const h = harness([new Error("socket hang up"), new Error("socket hang up")], { retries: 1 });
    await expect(h.client.request("https://a.test")).rejects.toThrow("socket hang up");
    expect(h.sleeps).toEqual([2000]);
  });

  it("gives every request a timeout signal", async () => {
    const h = harness([status(200)]);
    await h.client.request("https://a.test");
    expect(h.calls[0].init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("createClient identification [D-017]", () => {
  it("identifies the project in both User-Agent headers", async () => {
    expect(identifier).toBe("Feel First prototype (scott@reasinger.net)");
    const h = harness([status(200)]);
    await h.client.request("https://a.test");
    expect(h.calls[0].init.headers).toMatchObject({ "User-Agent": identifier, "AIC-User-Agent": identifier });
  });

  it("lets a source replace User-Agent, and a request add its own headers", async () => {
    expect(jplUserAgent.startsWith("Mozilla/5.0")).toBe(true);
    expect(jplUserAgent).toContain(identifier);
    const h = harness([status(200)], { headers: { "User-Agent": jplUserAgent } });
    await h.client.request("https://a.test", { headers: { Range: "bytes=0-9" } });
    expect(h.calls[0].init.headers).toEqual({ "User-Agent": jplUserAgent, "AIC-User-Agent": identifier, Range: "bytes=0-9" });
  });
});

describe("createClient json, head and text", () => {
  it("parses JSON", async () => {
    const h = harness([status(200, {}, '{"ok":true}')]);
    expect(await h.client.json("https://a.test")).toEqual({ ok: true });
  });

  it("treats an HTML page as a firewall block and stops", async () => {
    const h = harness([status(200, {}, "  \n<html>Request unsuccessful</html>")]);
    await expect(h.client.json("https://a.test")).rejects.toBeInstanceOf(SourceRefused);
  });

  it("throws a plain error on a failed status or malformed JSON", async () => {
    const h = harness([status(404), status(200, {}, "{oops")]);
    const notFound = h.client.json("https://a.test");
    await expect(notFound).rejects.toThrow("returned 404");
    await expect(notFound).rejects.not.toBeInstanceOf(SourceRefused);
    await expect(h.client.json("https://a.test")).rejects.toBeInstanceOf(SyntaxError);
  });

  it("asks for the first 128 KB of an image and returns the bytes", async () => {
    const h = harness([new Response(new Uint8Array([1, 2, 3]), { status: 206 })]);
    expect(Array.from(await h.client.head("https://img.test/a.jpg"))).toEqual([1, 2, 3]);
    expect(h.calls[0].init.headers).toMatchObject({ Range: "bytes=0-131071" });
  });

  it("throws when text or head fails", async () => {
    const h = harness([status(403), status(404)]);
    await expect(h.client.text("https://a.test")).rejects.toThrow("returned 403");
    await expect(h.client.head("https://a.test")).rejects.toThrow("returned 404");
  });
});
