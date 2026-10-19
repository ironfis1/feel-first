import { readFileSync } from "node:fs";
import path from "node:path";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { claudeEffort, claudeModel } from "@/config/feel";
import { type BucketKey, bucketKeys } from "@/lib/buckets";
import { catalogFileSchema, findingKinds, signalsFileSchema, signalsSeedFileSchema } from "@/lib/schemas";
import { bucketFigures, computeDrafts, type Draft, draftText, j8JsonSchema, j8Request, minGroupViews, parseJ8, segmentWords, signalsFile, withThousands } from "../../../scripts/j8.ts";
import { validWork } from "../../fixtures/works.ts";

// High tier (docs/test-tiers.md): bucketFigures, computeDrafts, parseJ8, signalsFile. Medium: draftText, j8Request.
// The contract tests replay tests/fixtures/anthropic/j8.jsonl; no model is called.

type Work = z.infer<typeof catalogFileSchema>[number];
type SeedFile = z.infer<typeof signalsSeedFileSchema>;
type Session = SeedFile["sessions"][number];
type AddLine = Session["adds"][number];

const repo = (file: string) => path.resolve(import.meta.dirname, "../../..", file);

const work = (id: string, lane: Work["lane"], subject: Work["subject"], valence: number, arousal: number) =>
  validWork({ id, lane, subject, valence, arousal }) as unknown as Work;

const add = (id: string, material: AddLine["material"] = "paper", frame: AddLine["frame"] = null): AddLine => ({ id, size: "18x24", material, frame });

const sessions = (n: number, bucket: BucketKey, views: string[], adds: AddLine[] = []): Session[] =>
  Array.from({ length: n }, () => ({ bucket, views: [...views], adds: adds.map((line) => ({ ...line })) }));

const seedOf = (...groups: Session[][]): SeedFile => {
  const all = groups.flat();
  return { seed: 20261008, sessionCount: all.length, sessions: all };
};

// One fine-art filler work at the center of each bucket, plus three posters and a fine-art space work.
const center = { heavy: -0.6, mid: 0, bright: 0.6, calm: -0.6, charged: 0.6 } as Record<string, number>;
const fillers = bucketKeys.map((k) => {
  const [v, a] = k.split("-");
  return work(`f-${k}`, "fine-art", "landscape", center[v], center[a]);
});
const catalog: Work[] = [
  ...fillers,
  work("ps1", "poster", "space", 0, 0), // mid-mid
  work("ps2", "poster", "space", 0.6, -0.6), // bright-calm
  work("pp1", "poster", "place", -0.6, -0.6), // heavy-calm
  work("fa1", "fine-art", "space", 0, 0.6), // mid-charged; a fine-art "space" work the rack must ignore
];
const others: BucketKey[] = ["mid-calm", "heavy-mid", "bright-mid", "heavy-charged", "mid-charged", "bright-charged"];
const filler = others.flatMap((k) => [...sessions(10, k, [`f-${k}`], [add(`f-${k}`)]), ...sessions(10, k, [`f-${k}`])]);

/**
 * The hand-computed dataset. Totals: 820 sessions, 1130 views, 350 adds, 180 framed adds.
 * bright-calm: 390 sessions viewing ps2, 40 add it framed in brass.
 * mid-mid: 300 sessions viewing ps1 and fa1; 80 add ps1 framed white, 60 framed black, 100 add fa1 on paper.
 * heavy-calm: 10 sessions viewing pp1 and its filler, each adding pp1 on canvas.
 * Six other buckets: 20 sessions each viewing their filler, 10 adding it on paper.
 */
const brightCalm = [...sessions(40, "bright-calm", ["ps2"], [add("ps2", "framed", "brass")]), ...sessions(350, "bright-calm", ["ps2"])];
const midMid = [
  ...sessions(80, "mid-mid", ["ps1", "fa1"], [add("ps1", "framed", "white")]),
  ...sessions(60, "mid-mid", ["ps1", "fa1"], [add("ps1", "framed", "black")]),
  ...sessions(100, "mid-mid", ["ps1", "fa1"], [add("fa1")]),
  ...sessions(60, "mid-mid", ["ps1", "fa1"]),
];
const heavyCalm = sessions(10, "heavy-calm", ["pp1", "f-heavy-calm"], [add("pp1", "canvas")]);
const main = seedOf(brightCalm, midMid, heavyCalm, filler);
const drafts = computeDrafts(main, catalog);

