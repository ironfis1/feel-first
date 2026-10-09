// The only code that reads catalog data [Res #28]. Swapping in a database later changes this file alone.
// It reads data/catalog.json, the metadata stage from Milestone 2. Tests swap in tests/fixtures/catalog.metadata.json.
// Milestone 3 adds J1's emotional fields and switches the schema to the full catalogFileSchema.

import type { z } from "zod";
import data from "../../data/catalog.json";
import { emotionTags, lanes, metadataCatalogFileSchema, metadataWorkSchema, orientations, subjects } from "./schemas";

export { emotionTags, lanes, subjects };

export type Lane = (typeof lanes)[number];
export type EmotionTag = (typeof emotionTags)[number];
export type Subject = (typeof subjects)[number];
export type Orientation = (typeof orientations)[number];

/** One catalog work: the Section 3.2 fields without J1's emotional fields until Milestone 3 [Gap G2, D-008]. */
export type Work = z.infer<typeof metadataWorkSchema>;

/** Sorts works by plain string comparison of id, which is catalog order [Res #23, D-008]. */
export function sortById(list: readonly Work[]): Work[] {
  return list.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// Validated on load, so a malformed file fails the build rather than the demo.
const works: readonly Work[] = Object.freeze(sortById(metadataCatalogFileSchema.parse(data)));

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
