import { readFileSync } from "node:fs";
import path from "node:path";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { describe, expect, it } from "vitest";
import { claudeEffort, claudeModel, roomTypes } from "@/config/feel";
import { bucketKeys, bucketOf } from "@/lib/buckets";
import { j2WordmapFileSchema } from "@/lib/schemas";
import {
  type J2Draft,
  draftProblems,
  j2DraftJsonSchema,
  j2DraftRequest,
  minWordsPerBucket,
  parseJ2Draft,
  phraseRange,
  promptFrom,
  wordmapFile,
  wordRange,
} from "../../../scripts/j2-draft.ts";

// High tier for wordmapFile, Medium for draftProblems and parseJ2Draft (docs/test-tiers.md). J2 draft [D-028, D-037, D-038].
// No test calls Anthropic: the draft response is replayed from tests/fixtures/anthropic/j2-draft.jsonl.

const root = path.resolve(import.meta.dirname, "../../..");
const video = "a slow sunday morning in the bedroom, something large";

/** Letters-only name for index i, so generated words pass the word-map key rule. */
const letters = (i: number) => [Math.floor(i / 676), Math.floor(i / 26) % 26, i % 26].map((n) => String.fromCharCode(97 + n)).join("");

/** A point inside each bucket. */
const centre = { heavy: -0.8, bright: 0.8, calm: -0.8, charged: 0.8, mid: 0 } as const;
const pointOf = (key: string) => {
  const [v, a] = key.split("-") as [keyof typeof centre, keyof typeof centre];
  return { valence: centre[v], arousal: centre[a] };
};

/** Mood words: counts[i] words in bucketKeys[i]. */
const moodWords = (counts: readonly number[]) => {
  let n = 0;
  return bucketKeys.flatMap((key, b) => Array.from({ length: counts[b] }, () => ({ word: `mood${letters(n++)}`, ...pointOf(key) })));
};
const counts140 = [16, 16, 16, 16, 16, 15, 15, 15, 15];

/** A draft that passes every rule, with n phrases and the given bucket counts. */
const draft = (phraseCount = 50, counts: readonly number[] = counts140): J2Draft => ({
  phrases: [video, ...Array.from({ length: phraseCount - 1 }, (_, i) => `phrase ${letters(i)}`)],
  words: moodWords(counts),
  roomWords: [
    { word: "lounge", roomType: "living room" },
    { word: "bedroom", roomType: "bedroom" },
    { word: "office", roomType: "office" },
    { word: "kitchen", roomType: "kitchen" },
    { word: "nursery", roomType: "nursery" },
    { word: "hallway", roomType: "entry" },
  ],
  sizeWords: [
    { word: "small", size: "small" },
    { word: "medium", size: "medium" },
    { word: "large", size: "large" },
    { word: "big", size: "large" },
  ],
});

const message = (text: string, stop_reason: string | null = "end_turn") =>
  ({ stop_reason, content: [{ type: "text", text, citations: null }] }) as unknown as Message;

describe("j2DraftRequest gate: request shape only", () => {
  const request = j2DraftRequest("SYSTEM TEXT", "  A Slow SUNDAY Morning  ");

  it("asks once, as j2-draft, with config model and J2 effort and 16000 max tokens", () => {
    expect(request.custom_id).toBe("j2-draft");
    expect(request.params.model).toBe(claudeModel);
    expect(request.params.max_tokens).toBe(16000);
    expect(request.params.system).toBe("SYSTEM TEXT");
    expect(request.params.output_config).toEqual({ effort: claudeEffort.j2, format: { type: "json_schema", schema: j2DraftJsonSchema } });
  });

  it("names the fixed lists and the normalized video phrase in the user turn", () => {
    expect(request.params.messages).toEqual([
      {
        role: "user",
        content: "Room types: living room, bedroom, office, kitchen, nursery, entry.\nSize words: small, medium, large.\nThe demo video phrase: a slow sunday morning",
      },
    ]);
  });

  it("reads the prompt from the j2-draft-prompt markers", () => {
    const markdown = "<!-- j2-draft-prompt:start -->\nDraft it.\n<!-- j2-draft-prompt:end -->\n<!-- j4-prompt:start -->\nWrite.\n<!-- j4-prompt:end -->";
    expect(promptFrom(markdown)).toBe("Draft it.");
    expect(() => promptFrom("<!-- j4-prompt:start -->\nWrite.\n<!-- j4-prompt:end -->")).toThrow("j2-draft-prompt");
  });

  it("enumerates the room types and size words in the JSON schema", () => {
    expect(j2DraftJsonSchema.required).toEqual(["phrases", "words", "roomWords", "sizeWords"]);
    expect(j2DraftJsonSchema.properties.roomWords.items.properties.roomType.enum).toEqual([...roomTypes]);
    expect(j2DraftJsonSchema.properties.sizeWords.items.properties.size.enum).toEqual(["small", "medium", "large"]);
  });
});