// The committed data, read with fs (an import of data/catalog.json is aliased to the fixture).
const realCatalog = catalogFileSchema.parse(JSON.parse(readFileSync(repo("data/catalog.json"), "utf8")));
const realSeed = signalsSeedFileSchema.parse(JSON.parse(readFileSync(repo("data/signals-seed.json"), "utf8")));
const realDrafts = computeDrafts(realSeed, realCatalog);

describe("bucketFigures [D-029]", () => {
  it("tallies sessions, views, adds and works per bucket", () => {
    expect(bucketFigures(main, catalog)).toEqual({
      "heavy-calm": { sessions: 10, views: 20, adds: 10, works: 2 },
      "mid-calm": { sessions: 20, views: 20, adds: 10, works: 1 },
      "bright-calm": { sessions: 390, views: 390, adds: 40, works: 2 },
      "heavy-mid": { sessions: 20, views: 20, adds: 10, works: 1 },
      "mid-mid": { sessions: 300, views: 600, adds: 240, works: 2 },
      "bright-mid": { sessions: 20, views: 20, adds: 10, works: 1 },
      "heavy-charged": { sessions: 20, views: 20, adds: 10, works: 1 },
      "mid-charged": { sessions: 20, views: 20, adds: 10, works: 2 },
      "bright-charged": { sessions: 20, views: 20, adds: 10, works: 1 },
    });
  });

  it("places works on a cut point in the middle third, keeps all nine keys, and counts lines not unique works", () => {
    const edge = [
      work("c1", "fine-art", "landscape", -1 / 3, 1 / 3),
      work("c2", "fine-art", "landscape", 1 / 3, -1 / 3),
      work("c3", "fine-art", "landscape", -0.34, 0.34),
      work("c4", "fine-art", "landscape", 0.34, -0.34),
    ];
    const file = seedOf(sessions(2, "mid-mid", ["c1", "c2"], [add("c1")]));
    const figures = bucketFigures(file, edge);
    expect(Object.keys(figures)).toEqual(bucketKeys);
    expect(figures["mid-mid"]).toEqual({ sessions: 2, views: 4, adds: 2, works: 2 });
    expect(figures["heavy-charged"]).toEqual({ sessions: 0, views: 0, adds: 0, works: 1 });
    expect(figures["bright-calm"]).toEqual({ sessions: 0, views: 0, adds: 0, works: 1 });
    expect(figures["heavy-calm"]).toEqual({ sessions: 0, views: 0, adds: 0, works: 0 });
    expect(bucketKeys.reduce((n, k) => n + figures[k].sessions, 0)).toBe(file.sessionCount);
  });
});

