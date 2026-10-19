// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frameWidthIn, matWidthIn, photoCopy, wallSceneHeightIn, wallSceneReferenceWidthIn, wallScenes } from "@/config/feel";
import { SessionProvider, useSession } from "@/components/session/Session";
import { HungPrint, useWidths } from "@/components/wall/Hung";
import { SceneObject } from "@/components/wall/Scenes";
import { Wall } from "@/components/wall/Wall";
import { getFeelingPositions, getWorkCards } from "@/lib/catalog";
import { moodFor } from "@/lib/feelings";
import { hang } from "@/lib/j3";
import { formatPrice, priceOf } from "@/lib/pricing";

// High tier (docs/test-tiers.md): Wall. Medium: PhotoWall, useWidths, HungPrint, SceneObject.
// Functional gates: a frame or size change on the Wall updates the selection and creates no bag line (D-073, D-076);
// Add to bag creates exactly one line and opens the Bag (D-077); the photo's object URL is made on choice and
// revoked when replaced, on leaving photo mode and on unmount (D-067, D-078). The default work is D-069, the
// scene D-062 and D-070, the photo bounds D-072.

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const works = getWorkCards();
const positions = getFeelingPositions();
const portrait = works.find((w) => w.height > w.width)!;

// jsdom does no layout: every element reports this width, and resize observers are fired by hand.
let stageWidth = 1000;
let observers: (() => void)[] = [];
let urls = 0;
const createObjectURL = vi.fn(() => `blob:photo-${++urls}`);
const revokeObjectURL = vi.fn();

beforeEach(() => {
  stageWidth = 1000;
  observers = [];
  urls = 0;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => stageWidth });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private cb: () => void) {}
      observe() {
        observers.push(this.cb);
      }
      disconnect() {
        observers = observers.filter((o) => o !== this.cb);
      }
    },
  );
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  cleanup();
  push.mockClear();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.unstubAllGlobals();
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

let session: ReturnType<typeof useSession>;
function Probe() {
  const s = useSession();
  useEffect(() => {
    session = s;
  });
  return null;
}

/** Opens the Wall only on request, so session state can be set before it mounts. */
function Gate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? children : <button onClick={() => setOpen(true)}>open</button>;
}

const mount = () =>
  render(
    <SessionProvider>
      <Probe />
      <Gate>
        <Wall works={works} positions={positions} />
      </Gate>
    </SessionProvider>,
  );
const open = () => fireEvent.click(screen.getByRole("button", { name: "open" }));
const stage = () => document.querySelector("[data-scene]") as HTMLElement;
const spec = () => document.querySelector("header")!.querySelectorAll("p")[1].textContent;
const total = () => screen.getByText(/^\$/, { selector: "p" }).textContent;
const file = (name = "wall.jpg") => new File(["x"], name, { type: "image/jpeg" });

describe("Wall: what hangs [D-069, Res #41]", () => {
  it("hangs the Room's first work at the Piece defaults when nothing was chosen", () => {
    mount();
    open();
    const first = hang(works, moodFor(session.point, positions), 1, [])[0];
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(first.title);
    expect(spec()).toBe("18 x 24 in, framed print, black frame");
  });

  it("uses a described size when nothing was chosen", () => {
    mount();
    act(() => session.describe({ x: 0.2, y: 0 }, { roomType: null, size: "large" }));
    open();
    expect(spec()).toBe("30 x 40 in, framed print, black frame");
  });

  it("hangs the current selection", () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "12x16", material: "canvas", finish: "white" }));
    open();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(portrait.title);
    expect(spec()).toBe("12 x 16 in, canvas");
    expect(total()).toBe(formatPrice(priceOf("12x16", "canvas")));
  });
});

describe("Wall: the preset wall at true scale [D-062, D-071]", () => {
  it("opens on the scene for the described room type, the sofa otherwise, and switches scenes", () => {
    mount();
    open();
    expect(stage().dataset.scene).toBe("sofa");
    cleanup();
    for (const [roomType, scene] of [["bedroom", "bed"], ["office", "desk"], ["kitchen", "sofa"]] as const) {
      mount();
      act(() => session.describe({ x: 0, y: 0 }, { roomType, size: null }));
      open();
      expect(stage().dataset.scene).toBe(scene);
      cleanup();
    }
    mount();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Desk" }));
    expect(stage().dataset.scene).toBe("desk");
    expect(screen.getByRole("button", { name: "Desk" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("sizes the piece and the furniture from the stage width over the wall span", () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "18x24", material: "framed", finish: "black" }));
    open();
    // A 1024px window shows 144 inches, so a 1000px stage is 1000 / 144 pixels per inch.
    const ppi = 1000 / 144;
    expect(stage().dataset.ppi).toBe(ppi.toFixed(4));
    const piece = stage().querySelector("[data-frame]")!.parentElement as HTMLElement;
    expect(parseFloat(piece.style.width)).toBeCloseTo(24.5 * ppi, 6);
    expect(parseFloat(piece.style.height)).toBeCloseTo(30.5 * ppi, 6);
    expect(parseFloat(piece.style.bottom)).toBeCloseTo(42 * ppi, 6);
    expect(Number(stage().querySelector("svg")!.getAttribute("width"))).toBeCloseTo(84 * ppi, 6);
  });

  it("draws nothing on the stage until it is measured", () => {
    stageWidth = 0;
    mount();
    open();
    expect(stage().querySelector("img")).toBeNull();
    expect(stage().querySelector("svg")).toBeNull();
  });

  it("changes the wall paint", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Ink blue" }));
    expect(stage().style.getPropertyValue("--wall")).toBe("var(--wall-ink-blue)");
  });
});

