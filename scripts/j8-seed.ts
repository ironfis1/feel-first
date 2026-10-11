// J8 seeded dataset: 20,000 simulated sessions over the real catalog, written to data/signals-seed.json
// [spec Section 3.10, Res #38, Gap G27, D-029]. Run by hand: node scripts/j8-seed.ts
//
// This is simulated data, not visitor data. No model is called. The same seed and catalog always give
// the same file, byte for byte. Every structural assumption the simulation makes is listed here, so
// each J8 finding can be traced to a stated cause rather than to noise.
//
// Assumptions
//
// A1. Mood mix. A session starts in one of the 9 mood buckets with these shares (percent): mid-mid 18,
//     bright-calm 15, mid-calm 14, bright-mid 13, heavy-calm 10, mid-charged 9, heavy-mid 8,
//     bright-charged 8, heavy-charged 5. People shopping for a home lean toward calm and bright moods.
// A2. Mood point. Within its bucket, the session's mood point is uniform over the part of the bucket's
//     cell that lies inside the unit circle, the same space the Room uses.
// A3. Views. A session opens 3 works plus a geometric number more (each further view with probability
//     0.75), at most 15, never the same work twice. Each view picks a lane with even odds, because the
//     Room interleaves the lanes, then a work in that lane with weight exp(-d^2 / (2 * 0.35^2)), where d
//     is the distance from the mood point to the work's J1 position. Nearer works are seen more.
// A4. Adds. Each viewed work is added to the bag with probability
//         0.05 * fit * propensity(bucket) * affinity(lane, subject, bucket)
//     where fit = exp(-d^2 / (2 * 0.30^2)): a work that matches the mood is far more likely to be kept.
// A5. Propensity by segment. Heavy, charged moods browse but buy less: heavy-charged 0.70,
//     heavy-mid 0.85, mid-charged 0.90. Calm, bright moods buy a little more: bright-calm 1.10,
//     bright-mid 1.15. Every other bucket is 1.00.
// A6. Poster affinities. Some poster groups suit some moods beyond their J1 position: space posters
//     1.6 in mid-charged and 1.5 in bright-charged; place posters (parks and landmarks) 1.6 in bright-calm
//     and 1.3 in mid-calm; animal posters 1.5 in bright-mid. Every other pairing is 1.00.
// A7. Material. Fine art: paper 30, canvas 25, framed 45 percent. Posters: paper 55, canvas 10,
//     framed 35. Calm moods move 10 points from paper to framed; charged moods move 10 points from
//     framed to paper.
// A8. Frame finish, by the mood's valence band (percent black, natural oak, white, brass):
//     heavy 50, 20, 10, 20; mid 30, 35, 25, 10; bright 15, 35, 40, 10.
// A9. Size, by the mood's arousal band (percent 12x16, 18x24, 24x36, 30x40): calm 15, 35, 30, 20;
//     mid 25, 40, 25, 10; charged 35, 40, 20, 5. Calm rooms take bigger pieces.
// A10. Random numbers come from mulberry32 seeded with 20261008, drawn in a fixed order.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import { frameFinishes, printSizes } from "../src/config/feel.ts";
import { arousalBands, bucketKeys, bucketOf, type BucketKey, valenceBands } from "../src/lib/buckets.ts";
import { catalogFileSchema, signalsSeedFileSchema } from "../src/lib/schemas.ts";

const root = path.resolve(import.meta.dirname, "..");

export const seed = 20261008;
export const sessionCount = 20_000;

type Work = z.infer<typeof catalogFileSchema>[number];
export type SeedFile = z.infer<typeof signalsSeedFileSchema>;
type Session = SeedFile["sessions"][number];
type AddLine = Session["adds"][number];

/** A1 */
export const moodShares: Record<BucketKey, number> = {
  "heavy-calm": 10,
  "mid-calm": 14,
  "bright-calm": 15,
  "heavy-mid": 8,
  "mid-mid": 18,
  "bright-mid": 13,
  "heavy-charged": 5,
  "mid-charged": 9,
  "bright-charged": 8,
};

/** A5 */
export const propensity: Record<BucketKey, number> = {
  "heavy-calm": 1,
  "mid-calm": 1,
  "bright-calm": 1.1,
  "heavy-mid": 0.85,
  "mid-mid": 1,
  "bright-mid": 1.15,
  "heavy-charged": 0.7,
  "mid-charged": 0.9,
  "bright-charged": 1,
};

/** A6: poster subject, then bucket, to multiplier. */
export const posterAffinity: Partial<Record<string, Partial<Record<BucketKey, number>>>> = {
  space: { "mid-charged": 1.6, "bright-charged": 1.5 },
  place: { "bright-calm": 1.6, "mid-calm": 1.3 },
  animal: { "bright-mid": 1.5 },
};

const viewSigma = 0.35;
const fitSigma = 0.3;
const baseAdd = 0.05;