describe("computeDrafts [Gap G27, D-029]", () => {
  it("computes the four findings by hand on a small dataset", () => {
    expect(drafts).toEqual([
      {
        kind: "rack-candidate",
        bucket: "mid-mid",
        group: "space posters",
        // 140/300 against 350/1130: lift 1.5067, pick rate 46.67, catalog 30.97. Only ps1 and ps2 are space posters.
        figures: { lift: 1.5, groupPickRatePct: 46.7, catalogPickRatePct: 31, groupViews: 300, groupAdds: 140, groupWorks: 2, totalSessions: 820 },
      },
      {
        kind: "attach-pattern",
        bucket: "mid-mid",
        group: "white frame",
        // 140 framed of 240 segment adds, 180 framed of 350 adds, 80 white of 140 framed.
        figures: { framedSharePct: 58.3, catalogFramedSharePct: 51.4, topFinishSharePct: 57.1, segmentAdds: 240, totalSessions: 820 },
      },
      {
        kind: "under-converting",
        bucket: "bright-calm",
        // 40/390 = 10.26 percent; lift 0.3311.
        figures: { pickRatePct: 10.3, catalogPickRatePct: 31, lift: 0.33, sessions: 390, totalSessions: 820 },
      },
      {
        kind: "licensing-gap",
        bucket: "bright-calm",
        // 2 works for 390 sessions = 5.128 per 1000; 13 works for 820 sessions = 15.85 per 1000.
        figures: { works: 2, sessions: 390, worksPer1000Sessions: 5.1, perSessions: 1000, catalogWorksPer1000Sessions: 15.9, totalSessions: 820 },
      },
    ]);
  });

  it("gives every draft the dataset size, in findingKinds order, with finite figures", () => {
    expect(drafts.map((d) => d.kind)).toEqual([...findingKinds]);
    for (const d of [...drafts, ...realDrafts]) {
      expect(Object.values(d.figures).every(Number.isFinite)).toBe(true);
    }
    expect(drafts.every((d) => d.figures.totalSessions === 820)).toBe(true);
    expect(realDrafts.every((d) => d.figures.totalSessions === 20_000)).toBe(true);
  });

  describe("rack candidate", () => {
    it("needs at least 300 views of a group: 299 drops it", () => {
      expect(minGroupViews).toBe(300);
      // One mid-mid session views only fa1, leaving ps1 with 299 views: the next qualifying cell wins.
      const short = seedOf(brightCalm, midMid.slice(0, -1), sessions(1, "mid-mid", ["fa1"]), heavyCalm, filler);
      const rack = computeDrafts(short, catalog)[0];
      expect(rack.bucket).toBe("bright-calm");
      expect(rack.figures.groupViews).toBe(390);
      expect(rack.figures.groupAdds).toBe(40);
    });

    it("breaks a tie by the ascending bucket and group string", () => {
      const tie = seedOf(
        sessions(30, "mid-mid", ["ps1"], [add("ps1")]),
        sessions(270, "mid-mid", ["ps1"]),
        sessions(30, "bright-calm", ["ps2"], [add("ps2")]),
        sessions(270, "bright-calm", ["ps2"]),
        sessions(100, "heavy-calm", ["f-heavy-calm"], [add("f-heavy-calm")]),
        filler,
      );
      expect(computeDrafts(tie, catalog)[0].bucket).toBe("bright-calm");
      // The same tie with the winning cell seen first.
      const reversed = seedOf(
        sessions(30, "bright-calm", ["ps2"], [add("ps2")]),
        sessions(270, "bright-calm", ["ps2"]),
        sessions(30, "mid-mid", ["ps1"], [add("ps1")]),
        sessions(270, "mid-mid", ["ps1"]),
        sessions(100, "heavy-calm", ["f-heavy-calm"], [add("f-heavy-calm")]),
        filler,
      );
      expect(computeDrafts(reversed, catalog)[0].bucket).toBe("bright-calm");
    });

    it("breaks a tie between groups in one bucket by group name", () => {
      const groups = [...catalog, work("pa1", "poster", "animal", 0, 0)];
      const tie = seedOf(
        sessions(30, "mid-mid", ["ps1"], [add("ps1")]),
        sessions(270, "mid-mid", ["ps1"]),
        sessions(30, "mid-mid", ["pa1"], [add("pa1")]),
        sessions(270, "mid-mid", ["pa1"]),
        sessions(100, "heavy-calm", ["f-heavy-calm"], [add("f-heavy-calm")]),
        sessions(10, "bright-calm", ["f-bright-calm"]),
        filler,
      );
      const rack = computeDrafts(tie, groups)[0];
      expect([rack.bucket, rack.group]).toEqual(["mid-mid", "animal posters"]);
      expect(rack.figures.groupWorks).toBe(1);
    });

    it("throws when no group qualifies (pin: TypeError on rack.group)", () => {
      const none = seedOf(sessions(100, "heavy-calm", ["f-heavy-calm"], [add("f-heavy-calm")]), sessions(299, "mid-mid", ["ps1"]));
      expect(() => computeDrafts(none, catalog)).toThrow(TypeError);
    });
  });

  describe("attach pattern", () => {
    it("excludes a segment with 99 adds and includes one with 100", () => {
      const at99 = seedOf(brightCalm, sessions(59, "bright-calm", ["ps2"], [add("ps2", "framed", "brass")]), midMid, heavyCalm, filler);
      expect(computeDrafts(at99, catalog)[1].bucket).toBe("mid-mid");
      const at100 = seedOf(brightCalm, sessions(60, "bright-calm", ["ps2"], [add("ps2", "framed", "brass")]), midMid, heavyCalm, filler);
      const attach = computeDrafts(at100, catalog)[1];
      expect(attach.bucket).toBe("bright-calm");
      expect(attach.group).toBe("brass frame");
      expect(attach.figures).toEqual({ framedSharePct: 100, catalogFramedSharePct: 58.5, topFinishSharePct: 100, segmentAdds: 100, totalSessions: 880 });
    });

    it("takes the highest framed share even when a lower one comes first", () => {
      const earlier = seedOf(sessions(100, "heavy-calm", ["pp1"], [add("pp1", "framed", "black")]), sessions(100, "heavy-calm", ["pp1"], [add("pp1")]), midMid, filler, brightCalm);
      // heavy-calm frames 50 percent, mid-mid 58.3 percent.
      expect(computeDrafts(earlier, catalog)[1].bucket).toBe("mid-mid");
    });

    it("breaks a finish tie by frameFinishes order", () => {
      const tie = seedOf(
        sessions(50, "mid-mid", ["ps1"], [add("ps1", "framed", "white")]),
        sessions(50, "mid-mid", ["ps1"], [add("ps1", "framed", "black")]),
        sessions(200, "mid-mid", ["ps1"]),
        sessions(10, "heavy-calm", ["f-heavy-calm"]),
        sessions(10, "bright-calm", ["f-bright-calm"]),
        filler,
      );
      const attach = computeDrafts(tie, catalog)[1];
      expect(attach.group).toBe("black frame");
      expect(attach.figures.topFinishSharePct).toBe(50);
      const oak = seedOf(
        sessions(50, "mid-mid", ["ps1"], [add("ps1", "framed", "white")]),
        sessions(50, "mid-mid", ["ps1"], [add("ps1", "framed", "natural oak")]),
        sessions(10, "mid-mid", ["ps1"], [add("ps1", "framed", "black")]),
        sessions(200, "mid-mid", ["ps1"]),
        sessions(10, "heavy-calm", ["f-heavy-calm"]),
        sessions(10, "bright-calm", ["f-bright-calm"]),
        filler,
      );
      expect(computeDrafts(oak, catalog)[1].group).toBe("natural oak frame");
    });
  });

  describe("buckets with no views or no sessions are left out of the rate sorts", () => {
    // heavy-calm adds every view; mid-mid adds 10 of 310; every other bucket has no sessions.
    const sparse = seedOf(
      sessions(100, "heavy-calm", ["f-heavy-calm"], [add("f-heavy-calm")]),
      sessions(300, "mid-mid", ["ps1"]),
      sessions(10, "mid-mid", ["ps1"], [add("ps1")]),
    );
    // Computed inside each test, so a broken sort fails a test instead of the whole file.
    const sparseDrafts = () => computeDrafts(sparse, catalog);

    it("sorts copies, leaving the shared bucketKeys order unchanged", () => {
      sparseDrafts();
      expect(bucketKeys).toEqual(["heavy-calm", "mid-calm", "bright-calm", "heavy-mid", "mid-mid", "bright-mid", "heavy-charged", "mid-charged", "bright-charged"]);
    });

    it("picks the lowest real pick rate, mid-mid, not a bucket with no views", () => {
      const under = sparseDrafts()[2];
      expect(under.bucket).toBe("mid-mid");
      expect(under.figures.pickRatePct).toBe(3.2);
    });

    it("still finds the licensing gap when empty buckets hold works (Infinity sorts last)", () => {
      // heavy-calm 2 works per 100 sessions, mid-mid 2 per 310; the rest have works but no sessions.
      const gap = sparseDrafts()[3];
      expect(gap.bucket).toBe("mid-mid");
      expect(gap.figures.worksPer1000Sessions).toBe(6.5);
    });

    it("picks the lowest real works per session when empty buckets hold no works either", () => {
      // heavy-calm 1 work per 100 sessions, mid-mid 1 per 310; the rest are 0 / 0.
      const gapOnly = computeDrafts(sparse, [work("f-heavy-calm", "fine-art", "landscape", -0.6, -0.6), work("ps1", "poster", "space", 0, 0)])[3];
      expect(gapOnly.bucket).toBe("mid-mid");
      expect(gapOnly.figures.worksPer1000Sessions).toBe(3.2);
    });
  });
});

