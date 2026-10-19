// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "@/components/session/Session";

// High tier (docs/test-tiers.md): SessionProvider. Functional gate: session metrics.
// Session state lives in memory only and is never stored or sent [D-040, Gap G23, D-041].

type S = ReturnType<typeof useSession>;
let current: S;

function Probe() {
  const s = useSession();
  // Hand the latest session to the test after each render.
  useEffect(() => {
    current = s;
  });
  return null;
}

const mount = () => render(<SessionProvider><Probe /></SessionProvider>);

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const choice = { workId: "w-0001", size: "18x24" as const, material: "framed" as const, frame: "black" as const };

describe("SessionProvider", () => {
  it("starts at the center with nothing chosen and a fresh clock", () => {
    mount();
    expect(current).toMatchObject({
      point: { x: 0, y: 0 },
      touched: false,
      drifted: [],
      pages: 1,
      bag: [],
      described: null,
      metrics: { startedAt: null, firstPieceAt: null, rehangs: 0 },
    });
  });

  it("starts the clock at the first pointerdown anywhere, and later events do not move it", () => {
    mount();
    fireEvent.pointerDown(document.body);
    expect(current.metrics.startedAt).toBe(1_000_000);
    vi.setSystemTime(1_005_000);
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, { key: "a" });
    expect(current.metrics.startedAt).toBe(1_000_000);
  });

  it("starts the clock at the first keydown too", () => {
    mount();
    fireEvent.keyDown(document.body, { key: "ArrowUp" });
    expect(current.metrics.startedAt).toBe(1_000_000);
  });

  it("removes its listeners when unmounted", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = mount();
    unmount();
    expect(remove.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(["pointerdown", "keydown"]));
  });

  it("moves the point and marks it touched", () => {
    mount();
    act(() => current.movePoint({ x: 0.2, y: -0.4 }));
    expect(current.point).toEqual({ x: 0.2, y: -0.4 });
    expect(current.touched).toBe(true);
    expect(current.metrics.rehangs).toBe(0);
  });

  it("counts one re-hang per call", () => {
    mount();
    act(() => current.countRehang());
    act(() => current.countRehang());
    expect(current.metrics.rehangs).toBe(2);
  });

  it("describe sets the point and what was described, and counts exactly one re-hang", () => {
    mount();
    act(() => current.describe({ x: 0.5, y: 0.1 }, { roomType: "bedroom", size: "large" }));
    expect(current.point).toEqual({ x: 0.5, y: 0.1 });
    expect(current.touched).toBe(true);
    expect(current.described).toEqual({ roomType: "bedroom", size: "large" });
    expect(current.metrics.rehangs).toBe(1);
  });

  it("records a drifted work once, and Show more adds a page", () => {
    mount();
    act(() => current.drift("w-1"));
    act(() => current.drift("w-2"));
    act(() => current.drift("w-1"));
    expect(current.drifted).toEqual(["w-1", "w-2"]);
    act(() => current.showMore());
    act(() => current.showMore());
    expect(current.pages).toBe(3);
  });

  it("adds and removes bag lines, ignoring a duplicate combination", () => {
    mount();
    act(() => current.addToBag(choice));
    act(() => current.addToBag(choice));
    act(() => current.addToBag({ ...choice, size: "12x16" }));
    expect(current.bag.map((l) => l.size)).toEqual(["18x24", "12x16"]);
    act(() => current.removeFromBag(current.bag[0].key));
    expect(current.bag.map((l) => l.size)).toEqual(["12x16"]);
  });

  it("stops the clock at the first Piece opened, only once the clock has started", () => {
    mount();
    act(() => current.openPiece());
    expect(current.metrics.firstPieceAt).toBeNull();
    fireEvent.pointerDown(document.body);
    vi.setSystemTime(1_008_000);
    act(() => current.openPiece());
    vi.setSystemTime(1_020_000);
    act(() => current.openPiece());
    expect(current.metrics.firstPieceAt).toBe(1_008_000);
  });

  it("writes nothing to storage and sends nothing [D-040]", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    mount();
    fireEvent.pointerDown(document.body);
    act(() => current.movePoint({ x: 0.3, y: 0.3 }));
    act(() => current.addToBag(choice));
    act(() => current.openPiece());
    expect(setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
    vi.unstubAllGlobals();
  });

  it("select stores the current selection, keeps it through other actions, and never touches the bag [Res #41, Gap G20]", () => {
    mount();
    expect(current.selection).toBeNull();
    const pick = { workId: "w-0002", size: "30x40" as const, material: "paper" as const, finish: "brass" as const };
    act(() => current.select(pick));
    expect(current.selection).toEqual(pick);
    expect(current.bag).toEqual([]);
    act(() => current.movePoint({ x: 0.2, y: 0.2 }));
    act(() => current.addToBag(choice));
    act(() => current.countRehang());
    expect(current.selection).toEqual(pick);
    act(() => current.select({ ...pick, size: "12x16" }));
    expect(current.selection?.size).toBe("12x16");
    expect(current.bag).toHaveLength(1);
  });

  it("throws when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useSession outside SessionProvider");
  });
});
