// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { describeMaxChars, describeNoMatch, feelingSentences, roomNames, roomPageSizePerLane } from "@/config/feel";
import { Room } from "@/components/room/Room";
import { SessionProvider, useSession } from "@/components/session/Session";
import { getFeelingPositions, getWorkCards } from "@/lib/catalog";
import { moodFor, wheelPointFor } from "@/lib/feelings";
import { hang } from "@/lib/j3";

// High tier (docs/test-tiers.md): Room. Re-hang counting [Gap G13, D-041, D-052], Closer and Drift [Res #10],
// the describe box with the word map answering, the room name and Show more [spec Section 5.2]. Vitest's catalog is the fixture.
// M5 (Triage 2026-10-19, High): the describe submit through the J2 route, where only the latest answer applies,
// and the 200-character cap [D-065]. fetch is a stub; nothing leaves the test.

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
// eslint-disable-next-line @next/next/no-img-element -- stand-in for next/image
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
});

const works = getWorkCards();
const positions = getFeelingPositions();
let session: ReturnType<typeof useSession>;

function Probe() {
  const s = useSession();
  // Hand the latest session to the test after each render.
  useEffect(() => {
    session = s;
  });
  return null;
}

const mount = (cards = works) =>
  render(
    <SessionProvider>
      <Probe />
      <Room works={cards} positions={positions} />
    </SessionProvider>,
  );

const hung = () => within(screen.getByRole("list", { name: "The room" })).getAllByRole("listitem");
const hungIds = () => hung().map((li) => li.querySelector("a")!.getAttribute("href")!.replace("/piece/", ""));
// The J2 route is unreachable here, so every describe answer comes from the browser's word map [D-065].
const describeAs = async (text: string) => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  fireEvent.change(screen.getByLabelText("Or describe the moment"), { target: { value: text } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "See matches" }));
  });
};