describe("wordmapFile [D-028]", () => {
  it("maps mood, room and size words to their sections", () => {
    const file = wordmapFile({
      phrases: [],
      words: [
        { word: "storm", valence: -0.6, arousal: 0.9 },
        { word: "don't", valence: -1, arousal: 1 },
      ],
      roomWords: [{ word: "den", roomType: "living room" }],
      sizeWords: [{ word: "tiny", size: "small" }],
    });
    expect(file).toEqual({
      words: { storm: { valence: -0.6, arousal: 0.9 }, "don't": { valence: -1, arousal: 1 } },
      roomTypes: { den: "living room" },
      sizes: { tiny: "small" },
    });
    expect(j2WordmapFileSchema.safeParse(file).success).toBe(true);
  });

  it("keeps the last of two entries for the same word (pin; draftProblems flags the repeat)", () => {
    const file = wordmapFile({
      ...draft(),
      words: [
        { word: "storm", valence: -0.6, arousal: 0.9 },
        { word: "storm", valence: 0.1, arousal: 0.2 },
      ],
    });
    expect(file.words).toEqual({ storm: { valence: 0.1, arousal: 0.2 } });
  });

  it.each(["Storm", "sun-lit", "70s", "two words"])("throws on the word %j", (word) => {
    expect(() => wordmapFile({ ...draft(), words: [{ word, valence: 0, arousal: 0 }] })).toThrow("one lowercase word");
  });

  it("throws on a valence or arousal outside -1 to 1", () => {
    expect(() => wordmapFile({ ...draft(), words: [{ word: "glow", valence: 1.01, arousal: 0 }] })).toThrow();
    expect(() => wordmapFile({ ...draft(), words: [{ word: "glow", valence: 0, arousal: -1.01 }] })).toThrow();
  });

  it("throws on an unknown room type", () => {
    const bad = { ...draft(), roomWords: [{ word: "garage", roomType: "garage" }] } as unknown as J2Draft;
    expect(() => wordmapFile(bad)).toThrow();
  });
});

