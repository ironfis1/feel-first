// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contactEmail, linkedInUrl, thresholdPrompt } from "@/config/feel";
import { Bag } from "@/components/bag/Bag";
import { Close } from "@/components/close/Close";
import { SessionProvider, useSession } from "@/components/session/Session";
import { Threshold } from "@/components/threshold/Threshold";
import { bagTotals } from "@/lib/bag";
import { getWorkCards } from "@/lib/catalog";
import { feelTogether } from "@/lib/j6";
import { formatPrice } from "@/lib/pricing";

// Medium tier (docs/test-tiers.md): Threshold, Bag and Close [spec Sections 5.1, 5.5, 5.6].

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
// eslint-disable-next-line @next/next/no-img-element -- stand-in for next/image
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));

let session: ReturnType<typeof useSession>;
function Probe() {
  const s = useSession();
  // Hand the latest session to the test after each render.
  useEffect(() => {
    session = s;
  });
  return null;
}
const mount = (screenEl: ReactNode) =>
  render(
    <SessionProvider>
      <Probe />
      {screenEl}
    </SessionProvider>,
  );

let reduced = false;
beforeEach(() => {
  push.mockClear();
  reduced = false;
  window.matchMedia = ((q: string) => ({ matches: reduced && q.includes("reduce"), media: q })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Threshold", () => {
  it("shows the prompt, and names no feeling and hides Step in until the point moves", () => {
    mount(<Threshold />);
    expect(screen.getByText(thresholdPrompt)).toBeTruthy();
    const step = screen.getByText("Step in");
    expect(step.getAttribute("aria-hidden")).toBe("true");
    expect(step.getAttribute("tabindex")).toBe("-1");
    expect(screen.queryByText("Nostalgic")).toBeNull();
    act(() => session.movePoint({ x: 1, y: 1 }));
    expect(screen.getByText("Playful")).toBeTruthy();
    expect(screen.getByText("a little joyful")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Step in" }).getAttribute("tabindex")).toBe("0");
  });

  it("opens the Room after the light opens, 650 ms", () => {
    vi.useFakeTimers();
    mount(<Threshold />);
    act(() => session.movePoint({ x: 0.5, y: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "Step in" }));
    expect(push).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(649));
    expect(push).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(push).toHaveBeenCalledWith("/room");
  });

  it("opens the Room at once with reduced motion", () => {
    reduced = true;
    mount(<Threshold />);
    act(() => session.movePoint({ x: 0.5, y: 0 }));
    fireEvent.click(screen.getByRole("button", { name: "Step in" }));
    expect(push).toHaveBeenCalledWith("/room");
  });
});

describe("Bag", () => {
  const works = getWorkCards();
  const [a, b] = works;

  it("shows a way back to the Room, and no totals or suggestion, when empty [Gap G6]", () => {
    mount(<Bag works={works} />);
    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to the room" }).getAttribute("href")).toBe("/room");
    expect(screen.queryByText("Subtotal")).toBeNull();
    expect(screen.queryByText("One more for this room")).toBeNull();
  });

  it("lists each line with its choices and price, totals, how they feel together, and a suggestion not in the bag", () => {
    mount(<Bag works={works} />);
    act(() => session.addToBag({ workId: a.id, size: "18x24", material: "framed", frame: "brass" }));
    act(() => session.addToBag({ workId: b.id, size: "12x16", material: "canvas", frame: null }));
    expect(screen.getByText("18 x 24 in, framed print, brass frame")).toBeTruthy();
    expect(screen.getByText("12 x 16 in, canvas")).toBeTruthy();
    const t = bagTotals(session.bag);
    for (const v of [t.subtotal, t.shipping, t.total]) expect(screen.getAllByText(formatPrice(v)).length).toBeGreaterThan(0);
    expect(screen.getByText(`Together they feel like ${feelTogether([a, b])}.`)).toBeTruthy();
    const suggested = screen.getByRole("heading", { name: "One more for this room" }).nextElementSibling!.getAttribute("href")!;
    expect([`/piece/${a.id}`, `/piece/${b.id}`]).not.toContain(suggested);
    expect(screen.getByRole("link", { name: "Finish" }).getAttribute("href")).toBe("/close");
  });

  it("removes a line with its Remove button", () => {
    mount(<Bag works={works} />);
    act(() => session.addToBag({ workId: a.id, size: "18x24", material: "paper", frame: null }));
    fireEvent.click(screen.getByRole("button", { name: `Remove ${a.title}` }));
    expect(session.bag).toEqual([]);
    expect(screen.getByText(/Nothing here yet/)).toBeTruthy();
  });

  it("skips a line whose work is not in the list without crashing", () => {
    mount(<Bag works={works} />);
    act(() => session.addToBag({ workId: "w-gone", size: "18x24", material: "paper", frame: null }));
    act(() => session.addToBag({ workId: a.id, size: "18x24", material: "paper", frame: null }));
    expect(screen.getAllByRole("button", { name: /^Remove / })).toHaveLength(1);
  });
});

describe("Close [Res #11, RB110, Res #39]", () => {
  it("shows all four figures for a visitor who did nothing: no search, time not measured, zeros", () => {
    mount(<Close />);
    const text = screen.getByRole("main").textContent!;
    expect(text).toContain("No search typed");
    expect(text).toContain("Time to first pieceNot measured");
    expect(text).toContain("Re-hangs0");
    expect(text).toContain("Pieces chosen0");
  });

  it("shows the measured time, re-hangs and pieces chosen from the session", () => {
    vi.useFakeTimers({ now: 0 });
    mount(<Close />);
    fireEvent.pointerDown(document.body);
    vi.setSystemTime(65_000);
    act(() => session.openPiece());
    act(() => session.countRehang());
    act(() => session.addToBag({ workId: "w-1", size: "18x24", material: "paper", frame: null }));
    const text = screen.getByRole("main").textContent!;
    expect(text).toContain("Time to first piece1 minute 5 seconds");
    expect(text).toContain("Re-hangs1");
    expect(text).toContain("Pieces chosen1");
  });

  it("gives the contact links from config and always links to Signals", () => {
    mount(<Close />);
    expect(screen.getByRole("link", { name: contactEmail }).getAttribute("href")).toBe(`mailto:${contactEmail}`);
    expect(screen.getByRole("link", { name: "LinkedIn" }).getAttribute("href")).toBe(linkedInUrl);
    expect(screen.getByRole("link", { name: "Signals" }).getAttribute("href")).toBe("/signals");
  });
});