describe("Room", () => {
  it("hangs the J3 interleave for the session mood, poster first, linking to each Piece", () => {
    mount();
    const items = hung();
    expect(items).toHaveLength(2 * roomPageSizePerLane);
    expect(items[0].getAttribute("data-lane")).toBe("poster");
    expect(hungIds()).toEqual(hang(works, moodFor({ x: 0, y: 0 }, positions), 1).map((w) => w.id));
  });

  it("names the room for the bucket, the feeling with its sentence, and no second feeling at the center", () => {
    mount();
    expect(screen.getAllByText(roomNames["mid-mid"])).toHaveLength(2); // header and slim bar [D-055]
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Nostalgic");
    expect(screen.getByText(feelingSentences.nostalgic)).toBeTruthy();
  });

  it("shows ', a little' with the second feeling between two", () => {
    mount();
    act(() => session.movePoint({ x: 1, y: 1 }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Playful, a little joyful");
  });

  it("counts a retune as a re-hang only when the hang's order changes [D-041]", () => {
    mount();
    const wheel = screen.getByRole("slider");
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(wheel);
    expect(session.metrics.rehangs).toBe(0);
    const before = hungIds();
    fireEvent.pointerDown(wheel, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(wheel, { clientX: 0, clientY: 200 });
    fireEvent.pointerMove(wheel, { clientX: 200, clientY: 0 });
    expect(session.metrics.rehangs).toBe(0); // live re-order, no count mid-gesture
    fireEvent.pointerUp(wheel);
    expect(hungIds()).not.toEqual(before);
    expect(session.metrics.rehangs).toBe(1);
  });

  it("Closer moves the point toward the work and counts one re-hang", () => {
    mount();
    act(() => session.movePoint({ x: 0.2, y: 0 }));
    const first = works.find((w) => w.id === hungIds()[0])!;
    const before = moodFor(session.point, positions);
    fireEvent.click(screen.getByRole("button", { name: `Closer to ${first.title}` }));
    const after = moodFor(session.point, positions);
    const d = (m: typeof before) => Math.hypot(m.valence - first.valence, m.arousal - first.arousal);
    expect(d(after)).toBeLessThan(d(before));
    expect(session.metrics.rehangs).toBe(1);
    expect(session.drifted).toEqual([]);
  });

  it("Drift moves the point away, demotes the work out of the first page, and counts one re-hang", () => {
    mount();
    act(() => session.movePoint({ x: 0.2, y: 0 }));
    const first = works.find((w) => w.id === hungIds()[0])!;
    const before = moodFor(session.point, positions);
    fireEvent.click(screen.getByRole("button", { name: `Drift from ${first.title}` }));
    const after = moodFor(session.point, positions);
    const d = (m: typeof before) => Math.hypot(m.valence - first.valence, m.arousal - first.arousal);
    expect(d(after)).toBeGreaterThan(d(before));
    expect(session.drifted).toEqual([first.id]);
    expect(hungIds()).not.toContain(first.id);
    expect(session.metrics.rehangs).toBe(1);
  });

  it("a described moment moves the point, adds the room type to the room name, and counts one re-hang", async () => {
    mount();
    await describeAs("calm morning in the bedroom");
    expect(session.metrics.rehangs).toBe(1);
    expect(session.point).not.toEqual({ x: 0, y: 0 });
    expect(session.described).toEqual({ roomType: "bedroom", size: null });
    expect(screen.getAllByText(/ for the bedroom$/)).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("a moment with no mood word changes nothing, counts no re-hang, and says so until the text changes [D-052]", async () => {
    mount();
    const before = hungIds();
    await describeAs("sunday coffee");
    expect(screen.getByRole("status").textContent).toBe(describeNoMatch);
    expect(session.metrics.rehangs).toBe(0);
    expect(session.point).toEqual({ x: 0, y: 0 });
    expect(session.described).toBeNull();
    expect(hungIds()).toEqual(before);
    fireEvent.change(screen.getByLabelText("Or describe the moment"), { target: { value: "sunday coffee c" } });
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("applies the J2 route's answer: the point, the room type and the size [D-065]", async () => {
    const body = { valence: -0.5, arousal: -0.4, roomType: "office", size: "small", heard: ["harbor"] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body }));
    mount();
    fireEvent.change(screen.getByLabelText("Or describe the moment"), { target: { value: "a grey harbor" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "See matches" }));
    });
    expect(session.point).toEqual(wheelPointFor(body, positions));
    expect(session.described).toEqual({ roomType: "office", size: "small" });
    expect(session.metrics.rehangs).toBe(1);
  });

  it("applies only the latest submission when an earlier answer arrives last", async () => {
    const late = { valence: 0.9, arousal: 0.9, roomType: "kitchen", size: "large", heard: ["joy"] };
    const latest = { valence: -0.6, arousal: -0.6, roomType: "bedroom", size: "small", heard: ["calm"] };
    let finishFirst: (v: unknown) => void = () => {};
    const fetchStub = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => latest });
    vi.stubGlobal("fetch", fetchStub);
    mount();
    const box = screen.getByLabelText("Or describe the moment");
    const ask = async (text: string) => {
      fireEvent.change(box, { target: { value: text } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "See matches" }));
      });
    };
    await ask("joy");
    await ask("calm");
    await act(async () => finishFirst({ ok: true, status: 200, json: async () => late }));
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(session.described).toEqual({ roomType: "bedroom", size: "small" });
    expect(session.point).toEqual(wheelPointFor(latest, positions));
    expect(session.metrics.rehangs).toBe(1);
  });

  it("caps the describe box at 200 characters", () => {
    mount();
    expect((screen.getByLabelText("Or describe the moment") as HTMLInputElement).maxLength).toBe(describeMaxChars);
    expect(describeMaxChars).toBe(200);
  });

  it("an empty box sends nothing and moves nothing", async () => {
    const fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);
    mount();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "See matches" }));
    });
    expect(fetchStub).not.toHaveBeenCalled();
    expect(session.described).toBeNull();
    expect(session.metrics.rehangs).toBe(0);
  });

  it("adds no room type to the name when none was described", async () => {
    mount();
    await describeAs("calm");
    expect(screen.queryByText(/ for the /)).toBeNull();
  });

  it("offers Show more only while a lane has more, and each click adds a page", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(session.pages).toBe(2);
    expect(hung()).toHaveLength(24); // the fixture has 12 per lane
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
    cleanup();
    mount(works.slice(0, 6));
    expect(screen.queryByRole("button", { name: "Show more" })).toBeNull();
  });

  it("shows the slim bar with the wheel only once the header has scrolled away [D-055]", () => {
    let report: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(cb: typeof report) {
          report = cb;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { unmount } = mount();
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    act(() => report([{ isIntersecting: false }]));
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    act(() => report([{ isIntersecting: true }]));
    expect(screen.getAllByRole("slider")).toHaveLength(1);
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