describe("Wall: choices change the selection, never the bag [Gap G20, D-073, D-076]", () => {
  it("a size choice updates the selection, the price and the hung size, with no bag line", () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "18x24", material: "framed", finish: "black" }));
    open();
    fireEvent.click(screen.getByRole("button", { name: /^24 x 36 in/ }));
    expect(session.selection).toEqual({ workId: portrait.id, size: "24x36", material: "framed", finish: "black" });
    expect(total()).toBe(formatPrice(priceOf("24x36", "framed")));
    expect(spec()).toBe("24 x 36 in, framed print, black frame");
    expect(session.bag).toEqual([]);
  });

  it("prices each size at the current material", () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "18x24", material: "paper", finish: "black" }));
    open();
    expect(screen.getByRole("button", { name: /^30 x 40 in/ }).textContent).toContain(formatPrice(priceOf("30x40", "paper")));
  });

  it("a finish frames the print, No frame makes it paper, and neither adds a bag line", () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "18x24", material: "canvas", finish: "black" }));
    open();
    expect(screen.getByRole("button", { name: "No frame" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Brass" }));
    expect(session.selection).toMatchObject({ material: "framed", finish: "brass" });
    expect(spec()).toBe("18 x 24 in, framed print, brass frame");
    fireEvent.click(screen.getByRole("button", { name: "No frame" }));
    expect(session.selection).toMatchObject({ material: "paper", finish: "brass" });
    expect(spec()).toBe("18 x 24 in, paper print");
    expect(session.bag).toEqual([]);
  });
});

describe("Wall: Add to bag opens the Bag [Gap G20, D-077]", () => {
  it("adds exactly one line with the current size, material and frame, then opens the Bag", () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "18x24", material: "framed", finish: "black" }));
    open();
    fireEvent.click(screen.getByRole("button", { name: /^30 x 40 in/ }));
    fireEvent.click(screen.getByRole("button", { name: "White" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(session.bag).toMatchObject([{ workId: portrait.id, size: "30x40", material: "framed", frame: "white", price: priceOf("30x40", "framed") }]);
    expect(push).toHaveBeenCalledWith("/bag");
    expect(screen.queryByRole("link", { name: "View your bag" })).toBeNull();
  });

  it("reads In your bag when the choice is already there, opens the Bag again and adds nothing", () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "18x24", material: "framed", finish: "black" }));
    act(() => session.addToBag({ workId: portrait.id, size: "18x24", material: "framed", frame: "black" }));
    open();
    const done = screen.getByRole("button", { name: "In your bag" }) as HTMLButtonElement;
    expect(done.disabled).toBe(false);
    fireEvent.click(done);
    expect(session.bag).toHaveLength(1);
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/bag");
    fireEvent.click(screen.getByRole("button", { name: "Brass" }));
    expect(screen.getByRole("button", { name: "Add to bag" })).toBeTruthy();
  });
});