describe("draftText", () => {
  const [rack, attach, under, gap] = drafts;

  it("names the kind, the room and the group, then lists the figures", () => {
    expect(draftText(rack).split("\n")).toEqual([
      "Kind: retail rack candidate: a group of posters picked far above the catalog average in one mood segment",
      "Mood segment: Plain Daylight (in the middle: balanced, steady, everyday)",
      "Group: space posters",
      "Figures:",
      "- lift = 1.5 (segment pick rate divided by catalog-average pick rate)",
      "- groupPickRatePct = 46.7 (pick rate of the group in this segment, percent of views added to the bag)",
      "- catalogPickRatePct = 31 (catalog-average pick rate, percent)",
      "- groupViews = 300 (views of the group in this segment)",
      "- groupAdds = 140 (adds of the group in this segment)",
      "- groupWorks = 2 (posters in the group)",
      "- totalSessions = 820 (simulated sessions in the dataset)",
    ]);
    expect(draftText(attach)).toContain("\nGroup: white frame\n");
    expect(draftText(attach).split("\n")[0]).toBe("Kind: frame attach pattern: how often one mood segment adds a frame, and which finish it picks");
    expect(draftText(under).split("\n")[0]).toBe(
      "Kind: under-converting mood segment: the segment whose sessions add the fewest works to the bag per work viewed",
    );
  });

  it("describes each segment with the J4 prompt's words for that mood", () => {
    const ai = readFileSync(repo("docs/ai-jobs.md"), "utf8");
    for (const key of bucketKeys) {
      const words = segmentWords[key].split(": ")[1];
      expect(ai).toContain(`\n- ${key}: ${words}`);
    }
  });

  it("leaves out the group line when there is no group", () => {
    expect(draftText(under)).not.toContain("Group:");
    expect(draftText(gap).split("\n").slice(0, 3)).toEqual([
      "Kind: licensing gap: the mood segment with the fewest catalog works per expected session",
      "Mood segment: Morning Light (bright and calm: light, gentle, warm, at rest)",
      "Figures:",
    ]);
  });

  it("has words for every figure computeDrafts produces", () => {
    for (const d of [...drafts, ...realDrafts]) {
      for (const [name, value] of Object.entries(d.figures)) {
        expect(draftText(d)).toContain(`- ${name} = ${value} (`);
        expect(draftText(d)).not.toContain(`- ${name} = ${value} (${name})`);
        expect(draftText(d)).not.toContain(`- ${name} = ${value} ()`);
      }
    }
  });

  it("prints values as stored and falls back to the raw name", () => {
    const d: Draft = { kind: "under-converting", bucket: "heavy-calm", figures: { lift: 0.123456, mystery: 7 } };
    expect(draftText(d)).toContain("- lift = 0.123456 (segment pick rate divided by catalog-average pick rate)");
    expect(draftText(d)).toContain("- mystery = 7 (mystery)");
  });
});

