import { describe, expect, it } from "vitest";
import { roomNames } from "@/config/feel";
import { roomNameFor } from "@/lib/buckets";
import { bagCenter, feelTogether, suggestion } from "@/lib/j6";
import { closeSummary, formatDuration, freshMetrics, interacted, pieceOpened, rehung } from "@/lib/metrics";

// High tier (docs/test-tiers.md): bagCenter, suggestion, interacted, pieceOpened, rehung, closeSummary, formatDuration.
// Medium: feelTogether. Functional gates: J6 suggestion including the empty bag; session metrics, including a
// visitor who never touched the Threshold [Res #11, Res #15, Gap G6, Gap G23, D-041, D-053].

const p = (id: string, valence: number, arousal: number, lane = "poster") => ({ id, valence, arousal, lane });

describe("bagCenter [Gap G6]", () => {
  it("is null for an empty bag and the work's own point for one line", () => {
    expect(bagCenter([])).toBeNull();
    expect(bagCenter([{ valence: 0.3, arousal: -0.7 }])).toEqual({ valence: 0.3, arousal: -0.7 });
  });

  it("is the unweighted mean across lines, counting a work on two lines twice", () => {
    const c = bagCenter([
      { valence: -0.6, arousal: 0.2 },
      { valence: 0.6, arousal: 0.4 },
      { valence: 0.6, arousal: 0.4 },
    ]);
    expect(c!.valence).toBeCloseTo(0.2, 12);
    expect(c!.arousal).toBeCloseTo(1 / 3, 12);
  });
});

describe("feelTogether [RB32, Res #14]", () => {
  it("is null for an empty bag and the center's room name otherwise", () => {
    expect(feelTogether([])).toBeNull();
    const lines = [
      { valence: 0.9, arousal: -0.9 },
      { valence: 0.5, arousal: -0.5 },
    ];
    expect(feelTogether(lines)).toBe(roomNames["bright-calm"]);
    expect(feelTogether(lines)).toBe(roomNameFor(bagCenter(lines)!));
  });

  it("puts a center on a cut point in the middle band", () => {
    expect(feelTogether([{ valence: 1 / 3, arousal: -1 / 3 }])).toBe(roomNames["mid-mid"]);
  });
});

describe("suggestion: the J6 room balancer [Res #15, Gap G6]", () => {
  const catalog = [p("a", 0.9, 0.9), p("b", 0.1, 0.1, "fine-art"), p("c", -0.5, 0), p("d", 0.2, 0.2)];

  it("gives no suggestion for an empty bag", () => {
    expect(suggestion(catalog, [])).toBeNull();
  });

  it("is the work nearest the bag center that is not in the bag, from either lane", () => {
    expect(suggestion(catalog, [p("a", 0.9, 0.9)])!.id).toBe("d");
    expect(suggestion(catalog, [p("c", -0.9, -0.9), p("a", 0.9, 0.9)])!.id).toBe("b");
  });

  it("never suggests a work already in the bag, even the nearest, and counts a work on two lines once", () => {
    expect(suggestion(catalog, [p("b", 0.1, 0.1), p("b", 0.1, 0.1)])!.id).toBe("d");
  });

  it("breaks a tie by ascending id, whatever the catalog order", () => {
    const tied = [p("z", 0.5, 0), p("m", -0.5, 0), p("q", 0, 0.5)];
    expect(suggestion(tied, [p("in", 0, 0)])!.id).toBe("m");
    expect(suggestion([...tied].reverse(), [p("in", 0, 0)])!.id).toBe("m");
  });

  it("is null when every work is in the bag, and does not mutate its inputs", () => {
    const copy = structuredClone(catalog);
    expect(suggestion(catalog, catalog)).toBeNull();
    expect(catalog).toEqual(copy);
  });
});

describe("session metrics [Res #11, Gap G23, D-041]", () => {
  it("starts the clock at the first interaction only", () => {
    const started = interacted(freshMetrics, 1000);
    expect(started).toEqual({ startedAt: 1000, firstPieceAt: null, rehangs: 0 });
    expect(interacted(started, 5000)).toBe(started);
    expect(freshMetrics).toEqual({ startedAt: null, firstPieceAt: null, rehangs: 0 });
  });

  it("stops the clock at the first Piece opened after it started, once", () => {
    const opened = pieceOpened(interacted(freshMetrics, 1000), 9000);
    expect(opened.firstPieceAt).toBe(9000);
    expect(pieceOpened(opened, 20000)).toBe(opened);
  });

  it("ignores a Piece opened before any interaction (a direct link, D-053)", () => {
    expect(pieceOpened(freshMetrics, 3000)).toBe(freshMetrics);
  });

  it("counts re-hangs one at a time without touching the clock or its input", () => {
    const m = interacted(freshMetrics, 10);
    const three = rehung(rehung(rehung(m)));
    expect(three).toEqual({ ...m, rehangs: 3 });
    expect(m.rehangs).toBe(0);
  });

  it("summarizes a visitor who never touched the Threshold: time not measured, nothing chosen", () => {
    expect(closeSummary(freshMetrics, 0)).toEqual({ noSearchTyped: true, timeToFirstPieceMs: null, rehangs: 0, piecesChosen: 0 });
  });

  it("measures the time only when both ends are set", () => {
    expect(closeSummary({ startedAt: 1000, firstPieceAt: 9500, rehangs: 4 }, 2)).toEqual({ noSearchTyped: true, timeToFirstPieceMs: 8500, rehangs: 4, piecesChosen: 2 });
    expect(closeSummary({ startedAt: 1000, firstPieceAt: null, rehangs: 0 }, 0).timeToFirstPieceMs).toBeNull();
    expect(closeSummary({ startedAt: null, firstPieceAt: 1000, rehangs: 0 }, 0).timeToFirstPieceMs).toBeNull();
  });

  it("gives 0, not null, for a zero gap, and clamps a negative one to 0", () => {
    expect(closeSummary({ startedAt: 500, firstPieceAt: 500, rehangs: 0 }, 0).timeToFirstPieceMs).toBe(0);
    expect(closeSummary({ startedAt: 900, firstPieceAt: 500, rehangs: 0 }, 0).timeToFirstPieceMs).toBe(0);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0 seconds"],
    [999, "0 seconds"],
    [1000, "1 second"],
    [8000, "8 seconds"],
    [59999, "59 seconds"],
    [60000, "1 minute"],
    [65000, "1 minute 5 seconds"],
    [121000, "2 minutes 1 second"],
    [120000, "2 minutes"],
    [3 * 3600 * 1000, "180 minutes"],
  ])("%d ms reads %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});
