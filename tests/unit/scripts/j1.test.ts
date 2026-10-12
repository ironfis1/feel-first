import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { claudeEffort, claudeModel } from "@/config/feel";
import { catalogFileSchema, emotionTags, metadataCatalogFileSchema, subjects } from "@/lib/schemas";
import { j1JsonSchema, j1Request, mergeJ1, parseJ1, pilotIds, promptFrom, worksToTag, type J1Fields } from "../../../scripts/j1.ts";

// High tier for parseJ1 and mergeJ1, Medium for j1Request and worksToTag (docs/test-tiers.md).
// J1 contract gate: every recorded pilot response in tests/fixtures/anthropic/j1-pilot.jsonl is replayed. No network.

const repo = path.resolve(import.meta.dirname, "../../..");
const recorded: { custom_id: string; result: { type: string; message: Message } }[] = readFileSync(
  path.join(repo, "tests/fixtures/anthropic/j1-pilot.jsonl"),
  "utf8",
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

const fields: J1Fields = {
  valence: 0.2,
  arousal: -0.4,
  tags: ["serene", "tender", "awe"],
  palette: ["#112233", "#445566", "#778899", "#aabbcc", "#ddeeff"],
  subject: "landscape",
};

type Reply = Pick<Message, "stop_reason" | "content">;
const reply = (json: unknown, overrides: Partial<Reply> = {}): Reply =>
  ({ stop_reason: "end_turn", content: [{ type: "text", text: typeof json === "string" ? json : JSON.stringify(json) }], ...overrides }) as Reply;
const parse = (overrides: Record<string, unknown>) => parseJ1(reply({ ...fields, ...overrides }));
const accepted = (overrides: Record<string, unknown>) => parse(overrides).ok;
const reasonOf = (result: ReturnType<typeof parseJ1>) => (result.ok ? "accepted" : result.reason);

describe("parseJ1 [spec Section 4 J1, Gap G1]", () => {
  it("accepts every recorded pilot response with exactly the five J1 fields", () => {
    expect(recorded).toHaveLength(24);
    for (const r of recorded) {
      const result = parseJ1(r.result.message);
      expect(result.ok, r.custom_id).toBe(true);
      if (result.ok) {
        expect(Object.keys(result.value).sort()).toEqual(["arousal", "palette", "subject", "tags", "valence"]);
        const text = r.result.message.content.find((b) => b.type === "text");
        expect(result.value).toEqual(JSON.parse(text?.type === "text" ? text.text : ""));
      }
    }
  });

  it("returns the parsed fields for a valid response", () => {
    expect(parseJ1(reply(fields))).toEqual({ ok: true, value: fields });
  });

  it.each(["max_tokens", "refusal", null] as const)("rejects stop reason %s", (stop) => {
    expect(parseJ1(reply(fields, { stop_reason: stop }))).toEqual({ ok: false, reason: `stop reason ${stop}` });
  });

  it("rejects a response with no text block", () => {
    expect(parseJ1(reply(fields, { content: [] }))).toEqual({ ok: false, reason: "no text block" });
    const thinkingOnly = [{ type: "thinking", thinking: "hm", signature: "s" }] as Reply["content"];
    expect(parseJ1(reply(fields, { content: thinkingOnly }))).toEqual({ ok: false, reason: "no text block" });
  });

  it("skips a thinking block before the text block", () => {
    const content = [{ type: "thinking", thinking: "{}", signature: "s" }, { type: "text", text: JSON.stringify(fields) }] as Reply["content"];
    expect(parseJ1(reply(fields, { content }))).toEqual({ ok: true, value: fields });
  });

  it("rejects malformed JSON", () => {
    expect(parseJ1(reply('{"valence": 0.2,'))).toEqual({ ok: false, reason: "malformed JSON" });
  });

  it("rejects an extra key", () => {
    expect(reasonOf(parse({ mood: "calm" }))).toMatch(/^: .*mood/);
  });

  it("rejects a missing key, naming it", () => {
    const { subject, ...rest } = fields;
    expect(subject).toBe("landscape");
    expect(reasonOf(parseJ1(reply(rest)))).toMatch(/^subject: /);
  });

  it.each([-1, 1, 0])("accepts valence and arousal of %s", (value) => {
    expect(accepted({ valence: value, arousal: value })).toBe(true);
  });

  it.each([1.0001, -1.0001, Number.NaN, "0.5"])("rejects valence %s", (value) => {
    // NaN does not survive JSON, so it reaches the schema as null.
    expect(reasonOf(parse({ valence: value }))).toMatch(/^valence: /);
  });

  it.each([1.0001, -1.0001, "0.5"])("rejects arousal %s", (value) => {
    expect(reasonOf(parse({ arousal: value }))).toMatch(/^arousal: /);
  });

  it("accepts three to five tags and rejects two or six", () => {
    expect(accepted({ tags: ["awe", "tense"] })).toBe(false);
    expect(accepted({ tags: ["awe", "tense", "serene"] })).toBe(true);
    expect(accepted({ tags: ["awe", "tense", "serene", "joyful", "playful"] })).toBe(true);
    expect(reasonOf(parse({ tags: ["awe", "tense", "serene", "joyful", "playful", "wistful"] }))).toMatch(/^tags: /);
  });

  it("rejects duplicate tags", () => {
    expect(reasonOf(parse({ tags: ["awe", "awe", "serene"] }))).toBe("tags: tags must be unique");
  });

  it("rejects a tag or subject outside the fixed twelve", () => {
    expect(reasonOf(parse({ tags: ["awe", "tense", "happy"] }))).toMatch(/^tags\.2: /);
    expect(reasonOf(parse({ subject: "portrait" }))).toMatch(/^subject: /);
  });

  it("accepts five colors in short or long hex and rejects four or six", () => {
    expect(accepted({ palette: ["#abc", "#aabbcc", "#ABC", "#AABBCC", "#012"] })).toBe(true);
    expect(reasonOf(parse({ palette: ["#abc", "#abc", "#abc", "#abc"] }))).toMatch(/^palette: /);
    expect(reasonOf(parse({ palette: ["#abc", "#abc", "#abc", "#abc", "#abc", "#abc"] }))).toMatch(/^palette: /);
  });

  it.each(["red", "#abcd", "#gggggg", "abc", "#aabbcc0"])("rejects the color %s at its position", (color) => {
    expect(reasonOf(parse({ palette: ["#abc", "#abc", "#abc", color, "#abc"] }))).toMatch(/^palette\.3: /);
  });

  it("joins several issues with '; '", () => {
    const reason = reasonOf(parse({ valence: 2, subject: "portrait" }));
    expect(reason.split("; ").map((part) => part.split(":")[0])).toEqual(["valence", "subject"]);
  });
});

describe("j1Request", () => {
  const work = { id: "w-0042", title: "Harbor", artist: "A. Painter", date: "1883", thumbUrl: "/thumbs/w-0042.webp" };
  const request = j1Request(work, "BASE64DATA", "The prompt.");

  it("is keyed by the work id and sends the configured model, effort and prompt", () => {
    expect(request.custom_id).toBe("w-0042");
    expect(request.params.model).toBe(claudeModel);
    expect(request.params.system).toBe("The prompt.");
    expect(request.params.output_config).toEqual({ effort: claudeEffort.j1, format: { type: "json_schema", schema: j1JsonSchema } });
  });

  it("sends the thumbnail as base64 webp, then the title, artist and date", () => {
    expect(request.params.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/webp", data: "BASE64DATA" } },
          { type: "text", text: "Title: Harbor\nArtist: A. Painter\nDate: 1883" },
        ],
      },
    ]);
  });

  it("asks for exactly the five fields, with tags and subject from the fixed lists", () => {
    expect(j1JsonSchema.additionalProperties).toBe(false);
    expect(j1JsonSchema.required).toEqual(["valence", "arousal", "tags", "palette", "subject"]);
    expect(j1JsonSchema.properties.tags.items.enum).toEqual([...emotionTags]);
    expect(j1JsonSchema.properties.subject.enum).toEqual([...subjects]);
  });

  it("reads the prompt from the j1-prompt markers", () => {
    expect(promptFrom("<!-- j1-prompt:start -->\nTag it.\n<!-- j1-prompt:end -->\n<!-- j4-prompt:start -->\nWrite.\n<!-- j4-prompt:end -->")).toBe("Tag it.");
    expect(() => promptFrom("<!-- j4-prompt:start -->\nWrite.\n<!-- j4-prompt:end -->")).toThrow("j1-prompt");
  });
});