describe("j8Request", () => {
  it("sends one request per finding, keyed by kind, with the config model and effort", () => {
    const request = j8Request(drafts[2], "SYSTEM");
    expect(request).toEqual({
      custom_id: "under-converting",
      params: {
        model: claudeModel,
        max_tokens: 2000,
        system: "SYSTEM",
        output_config: { effort: claudeEffort.j8, format: { type: "json_schema", schema: j8JsonSchema } },
        messages: [{ role: "user", content: draftText(drafts[2]) }],
      },
    });
  });

  it("asks for exactly a text and an action", () => {
    expect(j8JsonSchema).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["text", "action"],
      properties: { text: { type: "string" }, action: { type: "string" } },
    });
  });
});

describe("parseJ8 against recorded responses (j8.jsonl)", () => {
  const recorded = readFileSync(repo("tests/fixtures/anthropic/j8.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { custom_id: string; result: { type: string; message: Message } });
  const figuresOf = (kind: string) => realDrafts.find((d) => d.kind === kind)!.figures;
  const answer = (text: string): Pick<Message, "stop_reason" | "content"> => ({
    stop_reason: "end_turn",
    content: [{ type: "text", text, citations: null }],
  });
  const figures = figuresOf("rack-candidate");

  it("accepts every recorded response and returns its text and action, with thousands separators", () => {
    expect(recorded.map((r) => r.custom_id).sort()).toEqual([...findingKinds].sort());
    for (const r of recorded) {
      const body = JSON.parse((r.result.message.content.find((b) => b.type === "text") as { text: string }).text);
      expect(parseJ8(r.result.message, figuresOf(r.custom_id))).toEqual({ ok: true, value: { text: withThousands(body.text), action: withThousands(body.action) } });
    }
  });

  it("separates thousands in whole numbers only", () => {
    expect(withThousands("1279 views across 20000 sessions, 10.3 per 1000, 999 adds, 1,943 already, 1234.5 kept")).toBe(
      "1,279 views across 20,000 sessions, 10.3 per 1,000, 999 adds, 1,943 already, 1234.5 kept",
    );
  });

  it("matches the committed signals.json words", () => {
    const committed = signalsFileSchema.parse(JSON.parse(readFileSync(repo("data/signals.json"), "utf8")));
    for (const f of committed.findings) {
      const r = recorded.find((x) => x.custom_id === f.kind)!;
      expect(parseJ8(r.result.message, f.figures)).toEqual({ ok: true, value: { text: f.text, action: f.action } });
    }
  });

  it("trims the text and action", () => {
    expect(parseJ8(answer(JSON.stringify({ text: "  A steady segment.  ", action: "\nStock more.\n" })), figures)).toEqual({
      ok: true,
      value: { text: "A steady segment.", action: "Stock more." },
    });
  });

  it("rejects an incomplete response, a missing text block and malformed JSON", () => {
    const base = recorded[0].result.message;
    expect(parseJ8({ ...base, stop_reason: "max_tokens" }, figures)).toEqual({ ok: false, reason: "stop reason max_tokens" });
    expect(parseJ8({ stop_reason: "end_turn", content: [] }, figures)).toEqual({ ok: false, reason: "no text block" });
    expect(parseJ8({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "", signature: "" }] }, figures)).toEqual({
      ok: false,
      reason: "no text block",
    });
    expect(parseJ8(answer('{"text": "cut off'), figures)).toEqual({ ok: false, reason: "malformed JSON" });
  });

  it("reads the text block after a thinking block", () => {
    const thinking = { type: "thinking" as const, thinking: "", signature: "" };
    const both = { stop_reason: "end_turn" as const, content: [thinking, ...answer(JSON.stringify({ text: "A segment.", action: "Stock more." })).content] };
    expect(parseJ8(both, figures)).toEqual({ ok: true, value: { text: "A segment.", action: "Stock more." } });
  });

  it("requires a string text and a string action", () => {
    const reason = { ok: false, reason: "text and action must be strings" };
    expect(parseJ8(answer(JSON.stringify({ text: 5, action: "Stock more." })), figures)).toEqual(reason);
    expect(parseJ8(answer(JSON.stringify({ text: "A segment.", action: ["Stock more."] })), figures)).toEqual(reason);
    expect(parseJ8(answer(JSON.stringify({ text: "A segment." })), figures)).toEqual(reason);
    expect(parseJ8(answer("[]"), figures)).toEqual(reason);
  });

  it("rejects a JSON null body instead of throwing", () => {
    expect(parseJ8(answer("null"), figures)).toEqual({ ok: false, reason: "text and action must be strings" });
  });

  it("prefixes each problem with its field and joins them", () => {
    expect(parseJ8(answer(JSON.stringify({ text: "A segment!", action: "Secure the rights." })), figures)).toEqual({
      ok: false,
      reason: 'text: exclamation point; action: banned term "rights"',
    });
  });

  it("rejects a bad action alone", () => {
    expect(parseJ8(answer(JSON.stringify({ text: "A steady segment.", action: "Stock 99 more." })), figures)).toEqual({
      ok: false,
      reason: "action: numbers not in the figures: 99",
    });
  });

  it("rejects a number in the text that is not a figure, and accepts one that is", () => {
    expect(parseJ8(answer(JSON.stringify({ text: "Picked at 5.1 percent.", action: "Stock more." })), figures)).toEqual({
      ok: false,
      reason: "text: numbers not in the figures: 5.1",
    });
    expect(parseJ8(answer(JSON.stringify({ text: "Picked at 5 percent.", action: "Stock more." })), figures).ok).toBe(true);
  });
});