describe("Wall: the photo stays on this device [D-067, D-078]", () => {
  it("one choice opens photo mode with an object URL, and the URL is revoked when replaced, on leaving and on unmount", () => {
    const { unmount } = mount();
    open();
    fireEvent.change(screen.getByLabelText(photoCopy.choose), { target: { files: [file()] } });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect((screen.getByAltText("Your wall") as HTMLImageElement).src).toBe("blob:photo-1");
    expect(screen.queryByRole("group", { name: "Scene" })).toBeNull();
    expect(screen.getByRole("group", { name: "Frame" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(photoCopy.another), { target: { files: [file("b.jpg")] } });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
    expect((screen.getByAltText("Your wall") as HTMLImageElement).src).toBe("blob:photo-2");

    fireEvent.click(screen.getByRole("button", { name: photoCopy.preset }));
    expect(revokeObjectURL).toHaveBeenLastCalledWith("blob:photo-2");
    expect(stage()).toBeTruthy();

    fireEvent.change(screen.getByLabelText(photoCopy.choose), { target: { files: [file()] } });
    unmount();
    expect(revokeObjectURL).toHaveBeenLastCalledWith("blob:photo-3");
    expect(revokeObjectURL).toHaveBeenCalledTimes(3);
  });

  it("stays on the preset wall when the chooser is cancelled", () => {
    mount();
    open();
    fireEvent.change(screen.getByLabelText(photoCopy.choose), { target: { files: [] } });
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(stage()).toBeTruthy();
  });
});

describe("PhotoWall: the manual scale [Res #12, D-072]", () => {
  // A 2000 x 1000 photo on a 1000px stage is 500px tall. The starting line runs from 35% to 65% across: 300px.
  const enterPhoto = () => {
    mount();
    act(() => session.select({ workId: portrait.id, size: "18x24", material: "paper", finish: "black" }));
    open();
    fireEvent.change(screen.getByLabelText(photoCopy.choose), { target: { files: [file()] } });
    const img = screen.getByAltText("Your wall");
    Object.defineProperties(img, { naturalWidth: { value: 2000 }, naturalHeight: { value: 1000 } });
    fireEvent.load(img);
  };
  const photoStage = () => screen.getByAltText("Your wall").parentElement as HTMLElement;
  const ppi = () => photoStage().dataset.ppi;
  const length = () => screen.getByLabelText(photoCopy.lengthLabel);
  const note = () => screen.getByRole("status").textContent;
  const end = () => screen.getByRole("button", { name: "End of the line" });

  it("applies line over length when a length in range is entered, and hangs the piece at that scale", () => {
    enterPhoto();
    expect(ppi()).toBe("");
    fireEvent.change(length(), { target: { value: "36" } });
    expect(ppi()).toBe((300 / 36).toFixed(4));
    // The hung print's box: the parent of the paper print around the art.
    const piece = screen.getByAltText(`${portrait.title}, ${portrait.artist}`).parentElement!.parentElement as HTMLElement;
    expect(parseFloat(piece.style.width)).toBeCloseTo(18 * (300 / 36), 6);
    expect(note()).toBe("");
  });

  it("shows the out-of-range note and keeps the last scale for a length outside 2 to 200", () => {
    enterPhoto();
    fireEvent.change(length(), { target: { value: "36" } });
    fireEvent.change(length(), { target: { value: "500" } });
    expect(note()).toBe(photoCopy.outOfRange);
    expect(note()).toBe("Enter a length from 2 to 200 inches.");
    expect(ppi()).toBe((300 / 36).toFixed(4));
    fireEvent.change(length(), { target: { value: "" } });
    expect(note()).toBe("");
  });

  it("moves an end 2px per arrow key, 20px with Shift, and re-applies the scale", () => {
    enterPhoto();
    fireEvent.change(length(), { target: { value: "30" } });
    fireEvent.keyDown(end(), { key: "ArrowRight" });
    expect(ppi()).toBe((302 / 30).toFixed(4));
    fireEvent.keyDown(end(), { key: "ArrowRight", shiftKey: true });
    expect(ppi()).toBe((322 / 30).toFixed(4));
    fireEvent.keyDown(end(), { key: "ArrowLeft", shiftKey: true });
    fireEvent.keyDown(end(), { key: "ArrowLeft" });
    expect(ppi()).toBe((300 / 30).toFixed(4));
    // Down 20px on a horizontal 300px line makes it the hypotenuse.
    fireEvent.keyDown(end(), { key: "ArrowDown", shiftKey: true });
    expect(ppi()).toBe((Math.hypot(300, 20) / 30).toFixed(4));
    fireEvent.keyDown(end(), { key: "ArrowUp", shiftKey: true });
    expect(ppi()).toBe((300 / 30).toFixed(4));
  });

  it("ignores other keys and lets them through", () => {
    enterPhoto();
    fireEvent.change(length(), { target: { value: "30" } });
    expect(fireEvent.keyDown(end(), { key: "a" })).toBe(true);
    expect(fireEvent.keyDown(end(), { key: "ArrowRight" })).toBe(false);
  });

  it("stops an end at the edge of the photo", () => {
    enterPhoto();
    fireEvent.change(length(), { target: { value: "50" } });
    for (let i = 0; i < 30; i++) fireEvent.keyDown(end(), { key: "ArrowRight", shiftKey: true });
    // From 35% to the right edge: 650px.
    expect(ppi()).toBe((650 / 50).toFixed(4));
  });

  it("asks for a longer line when the line is under 20px, keeping the last scale", () => {
    enterPhoto();
    fireEvent.change(length(), { target: { value: "30" } });
    // 300px less 13 steps of 20px is 40px, then 11 steps of 2px is 18px. The exact 20px edge is in wall.test.ts.
    for (let i = 0; i < 13; i++) fireEvent.keyDown(end(), { key: "ArrowLeft", shiftKey: true });
    expect(ppi()).toBe((40 / 30).toFixed(4));
    for (let i = 0; i < 10; i++) fireEvent.keyDown(end(), { key: "ArrowLeft" });
    const before = ppi();
    fireEvent.keyDown(end(), { key: "ArrowLeft" });
    expect(note()).toBe(photoCopy.shortLine);
    expect(ppi()).toBe(before);
  });

  it("draws a new line by dragging across the photo", () => {
    enterPhoto();
    const draw = photoStage().querySelector("svg")!.parentElement as HTMLElement;
    draw.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 500, right: 1000, bottom: 500, x: 0, y: 0, toJSON: () => ({}) });
    draw.setPointerCapture = vi.fn();
    fireEvent.change(length(), { target: { value: "40" } });
    fireEvent.pointerDown(draw, { clientX: 100, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(draw, { clientX: 600, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(draw, { pointerId: 1 });
    expect(draw.setPointerCapture).toHaveBeenCalledWith(1);
    expect(ppi()).toBe((500 / 40).toFixed(4));
    // A move with no button down changes nothing.
    fireEvent.pointerMove(draw, { clientX: 900, clientY: 50 });
    expect(ppi()).toBe((500 / 40).toFixed(4));
  });

  it("keeps the scale as a share of the stage when the stage is resized", () => {
    enterPhoto();
    fireEvent.change(length(), { target: { value: "36" } });
    stageWidth = 500;
    act(() => observers.forEach((o) => o()));
    expect(ppi()).toBe(((300 / 36) * 0.5).toFixed(4));
  });
});

describe("useWidths", () => {
  function Measured({ show }: { show: boolean }) {
    const [ref, widths] = useWidths();
    return (
      <>
        <p data-testid="w">{`${widths.stage} ${widths.window}`}</p>
        {show && <div ref={ref} />}
      </>
    );
  }

  it("is zero until an element is attached, then measures it and the window, and follows resizes", () => {
    const { rerender } = render(<Measured show={false} />);
    expect(screen.getByTestId("w").textContent).toBe("0 0");
    rerender(<Measured show />);
    expect(screen.getByTestId("w").textContent).toBe(`1000 ${window.innerWidth}`);
    stageWidth = 640;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(screen.getByTestId("w").textContent).toBe(`640 ${window.innerWidth}`);
  });

  it("stops watching when unmounted", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Measured show />);
    expect(observers).toHaveLength(1);
    unmount();
    expect(observers).toHaveLength(0);
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("still measures once without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(<Measured show />);
    expect(screen.getByTestId("w").textContent).toBe(`1000 ${window.innerWidth}`);
  });
});

describe("HungPrint and SceneObject [Res #41, Gap G28, Gap G30]", () => {
  it("shows an unframed print as the work alone", () => {
    const { container } = render(<HungPrint work={portrait} ppi={10} frame={null} print={{ width: 18, height: 24 }} />);
    expect(container.querySelector("[data-frame]")).toBeNull();
    expect(screen.getByAltText(`${portrait.title}, ${portrait.artist}`)).toBeTruthy();
  });

  it("draws the frame and mat at their true widths around the print", () => {
    const { container } = render(<HungPrint work={portrait} ppi={10} frame="natural oak" print={{ width: 18, height: 24 }} />);
    const frame = container.querySelector("[data-frame]") as HTMLElement;
    expect(frame.dataset.frame).toBe("natural oak");
    expect(frame.style.padding).toBe(`${frameWidthIn * 10}px`);
    expect(frame.style.background).toBe("var(--finish-natural-oak)");
    const mat = frame.firstElementChild as HTMLElement;
    expect(mat.style.padding).toBe(`${matWidthIn * 10}px`);
    const print = mat.firstElementChild as HTMLElement;
    expect([print.style.width, print.style.height]).toEqual(["180px", "240px"]);
  });

  it("draws each scene's furniture at its true width and height", () => {
    for (const scene of wallScenes) {
      const { container, unmount } = render(<SceneObject scene={scene} ppi={4} />);
      const svg = container.querySelector("svg")!;
      const [w, h] = [wallSceneReferenceWidthIn[scene], wallSceneHeightIn[scene]];
      expect(svg.getAttribute("viewBox")).toBe(`0 0 ${w} ${h}`);
      expect([Number(svg.getAttribute("width")), Number(svg.getAttribute("height"))]).toEqual([w * 4, h * 4]);
      unmount();
    }
  });
});