const ids = (list: { id: string }[]) => list.map((w) => w.id);
const stored = (entries: Record<string, string>, extra: Partial<J1Fields> = {}) =>
  Object.fromEntries(Object.entries(entries).map(([id, promptHash]) => [id, { promptHash, fields: { ...fields, ...extra } }]));

describe("worksToTag", () => {
  const catalog = [{ id: "w-0004" }, { id: "w-0005" }, { id: "w-0017" }, { id: "w-0018" }];

  it("pilot mode returns exactly the pilot works, ignoring stored results", () => {
    expect(ids(worksToTag(catalog, stored({ "w-0004": "h1", "w-0017": "h1" }), "h1", "pilot"))).toEqual(["w-0004", "w-0017"]);
  });

  it("rest mode returns works with no result or a result from another prompt", () => {
    const results = stored({ "w-0004": "h1", "w-0005": "old", "w-0018": "h1" });
    expect(ids(worksToTag(catalog, results, "h1", "rest"))).toEqual(["w-0005", "w-0017"]);
  });

  it("pilotIds holds 24 unique ids, 12 per lane, all in the committed catalog", () => {
    const catalogJson: { id: string; lane: string }[] = JSON.parse(readFileSync(path.join(repo, "data/catalog.json"), "utf8"));
    const lanes = new Map(catalogJson.map((w) => [w.id, w.lane]));
    expect(new Set(pilotIds).size).toBe(24);
    expect(pilotIds.filter((id) => lanes.get(id) === "fine-art")).toHaveLength(12);
    expect(pilotIds.filter((id) => lanes.get(id) === "poster")).toHaveLength(12);
  });
});

