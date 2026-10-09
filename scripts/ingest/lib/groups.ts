// Subject groups used only to spread picks across the field (D-020). Low tier in docs/test-tiers.md:
// the word lists are data, and the ingest contract tests run them on real records.

import { escape } from "./curation.ts";

/** Subject groups used only to spread picks across the field [D-020]. Order sets precedence. */
const fineArtGroups: [string, readonly string[]][] = [
  ["still life", ["still life", "still lifes", "still-life", "fruit", "vase", "vases"]],
  ["botanical", ["flower", "flowers", "botanical", "plant", "plants", "rose", "roses", "lilies", "blossom", "blossoms"]],
  ["seascape", ["seascape", "marine", "sea", "ocean", "harbor", "harbour", "ship", "ships", "boat", "boats", "coast", "beach", "waves", "shore"]],
  ["cityscape", ["cityscape", "city", "street", "streets", "urban", "bridge", "architecture", "buildings", "town", "village"]],
  ["landscape", ["landscape", "landscapes", "mountain", "mountains", "river", "forest", "trees", "field", "fields", "valley", "lake", "snow", "hills", "countryside"]],
  ["interior", ["interior", "interiors", "room", "bedroom", "domestic scenes"]],
  ["animal", ["animal", "animals", "horse", "horses", "dog", "dogs", "cat", "cats", "bird", "birds", "cow", "cows", "cattle", "deer"]],
  ["figure", ["portrait", "portraits", "woman", "women", "man", "men", "girl", "boy", "child", "children", "figure", "figures", "people", "mother", "dancer", "dancers"]],
  ["abstract", ["abstract", "abstraction", "geometric"]],
];

/** WPA poster groups, following the selection note in docs/asset-sources.md. */
const posterGroups: [string, readonly string[]][] = [
  ["theater", ["theater", "theatre", "theatrical", "play", "plays", "drama", "comedies", "opera", "marionette", "marionettes", "puppet"]],
  ["music", ["music", "concert", "concerts", "orchestra", "symphony", "band"]],
  ["travel and parks", ["travel", "national park", "national parks", "parks", "tourism", "vacation", "visit", "zoo", "zoos", "camping"]],
  ["health and safety", ["health", "hygiene", "safety", "disease", "diseases", "medical", "clinic", "food", "milk", "teeth"]],
  ["art and exhibitions", ["exhibition", "exhibitions", "art", "museum", "museums", "gallery", "galleries", "craft", "crafts"]],
  ["education and reading", ["education", "library", "libraries", "reading", "books", "school", "schools", "classes", "lectures"]],
  ["nature and science", ["nature", "wildlife", "birds", "animals", "science", "garden", "gardens", "conservation", "forest", "forests"]],
  ["civic and work", ["work", "workers", "housing", "community", "recreation", "sports", "civil defense", "defense"]],
];

function classify(groups: [string, readonly string[]][], texts: readonly (string | null | undefined)[]): string {
  const joined = texts.join(" | ").toLowerCase();
  for (const [group, words] of groups) {
    if (words.some((word) => new RegExp(`\\b${escape(word)}\\b`).test(joined))) return group;
  }
  return "other";
}

export const fineArtGroup = (texts: readonly (string | null | undefined)[]) => classify(fineArtGroups, texts);
export const posterGroup = (texts: readonly (string | null | undefined)[]) => classify(posterGroups, texts);
