// Session metrics shown on Close: computed in the browser, never stored or sent [spec Section 5.6, Res #11, Res #36, D-040].

export type Metrics = {
  /** Time of the visitor's first interaction on any screen, in ms [Res #11, Gap G23]. */
  startedAt: number | null;
  /** Time the first Piece screen opened, in ms [Res #11]. */
  firstPieceAt: number | null;
  /** Re-hangs: one per completed retune gesture, describe submission, Closer or Drift [Gap G13, D-041]. */
  rehangs: number;
};

export const freshMetrics: Metrics = Object.freeze({ startedAt: null, firstPieceAt: null, rehangs: 0 });

/** Starts the clock at the first interaction; later interactions change nothing [Gap G23]. */
export function interacted(m: Metrics, now: number): Metrics {
  return m.startedAt === null ? { ...m, startedAt: now } : m;
}

/** Stops the clock when the first Piece screen opens. Only the first opening counts, and only once the clock has started. */
export function pieceOpened(m: Metrics, now: number): Metrics {
  return m.startedAt !== null && m.firstPieceAt === null ? { ...m, firstPieceAt: now } : m;
}

export function rehung(m: Metrics): Metrics {
  return { ...m, rehangs: m.rehangs + 1 };
}

export type CloseSummary = {
  /** Always shown: the journey has no search box [Res #11, upheld by Res #52]. */
  noSearchTyped: true;
  /** Null when not measured: the visitor never interacted or never opened a Piece. */
  timeToFirstPieceMs: number | null;
  rehangs: number;
  /** Equals the number of bag lines [Res #11]. */
  piecesChosen: number;
};

export function closeSummary(m: Metrics, bagLines: number): CloseSummary {
  const t = m.startedAt !== null && m.firstPieceAt !== null ? Math.max(0, m.firstPieceAt - m.startedAt) : null;
  return { noSearchTyped: true, timeToFirstPieceMs: t, rehangs: m.rehangs, piecesChosen: bagLines };
}

/** "8 seconds", "1 minute 5 seconds": whole seconds, rounded down. */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  const s = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return min ? (sec ? `${s(min, "minute")} ${s(sec, "second")}` : s(min, "minute")) : s(sec, "second");
}
