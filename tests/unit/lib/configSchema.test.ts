/* eslint-disable @typescript-eslint/no-explicit-any -- tests edit the config as loose JSON to break one rule at a time */
import { describe, expect, it } from "vitest";
import * as feel from "@/config/feel";
import { configSchema } from "@/lib/schemas";

// High tier (docs/test-tiers.md). Spec Section 7, Gap G18. Config is validated against its schema here.

/** A plain, editable copy of the real config values. */
const realConfig = () => JSON.parse(JSON.stringify(feel)) as Record<string, any>;

/** Issues raised after one change to the real config. */
const issuesAfter = (change: (config: Record<string, any>) => void) => {
  const config = realConfig();
  change(config);
  return configSchema.safeParse(config).error?.issues ?? [];
};
const accepted = (change: Parameters<typeof issuesAfter>[0]) => issuesAfter(change).length === 0;

describe("the real config in src/config/feel.ts", () => {
  it("validates against the config schema", () => {
    expect(configSchema.safeParse(feel).error?.issues ?? []).toEqual([]);
  });
});

describe("configSchema cross-checks", () => {
  it("rejects a size word that maps to an unknown print size [Gap G7]", () => {
    const issues = issuesAfter((c) => (c.sizeWordToPrintSize.medium = "20x30"));
    expect(issues.map((i) => i.path)).toEqual([["sizeWordToPrintSize", "medium"]]);
  });

  it("rejects a default wall scene that is not a scene", () => {
    const issues = issuesAfter((c) => (c.defaultWallScene = "bench"));
    expect(issues.map((i) => i.path)).toEqual([["defaultWallScene"]]);
  });

  it("rejects a wall scene with no scale reference width [Gap G30]", () => {
    const issues = issuesAfter((c) => delete c.wallSceneReferenceWidthIn.desk);
    expect(issues.map((i) => i.path)).toEqual([["wallSceneReferenceWidthIn", "desk"]]);
  });

  describe("cost line stays hidden until N and X are filled [Res #40, Gap G31]", () => {
    it.each([
      ["neither", null, null],
      ["only dollars", null, 120],
      ["only days", 5, null],
    ])("rejects showing it with %s filled", (_label, days, dollars) => {
      const issues = issuesAfter((c) => {
        c.showCostLine = true;
        c.costLine = { days, dollars };
      });
      expect(issues.map((i) => i.path)).toEqual([["showCostLine"]]);
    });

    it("accepts showing it once both are filled", () => {
      expect(
        accepted((c) => {
          c.showCostLine = true;
          c.costLine = { days: 5, dollars: 120 };
        }),
      ).toBe(true);
    });

    it("accepts it hidden with both empty", () => {
      expect(accepted((c) => (c.costLine = { days: null, dollars: null }))).toBe(true);
    });
  });
});

