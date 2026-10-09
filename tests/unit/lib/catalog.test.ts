import { describe, expect, it } from "vitest";
import fixture from "../../../data/fixtures/catalog.fixture.json";
import {
  emotionTags,
  getAllWorks,
  getWorkById,
  getWorksByLane,
  lanes,
  subjects,
} from "@/lib/catalog";
import { workSchema } from "@/lib/schemas";

// Contract tests for every function the catalog module exports (docs/testing.md functional gate).
// They check the module's contract, not the fixture's contents, so they survive the M2 data swap.

const ids = (list: readonly { id: string }[]) => list.map((w) => w.id);
const ascending = (list: string[]) => [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

describe("vocabularies [Gap G1, D-008]", () => {
  it("has exactly the 12 emotion tags, with no duplicates", () => {
    expect(emotionTags).toHaveLength(12);
    expect(new Set(emotionTags).size).toBe(12);
  });

  it("has exactly the 12 subjects, with no duplicates", () => {
    expect(subjects).toHaveLength(12);
    expect(new Set(subjects).size).toBe(12);
  });

  it("has exactly the two lanes", () => {
    expect(lanes).toEqual(["fine-art", "poster"]);
  });
});

describe("getAllWorks", () => {
  const all = getAllWorks();

  it("returns every work in the data file, each valid against the work schema", () => {
    expect(all).toHaveLength(fixture.length);
    for (const work of all) expect(workSchema.safeParse(work).success).toBe(true);
  });

  it("returns works in ascending catalog id order [Res #23]", () => {
    expect(ids(all)).toEqual(ascending(fixture.map((w) => w.id)));
  });

  it("returns a frozen array so callers cannot reorder the catalog", () => {
    expect(Object.isFrozen(all)).toBe(true);
    expect(() => (all as unknown as unknown[]).reverse()).toThrow(TypeError);
  });

  it("returns the same array on every call", () => {
    expect(getAllWorks()).toBe(all);
  });

  it("freezes only the list, not the work records inside it", () => {
    expect(Object.isFrozen(all[0])).toBe(false);
  });
});

describe("getWorkById", () => {
  const sample = getAllWorks()[3];

  it("finds every work in the catalog by its own id", () => {
    for (const work of getAllWorks()) expect(getWorkById(work.id)).toBe(work);
  });

  it.each([
    ["an unknown id", "no-such-id"],
    ["an empty string", ""],
    ["a different case", sample.id.toUpperCase()],
    ["surrounding spaces", ` ${sample.id} `],
    ["an inherited property name", "constructor"],
    ["the prototype key", "__proto__"],
  ])("returns undefined for %s", (_label, id) => {
    expect(getWorkById(id)).toBeUndefined();
  });
});

describe("getWorksByLane", () => {
  const fineArt = getWorksByLane("fine-art");
  const posters = getWorksByLane("poster");

  it("returns only works from the requested lane", () => {
    expect(fineArt.length).toBeGreaterThan(0);
    expect(posters.length).toBeGreaterThan(0);
    expect(fineArt.every((w) => w.lane === "fine-art")).toBe(true);
    expect(posters.every((w) => w.lane === "poster")).toBe(true);
  });

  it("splits the whole catalog between the two lanes with no overlap", () => {
    expect(new Set([...ids(fineArt), ...ids(posters)]).size).toBe(getAllWorks().length);
    expect(fineArt.length + posters.length).toBe(getAllWorks().length);
  });

  it("returns a fresh list each call, so changing it leaves the catalog alone", () => {
    const first = getWorksByLane("poster") as unknown[];
    expect(getWorksByLane("poster")).not.toBe(first);
    first.length = 0;
    expect(getWorksByLane("poster").length).toBe(posters.length);
    expect(getAllWorks().length).toBe(fixture.length);
  });

  it("keeps ascending id order within each lane", () => {
    expect(ids(fineArt)).toEqual(ascending(ids(fineArt)));
    expect(ids(posters)).toEqual(ascending(ids(posters)));
  });
});
