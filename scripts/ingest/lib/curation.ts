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

/** Escapes regular-expression characters in a word. */
export const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const flagPatterns = Object.entries(flagWords).flatMap(([reason, words]) =>
  words.map((word) => ({ reason, word, pattern: new RegExp(`\\b${escape(word)}\\b`, "i") })),
);

/** Reason text if any of the texts contains a flag word, else null. */
export function contentProblem(texts: readonly (string | null | undefined)[]): string | null {
  // join() writes null and undefined as empty strings.
  const joined = texts.join(" | ");
  for (const { reason, word, pattern } of flagPatterns) {
    if (pattern.test(joined)) return `${reason}: matched "${word}"`;
  }
  return null;
}

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

/** Takes one item from each list in turn (a, b, c, a, b, c). A repeated item keeps its first place. */
export function interleave<T>(lists: readonly (readonly T[])[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      if (i < list.length && !seen.has(list[i])) {
        seen.add(list[i]);
        out.push(list[i]);
      }
    }
  }
  return out;
}