describe("configSchema field rules", () => {
  it("requires bucket cut points to ascend inside the field [Gap G4]", () => {
    expect(accepted((c) => (c.bucketCutPoints = [-1, 1]))).toBe(true);
    expect(accepted((c) => (c.bucketCutPoints = [0.2, 0.2]))).toBe(false);
    expect(accepted((c) => (c.bucketCutPoints = [0.3, -0.3]))).toBe(false);
    expect(accepted((c) => (c.bucketCutPoints = [-1.5, 0.3]))).toBe(false);
    expect(accepted((c) => (c.bucketCutPoints = [-0.3, 1.5]))).toBe(false);
  });

  it("keeps the nudge step strictly between 0 and 1 [Res #10]", () => {
    for (const bad of [0, 1, -0.3, 1.3]) expect(accepted((c) => (c.nudgeStep = bad))).toBe(false);
    expect(accepted((c) => (c.nudgeStep = 0.3))).toBe(true);
  });

  it("allows 1 to 3 whole fingerprint tags, since a work has at least 3 [Res #13]", () => {
    for (const ok of [1, 3]) expect(accepted((c) => (c.fingerprintTagCount = ok))).toBe(true);
    for (const bad of [0, 4, 2.5]) expect(accepted((c) => (c.fingerprintTagCount = bad))).toBe(false);
  });

  it("accepts only the end-of-lane drift behavior [Gap G22]", () => {
    expect(accepted((c) => (c.driftBehavior = "remove"))).toBe(false);
  });

  it("rejects an empty Threshold prompt or one with an em dash", () => {
    expect(accepted((c) => (c.thresholdPrompt = ""))).toBe(false);
    expect(accepted((c) => (c.thresholdPrompt = `Move the light ${String.fromCharCode(0x2014)} until it feels right.`))).toBe(false);
  });

  it("rejects a malformed contact email or LinkedIn URL", () => {
    expect(accepted((c) => (c.contactEmail = "scott at reasinger"))).toBe(false);
    expect(accepted((c) => (c.linkedInUrl = "linkedin/scott"))).toBe(false);
  });

  it("allows cost line days as null or a positive whole number", () => {
    expect(accepted((c) => (c.costLine.days = 0))).toBe(false);
    expect(accepted((c) => (c.costLine.days = 1.5))).toBe(false);
  });

  it("allows cost line dollars as null, zero or more", () => {
    expect(accepted((c) => (c.costLine.dollars = 0))).toBe(true);
    expect(accepted((c) => (c.costLine.dollars = -1))).toBe(false);
  });

  it.each([
    ["shipping", (c: any, v: number) => (c.shippingFlat = v)],
    ["frame width", (c: any, v: number) => (c.frameWidthIn = v)],
    ["mat width", (c: any, v: number) => (c.matWidthIn = v)],
    ["print width", (c: any, v: number) => (c.printSizes[0].widthIn = v)],
    ["print height", (c: any, v: number) => (c.printSizes[0].heightIn = v)],
    ["base price", (c: any, v: number) => (c.printSizes[0].basePrice = v)],
    ["paper multiplier", (c: any, v: number) => (c.materials.paper.baseMultiplier = v)],
    ["canvas multiplier", (c: any, v: number) => (c.materials.canvas.baseMultiplier = v)],
    ["framed multiplier", (c: any, v: number) => (c.materials.framed.baseMultiplier = v)],
    ["framed flat amount", (c: any, v: number) => (c.materials.framed.framedFlat = v)],
    ["framed per-inch amount", (c: any, v: number) => (c.materials.framed.framedPerWidthInch = v)],
    ["scene reference width", (c: any, v: number) => (c.wallSceneReferenceWidthIn.sofa = v)],
  ])("rejects a zero or negative %s [Gap G5]", (_label, set) => {
    expect(accepted((c) => set(c, 0))).toBe(false);
    expect(accepted((c) => set(c, -5))).toBe(false);
  });

  it.each(["roomTypes", "printSizes", "frameFinishes", "wallColors", "wallScenes"])("rejects an empty %s list", (key) => {
    expect(accepted((c) => (c[key] = []))).toBe(false);
  });

  it("rejects an empty label on a material", () => {
    expect(accepted((c) => (c.materials.canvas.label = ""))).toBe(false);
  });

  it("requires whole, positive J2 timeout and rate limit values [Gap G18]", () => {
    for (const bad of [0, 2.5]) {
      expect(accepted((c) => (c.j2TimeoutMs = bad))).toBe(false);
      expect(accepted((c) => (c.j2RateLimit.calls = bad))).toBe(false);
      expect(accepted((c) => (c.j2RateLimit.windowMs = bad))).toBe(false);
    }
  });

  it("requires a page size of at least one whole work per lane [Res #5]", () => {
    expect(accepted((c) => (c.roomPageSizePerLane = 0))).toBe(false);
    expect(accepted((c) => (c.roomPageSizePerLane = 6.5))).toBe(false);
  });
});