describe("signalsFile [D-029]", () => {
  // Words inserted in reverse kind order, so a positional match would give the wrong words.
  const words = new Map([...findingKinds].reverse().map((kind) => [kind, { text: `Text for ${kind}.`, action: `Action for ${kind}.` }]));

  it("gives each finding its own kind's words and its draft's figures", () => {
    const file = signalsFile({ ...main, seed: 7 }, catalog, drafts, words);
    expect(file.seed).toBe(7);
    expect(file.simulated).toBe(true);
    expect(file.sessionCount).toBe(820);
    expect(file.buckets).toEqual(bucketFigures(main, catalog));
    expect(file.findings).toEqual(
      drafts.map((d) => ({ kind: d.kind, bucket: d.bucket, text: `Text for ${d.kind}.`, action: `Action for ${d.kind}.`, figures: d.figures })),
    );
    expect(signalsFileSchema.safeParse(file).success).toBe(true);
  });

  it("throws when a kind has no words (pin: TypeError)", () => {
    const missing = new Map([...words].filter(([kind]) => kind !== "licensing-gap"));
    expect(() => signalsFile(main, catalog, drafts, missing)).toThrow(TypeError);
  });

  it("rejects drafts out of kind order", () => {
    const swapped = [drafts[1], drafts[0], drafts[2], drafts[3]];
    expect(() => signalsFile(main, catalog, swapped, words)).toThrow("one finding of each kind, in order");
  });
});
