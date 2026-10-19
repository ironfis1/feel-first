// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { contactEmail, linkedInUrl, roomNames } from "@/config/feel";
import { SessionProvider, useSession } from "@/components/session/Session";
import { Signals } from "@/components/signals/Signals";
import { bucketKeys, type BucketKey } from "@/lib/buckets";
import { getFeelingPositions, getSignals, getWorkCards } from "@/lib/catalog";
import type { FeelingPositions } from "@/lib/feelings";

// High tier (docs/test-tiers.md): Signals [spec Section 5.7, Gap G26, Res #36]. Strings are D-079, the order is
// D-068 (findings, your session, the ask, then contact). The session panel reads client memory only.

let session: ReturnType<typeof useSession>;
function Probe() {
  const s = useSession();
  // Hand the latest session to the test after each render.
  useEffect(() => {
    session = s;
  });
  return null;
}

const signals = getSignals();
const works = getWorkCards();
const realPositions = getFeelingPositions();

/** Every feeling at one mood, so a point on the wheel's edge reads exactly that valence and arousal. */
const allAt = (valence: number, arousal: number) =>
  Object.fromEntries(Object.keys(realPositions).map((f) => [f, { valence, arousal }])) as FeelingPositions;

const mount = (positions: FeelingPositions = realPositions) =>
  render(
    <SessionProvider>
      <Probe />
      <Signals signals={signals} works={works} positions={positions} />
    </SessionProvider>,
  );

/** Puts the visitor's mood exactly at (valence, arousal): the point sits on the edge, so the blend is not scaled. */
const moodAt = (valence: number, arousal: number) => {
  mount(allAt(valence, arousal));
  act(() => session.movePoint({ x: 1, y: 0 }));
};

const grid = () => screen.getByRole("img", { name: /^The nine mood segments/ });
const dot = () => grid().querySelector<HTMLElement>("span[style]")!;
const marked = () => [...grid().querySelectorAll("[data-mine]")].map((c) => c.textContent);

afterEach(cleanup);

