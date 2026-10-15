"use client";

// The visitor's session: wheel point, Drift demotions, Show more pages, metrics, the bag and the last described
// room type and size. Held in client memory only; nothing is stored, sent or logged. A reload starts over [D-040].

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { RoomType, SizeWord } from "@/config/feel";
import { addLine, removeLine, type BagChoice, type BagLine } from "@/lib/bag";
import { feelingAt, type WheelPoint } from "@/lib/feelings";
import { freshMetrics, interacted, pieceOpened, rehung, type Metrics } from "@/lib/metrics";

export type Described = { roomType: RoomType | null; size: SizeWord | null };

type State = {
  point: WheelPoint;
  /** True once the visitor has moved the point; the Threshold names a feeling only after that. */
  touched: boolean;
  drifted: string[];
  pages: number;
  metrics: Metrics;
  bag: BagLine[];
  described: Described | null;
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
};

const initial: State = { point: { x: 0, y: 0 }, touched: false, drifted: [], pages: 1, metrics: freshMetrics, bag: [], described: null };

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

  const movePoint = useCallback((p: WheelPoint) => setState((s) => ({ ...s, point: p, touched: true })), []);
  const countRehang = useCallback(() => setState((s) => ({ ...s, metrics: rehung(s.metrics) })), []);
  const drift = useCallback(
    (id: string) => setState((s) => ({ ...s, drifted: s.drifted.includes(id) ? s.drifted : [...s.drifted, id] })),
    [],
  );
  const showMore = useCallback(() => setState((s) => ({ ...s, pages: s.pages + 1 })), []);
  const describe = useCallback(
    (p: WheelPoint, d: Described) => setState((s) => ({ ...s, point: p, touched: true, described: d, metrics: rehung(s.metrics) })),
    [],
  );
  const addToBag = useCallback((c: BagChoice) => setState((s) => ({ ...s, bag: addLine(s.bag, c) })), []);
  const removeFromBag = useCallback((key: string) => setState((s) => ({ ...s, bag: removeLine(s.bag, key) })), []);
  const openPiece = useCallback(() => setState((s) => ({ ...s, metrics: pieceOpened(s.metrics, Date.now()) })), []);

  const value = useMemo(
    () => ({ ...state, movePoint, countRehang, drift, showMore, describe, addToBag, removeFromBag, openPiece }),
    [state, movePoint, countRehang, drift, showMore, describe, addToBag, removeFromBag, openPiece],
  );

  return (
    <SessionContext.Provider value={value}>
      <div style={{ display: "contents", ...glowStyle(state.point) }}>{children}</div>
    </SessionContext.Provider>
  );
}