describe("draftProblems [docs/ai-jobs.md J2, D-037]", () => {
  it("passes a draft that keeps every rule", () => {
    expect([phraseRange, wordRange, minWordsPerBucket]).toEqual([[45, 55], [140, 160], 8]);
    expect(draftProblems(draft(), video)).toEqual([]);
  });

  it("flags an em dash anywhere", () => {
    const d = draft();
    d.phrases[1] = `rain ${String.fromCharCode(0x2014)} again`;
    expect(draftProblems(d, video)).toEqual(["em dash"]);
  });

  it("flags phrases that are not normalized", () => {
    const d = draft();
    d.phrases[1] = "Rain  Again";
    expect(draftProblems(d, video)).toEqual(["phrases not in normalized lowercase form"]);
  });

  it("flags duplicate phrases", () => {
    const d = draft();
    d.phrases[2] = d.phrases[1];
    expect(draftProblems(d, video)).toEqual(["duplicate phrases"]);
  });

  it("allows 45 to 55 phrases", () => {
    expect(draftProblems(draft(44), video)).toEqual(["44 phrases, not 45 to 55"]);
    expect(draftProblems(draft(45), video)).toEqual([]);
    expect(draftProblems(draft(55), video)).toEqual([]);
    expect(draftProblems(draft(56), video)).toEqual(["56 phrases, not 45 to 55"]);
  });

  it("requires the video phrase, matched after normalization", () => {
    expect(draftProblems(draft(), "  A Slow Sunday  Morning in the Bedroom, something LARGE ")).toEqual([]);
    expect(draftProblems(draft(), "a slow sunday morning")).toEqual(["video phrase missing"]);
  });

  it("allows 140 to 160 mood words", () => {
    expect(draftProblems(draft(50, [16, 16, 16, 16, 15, 15, 15, 15, 15]), video)).toEqual(["139 mood words, not 140 to 160"]);
    expect(draftProblems(draft(50, counts140), video)).toEqual([]);
    expect(draftProblems(draft(50, [18, 18, 18, 18, 18, 18, 18, 17, 17]), video)).toEqual([]);
    expect(draftProblems(draft(50, [19, 18, 18, 18, 18, 18, 18, 17, 17]), video)).toEqual(["161 mood words, not 140 to 160"]);
  });

  it("flags duplicate mood words", () => {
    const d = draft();
    d.words[1] = { ...d.words[1], word: d.words[0].word };
    expect(draftProblems(d, video)).toEqual(["duplicate mood words", `words in more than one list or repeated: ${d.words[0].word}`]);
  });

  it("needs 8 mood words in each bucket, naming each thin bucket with its count", () => {
    expect(draftProblems(draft(50, [8, 17, 17, 17, 17, 16, 16, 16, 16]), video)).toEqual([]);
    expect(draftProblems(draft(50, [7, 17, 17, 17, 17, 17, 16, 16, 16]), video)).toEqual(["fewer than 8 mood words in heavy-calm (7)"]);
    expect(draftProblems(draft(50, [17, 17, 17, 17, 17, 17, 17, 7, 14]), video)).toEqual(["fewer than 8 mood words in mid-charged (7)"]);
    expect(draftProblems(draft(50, [7, 7, 18, 18, 18, 18, 18, 18, 18]), video)).toEqual(["fewer than 8 mood words in heavy-calm (7), mid-calm (7)"]);
  });

  it("counts a word at exactly -1 or 1 but not one beyond", () => {
    const edge = draft(50, [8, 17, 17, 17, 17, 16, 16, 16, 16]);
    edge.words[0] = { ...edge.words[0], valence: -1, arousal: -1 };
    expect(bucketOf(-1, -1)).toBe("heavy-calm");
    expect(draftProblems(edge, video)).toEqual([]);

    for (const outside of [{ valence: -1.5 }, { arousal: -1.01 }]) {
      const d = draft(50, [8, 17, 17, 17, 17, 16, 16, 16, 16]);
      d.words[0] = { ...d.words[0], ...outside };
      const problems = draftProblems(d, video);
      expect(problems[0]).toBe("fewer than 8 mood words in heavy-calm (7)");
      expect(problems[1]).toMatch(/^word map schema: /);
      expect(problems).toHaveLength(2);
    }
  });

  it("needs a word for every room type", () => {
    const d = draft();
    d.roomWords = d.roomWords.filter((w) => w.roomType !== "nursery" && w.roomType !== "entry");
    expect(draftProblems(d, video)).toEqual(["no word for room types: nursery, entry"]);
  });

  it("needs each size word mapped to its own size", () => {
    const missing = draft();
    missing.sizeWords = missing.sizeWords.filter((w) => w.word !== "small");
    expect(draftProblems(missing, video)).toEqual(["size words missing: small"]);

    const crossed = draft();
    crossed.sizeWords = crossed.sizeWords.map((w) => (w.word === "medium" ? { word: "medium", size: "large" } : w));
    expect(draftProblems(crossed, video)).toEqual(["size words missing: medium"]);

    const renamed = draft();
    renamed.sizeWords = renamed.sizeWords.map((w) => (w.word === "small" ? { word: "tiny", size: "small" } : w));
    expect(draftProblems(renamed, video)).toEqual(["size words missing: small"]);
  });

  it("lists several missing size words and several repeated words, comma-separated", () => {
    const d = draft();
    d.sizeWords = d.sizeWords.filter((w) => w.word !== "small" && w.word !== "medium");
    d.roomWords.push({ word: "big", roomType: "office" }, { word: "large", roomType: "office" });
    expect(draftProblems(d, video)).toEqual(["size words missing: small, medium", "words in more than one list or repeated: large, big"]);
  });

  it("flags a word in two lists, once", () => {
    const d = draft();
    d.roomWords.push({ word: "big", roomType: "office" });
    d.roomWords.push({ word: "big", roomType: "office" });
    expect(draftProblems(d, video)).toEqual(["words in more than one list or repeated: big"]);
  });

  it("reports a word-map schema error cut to 300 characters", () => {
    const d = draft();
    d.words[0] = { ...d.words[0], word: "Moody" };
    let thrown = "";
    try {
      wordmapFile(d);
    } catch (error) {
      thrown = (error as Error).message;
    }
    expect(thrown.length).toBeGreaterThan(300);
    expect(draftProblems(d, video)).toEqual([`word map schema: ${thrown.slice(0, 300)}`]);
  });

  it("throws a TypeError on a null list member when called directly (pin; parseJ2Draft checks the shape first)", () => {
    const d = draft();
    (d.words as unknown[])[0] = null;
    expect(() => draftProblems(d, video)).toThrow(TypeError);
  });
});

