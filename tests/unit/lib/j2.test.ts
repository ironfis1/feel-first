import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { claudeEffort, claudeModel, roomTypes, sizeWordToPrintSize } from "@/config/feel";
import { type J2Message, inventedHeard, j2JsonSchema, j2OutputSchema, j2Request, j2SystemPrompt, maxHeard, normalizePhrase, parseJ2 } from "@/lib/j2";

// High tier (docs/test-tiers.md). J2 mood interpreter [spec Section 4 J2, Res #7, D-037].
// No test calls Anthropic: answers are hand-built or replayed from tests/fixtures/anthropic/j2-cache.jsonl.

const root = path.resolve(import.meta.dirname, "../../..");

/** A valid J2 answer. Override fields per test. */
const answer = (overrides: Record<string, unknown> = {}) => ({
  valence: 0.2,
  arousal: -0.4,
  roomType: null,
  size: null,
  heard: ["calm"],
  ...overrides,
});

/** A Messages API response whose only block is the given text. */
const message = (text: string, stop_reason: string | null = "end_turn"): J2Message => ({ stop_reason, content: [{ type: "text", text }] });
const reply = (overrides: Record<string, unknown> = {}) => message(JSON.stringify(answer(overrides)));

describe("normalizePhrase: the cache key form", () => {
  it("lowercases, trims and collapses inner whitespace to one space", () => {
    expect(normalizePhrase("  A Slow  Sunday\t\tMorning\n\nIn The Bedroom  ")).toBe("a slow sunday morning in the bedroom");
  });

  it("collapses a non-breaking space", () => {
    expect(normalizePhrase("quiet  room")).toBe("quiet room");
  });

  it("is idempotent", () => {
    const once = normalizePhrase("  Bright,  Bold   ROOM ");
    expect(normalizePhrase(once)).toBe(once);
    expect(once).toBe("bright, bold room");
  });

  it("gives an empty string for empty or whitespace-only text", () => {
    expect(normalizePhrase("")).toBe("");
    expect(normalizePhrase(" \t\n ")).toBe("");
  });

  it("keeps punctuation", () => {
    expect(normalizePhrase("Rain, again? Yes!")).toBe("rain, again? yes!");
  });

  it("lowercases accented capitals", () => {
    expect(normalizePhrase("CAFÉ ÉTÉ")).toBe("café été");
  });

  it("lowercases a dotted capital I to two code points (pin)", () => {
    expect([...normalizePhrase("İ")]).toEqual(["i", "̇"]);
  });
});

describe("j2OutputSchema", () => {
  const ok = (overrides: Record<string, unknown>) => j2OutputSchema.safeParse(answer(overrides)).success;

  it.each(["valence", "arousal"])("accepts %s at -1 and 1 and rejects beyond", (key) => {
    expect(ok({ [key]: -1 })).toBe(true);
    expect(ok({ [key]: 1 })).toBe(true);
    expect(ok({ [key]: -1.0001 })).toBe(false);
    expect(ok({ [key]: 1.0001 })).toBe(false);
    expect(ok({ [key]: Number.NaN })).toBe(false);
    expect(ok({ [key]: Number.POSITIVE_INFINITY })).toBe(false);
    expect(ok({ [key]: "0.5" })).toBe(false);
  });

  it("accepts a null or known room type and rejects an unknown one", () => {
    expect(ok({ roomType: null })).toBe(true);
    for (const room of roomTypes) expect(ok({ roomType: room })).toBe(true);
    expect(ok({ roomType: "garage" })).toBe(false);
  });

  it("accepts a null or known size word and rejects an unknown one", () => {
    expect(ok({ size: null })).toBe(true);
    for (const size of Object.keys(sizeWordToPrintSize)) expect(ok({ size })).toBe(true);
    expect(ok({ size: "huge" })).toBe(false);
    expect(ok({ size: "30x40" })).toBe(false);
  });

  it("takes 1 to 5 heard words, none empty", () => {
    expect(maxHeard).toBe(5);
    expect(ok({ heard: [] })).toBe(false);
    expect(ok({ heard: ["a"] })).toBe(true);
    expect(ok({ heard: ["a", "b", "c", "d", "e"] })).toBe(true);
    expect(ok({ heard: ["a", "b", "c", "d", "e", "f"] })).toBe(false);
    expect(ok({ heard: [""] })).toBe(false);
  });

  it("rejects an extra key", () => {
    expect(ok({ mood: "calm" })).toBe(false);
  });

  it.each(["valence", "arousal", "roomType", "size", "heard"])("rejects a missing %s", (key) => {
    const value: Record<string, unknown> = answer();
    delete value[key];
    expect(j2OutputSchema.safeParse(value).success).toBe(false);
  });
});

