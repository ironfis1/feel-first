// The only code that reads catalog data [Res #28]. Swapping in a database later changes this file alone.
// It reads data/catalog.json with J1's emotional fields merged in (Milestone 3), and data/copy.json (J4).
// Tests swap in data/fixtures/catalog.fixture.json.

import type { z } from "zod";
import data from "../../data/catalog.json";
import copyData from "../../data/copy.json";
import type { BucketKey } from "./buckets";
import { feelingPositions, type FeelingPositions } from "./feelings";
import { catalogFileSchema, copyFileSchema, emotionTags, lanes, orientations, subjects, workSchema } from "./schemas";

export { emotionTags, lanes, subjects };

export type Lane = (typeof lanes)[number];
export type EmotionTag = (typeof emotionTags)[number];
export type Subject = (typeof subjects)[number];
export type Orientation = (typeof orientations)[number];

/** One catalog work: every Section 3.2 field, including J1's emotional fields [Gap G2, D-008]. */
export type Work = z.infer<typeof workSchema>;

/** Sorts works by plain string comparison of id, which is catalog order [Res #23, D-008]. */
export function sortById(list: readonly Work[]): Work[] {
  return list.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Validated on load, so a malformed file fails the build rather than the demo.
const works: readonly Work[] = Object.freeze(sortById(catalogFileSchema.parse(data)));

const byId = new Map(works.map((w) => [w.id, w]));

/** Every work, in ascending catalog ID order. The array is frozen. */
export function getAllWorks(): readonly Work[] {
  return works;
}

/** One work by catalog ID, or undefined if no such work exists. */
export function getWorkById(id: string): Work | undefined {
  return byId.get(id);
}

/** Every work in one lane, in ascending catalog ID order. Ranking is J3's job, not this module's. */
export function getWorksByLane(lane: Lane): readonly Work[] {
  return works.filter((w) => w.lane === lane);
}

let positions: FeelingPositions | undefined;

/** Each feeling's catalog position, computed from the catalog on first use [D-044, D-049]. */
export function getFeelingPositions(): FeelingPositions {
  positions ??= Object.freeze(feelingPositions(works));
  return positions;
}

const copy = copyFileSchema.parse(copyData);

/**
 * A work's 9 "why this found you" lines, one per mood bucket [Res #9], or undefined when copy.json has none for it
 * yet: copy.json holds only the J4 pilot works until the full run (D-042, D-053).
 */
export function getCopyLines(id: string): Readonly<Record<BucketKey, string>> | undefined {
  return Object.hasOwn(copy, id) ? copy[id] : undefined;
}

/** What the Room, Bag and J6 need of a work: enough to rank it, hang it and caption it. */
export type WorkCard = Pick<Work, "id" | "lane" | "title" | "artist" | "date" | "thumbUrl" | "width" | "height" | "valence" | "arousal">;

/** Every work as a card, in ascending catalog ID order. */
export function getWorkCards(): WorkCard[] {
  return works.map(({ id, lane, title, artist, date, thumbUrl, width, height, valence, arousal }) => ({ id, lane, title, artist, date, thumbUrl, width, height, valence, arousal }));
}