/** A10: mulberry32, a small seeded generator with a fixed sequence. */
export function mulberry32(seedValue: number): () => number {
  let state = seedValue >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Index chosen from weights that need not sum to 1. */
export function pick(weights: readonly number[], random: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

const gauss = (d2: number, sigma: number) => Math.exp(-d2 / (2 * sigma * sigma));
const dist2 = (w: Work, v: number, a: number) => (w.valence - v) ** 2 + (w.arousal - a) ** 2;

/** A2: a mood point inside the bucket's cell and the unit circle. */
function moodPoint(bucket: BucketKey, random: () => number): [number, number] {
  for (;;) {
    const v = random() * 2 - 1;
    const a = random() * 2 - 1;
    if (v * v + a * a <= 1 && bucketOf(v, a) === bucket) return [v, a];
  }
}

const materialWeights = (lane: Work["lane"], arousalBand: (typeof arousalBands)[number]) => {
  // A7: paper, canvas, framed
  const [paper, canvas, framed] = lane === "fine-art" ? [30, 25, 45] : [55, 10, 35];
  const shift = arousalBand === "calm" ? 10 : arousalBand === "charged" ? -10 : 0;
  return [paper - shift, canvas, framed + shift];
};

/** A8, in frameFinishes order: black, natural oak, white, brass. */
const finishWeights: Record<(typeof valenceBands)[number], number[]> = {
  heavy: [50, 20, 10, 20],
  mid: [30, 35, 25, 10],
  bright: [15, 35, 40, 10],
};

/** A9, in printSizes order: 12x16, 18x24, 24x36, 30x40. */
const sizeWeights: Record<(typeof arousalBands)[number], number[]> = {
  calm: [15, 35, 30, 20],
  mid: [25, 40, 25, 10],
  charged: [35, 40, 20, 5],
};

const materialIds = ["paper", "canvas", "framed"] as const;

/** The whole simulated dataset for a catalog. Pure: the same inputs give the same output. */
export function simulate(catalog: readonly Work[], seedValue = seed, count = sessionCount): SeedFile {
  const random = mulberry32(seedValue);
  const works = [...catalog].sort((a, b) => (a.id < b.id ? -1 : 1));
  const lanes = { "fine-art": works.filter((w) => w.lane === "fine-art"), poster: works.filter((w) => w.lane === "poster") };
  const shares = bucketKeys.map((k) => moodShares[k]);
  const sessions: Session[] = [];

  for (let s = 0; s < count; s++) {
    const bucket = bucketKeys[pick(shares, random)];
    const [v, a] = moodPoint(bucket, random);
    const [valenceBand, arousalBand] = bucket.split("-") as [(typeof valenceBands)[number], (typeof arousalBands)[number]];

    // A3
    let viewCount = 3;
    while (viewCount < 15 && random() < 0.75) viewCount++;
    const seen = new Set<string>();
    const views: string[] = [];
    const adds: AddLine[] = [];
    for (let i = 0; i < viewCount; i++) {
      const lanePool = random() < 0.5 ? lanes["fine-art"] : lanes.poster;
      const pool = lanePool.filter((w) => !seen.has(w.id));
      if (!pool.length) continue;
      const work = pool[pick(pool.map((w) => gauss(dist2(w, v, a), viewSigma)), random)];
      seen.add(work.id);
      views.push(work.id);

      // A4, A5, A6
      const affinity = work.lane === "poster" ? (posterAffinity[work.subject]?.[bucket] ?? 1) : 1;
      const p = baseAdd * gauss(dist2(work, v, a), fitSigma) * propensity[bucket] * affinity;
      if (random() < p) {
        const material = materialIds[pick(materialWeights(work.lane, arousalBand), random)];
        const size = printSizes[pick(sizeWeights[arousalBand], random)].id;
        const frame = material === "framed" ? frameFinishes[pick(finishWeights[valenceBand], random)] : null;
        adds.push({ id: work.id, size, material, frame });
      }
    }
    sessions.push({ bucket, views, adds });
  }
  return { seed: seedValue, sessionCount: count, sessions };
}

/** One session per line, so the file stays readable in a diff and small enough to commit. */
export function seedFileText(file: SeedFile): string {
  const lines = file.sessions.map((s) => JSON.stringify(s));
  return `{"seed":${file.seed},"sessionCount":${file.sessionCount},"sessions":[\n${lines.join(",\n")}\n]}\n`;
}

async function main() {
  const catalog = catalogFileSchema.parse(JSON.parse(await readFile(path.join(root, "data/catalog.json"), "utf8")));
  const file = signalsSeedFileSchema.parse(simulate(catalog));
  await writeFile(path.join(root, "data/signals-seed.json"), seedFileText(file));
  const adds = file.sessions.reduce((n, s) => n + s.adds.length, 0);
  const views = file.sessions.reduce((n, s) => n + s.views.length, 0);
  console.log(`data/signals-seed.json: ${file.sessionCount} sessions, ${views} views, ${adds} adds (seed ${file.seed})`);
}

if (import.meta.main) await main();
