// The only code that reads catalog data [Res #28]. Swapping in a database later changes this file alone.
// Milestone 1 reads the fixture file. Milestone 2 switches it to data/catalog.json.

import type { z } from "zod";
import fixture from "../../data/fixtures/catalog.fixture.json";
import { catalogFileSchema, emotionTags, lanes, orientations, subjects, workSchema } from "./schemas";

export { emotionTags, lanes, subjects };

export type Lane = (typeof lanes)[number];
export type EmotionTag = (typeof emotionTags)[number];
export type Subject = (typeof subjects)[number];
export type Orientation = (typeof orientations)[number];

/** One catalog work, matching the catalog.json field list [spec Section 3.2, Gap G2, D-008]. */
export type Work = z.infer<typeof workSchema>;

/** Sorts works by plain string comparison of id, which is catalog order [Res #23, D-008]. */
export function sortById(list: readonly Work[]): Work[] {
  return list.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Validated on load, so a malformed file fails the build rather than the demo.
const works: readonly Work[] = Object.freeze(sortById(catalogFileSchema.parse(fixture)));

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
