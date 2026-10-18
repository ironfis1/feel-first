// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { frameWidthIn, matWidthIn, pieceDefaults, printSizes } from "@/config/feel";
import { Piece } from "@/components/piece/Piece";
import { Preview } from "@/components/piece/Preview";
import { SessionProvider, useSession } from "@/components/session/Session";
import { bucketKeys, bucketOf, type BucketKey } from "@/lib/buckets";
import { getAllWorks, getFeelingPositions } from "@/lib/catalog";
import { moodFor } from "@/lib/feelings";
import { formatPrice, framedOuterInches, priceOf } from "@/lib/pricing";

// Medium tier (docs/test-tiers.md): Piece and Preview. Choices with prices [Gap G5, D-048], defaults [D-054],
// a described size [Res #6], the why line by bucket [Res #9], Add to bag [Gap G20], the framed preview [Gap G29].

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));

afterEach(cleanup);

const positions = getFeelingPositions();
const works = getAllWorks();
const portrait = works.find((w) => w.height > w.width)!;
const landscape = works.find((w) => w.width > w.height)!;
const lines = Object.fromEntries(bucketKeys.map((k) => [k, `Why for ${k}.`])) as Record<BucketKey, string>;

let session: ReturnType<typeof useSession>;
function Probe() {
  const s = useSession();
  // Hand the latest session to the test after each render.
  useEffect(() => {
    session = s;
  });
  return null;
}

/** Opens the Piece only on request, so session state can be set before it mounts. */
function Gate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? children : <button onClick={() => setOpen(true)}>open</button>;
}

const mount = (work = portrait, withLines: typeof lines | "none" = lines) =>
  render(
    <SessionProvider>
      <Probe />
      <Gate>
        <Piece work={work} lines={withLines === "none" ? undefined : withLines} positions={positions} />
      </Gate>
    </SessionProvider>,
  );
const open = () => fireEvent.click(screen.getByRole("button", { name: "open" }));
const pressed = (group: string) =>
  screen
    .getByRole("group", { name: group })
    .querySelectorAll('[aria-pressed="true"]');