describe("parseJ2Draft", () => {
  const body = JSON.stringify(draft());

  it("rejects any stop reason but end_turn", () => {
    expect(parseJ2Draft(message(body, "max_tokens"), video)).toEqual({ ok: false, reason: "stop reason max_tokens" });
    expect(parseJ2Draft(message(body, null), video)).toEqual({ ok: false, reason: "stop reason null" });
  });

  it("rejects a response with no text block", () => {
    const thinkingOnly = { stop_reason: "end_turn", content: [{ type: "thinking", thinking: "", signature: "" }] } as unknown as Message;
    expect(parseJ2Draft(thinkingOnly, video)).toEqual({ ok: false, reason: "no text block" });
  });

  it("reads the first text block after a thinking block", () => {
    const withThinking = {
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "", signature: "" },
        { type: "text", text: body, citations: null },
      ],
    } as unknown as Message;
    expect(parseJ2Draft(withThinking, video)).toEqual({ ok: true, value: draft() });
  });

  it("rejects malformed JSON", () => {
    expect(parseJ2Draft(message('{"phrases": ['), video)).toEqual({ ok: false, reason: "malformed JSON" });
  });

  it("rejects a null body with the shape reason, not a crash", () => {
    expect(parseJ2Draft(message("null"), video)).toEqual({ ok: false, reason: ": Invalid input: expected object, received null" });
  });

  it("names each absent list by path", () => {
    expect(parseJ2Draft(message("{}"), video)).toEqual({
      ok: false,
      reason:
        "phrases: Invalid input: expected array, received undefined; words: Invalid input: expected array, received undefined; " +
        "roomWords: Invalid input: expected array, received undefined; sizeWords: Invalid input: expected array, received undefined",
    });
  });

  it("rejects malformed list members by path instead of throwing", () => {
    const bad = { ...draft(), phrases: [1], words: [null], roomWords: [{ word: "den", roomType: "garage" }] };
    expect(parseJ2Draft(message(JSON.stringify(bad)), video)).toEqual({
      ok: false,
      reason:
        "phrases.0: Invalid input: expected string, received number; words.0: Invalid input: expected object, received null; " +
        'roomWords.0.roomType: Invalid option: expected one of "living room"|"bedroom"|"office"|"kitchen"|"nursery"|"entry"',
    });
  });

  it("rejects an extra key in a list member", () => {
    const bad = { ...draft(), sizeWords: [{ word: "small", size: "small", note: "x" }] };
    expect(parseJ2Draft(message(JSON.stringify(bad)), video)).toEqual({ ok: false, reason: 'sizeWords.0: Unrecognized key: "note"' });
  });

  it("joins rule problems with a semicolon", () => {
    expect(parseJ2Draft(message(JSON.stringify(draft(44))), "a quiet attic")).toEqual({
      ok: false,
      reason: "44 phrases, not 45 to 55; video phrase missing",
    });
  });

  it("returns the draft when every rule holds", () => {
    expect(parseJ2Draft(message(body), video)).toEqual({ ok: true, value: draft() });
  });
});

describe("J2 draft contract against the recorded batch result [D-037, D-038]", () => {
  const line = JSON.parse(readFileSync(path.join(root, "tests/fixtures/anthropic/j2-draft.jsonl"), "utf8")) as {
    custom_id: string;
    result: { type: string; message: Message };
  };
  // Parsed inside each test, so a broken parser fails a test instead of the whole file.
  const parse = () => parseJ2Draft(line.result.message, video);

  it("accepts the recorded draft for the video phrase", () => {
    expect(line.custom_id).toBe("j2-draft");
    const parsed = parse();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect([parsed.value.phrases.length, parsed.value.words.length, parsed.value.roomWords.length, parsed.value.sizeWords.length]).toEqual([52, 147, 21, 12]);
    expect(parsed.value.phrases[0]).toBe(video);
  });

  it("rejects the same draft for a phrase it does not contain", () => {
    expect(parseJ2Draft(line.result.message, "a phrase nobody wrote")).toEqual({ ok: false, reason: "video phrase missing" });
  });

  it("produces exactly the committed data/j2-wordmap.json", () => {
    const parsed = parse();
    if (!parsed.ok) throw new Error(parsed.reason);
    const committed = JSON.parse(readFileSync(path.join(root, "data/j2-wordmap.json"), "utf8"));
    expect(wordmapFile(parsed.value)).toEqual(committed);
  });
});