describe("mergeJ1", () => {
  const metadata: Record<string, unknown>[] = JSON.parse(readFileSync(path.join(repo, "tests/fixtures/catalog.metadata.json"), "utf8"));
  const allStored = (hash: string) =>
    Object.fromEntries(metadata.map((w, i) => [w.id as string, { promptHash: hash, fields: { ...fields, valence: i / 100 } }]));

  it("gives each work exactly its own fields, keeping order and metadata, and passes catalogFileSchema", () => {
    expect(metadataCatalogFileSchema.safeParse(metadata).success).toBe(true);
    const merged = mergeJ1(metadata as { id: string }[], allStored("h1"), "h1");
    expect(ids(merged)).toEqual(ids(metadata as { id: string }[]));
    merged.forEach((w, i) => expect(w).toEqual({ ...metadata[i], ...fields, valence: i / 100 }));
    expect(catalogFileSchema.safeParse(merged).success).toBe(true);
  });

  it("throws with the count and first missing id when works lack a result or hold another prompt's", () => {
    const results = allStored("h1");
    delete results["fx-0003"];
    results["fx-0007"].promptHash = "old";
    expect(() => mergeJ1(metadata as { id: string }[], results, "h1")).toThrow(
      "2 works have no J1 result from the current prompt, for example fx-0003",
    );
  });

  it("replaces J1 fields a work already has", () => {
    const merged = mergeJ1([{ id: "a", title: "T", valence: 0.9, tags: ["joyful", "playful", "awe"] }], stored({ a: "h1" }), "h1");
    expect(merged).toEqual([{ id: "a", title: "T", ...fields }]);
  });

  it("ignores stored ids not in the catalog", () => {
    expect(mergeJ1([{ id: "a" }], stored({ a: "h1", zzz: "h1" }), "h1")).toEqual([{ id: "a", ...fields }]);
  });

  it("returns [] for an empty catalog", () => {
    expect(mergeJ1([], {}, "h1")).toEqual([]);
  });

  it("does not change the input catalog", () => {
    const catalog = [{ id: "a", title: "T" }];
    mergeJ1(catalog, stored({ a: "h1" }), "h1");
    expect(catalog).toEqual([{ id: "a", title: "T" }]);
  });
});