describe("Signals findings [RB101, Res #38, D-079]", () => {
  it("shows the four findings in file order, each with its team, heading, segment, text and action", () => {
    const { container } = mount();
    const items = within(container.querySelector("ol")!).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    const expected = [
      ["For merchandising", "Retail rack candidate"],
      ["For merchandising", "Frame attach pattern"],
      ["For merchandising", "Under-converting segment"],
      ["For licensing", "Licensing gap"],
    ];
    items.forEach((item, i) => {
      const f = signals.findings[i];
      const q = within(item);
      expect(q.getByText(expected[i][0])).toBeTruthy();
      expect(q.getByRole("heading", { level: 2 }).textContent).toBe(expected[i][1]);
      expect(q.getByText(`Segment: ${roomNames[f.bucket]}`)).toBeTruthy();
      expect(q.getByText(f.text)).toBeTruthy();
      expect(q.getByRole("heading", { level: 3 }).textContent).toBe("Action");
      expect(q.getByText(f.action)).toBeTruthy();
    });
  });

  it("labels the data as simulated, with the session count from the file", () => {
    mount();
    const label = screen.getByText("Simulated data.").closest("p")!;
    expect(label.textContent).toBe(`Simulated data. ${signals.sessionCount.toLocaleString("en-US")} sessions generated from a fixed seed. No real visitors.`);
    expect(label.textContent).toContain("20,000");
  });

  it("orders the sections findings, your session, the ask, then contact, and ends with contact [D-068]", () => {
    mount();
    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual(["Retail rack candidate", "Frame attach pattern", "Under-converting segment", "Licensing gap", "Your session", "Next step", "Contact"]);
  });

  it("asks for the pipeline run on a sample of licensed SKUs [RB102, Res #45]", () => {
    mount();
    expect(screen.getByText(/^Run this same pipeline on a sample of Trends. licensed SKUs: tag each work by feeling \(J1\), write why each piece fits a mood \(J4\), and read the signals \(J8\)\.$/)).toBeTruthy();
  });

  it("repeats the Close contact links from config [Res #35]", () => {
    mount();
    expect(screen.getByRole("link", { name: contactEmail }).getAttribute("href")).toBe(`mailto:${contactEmail}`);
    const linkedIn = screen.getByRole("link", { name: "LinkedIn" });
    expect(linkedIn.getAttribute("href")).toBe(linkedInUrl);
    expect(linkedIn.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

describe("Your session panel [Gap G26, Res #36]", () => {
  it("says it stays on this device", () => {
    mount();
    expect(screen.getByText("Only on this device. Nothing here is stored or sent.")).toBeTruthy();
  });

  it("draws the nine segments by room name, charged on top, heavy to bright in each row", () => {
    mount();
    const cells = [...grid().children].filter((el) => !el.hasAttribute("style")).map((el) => el.textContent);
    expect(cells).toEqual([
      "Gathering Storm", "High Wind", "Full Sun",
      "Overcast", "Plain Daylight", "Warm Afternoon",
      "Low Light", "Still Air", "Morning Light",
    ]);
  });

  it.each([
    ["the heavy, charged corner", -1, 1, "0%", "0%"],
    ["the bright, charged corner", 1, 1, "100%", "0%"],
    ["the heavy, calm corner", -1, -1, "0%", "100%"],
    ["the bright, calm corner", 1, -1, "100%", "100%"],
    ["the centre", 0, 0, "50%", "50%"],
  ])("places the point at %s", (_label, v, a, left, top) => {
    moodAt(v, a);
    expect(dot().style.left).toBe(left);
    expect(dot().style.top).toBe(top);
  });

  it("places the point on the cut lines a third of the way in, inside the middle cell [D-030]", () => {
    moodAt(-1 / 3, 1 / 3);
    expect(parseFloat(dot().style.left)).toBeCloseTo(100 / 3, 10);
    expect(parseFloat(dot().style.top)).toBeCloseTo(100 / 3, 10);
    expect(marked()).toEqual(["Plain Daylight"]);
  });

  const centers: Record<string, number> = { heavy: -0.6, mid: 0, bright: 0.6, calm: -0.6, charged: 0.6 };
  it.each(bucketKeys.map((k) => [k]))("marks the visitor's cell, and only it, in %s", (key) => {
    const [v, a] = (key as BucketKey).split("-");
    moodAt(centers[v], centers[a]);
    expect(marked()).toEqual([roomNames[key as BucketKey]]);
    expect(screen.getByText(`Your segment: ${roomNames[key as BucketKey]}`)).toBeTruthy();
    expect(screen.getByText(`Simulated sessions in this segment: ${signals.buckets[key as BucketKey].sessions.toLocaleString("en-US")}`)).toBeTruthy();
  });

  it("shows the empty bag note when nothing is in the bag", () => {
    mount();
    expect(screen.getByText("Nothing in your bag yet.")).toBeTruthy();
  });

  it("lists each bag line as on the Bag, and survives a line whose work is not in the catalog", () => {
    mount();
    const w = works[0];
    act(() => session.addToBag({ workId: w.id, size: "18x24", material: "framed", frame: "black" }));
    act(() => session.addToBag({ workId: w.id, size: "12x16", material: "canvas", frame: null }));
    act(() => session.addToBag({ workId: "w-gone", size: "30x40", material: "paper", frame: null }));
    const lines = within(screen.getByText("Your bag").nextElementSibling as HTMLElement).getAllByRole("listitem").map((li) => li.textContent);
    expect(lines).toEqual([`${w.title}, 18 x 24 in, framed print, black frame`, `${w.title}, 12 x 16 in, canvas`, ", 30 x 40 in, paper print"]);
    expect(screen.queryByText("Nothing in your bag yet.")).toBeNull();
  });
});
