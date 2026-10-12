import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { numbersIn, signalsFileSchema, signalsSeedFileSchema } from "@/lib/schemas";

// High tier (docs/test-tiers.md): numbersIn, signalsSeedFileSchema, signalsFileSchema [D-029].

const emDash = String.fromCharCode(0x2014);

describe("numbersIn", () => {
  it("reads integers, decimals and thousands separators, in order", () => {
    expect(numbersIn("12 works, 3.5 percent, 1,000 sessions, 12,345.6 views and 1,000,000 more")).toEqual([12, 3.5, 1000, 12345.6, 1000000]);
  });

  it("returns an empty list when there are no numbers", () => {
    expect(numbersIn("No figures here.")).toEqual([]);
  });

  it("drops a trailing period or comma and reads a number glued to a unit", () => {
    expect(numbersIn("It was 18.4.")).toEqual([18.4]);
    expect(numbersIn("At 5, then 6")).toEqual([5, 6]);
    expect(numbersIn("18% and 3x")).toEqual([18, 3]);
  });

  it("counts a minus sign only when no letter or digit comes before it", () => {
    expect(numbersIn("-3 to start")).toEqual([-3]);
    expect(numbersIn("fell to -3.5")).toEqual([-3.5]);
    expect(numbersIn("the mid-1990s")).toEqual([1990]);
    expect(numbersIn("pages 2-3")).toEqual([2, 3]);
  });

  it("reads 3,5 as 35 (pin)", () => {
    expect(numbersIn("3,5")).toEqual([35]);
  });
});

const line = (id: string, material = "paper", frame: string | null = null) => ({ id, size: "18x24", material, frame });
const seedFile = () => ({
  seed: 20261008,
  sessionCount: 2,
  sessions: [
    { bucket: "mid-mid", views: ["w-1", "w-2"], adds: [line("w-1"), line("w-2", "framed", "black")] },
    { bucket: "heavy-calm", views: ["w-3"], adds: [] },
  ],
});
const seedIssues = (file: unknown) => {
  const result = signalsSeedFileSchema.safeParse(file);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("signalsSeedFileSchema", () => {
  it("accepts a valid seed file", () => {
    expect(seedIssues(seedFile())).toEqual([]);
  });

  it("requires sessionCount to equal the number of sessions", () => {
    expect(seedIssues({ ...seedFile(), sessionCount: 3 })).toEqual(["sessionCount must equal the number of sessions"]);
  });

  it("requires at least one view per session", () => {
    const file = seedFile();
    file.sessions[1].views = [];
    expect(signalsSeedFileSchema.safeParse(file).success).toBe(false);
  });

  it("requires every add to be a viewed work", () => {
    const file = seedFile();
    file.sessions[1].adds = [line("w-9")];
    expect(seedIssues(file)).toEqual(["every added work was viewed"]);
  });

  it("puts a frame on framed prints only", () => {
    for (const bad of [line("w-1", "framed", null), line("w-1", "paper", "black"), line("w-1", "canvas", "white")]) {
      const file = seedFile();
      file.sessions[0].adds = [bad];
      expect(seedIssues(file)).toEqual(["a frame goes with framed prints only"]);
    }
  });

  it("checks size, material, frame and bucket against the fixed lists", () => {
    const cases = [
      { ...line("w-1"), size: "20x30" },
      { ...line("w-1"), material: "metal" },
      line("w-1", "framed", "gold"),
    ];
    for (const bad of cases) {
      const file = seedFile();
      file.sessions[0].adds = [bad];
      expect(signalsSeedFileSchema.safeParse(file).success).toBe(false);
    }
    const file = seedFile();
    file.sessions[0].bucket = "mid-middle";
    expect(signalsSeedFileSchema.safeParse(file).success).toBe(false);
  });

  it("rejects extra keys and a non-integer seed", () => {
    expect(signalsSeedFileSchema.safeParse({ ...seedFile(), note: "x" }).success).toBe(false);
    const file = seedFile();
    Object.assign(file.sessions[0].adds[0], { price: 39 });
    expect(signalsSeedFileSchema.safeParse(file).success).toBe(false);
    expect(signalsSeedFileSchema.safeParse({ ...seedFile(), seed: 1.5 }).success).toBe(false);
  });

  it("allows a work viewed twice in one session (pin)", () => {
    const file = seedFile();
    file.sessions[1].views = ["w-3", "w-3"];
    expect(seedIssues(file)).toEqual([]);
  });
});

const committed = () => JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../data/signals.json"), "utf8"));
const signalsIssues = (file: unknown) => {
  const result = signalsFileSchema.safeParse(file);
  return result.success ? [] : result.error.issues.map((i) => ({ message: i.message, path: i.path }));
};

describe("signalsFileSchema", () => {
  it("accepts the committed data/signals.json", () => {
    expect(signalsIssues(committed())).toEqual([]);
  });

  it("needs exactly four findings in findingKinds order", () => {
    const swapped = committed();
    [swapped.findings[0], swapped.findings[1]] = [swapped.findings[1], swapped.findings[0]];
    expect(signalsIssues(swapped)).toEqual([{ message: "one finding of each kind, in order", path: [] }]);
    const three = committed();
    three.findings.pop();
    expect(signalsFileSchema.safeParse(three).success).toBe(false);
  });

  it("must be marked simulated", () => {
    expect(signalsFileSchema.safeParse({ ...committed(), simulated: false }).success).toBe(false);
  });

  it("needs all nine buckets with non-negative integer figures", () => {
    const missing = committed();
    delete missing.buckets["mid-mid"];
    expect(signalsFileSchema.safeParse(missing).success).toBe(false);
    const negative = committed();
    negative.buckets["mid-mid"].adds = -1;
    expect(signalsFileSchema.safeParse(negative).success).toBe(false);
    const fraction = committed();
    fraction.buckets["mid-mid"].views = 2.5;
    expect(signalsFileSchema.safeParse(fraction).success).toBe(false);
  });

  it("rejects a number in the text that is not a figure, with its path", () => {
    const file = committed();
    file.findings[2].text = "Picked at 0.8 percent.";
    expect(signalsIssues(file)).toEqual([{ message: "0.8 in the text is not one of the figures", path: ["findings", 2, "text"] }]);
  });

  it("rejects a number in the action that is not a figure, with its path", () => {
    const file = committed();
    file.findings[0].action = "Build a rack of 60 posters.";
    expect(signalsIssues(file)).toEqual([{ message: "60 in the action is not one of the figures", path: ["findings", 0, "action"] }]);
  });

  it("accepts a figure value in the action", () => {
    const file = committed();
    file.findings[0].action = "Build a rack of the 12 place posters.";
    expect(signalsIssues(file)).toEqual([]);
  });

  it("rejects an em dash in the text or action, and empty text", () => {
    const text = committed();
    text.findings[0].text = `Calm ${emDash} quiet.`;
    expect(signalsIssues(text)).toEqual([{ message: "no em dash", path: ["findings", 0, "text"] }]);
    const action = committed();
    action.findings[1].action = `Frame ${emDash} black.`;
    expect(signalsIssues(action)).toEqual([{ message: "no em dash", path: ["findings", 1, "action"] }]);
    const empty = committed();
    empty.findings[3].text = "   ";
    expect(signalsFileSchema.safeParse(empty).success).toBe(false);
  });
});
