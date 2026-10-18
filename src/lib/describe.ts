// The describe box's call to the J2 route, with the browser's own fallback [D-065].
// It sends { "text" } and nothing else. Anything but a valid J2 output within j2ClientTimeoutMs, including a
// network error, answers from the word map, so the visitor never sees an error [quality-bar section 2].

import { describeMaxChars, j2ClientTimeoutMs } from "../config/feel.ts";
import { type J2Output, j2OutputSchema } from "./j2.ts";
import { interpretWords } from "./wordmap.ts";

/** Interprets typed text through the J2 route. Null only when no answer hears a mood word [D-052]. */
export async function describeMoment(text: string, fetchImpl: typeof fetch = fetch, timeoutMs = j2ClientTimeoutMs): Promise<J2Output | null> {
  const typed = text.slice(0, describeMaxChars);
  if (!typed.trim()) return null;
  try {
    const res = await fetchImpl("/api/j2", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: typed }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) {
      const parsed = j2OutputSchema.safeParse(await res.json());
      if (parsed.success) return parsed.data;
    }
  } catch {
    // A network error, a timeout or an unreadable body: the word map answers below.
  }
  return interpretWords(typed);
}
