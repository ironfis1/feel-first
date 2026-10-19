// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SessionProvider, useSession } from "@/components/session/Session";
import { Signals } from "@/components/signals/Signals";
import { bucketKeys, type BucketKey } from "@/lib/buckets";
import { getFeelingPositions, getWorkCards } from "@/lib/catalog";
import type { FeelingPositions } from "@/lib/feelings";
import { catalogFileSchema, numbersIn, signalsFileSchema, signalsSeedFileSchema } from "@/lib/schemas";
import { bucketFigures, computeDrafts } from "../../../scripts/j8.ts";

// Functional gate (docs/testing.md, quality-bar section 8): Signals honesty. Every figure the Signals screen shows is
// recomputed from data/signals-seed.json and the real catalog, and the screen says the data is simulated [Res #34,
// Res #38]. Strings are D-079; numbers carry thousands separators (D-080). The real files are read with fs, because
// vitest aliases any import of data/catalog.json to the fixture.

const repo = (file: string) => path.resolve(import.meta.dirname, "../../..", file);
const read = (file: string) => JSON.parse(readFileSync(repo(file), "utf8"));

const catalog = catalogFileSchema.parse(read("data/catalog.json"));
const seedFile = signalsSeedFileSchema.parse(read("data/signals-seed.json"));
const signals = signalsFileSchema.parse(read("data/signals.json"));
const buckets = bucketFigures(seedFile, catalog);
const drafts = computeDrafts(seedFile, catalog);

/** The job names in the ask (J1, J4, J8) are labels, not figures. */
const jobNumbers = [1, 4, 8];

let session: ReturnType<typeof useSession>;
function Probe() {
  const s = useSession();
  // Hand the latest session to the test after each render.
  useEffect(() => {
    session = s;
  });
  return null;
}

/** Every feeling at one mood, so a point on the wheel's edge reads exactly that valence and arousal. */
const allAt = (valence: number, arousal: number) =>
  Object.fromEntries(Object.keys(getFeelingPositions()).map((f) => [f, { valence, arousal }])) as FeelingPositions;

const mount = (positions: FeelingPositions = getFeelingPositions()) =>
  render(
    <SessionProvider>
      <Probe />
      <Signals signals={signals} works={getWorkCards()} positions={positions} />
    </SessionProvider>,
  );

afterEach(cleanup);

describe("Signals figures trace to the seed", () => {
  it("recomputes the session count and every segment's sessions, views, adds and works", () => {
    expect(signals.seed).toBe(seedFile.seed);
    expect(signals.sessionCount).toBe(seedFile.sessions.length);
    expect(signals.buckets).toEqual(buckets);
  }, 60_000);

  it("recomputes every finding's kind, segment and figures", () => {
    expect(signals.findings.map((f) => ({ kind: f.kind, bucket: f.bucket, figures: f.figures }))).toEqual(
      drafts.map((d) => ({ kind: d.kind, bucket: d.bucket, figures: d.figures })),
    );
  }, 60_000);

  it("has four findings, each with an action, and every number in the text and action is one of its recomputed figures", () => {
    expect(signals.findings).toHaveLength(4);
    signals.findings.forEach((f, i) => {
      expect(f.action.trim()).not.toBe("");
      const figures = Object.values(drafts[i].figures);
      for (const n of [...numbersIn(f.text), ...numbersIn(f.action)]) expect(figures, `${f.kind}: ${n}`).toContain(n);
    });
  });
});

describe("the Signals screen shows only traceable figures", () => {
  it("says the data is simulated", () => {
    mount();
    expect(screen.getByText("Simulated data.")).toBeTruthy();
    expect(screen.getByText(/sessions generated from a fixed seed\. No real visitors\./)).toBeTruthy();
  });

  const centers: Record<string, number> = { heavy: -0.6, mid: 0, bright: 0.6, calm: -0.6, charged: 0.6 };
  it.each(bucketKeys.map((k) => [k]))("every number on screen traces to the seed with the visitor in %s", (key) => {
    const [v, a] = (key as BucketKey).split("-");
    const { container } = mount(allAt(centers[v], centers[a]));
    act(() => session.movePoint({ x: 1, y: 0 }));
    const allowed = new Set([seedFile.sessions.length, buckets[key as BucketKey].sessions, ...drafts.flatMap((d) => Object.values(d.figures)), ...jobNumbers]);
    const shown = numbersIn(container.textContent ?? "");
    expect(shown.length).toBeGreaterThan(0);
    for (const n of shown) expect(allowed.has(n), `${n} does not trace to the seed`).toBe(true);
    expect(shown).toContain(buckets[key as BucketKey].sessions);
  });
});
