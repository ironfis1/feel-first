import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { claudeEffort, claudeModel } from "@/config/feel";
import { bucketKeys } from "@/lib/buckets";
import { copyFileSchema, type workSchema } from "@/lib/schemas";
import { pilotIds } from "../../../scripts/j1.ts";
import { copyFor, inputHash, j4JsonSchema, j4Request, type Lines, parseJ4, sampleLines, systemPrompt, workText, worksToWrite } from "../../../scripts/j4.ts";
import { validWork } from "../../fixtures/works.ts";

// High tier (docs/test-tiers.md): parseJ4 and copyFor. Medium: systemPrompt, workText, inputHash, j4Request, worksToWrite.
// J4 contract tests replay recorded batch results from tests/fixtures/anthropic; no network, no Anthropic.

type Work = z.infer<typeof workSchema>;
const work = (overrides: Partial<Work> = {}) => validWork(overrides) as Work;
const root = path.resolve(import.meta.dirname, "../../..");
const markdown = "intro\n<!-- j4-prompt:start -->\nWrite one line per bucket.\n<!-- j4-prompt:end -->\noutro";
// An opaque system prompt for the tests that only pass one through; systemPrompt itself is called inside its own tests.
const system = "J4 SYSTEM PROMPT";

/** Nine passing lines, one per bucket, each naming its bucket so mix-ups show. */
const nineLines = (): Lines => Object.fromEntries(bucketKeys.map((key) => [key, `Calm water for ${key}.`])) as Lines;
const message = (text: string, stop_reason: string | null = "end_turn") =>
  ({ stop_reason, content: [{ type: "text", text, citations: null }] }) as Parameters<typeof parseJ4>[0];
const meta = { title: "Harbor at Dusk", artist: "Jan Toorop", subject: "seascape" as const };
const without = (lines: Lines, ...keys: string[]) => Object.fromEntries(Object.entries(lines).filter(([key]) => !keys.includes(key)));

describe("systemPrompt", () => {
  it("is the j4-prompt block followed by every banned phrase, in order, ending with a period", () => {
    const prompt = systemPrompt(markdown);
    expect(prompt.startsWith("Write one line per bucket.\n\nNever use these words or phrases: captivating, captivates, evoke, evokes,")).toBe(true);
    expect(prompt.endsWith(", a sense of, truly, nestled.")).toBe(true);
    expect(prompt).toContain("evokes emotion, stunning,");
  });

  it("throws when the marker is missing", () => {
    expect(() => systemPrompt("no markers here")).toThrow("docs/ai-jobs.md has no prompt between the j4-prompt markers");
  });

  it("reads a non-empty prompt from the real docs/ai-jobs.md", () => {
    const real = systemPrompt(readFileSync(path.join(root, "docs/ai-jobs.md"), "utf8"));
    expect(real.indexOf("Never use these words or phrases:")).toBeGreaterThan(0);
  });
});

describe("workText", () => {
  it("lists the eight fields in order", () => {
    expect(workText(work({ lane: "poster", valence: 0.25, arousal: -0.5, tags: ["serene", "tender", "awe"] }))).toBe(
      [
        "Title: Test Work",
        "Artist: Test Artist",
        "Date: 1900",
        "Lane: poster",
        "Subject: landscape",
        "Valence: 0.25",
        "Arousal: -0.5",
        "Strongest feelings: serene, tender, awe",
      ].join("\n"),
    );
  });

  it("prints the fine-art lane as 'fine art'", () => {
    expect(workText(work({ lane: "fine-art" })).split("\n")[3]).toBe("Lane: fine art");
  });
});

describe("inputHash", () => {
  const base = work();

  it("hashes the system prompt and the work text together", () => {
    expect(inputHash(system, base)).toBe("32857022cd45");
    expect(inputHash(system, base)).toBe(inputHash(system, work()));
  });

  it("changes with the system prompt or any field the request carries", () => {
    const before = inputHash(system, base);
    expect(inputHash(`${system} `, base)).not.toBe(before);
    const changes: Partial<Work>[] = [
      { title: "Other" },
      { artist: "Other" },
      { date: "1901" },
      { lane: "poster" },
      { subject: "figure" },
      { valence: 0.3 },
      { arousal: -0.3 },
      { tags: ["serene", "tender", "joyful"] },
    ];
    for (const change of changes) expect(inputHash(system, work(change))).not.toBe(before);
  });

  it("does not change with palette, id or thumbUrl (pin: the image is left out by design)", () => {
    const before = inputHash(system, base);
    expect(inputHash(system, work({ palette: ["#000", "#111", "#222", "#333", "#444"], id: "w-9999", thumbUrl: "/thumbs/other.jpg" }))).toBe(before);
  });
});