describe("j2Request: the live request shape", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends the normalized phrase as the only user message", () => {
    expect(j2Request("  A Slow   SUNDAY ").messages).toEqual([{ role: "user", content: "a slow sunday" }]);
  });

  it("takes model and effort from config, with 2000 max tokens and the J2 system prompt", () => {
    const request = j2Request("calm");
    expect(request.model).toBe(claudeModel);
    expect(request.output_config.effort).toBe(claudeEffort.j2);
    expect(request.max_tokens).toBe(2000);
    expect(request.system).toBe(j2SystemPrompt);
    expect(request.output_config.format).toEqual({ type: "json_schema", schema: j2JsonSchema });
  });

  it("asks for exactly the five keys, with room and size enums from config", () => {
    expect(j2JsonSchema.additionalProperties).toBe(false);
    expect(j2JsonSchema.required).toEqual(["valence", "arousal", "roomType", "size", "heard"]);
    expect(j2JsonSchema.properties.roomType.anyOf[0].enum).toEqual([...roomTypes]);
    expect(j2JsonSchema.properties.size.anyOf[0].enum).toEqual(Object.keys(sizeWordToPrintSize));
    expect(j2JsonSchema.properties.roomType.anyOf[1]).toEqual({ type: "null" });
    expect(j2JsonSchema.properties.size.anyOf[1]).toEqual({ type: "null" });
  });

  it("states the heard limit and the fixed lists in the system prompt", () => {
    expect(j2SystemPrompt).toContain(`heard lists 1 to ${maxHeard} words copied exactly from the visitor's text`);
    expect(j2SystemPrompt).toContain(`roomType is one of ${roomTypes.map((r) => `"${r}"`).join(", ")} when`);
    expect(j2SystemPrompt).toContain('size is one of "small", "medium", "large" when');
  });

  it("never carries the API key", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-secret-123");
    expect(JSON.stringify(j2Request("calm"))).not.toContain("sk-ant-test-secret-123");
  });
});

describe("parseJ2", () => {
  it("accepts only the end_turn stop reason", () => {
    const text = JSON.stringify(answer());
    expect(parseJ2(message(text, "max_tokens"), "calm")).toEqual({ ok: false, reason: "stop reason max_tokens" });
    expect(parseJ2(message(text, "refusal"), "calm")).toEqual({ ok: false, reason: "stop reason refusal" });
    expect(parseJ2(message(text, null), "calm")).toEqual({ ok: false, reason: "stop reason null" });
  });

  it("rejects a response with no text block", () => {
    expect(parseJ2({ stop_reason: "end_turn", content: [{ type: "thinking" }] }, "calm")).toEqual({ ok: false, reason: "no text block" });
    expect(parseJ2({ stop_reason: "end_turn", content: [] }, "calm")).toEqual({ ok: false, reason: "no text block" });
  });

  it("uses the first text block when other blocks precede it", () => {
    const result = parseJ2(
      {
        stop_reason: "end_turn",
        content: [{ type: "thinking" }, { type: "text", text: JSON.stringify(answer({ valence: 0.9 })) }, { type: "text", text: "not json" }],
      },
      "calm",
    );
    expect(result).toEqual({ ok: true, value: answer({ valence: 0.9 }) });
  });

  it("rejects an empty body and malformed JSON as malformed JSON", () => {
    expect(parseJ2(message(""), "calm")).toEqual({ ok: false, reason: "malformed JSON" });
    expect(parseJ2(message('{"valence": 0.2,'), "calm")).toEqual({ ok: false, reason: "malformed JSON" });
  });

  it("lists each schema failure with its path", () => {
    expect(parseJ2(reply({ valence: 2 }), "calm")).toEqual({ ok: false, reason: "valence: Too big: expected number to be <=1" });
    expect(parseJ2(reply({ valence: 2, heard: [] }), "calm")).toEqual({
      ok: false,
      reason: "valence: Too big: expected number to be <=1; heard: Too small: expected array to have >=1 items",
    });
    expect(parseJ2(reply({ heard: [""] }), "calm")).toEqual({ ok: false, reason: "heard.0: Too small: expected string to have >=1 characters" });
  });

  it("rejects heard words the visitor did not type, naming them", () => {
    expect(parseJ2(reply({ heard: ["calm", "storm", "living room"] }), "Calm afternoon in the living room")).toEqual({
      ok: false,
      reason: "heard words not in the text: storm, living room",
    });
  });

  it("returns the parsed answer when every rule holds", () => {
    const value = answer({ valence: 1, arousal: -1, roomType: "bedroom", size: "large", heard: ["sunday", "bedroom", "large"] });
    expect(parseJ2(message(JSON.stringify(value)), "A slow Sunday in the bedroom, something LARGE")).toEqual({ ok: true, value });
  });
});