describe("Piece", () => {
  it("starts on 18x24, framed, black when nothing was described [D-054]", () => {
    mount();
    open();
    expect(pieceDefaults).toEqual({ size: "18x24", material: "framed", frame: "black" });
    expect(pressed("Size")[0].textContent).toContain("18 x 24 in");
    expect(pressed("Material")[0].textContent).toContain("Framed print");
    expect(pressed("Frame")[0].textContent).toContain("Black");
  });

  it("starts on the described size [Res #6]", () => {
    mount();
    act(() => session.describe({ x: 0.3, y: 0 }, { roomType: null, size: "small" }));
    open();
    expect(pressed("Size")[0].textContent).toContain("12 x 16 in");
  });

  it("prices each size at the chosen material and each material at the chosen size", () => {
    mount();
    open();
    const sizes = screen.getByRole("group", { name: "Size" }).querySelectorAll("button");
    printSizes.forEach((p, i) => expect(sizes[i].textContent).toContain(formatPrice(priceOf(p.id, "framed"))));
    fireEvent.click(screen.getByRole("button", { name: /^Paper print/ }));
    printSizes.forEach((p, i) => expect(sizes[i].textContent).toContain(formatPrice(priceOf(p.id, "paper"))));
    fireEvent.click(screen.getByRole("button", { name: /^30 x 40 in/ }));
    expect(screen.getByRole("button", { name: /^Canvas/ }).textContent).toContain(formatPrice(priceOf("30x40", "canvas")));
  });

  it("offers frames only for a framed print", () => {
    mount();
    open();
    expect(screen.getByRole("group", { name: "Frame" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Canvas/ }));
    expect(screen.queryByRole("group", { name: "Frame" })).toBeNull();
  });

  it("adds the chosen print to the bag once, then reads In your bag until the choice changes", () => {
    mount();
    open();
    fireEvent.click(screen.getByRole("button", { name: /^Brass/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(session.bag).toMatchObject([{ workId: portrait.id, size: "18x24", material: "framed", frame: "brass", price: 294 }]);
    const done = screen.getByRole("button", { name: "In your bag" }) as HTMLButtonElement;
    expect(done.disabled).toBe(true);
    expect(screen.getByRole("link", { name: "View your bag" }).getAttribute("href")).toBe("/bag");
    fireEvent.click(screen.getByRole("button", { name: /^Paper print/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add to bag" }));
    expect(session.bag[1]).toMatchObject({ material: "paper", frame: null, price: 69 });
  });

  it("shows the why line for the bucket of the visitor's mood, and none when the work has no copy", () => {
    mount();
    act(() => session.movePoint({ x: 0.9, y: 0.3 }));
    open();
    const m = moodFor(session.point, positions);
    expect(screen.getByText(`Why for ${bucketOf(m.valence, m.arousal)}.`)).toBeTruthy();
    cleanup();
    mount(portrait, "none");
    open();
    expect(screen.queryByText(/^Why for/)).toBeNull();
  });

  it("stops the time-to-first-piece clock when it opens", () => {
    mount();
    fireEvent.pointerDown(document.body);
    expect(session.metrics.firstPieceAt).toBeNull();
    open();
    expect(session.metrics.firstPieceAt).not.toBeNull();
  });

  it("shows the top three tags, a link to the Wall, and credits ending each field once", () => {
    mount();
    open();
    expect(screen.getByText(portrait.tags.slice(0, 3).join(", "))).toBeTruthy();
    expect(screen.getByRole("link", { name: "Hang it" }).getAttribute("href")).toBe("/wall");
    const credits = screen.getByText((_, el) => el?.tagName === "P" && el.textContent?.includes(portrait.source) === true && el.textContent.endsWith(".") === true);
    expect(credits.textContent).not.toMatch(/\.\./);
    expect(credits.textContent).toContain(portrait.title);
    expect(credits.textContent).toContain(portrait.license);
  });
});

describe("Preview: the framed preview drawn in code [Gap G29, Res #42]", () => {
  const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

  it("shows the plain work with no frame for paper and canvas", () => {
    const { container } = render(<Preview work={portrait} size="18x24" frame={null} />);
    expect(container.querySelector("[data-frame]")).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("draws frame and mat at their true widths for a portrait work, matching framedOuterInches", () => {
    const { container } = render(<Preview work={portrait} size="18x24" frame="natural oak" />);
    const frame = container.querySelector("[data-frame]") as HTMLElement;
    const outer = framedOuterInches("18x24");
    expect(frame.getAttribute("data-frame")).toBe("natural oak");
    expect(frame.style.padding).toBe(pct(frameWidthIn / outer.width));
    expect((frame.firstElementChild as HTMLElement).style.padding).toBe(pct(matWidthIn / (outer.width - 2 * frameWidthIn)));
    expect(frame.style.background).toContain("--finish-natural-oak");
    const print = frame.firstElementChild!.firstElementChild as HTMLElement;
    expect(print.style.aspectRatio).toBe("18 / 24");
  });

  it("turns the print to landscape for a landscape work", () => {
    const { container } = render(<Preview work={landscape} size="12x16" frame="black" />);
    const frame = container.querySelector("[data-frame]") as HTMLElement;
    expect(frame.style.padding).toBe(pct(frameWidthIn / (16 + 2 * (matWidthIn + frameWidthIn))));
    expect((frame.firstElementChild!.firstElementChild as HTMLElement).style.aspectRatio).toBe("16 / 12");
  });

  it("fades the source image in over the thumbnail when it loads", () => {
    const { container } = render(<Preview work={portrait} size="18x24" frame={null} />);
    const full = container.querySelector(`img[src="${portrait.imageUrl}"]`) as HTMLImageElement;
    expect(full.getAttribute("referrerpolicy")).toBe("no-referrer");
    const before = full.className;
    fireEvent.load(full);
    expect(full.className).not.toBe(before);
  });
});