describe("j4Request", () => {
  it("sends the thumbnail, then the work text, under the work's id", () => {
    const w = work({ id: "w-0042" });
    expect(j4Request(w, "QUJD", system)).toEqual({
      custom_id: "w-0042",
      params: {
        model: claudeModel,
        max_tokens: 4000,
        system,
        output_config: { effort: claudeEffort.j4, format: { type: "json_schema", schema: j4JsonSchema } },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/webp", data: "QUJD" } },
              { type: "text", text: workText(w) },
            ],
          },
        ],
      },
    });
  });

  it("asks for exactly the nine bucket keys as strings", () => {
    expect(j4JsonSchema).toEqual({
      type: "object",
      additionalProperties: false,
      required: [...bucketKeys],
      properties: Object.fromEntries(bucketKeys.map((key) => [key, { type: "string" }])),
    });
    expect(j4JsonSchema.required).toHaveLength(9);
  });
});

describe("parseJ4", () => {
  it("accepts nine passing lines and trims them", () => {
    const lines = nineLines();
    const padded = Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, `  ${v}\n`]));
    expect(parseJ4(message(JSON.stringify(padded)), meta)).toEqual({ ok: true, value: lines });
  });

  it("rejects a stop reason other than end_turn", () => {
    const text = JSON.stringify(nineLines());
    expect(parseJ4(message(text, "max_tokens"), meta)).toEqual({ ok: false, reason: "stop reason max_tokens" });
    expect(parseJ4(message(text, "refusal"), meta)).toEqual({ ok: false, reason: "stop reason refusal" });
    expect(parseJ4(message(text, null), meta)).toEqual({ ok: false, reason: "stop reason null" });
  });

  it("rejects a response with no text block, and skips a thinking block before the text", () => {
    const thinking = { type: "thinking", thinking: "", signature: "x" };
    expect(parseJ4({ stop_reason: "end_turn", content: [thinking] } as Parameters<typeof parseJ4>[0], meta)).toEqual({
      ok: false,
      reason: "no text block",
    });
    const both = { stop_reason: "end_turn", content: [thinking, ...message(JSON.stringify(nineLines())).content] };
    expect(parseJ4(both as Parameters<typeof parseJ4>[0], meta)).toEqual({ ok: true, value: nineLines() });
  });

  it("rejects malformed JSON", () => {
    expect(parseJ4(message('{"heavy-calm": "Calm'), meta)).toEqual({ ok: false, reason: "malformed JSON" });
  });

  it("rejects a missing bucket key, naming it", () => {
    const eight = without(nineLines(), "mid-mid");
    const result = parseJ4(message(JSON.stringify(eight)), meta);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/^mid-mid: /);
  });

  it("rejects an extra key and a non-string value", () => {
    const extra = parseJ4(message(JSON.stringify({ ...nineLines(), extra: "x" })), meta);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.reason).toContain('"extra"');
    const number = parseJ4(message(JSON.stringify({ ...nineLines(), "bright-charged": 7 })), meta);
    expect(number.ok).toBe(false);
    if (!number.ok) expect(number.reason).toMatch(/^bright-charged: /);
  });

  it("joins several schema issues with '; '", () => {
    const seven = without(nineLines(), "heavy-calm", "mid-calm");
    const result = parseJ4(message(JSON.stringify(seven)), meta);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/^heavy-calm: .+; mid-calm: /);
  });

  it("rejects a whitespace-only line as an empty line", () => {
    expect(parseJ4(message(JSON.stringify({ ...nineLines(), "mid-calm": "   " })), meta)).toEqual({
      ok: false,
      reason: "mid-calm: empty line",
    });
  });

  it("rejects the whole response for one bad bucket among nine", () => {
    expect(parseJ4(message(JSON.stringify({ ...nineLines(), "bright-mid": "Calm water near Venice." })), meta)).toEqual({
      ok: false,
      reason: "bright-mid: name not from the artist or title: Venice",
    });
  });

  it("prefixes each problem with its bucket and joins them with '; ' in bucket order", () => {
    const lines = { ...nineLines(), "bright-charged": "Calm water!", "heavy-calm": "One. Two. Three." };
    expect(parseJ4(message(JSON.stringify(lines)), meta)).toEqual({
      ok: false,
      reason: "heavy-calm: more than two sentences; bright-charged: exclamation point",
    });
  });

  it("checks names against the work it is given", () => {
    const lines = { ...nineLines(), "mid-mid": "The light by Toorop at Dusk." };
    expect(parseJ4(message(JSON.stringify(lines)), meta).ok).toBe(true);
    expect(parseJ4(message(JSON.stringify(lines)), { ...meta, artist: "Someone Else", title: "Harbor" })).toEqual({
      ok: false,
      reason: "mid-mid: name not from the artist or title: Toorop, Dusk",
    });
  });
});

