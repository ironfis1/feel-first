// The only code that reads catalog data [Res #28]. Swapping in a database later changes this file alone.
// Milestone 1 reads the fixture file. Milestone 2 switches it to data/catalog.json.

import fixture from "../../data/fixtures/catalog.fixture.json";

/** The two content lanes [RB36, D-008]. */
export const lanes = ["fine-art", "poster"] as const;
export type Lane = (typeof lanes)[number];

/** Fixed 12-word emotion tag vocabulary [Gap G1]. */
export const emotionTags = [
  "joyful",
  "playful",
  "energized",
  "awe",
  "serene",
  "tender",
  "contemplative",
  "nostalgic",
  "wistful",
  "melancholy",
  "tense",
  "defiant",
] as const;
export type EmotionTag = (typeof emotionTags)[number];

/** Fixed 12-subject list [Gap G1]. */
export const subjects = [
  "landscape",
  "seascape",
  "cityscape",
  "figure",
  "still life",
  "botanical",
  "animal",
  "abstract",
  "interior",
  "place",
  "graphic",
  "space",
] as const;
export type Subject = (typeof subjects)[number];

export type Orientation = "portrait" | "landscape" | "square";

/** One catalog work, matching the catalog.json field list [spec Section 3.2, Gap G2, D-008]. */
export interface Work {
  /** Catalog ID; ascending string sort is catalog order [Res #23]. */
  id: string;
  title: string;
  artist: string;
  date: string;
  /** Source collection. "FIXTURE" marks placeholder data. */
  source: string;
  sourceId: string;
  lane: Lane;
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  orientation: Orientation;
  /** -1 is heavy, +1 is bright [Gap G3]. */
  valence: number;
  /** -1 is calm, +1 is charged [Gap G3]. */
  arousal: number;
  /** 3 to 5 tags from the fixed vocabulary. */
  tags: EmotionTag[];
  /** Exactly 5 hex colors. */
  palette: string[];
  subject: Subject;
  license: string;
}

const works: readonly Work[] = (fixture as Work[])
  .slice()
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const byId = new Map(works.map((w) => [w.id, w]));

/** Every work, in ascending catalog ID order. */
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
