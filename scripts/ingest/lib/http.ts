// Polite HTTP for the ingest scripts (D-017). Run by hand only; tests never call this with a real fetch.

/** How every script identifies itself to a source [D-017]. */
export const identifier = "Feel First prototype (scott@reasinger.net)";

export const identifyingHeaders: Record<string, string> = {
  "User-Agent": identifier,
  // AIC asks for this header because browsers cannot set User-Agent [D-017].
  "AIC-User-Agent": identifier,
};

type Fetch = typeof fetch;
type Sleep = (ms: number) => Promise<void>;

const realSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown when a source asks us to stop for longer than it is worth waiting. */
export class SourceRefused extends Error {}

export interface ClientOptions {
  /** Minimum gap between requests to this source, in ms. */
  minIntervalMs: number;
  /** Retries after a 429 or 5xx before giving up. */
  retries?: number;
  /** Stop at once on a 429 instead of waiting (Library of Congress blocks for an hour). */
  stopOn429?: boolean;
  /** Headers that replace the defaults for this source. */
  headers?: Record<string, string>;
  /** Give up on one request after this long (default 30 seconds). */
  timeoutMs?: number;
  fetchImpl?: Fetch;
  sleep?: Sleep;
  now?: () => number;
}

/** A throttled client for one source: requests are spaced at least minIntervalMs apart. */
export function createClient(options: ClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? realSleep;
  const now = options.now ?? Date.now;
  const retries = options.retries ?? 3;
  let last = -Infinity;

  /**
   * One request, spaced from the last. A 429 is retried (or stops the run with stopOn429).
   * A 5xx or timeout is retried; if it persists, the 5xx response is returned (or the timeout thrown)
   * so the caller can skip that one record and carry on.
   */
  async function request(url: string, init: RequestInit = {}): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const wait = last + options.minIntervalMs - now();
      if (wait > 0) await sleep(wait);
      last = now();
      let response: Response;
      try {
        response = await fetchImpl(url, {
          ...init,
          headers: { ...identifyingHeaders, ...options.headers, ...init.headers },
          signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
        });
      } catch (error) {
        if (attempt >= retries) throw error;
        await sleep(options.minIntervalMs * 2 ** (attempt + 1));
        continue;
      }
      if (response.status === 429) {
        if (options.stopOn429) throw new SourceRefused(`${url} returned 429; stopping so the source does not extend its block`);
        if (attempt >= retries) throw new SourceRefused(`${url} still returned 429 after ${retries} retries`);
      } else if (response.status < 500 || attempt >= retries) {
        return response;
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : options.minIntervalMs * 2 ** (attempt + 1));
    }
  }

  async function json<T = unknown>(url: string): Promise<T> {
    const response = await request(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    const body = await response.text();
    // A firewall or CAPTCHA page arrives as HTML with a 200; stop rather than hammer it.
    if (body.trimStart().startsWith("<")) throw new SourceRefused(`${url} returned an HTML page instead of JSON (likely a firewall block)`);
    return JSON.parse(body) as T;
  }

  /** The first bytes of a file, enough to read an image's size. */
  async function head(url: string, bytes = 131072): Promise<Uint8Array> {
    const response = await request(url, { headers: { Range: `bytes=0-${bytes - 1}` } });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async function text(url: string): Promise<string> {
    const response = await request(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
  }

  return { request, json, head, text };
}

export type Client = ReturnType<typeof createClient>;