describe("parseJ4 contract: recorded J4 batch results", () => {
  type Recorded = { attempt: number; batch: string; custom_id: string; result: { type: string; message: Parameters<typeof parseJ4>[0] } };
  const catalog: Work[] = JSON.parse(readFileSync(path.join(root, "data/catalog.json"), "utf8"));
  const replay = (file: string) =>
    readFileSync(path.join(root, "tests/fixtures/anthropic", file), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Recorded)
      .map((r) => {
        const w = catalog.find((c) => c.id === r.custom_id);
        if (!w) throw new Error(`${r.custom_id} is not in data/catalog.json`);
        return { ...r, work: w, parsed: parseJ4(r.result.message, w) };
      });

  it("first pilot (older prompt, no 30-word cap): every response is rejected, each problem prefixed with its bucket", () => {
    const results = replay("j4-pilot.jsonl");
    expect(results).toHaveLength(39);
    const bucketPrefix = new RegExp(`^(${bucketKeys.join("|")}): `);
    for (const r of results) {
      expect(r.result.type).toBe("succeeded");
      if (r.parsed.ok) throw new Error(`${r.work.id} was accepted`);
      for (const problem of r.parsed.reason.split("; ")) expect(problem).toMatch(bucketPrefix);
      // Every line from that prompt ran long, so the cap rejects all of them [D-034].
      expect(r.parsed.reason).toContain("words, over 30");
    }
  });

  it("third pilot (current prompt): all 24 pilot works end accepted, and the rejections are the recorded near misses", () => {
    const results = replay("j4-pilot-3.jsonl");
    expect(results).toHaveLength(27);
    const accepted = results.filter((r) => r.parsed.ok);
    expect(accepted.map((r) => r.custom_id).sort()).toEqual([...pilotIds].sort());
    for (const r of accepted) {
      if (!r.parsed.ok) continue;
      expect(Object.keys(r.parsed.value)).toEqual([...bucketKeys]);
      for (const line of Object.values(r.parsed.value)) {
        expect(line).toBe(line.trim());
        expect(line.length).toBeGreaterThan(0);
      }
      expect(copyFileSchema.safeParse({ [r.custom_id]: r.parsed.value }).success).toBe(true);
    }
    const rejected = results.filter((r) => !r.parsed.ok).map((r) => [r.attempt, r.custom_id, r.parsed.ok ? "" : r.parsed.reason]);
    expect(rejected).toEqual([
      [1, "w-0133", "heavy-mid: 32 words, over 30"],
      [1, "w-0302", "heavy-calm: 32 words, over 30"],
      [1, "w-0004", "heavy-calm: 31 words, over 30; bright-calm: 31 words, over 30"],
    ]);
  });
});

describe("worksToWrite", () => {
  const pilotWork = work({ id: pilotIds[0] });
  const other = work({ id: "w-9999" });
  const changed = work({ id: "w-9998" });
  const stored = {
    [pilotWork.id]: { inputHash: inputHash(system, pilotWork), lines: nineLines() },
    [other.id]: { inputHash: inputHash(system, other), lines: nineLines() },
    [changed.id]: { inputHash: "stale0000000", lines: nineLines() },
  };

  it("pilot mode returns only pilot works, even ones with current lines", () => {
    expect(worksToWrite([pilotWork, other], stored, system, "pilot")).toEqual([pilotWork]);
  });

  it("rest mode skips works with lines for their current input and takes missing or changed ones", () => {
    const missing = work({ id: "w-9997" });
    expect(worksToWrite([pilotWork, other, changed, missing], stored, system, "rest")).toEqual([changed, missing]);
  });

  it("rest mode re-selects every work when the system prompt changes", () => {
    expect(worksToWrite([pilotWork, other], stored, `${system} v2`, "rest")).toEqual([pilotWork, other]);
  });
});

