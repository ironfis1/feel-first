"use client";

// The visitor's session: wheel point, Drift demotions, Show more pages, metrics, the bag, the last described
// room type and size, and the current selection the Wall hangs. Held in client memory only; nothing is stored, sent or logged. A reload starts over [D-040].

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { FrameFinish, MaterialId, PrintSizeId, RoomType, SizeWord } from "@/config/feel";
import { addLine, removeLine, type BagChoice, type BagLine } from "@/lib/bag";
import { feelingAt, type WheelPoint } from "@/lib/feelings";
import { freshMetrics, interacted, pieceOpened, rehung, type Metrics } from "@/lib/metrics";

export type Described = { roomType: RoomType | null; size: SizeWord | null };

/**
 * The piece as last chosen on the Piece or the Wall [Res #41]. The finish is kept even for paper and canvas, so
 * switching back to a framed print restores it. Changing it never adds a bag line [Gap G20].
 */
export type Selection = { workId: string; size: PrintSizeId; material: MaterialId; finish: FrameFinish };

type State = {
  point: WheelPoint;
  /** True once the visitor has moved the point; the Threshold names a feeling only after that. */
  touched: boolean;
  drifted: string[];
  pages: number;
  metrics: Metrics;
  bag: BagLine[];
  described: Described | null;
  selection: Selection | null;
};

type Session = State & {
  movePoint: (p: WheelPoint) => void;
  countRehang: () => void;
  drift: (id: string) => void;
  showMore: () => void;
  describe: (p: WheelPoint, d: Described) => void;
  addToBag: (c: BagChoice) => void;
  removeFromBag: (key: string) => void;
  openPiece: () => void;
  select: (s: Selection) => void;
};

const initial: State = { point: { x: 0, y: 0 }, touched: false, drifted: [], pages: 1, metrics: freshMetrics, bag: [], described: null, selection: null };

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}

/** The current feeling's color as the glow every screen uses for its light, wash and focus ring [design-system.md]. */
export function glowStyle(p: WheelPoint): CSSProperties {
  const glow = `var(--feel-${feelingAt(p).main})`;
  return { "--glow": glow, "--glow-soft": `color-mix(in srgb, ${glow} 20%, transparent)` } as CSSProperties;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);

  // The clock starts at the first interaction on any screen [Gap G23].
  useEffect(() => {
    if (state.metrics.startedAt !== null) return;
    const start = () => setState((s) => ({ ...s, metrics: interacted(s.metrics, Date.now()) }));
    const opts = { capture: true, once: true } as const;
    document.addEventListener("pointerdown", start, opts);
    document.addEventListener("keydown", start, opts);
    return () => {
      document.removeEventListener("pointerdown", start, opts);
      document.removeEventListener("keydown", start, opts);
    };
  }, [state.metrics.startedAt]);

  // Actions are made once: setState never changes, so screens can depend on them safely.
  const actions = useMemo(
    () => ({
      movePoint: (p: WheelPoint) => setState((s) => ({ ...s, point: p, touched: true })),
      countRehang: () => setState((s) => ({ ...s, metrics: rehung(s.metrics) })),
      drift: (id: string) => setState((s) => ({ ...s, drifted: s.drifted.includes(id) ? s.drifted : [...s.drifted, id] })),
      showMore: () => setState((s) => ({ ...s, pages: s.pages + 1 })),
      describe: (p: WheelPoint, d: Described) =>
        setState((s) => ({ ...s, point: p, touched: true, described: d, metrics: rehung(s.metrics) })),
      addToBag: (c: BagChoice) => setState((s) => ({ ...s, bag: addLine(s.bag, c) })),
      removeFromBag: (key: string) => setState((s) => ({ ...s, bag: removeLine(s.bag, key) })),
      openPiece: () => setState((s) => ({ ...s, metrics: pieceOpened(s.metrics, Date.now()) })),
      select: (selection: Selection) => setState((s) => ({ ...s, selection })),
    }),
    [],
  );
  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return (
    <SessionContext.Provider value={value}>
      <div style={{ display: "contents", ...glowStyle(state.point) }}>{children}</div>
    </SessionContext.Provider>
  );
}
