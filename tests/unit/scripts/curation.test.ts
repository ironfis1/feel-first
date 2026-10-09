import { describe, expect, it } from "vitest";
import {
  capPerArtist,
  contentProblem,
  flagWords,
  maxPerArtist,
  minLongEdge,
  pickSpread,
  sizeProblem,
} from "../../../scripts/ingest/lib/curation.ts";

// Curation rules (D-002, D-020, D-021). contentProblem and pickSpread are High tier; the rest Medium.

describe("sizeProblem [D-002]", () => {
  it("passes 1,200px on the long edge, whichever side it is", () => {
    expect(minLongEdge).toBe(1200);
    expect(sizeProblem(1200, 800)).toBeNull();
    expect(sizeProblem(800, 1200)).toBeNull();
    expect(sizeProblem(1200, 1200)).toBeNull();
  });

  it("skips 1,199px and names the measured edge and the minimum", () => {
    expect(sizeProblem(1199, 900)).toBe("image too small: 1199px on the long edge, needs 1200");
    expect(sizeProblem(900, 1199)).toBe("image too small: 1199px on the long edge, needs 1200");
  });

  it("does not defend against a zero size; it reports it as too small", () => {
    expect(sizeProblem(0, 0)).toBe("image too small: 0px on the long edge, needs 1200");
  });
});

describe("contentProblem [D-021]", () => {
  it.each([
    ["Reclining Nude", 'nudity: matched "nude"'],
    ["The Massacre of the Innocents", 'violence: matched "massacre"'],
    ["Minstrel Show", 'racist caricature or slur: matched "minstrel"'],
    ["Syphilis can be cured", 'reads badly in a demo: matched "syphilis"'],
    ["Fragment of a Fresco", 'damaged or fragmentary: matched "fragment"'],
  ])("flags %s", (title, reason) => {
    expect(contentProblem([title])).toBe(reason);
  });

  it("reports the first reason group in table order when several match", () => {
    expect(contentProblem(["Dead nude"])).toBe('nudity: matched "nude"');
  });

  it("matches whole words only", () => {
    expect(contentProblem(["The Dead Christ"])).toBe('violence: matched "dead"');
    expect(contentProblem(["Deadline", "Raccoon", "Bloodhound", "Nudelman Street"])).toBeNull();
  });

  it("ignores case, and finds words next to punctuation", () => {
    expect(contentProblem(["NUDE STUDY"])).toBe('nudity: matched "nude"');
    expect(contentProblem(["naked-eye astronomy"])).toBe('nudity: matched "naked"');
  });

  it("matches a plural only when it is listed", () => {
    expect(contentProblem(["Two Nudes"])).toBe('nudity: matched "nudes"');
    expect(contentProblem(["Bathers"])).toBe('nudity: matched "bathers"');
    expect(contentProblem(["Martyrdoms"])).toBeNull();
  });

  it("reads every text it is given and skips empty ones", () => {
    expect(contentProblem([null, undefined, "", "Harbor", "battle"])).toBe('violence: matched "battle"');
    expect(contentProblem([null, undefined, ""])).toBeNull();
    expect(contentProblem([])).toBeNull();
  });

  it("flags these known false positives on purpose; Scott reviews them in the skip log", () => {
    expect(contentProblem(["View of the Dead Sea"])).toBe('violence: matched "dead"');
    expect(contentProblem(["Vanitas with a Skull"])).toBe('violence: matched "skull"');
  });

  it("gives the same answer when called twice with the same text", () => {
    expect(contentProblem(["nude"])).toBe(contentProblem(["nude"]));
  });

  it("keeps every flag word lowercase and listed once", () => {
    const words = Object.values(flagWords).flat();
    expect(words.every((w) => w === w.toLowerCase())).toBe(true);
    expect(new Set(words).size).toBe(words.length);
  });
});

describe("pickSpread [D-020]", () => {
  const item = (rank: number, group: string) => ({ rank, group, name: `${group}${rank}` });
  const names = (list: { name: string }[]) => list.map((i) => i.name);

  it("takes the best of each group in turn, groups ordered by their best item", () => {
    const items = [item(5, "b"), item(1, "a"), item(2, "a"), item(3, "c"), item(4, "b"), item(6, "c")];
    expect(names(pickSpread(items, 6))).toEqual(["a1", "c3", "b4", "a2", "c6", "b5"]);
  });

  it("drops an exhausted group and lets the others continue", () => {
    const items = [item(1, "a"), item(2, "b"), item(3, "b"), item(4, "b")];
    expect(names(pickSpread(items, 4))).toEqual(["a1", "b2", "b3", "b4"]);
  });

  it("stops mid-round at n", () => {
    const items = [item(1, "a"), item(2, "b"), item(3, "c")];
    expect(names(pickSpread(items, 2))).toEqual(["a1", "b2"]);
  });

  it("returns fewer than n without error, all with Infinity, and none for 0 or empty input", () => {
    const items = [item(1, "a"), item(2, "b")];
    expect(pickSpread(items, 5)).toHaveLength(2);
    expect(pickSpread(items, Infinity)).toHaveLength(2);
    expect(pickSpread(items, 0)).toEqual([]);
    expect(pickSpread([], 3)).toEqual([]);
  });

  it("keeps input order for equal ranks and degrades to rank order with one group", () => {
    const tied = [{ rank: 1, group: "a", name: "first" }, { rank: 1, group: "a", name: "second" }, item(0, "a")];
    expect(names(pickSpread(tied, 3))).toEqual(["a0", "first", "second"]);
  });

  it("leaves the input untouched and returns the same objects", () => {
    const items = [item(2, "a"), item(1, "b")];
    const copy = [...items];
    const picked = pickSpread(items, 2);
    expect(items).toEqual(copy);
    expect(picked[0]).toBe(items[1]);
  });
});

describe("capPerArtist [D-020]", () => {
  const work = (id: string, artist: string) => ({ sourceId: id, title: `T${id}`, artist });

  it("keeps three works per artist and skips the fourth with its reason", () => {
    expect(maxPerArtist).toBe(3);
    const works = ["1", "2", "3", "4"].map((id) => work(id, "Hokusai"));
    const { kept, skips } = capPerArtist(works);
    expect(kept.map((w) => w.sourceId)).toEqual(["1", "2", "3"]);
    expect(skips).toEqual([{ sourceId: "4", title: "T4", reason: "artist limit: already 3 works by Hokusai" }]);
  });

  it("never caps Unknown artist", () => {
    const works = ["1", "2", "3", "4", "5"].map((id) => work(id, "Unknown artist"));
    expect(capPerArtist(works).kept).toHaveLength(5);
  });

  it("trims names, takes a custom limit, and lets input order decide who is kept", () => {
    const { kept } = capPerArtist([work("1", "Monet "), work("2", " Monet"), work("3", "Degas")], 1);
    expect(kept.map((w) => w.sourceId)).toEqual(["1", "3"]);
  });

  it("treats different spellings as different artists", () => {
    const works = [work("1", "monet"), work("2", "Monet"), work("3", "Claude Monet, Pierre Renoir")];
    expect(capPerArtist(works, 1).kept).toHaveLength(3);
  });

  it("gives the same result when run again on a longer list", () => {
    const works = ["1", "2", "3", "4"].map((id) => work(id, "A"));
    expect(capPerArtist(works.slice(0, 3)).kept).toEqual(capPerArtist(works).kept);
    expect(capPerArtist([])).toEqual({ kept: [], skips: [] });
  });
});