describe("copyFor", () => {
  const a = work({ id: "w-0001", title: "First" });
  const b = work({ id: "w-0002", title: "Second" });
  const linesFor = (id: string) => Object.fromEntries(bucketKeys.map((key) => [key, `Line for ${id} in ${key}.`])) as Lines;
  const current = (...works: Work[]) => Object.fromEntries(works.map((w) => [w.id, { inputHash: inputHash(system, w), lines: linesFor(w.id) }]));

  it("maps each id to its own nine lines", () => {
    expect(copyFor([a, b], current(b, a), system)).toEqual({ "w-0001": linesFor("w-0001"), "w-0002": linesFor("w-0002") });
  });

  it("produces a file that passes copyFileSchema", () => {
    expect(copyFileSchema.safeParse(copyFor([a, b], current(a, b), system)).success).toBe(true);
  });

  it("ignores stored ids that are not in the catalog", () => {
    expect(Object.keys(copyFor([a], current(a, b), system))).toEqual(["w-0001"]);
  });

  it("gives {} for an empty catalog", () => {
    expect(copyFor([], {}, system)).toEqual({});
  });

  it("throws with the count and first id when works lack lines", () => {
    expect(() => copyFor([a, b], {}, system)).toThrow("2 works have no J4 lines for their current input, for example w-0001");
    expect(() => copyFor([a, b], current(a), system)).toThrow("1 works have no J4 lines for their current input, for example w-0002");
  });

  it("throws when a work's stored lines are for an older input", () => {
    const stale = { ...current(a, b), "w-0001": { inputHash: inputHash(`${system} old`, a), lines: linesFor("w-0001") } };
    expect(() => copyFor([a, b], stale, system)).toThrow("1 works have no J4 lines for their current input, for example w-0001");
    expect(() => copyFor([work({ ...a, valence: 0.9 }), b], current(a, b), system)).toThrow("for example w-0001");
  });

  describe("partial, until the J4 full run [D-042]", () => {
    const c = work({ id: "w-0003", title: "Third" });
    const stale = { ...current(a, c), "w-0003": { inputHash: inputHash(`${system} old`, c), lines: linesFor("w-0003") } };

    it("keeps only works with lines for their current input, in catalog order", () => {
      expect(copyFor([a, b, c], stale, system, true)).toEqual({ "w-0001": linesFor("w-0001") });
      expect(Object.keys(copyFor([c, b, a], current(a, b, c), system, true))).toEqual(["w-0003", "w-0002", "w-0001"]);
    });

    it("returns every work when all are current, and passes copyFileSchema", () => {
      const out = copyFor([a, b], current(a, b, c), system, true);
      expect(out).toEqual({ "w-0001": linesFor("w-0001"), "w-0002": linesFor("w-0002") });
      expect(copyFileSchema.safeParse(out).success).toBe(true);
    });

    it("throws when no work is current", () => {
      expect(() => copyFor([a, b], {}, system, true)).toThrow("2 works have no J4 lines for their current input, for example w-0001");
    });

    it("throws a TypeError for an empty catalog (pin: no message to name)", () => {
      expect(() => copyFor([], {}, system, true)).toThrow(TypeError);
    });
  });
});

describe("sampleLines", () => {
  const current = work({ id: "w-0001", title: "First" });
  const stale = work({ id: "w-0002", title: "Second" });
  const missing = work({ id: "w-0003", title: "Third" });
  const other = work({ id: "w-0004", title: "Fourth" });
  const linesFor = (id: string) => Object.fromEntries(bucketKeys.map((key) => [key, `Line for ${id} in ${key}.`])) as Lines;
  const stored = {
    [current.id]: { inputHash: inputHash(system, current), lines: linesFor(current.id) },
    [stale.id]: { inputHash: inputHash(`${system} old`, stale), lines: linesFor(stale.id) },
    [other.id]: { inputHash: inputHash(system, other), lines: linesFor(other.id) },
  };
  const catalog = [current, stale, missing, other];

  it("draws (work, bucket, line) picks only from works with lines for their current input", () => {
    const all = sampleLines(catalog, stored, system, 100, 7);
    expect(all.map((p) => `${p.work.id} ${p.bucket}`).sort()).toEqual(
      ["w-0001", "w-0004"].flatMap((id) => bucketKeys.map((key) => `${id} ${key}`)).sort(),
    );
    for (const p of all) expect(p.line).toBe(`Line for ${p.work.id} in ${p.bucket}.`);
  });

  it("returns n picks, the same ones for the same seed", () => {
    const five = sampleLines(catalog, stored, system, 5, 7);
    expect(five).toHaveLength(5);
    expect(sampleLines(catalog, stored, system, 5, 7)).toEqual(five);
  });
});
