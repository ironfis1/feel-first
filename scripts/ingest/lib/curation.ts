// Curation rules shared by every ingest script (D-002, D-020, D-021).

/** Skip images under this many pixels on the long edge [D-002]. */
export const minLongEdge = 1200;

/** Reason text for an image below the size rule, or null if it is large enough. */
export function sizeProblem(width: number, height: number): string | null {
  const longEdge = Math.max(width, height);
  return longEdge < minLongEdge ? `image too small: ${longEdge}px on the long edge, needs ${minLongEdge}` : null;
}

/**
 * First-pass content screen [D-021]. A work whose title, subjects or tags contain one of these
 * words is skipped and logged with the word, for Scott's review. Grouped by the D-002 reason.
 */
export const flagWords: Record<string, readonly string[]> = {
  nudity: ["nude", "nudes", "naked", "nudity", "odalisque", "bather", "bathers"],
  violence: [
    "massacre", "execution", "murder", "slaughter", "battle", "corpse", "corpses", "dead", "death",
    "crucifixion", "crucified", "martyrdom", "martyr", "beheading", "decapitation", "holofernes",
    "slain", "wounded", "blood", "torture", "lynching", "skull", "skulls",
  ],
  "racist caricature or slur": [
    "minstrel", "minstrels", "blackface", "mammy", "pickaninny", "darky", "darkie", "darkies",
    "coon", "sambo", "savage", "savages", "squaw", "redskin", "chinaman", "negro", "negroes",
  ],
  "reads badly in a demo": ["syphilis", "venereal", "gonorrhea"],
  "damaged or fragmentary": ["fragment", "fragments", "damaged"],
};

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const flagPatterns = Object.entries(flagWords).flatMap(([reason, words]) =>
  words.map((word) => ({ reason, word, pattern: new RegExp(`\\b${escape(word)}\\b`, "i") })),
);

/** Reason text if any of the texts contains a flag word, else null. */
export function contentProblem(texts: readonly (string | null | undefined)[]): string | null {
  const joined = texts.filter(Boolean).join(" | ");
  for (const { reason, word, pattern } of flagPatterns) {
    if (pattern.test(joined)) return `${reason}: matched "${word}"`;
  }
  return null;
}

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
  const joined = texts.filter(Boolean).join(" | ").toLowerCase();
  for (const [group, words] of groups) {
    if (words.some((word) => new RegExp(`\\b${escape(word)}\\b`).test(joined))) return group;
  }
  return "other";
}

export const fineArtGroup = (texts: readonly (string | null | undefined)[]) => classify(fineArtGroups, texts);
export const posterGroup = (texts: readonly (string | null | undefined)[]) => classify(posterGroups, texts);

/**
 * Picks up to n items, best rank first, taking turns across groups so no group crowds out the rest [D-020].
 * Items are taken in rank order within each group; groups take turns in order of their best item.
 */
export function pickSpread<T extends { rank: number; group: string }>(items: readonly T[], n: number): T[] {
  const byGroup = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.rank - b.rank)) {
    const list = byGroup.get(item.group) ?? [];
    list.push(item);
    byGroup.set(item.group, list);
  }
  const queues = [...byGroup.values()];
  const picked: T[] = [];
  while (picked.length < n && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < n) picked.push(next);
    }
  }
  return picked;
}

/** Most works one artist may have from one museum, so a series cannot crowd the lane [D-020]. */
export const maxPerArtist = 3;

/** Keeps at most maxPerArtist works per named artist, in the given order; the rest become skips. */
export function capPerArtist<T extends { sourceId: string; title: string; artist: string }>(
  works: readonly T[],
  max = maxPerArtist,
): { kept: T[]; skips: { sourceId: string; title: string; reason: string }[] } {
  const counts = new Map<string, number>();
  const kept: T[] = [];
  const skips: { sourceId: string; title: string; reason: string }[] = [];
  for (const work of works) {
    const artist = work.artist.trim();
    if (artist === "Unknown artist") {
      kept.push(work);
      continue;
    }
    const count = counts.get(artist) ?? 0;
    if (count >= max) {
      skips.push({ sourceId: work.sourceId, title: work.title, reason: `artist limit: already ${max} works by ${artist}` });
      continue;
    }
    counts.set(artist, count + 1);
    kept.push(work);
  }
  return { kept, skips };
}
