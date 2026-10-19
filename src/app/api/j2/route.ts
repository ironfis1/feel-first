import Anthropic from "@anthropic-ai/sdk";
import { j2TimeoutMs } from "@/config/feel";
import { j2Request } from "@/lib/j2";
import { answerJ2, type CallModel, type J2Source, RateLimiter, readBody } from "@/lib/j2answer";

// POST /api/j2: the describe box's one server call [spec Section 4 J2, D-065]. The SDK reads ANTHROPIC_API_KEY
// from the server environment; the key never reaches a response or a log. Only the answer path is logged, with the
// kind of failure for a fallback (D-082), never the visitor's text.

const limiter = new RateLimiter();
let client: Anthropic | undefined;

const callModel: CallModel = (text, signal) => {
  client ??= new Anthropic();
  return client.messages.create(j2Request(text), { signal, maxRetries: 0, timeout: j2TimeoutMs });
};

/** The visitor's IP as the Upsun router reports it, for the rate limit only. Never stored past the window or logged. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return request.headers.get("x-client-ip") ?? (forwarded || "unknown");
}

function reply(source: J2Source, body: unknown, status = 200, reason?: string) {
  console.log(reason ? `j2 ${source}: ${reason}` : `j2 ${source}`);
  return Response.json(body, { status, headers: { "x-j2-source": source, "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const text = readBody(await request.json().catch(() => undefined));
  // A body the describe box never sends: the browser answers from its own word map [D-065].
  if (text === null) return reply("fallback", null, 400, "refused body");
  const answer = await answerJ2(text, clientIp(request), { callModel, limiter });
  return reply(answer.source, answer.body, 200, answer.source === "fallback" ? answer.reason : undefined);
}