describe("parseJ2 contract against the recorded J2 cache run [Res #7, D-037]", () => {
  type Line = { phrase: string; attempt: number; message: J2Message };
  const lines = readFileSync(path.join(root, "tests/fixtures/anthropic/j2-cache.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Line);
  const cache = JSON.parse(readFileSync(path.join(root, "data/j2-cache.json"), "utf8")) as Record<string, unknown>;

  it("covers all 52 cached phrases in 53 recorded attempts", () => {
    expect(lines).toHaveLength(53);
    expect(new Set(lines.map((l) => l.phrase))).toEqual(new Set(Object.keys(cache)));
  });

  it("accepts every final attempt with exactly the committed cache entry", () => {
    const accepted = lines.map((l) => [l.phrase, parseJ2(l.message, l.phrase)] as const).filter(([, r]) => r.ok);
    expect(accepted).toHaveLength(52);
    for (const [phrase, result] of accepted) expect(result).toEqual({ ok: true, value: cache[phrase] });
  });

  it("rejected the one phrase whose first answer split a room type into an invented word", () => {
    const tries = lines.filter((l) => l.phrase === "bright and bold for the living room");
    expect(tries.map((l) => l.attempt)).toEqual([1, 2]);
    expect(parseJ2(tries[0].message, tries[0].phrase)).toEqual({ ok: false, reason: "heard words not in the text: living room" });
    expect(parseJ2(tries[1].message, tries[1].phrase).ok).toBe(true);
  });
});

describe("inventedHeard", () => {
  it("returns nothing when every heard word was typed", () => {
    expect(inventedHeard(["slow", "sunday", "bedroom"], "A slow Sunday morning in the bedroom, something large")).toEqual([]);
  });

  it("returns the words that were not typed, in order, each duplicate reported", () => {
    expect(inventedHeard(["storm", "calm", "storm", "dark"], "calm and quiet")).toEqual(["storm", "storm", "dark"]);
  });

  it("keeps a straight apostrophe inside a word", () => {
    expect(inventedHeard(["don't"], "I don't know")).toEqual([]);
    expect(inventedHeard(["don", "t"], "I don't know")).toEqual(["don", "t"]);
  });

  it("treats curly and straight apostrophes as the same on both sides", () => {
    expect(inventedHeard(["don't"], "I don’t know")).toEqual([]);
    expect(inventedHeard(["don’t"], "I don't know")).toEqual([]);
    expect(inventedHeard(["‘tis"], "'tis the season")).toEqual([]);
  });

  it("splits hyphenated text, so the parts are heard but the whole is invented (pin)", () => {
    expect(inventedHeard(["sun", "drenched"], "a sun-drenched kitchen")).toEqual([]);
    expect(inventedHeard(["sun-drenched"], "a sun-drenched kitchen")).toEqual(["sun-drenched"]);
  });

  it("keeps digits as word characters", () => {
    expect(inventedHeard(["1970s", "70s"], "a 1970s den")).toEqual(["70s"]);
  });

  it("keeps accented letters inside a word", () => {
    expect(inventedHeard(["café", "lait"], "Café au lait")).toEqual([]);
    expect(inventedHeard(["caf"], "Café au lait")).toEqual(["caf"]);
  });

  it("rejects an uppercase heard word, since only the text is normalized", () => {
    expect(inventedHeard(["Calm"], "calm")).toEqual(["Calm"]);
  });

  it("lets an empty heard word pass when the text starts with punctuation (pin)", () => {
    expect(inventedHeard([""], ", calm")).toEqual([]);
    expect(inventedHeard([""], "calm")).toEqual([""]);
  });
});
