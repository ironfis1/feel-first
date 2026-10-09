// Rijksmuseum ingest through Rijksmuseum Data Services (docs/asset-sources.md, D-017, D-020).
// Run by hand: node scripts/ingest/rijks.ts

import { capPerArtist, contentProblem, interleave, sizeProblem } from "./lib/curation.ts";
import { fineArtGroup } from "./lib/groups.ts";
import { type Client, createClient, SourceRefused } from "./lib/http.ts";
import { type RawWork, type Skip, writeRaw } from "./lib/raw.ts";

/** Eligible works to collect; more than the 100 used, so shortfalls elsewhere can be filled [Gap G21]. */
export const target = 180;

/** Wall-art types, taking turns [D-020]. The Rijksmuseum publishes no quality ranking, so search order stands. */
export const types = ["painting", "print", "drawing"];

/** Width of the full-size image linked from the Piece and Wall screens [D-024]. */
export const fullWidth = 1686;

/** Rights accepted: public domain only (docs/asset-sources.md). */
export const publicDomainRights: Record<string, string> = {
  "https://creativecommons.org/publicdomain/mark/1.0/": "Public Domain Mark 1.0",
  "https://creativecommons.org/publicdomain/zero/1.0/": "CC0 1.0",
};

export const searchUrl = (type: string) =>
  `https://data.rijksmuseum.nl/search/collection?type=${encodeURIComponent(type)}&imageAvailable=true`;

/** Linked Art JSON-LD for any Rijksmuseum identifier [D-017]. */
export const linkedArtUrl = (id: string) => `${id}?_profile=la-framed&_mediatype=application/ld%2Bjson`;

/** JSON-LD may give one object where a list is expected; treat both as a list. */
export const asArray = <T>(value: T | T[] | undefined | null): T[] => (value == null ? [] : Array.isArray(value) ? value : [value]);

const english = "http://vocab.getty.edu/aat/300388277";
const preferred = "http://vocab.getty.edu/aat/300404670";

type Many<T> = T | T[];

interface Name {
  type: string;
  content?: string;
  language?: Many<{ id: string }>;
  classified_as?: Many<{ id: string }>;
}
interface Notation {
  "@language": string;
  "@value": string;
}
interface Actor {
  notation?: Many<Notation>;
  _label?: string;
}
interface Production {
  carried_out_by?: Many<Actor>;
  part?: Many<Production>;
  timespan?: { identified_by?: Many<Name> };
}
export interface RijksObject {
  id: string;
  identified_by?: Many<Name>;
  produced_by?: Production;
  shows?: Many<{ id: string }>;
}
export interface RijksVisualItem {
  subject_to?: Many<{ classified_as?: Many<{ id: string }> }>;
  digitally_shown_by?: Many<{ id: string }>;
}
export interface RijksDigitalObject {
  access_point?: Many<{ id: string }>;
}

const isEnglish = (n: Name) => asArray(n.language).some((l) => l.id === english);
const isPreferred = (n: Name) => asArray(n.classified_as).some((c) => c.id === preferred);

/** The English preferred title, else any English title, else any title. */
export function titleOf(object: RijksObject): string {
  const names = asArray(object.identified_by).filter((n) => n.type === "Name" && n.content?.trim());
  const pick = names.find((n) => isEnglish(n) && isPreferred(n)) ?? names.find(isEnglish) ?? names[0];
  return pick?.content?.trim() || "Untitled";
}

/** Every named maker, English names preferred, in record order without repeats. */
export function artistOf(object: RijksObject): string {
  const productions = [...asArray(object.produced_by), ...asArray(object.produced_by?.part)];
  const names = productions.flatMap((p) =>
    asArray(p.carried_out_by).map((actor) => {
      const notations = asArray(actor.notation);
      return notations.find((n) => n["@language"] === "en")?.["@value"] ?? notations[0]?.["@value"] ?? actor._label;
    }),
  );
  const unique = [...new Set(names.filter((n): n is string => Boolean(n?.trim())).map((n) => n.trim()))];
  return unique.length ? unique.join(", ") : "Unknown artist";
}

/** The English date text, else any date text. */
export function dateOf(object: RijksObject): string {
  const names = asArray(object.produced_by?.timespan?.identified_by).filter((n) => n.content?.trim());
  return (names.find(isEnglish) ?? names[0])?.content?.trim() || "Undated";
}

/** License and rights-statement vocabularies; any of these that is not public domain is restrictive. */
const licenseUri = /^https?:\/\/(creativecommons\.org|rightsstatements\.org)\//;

/**
 * The public-domain license label for a visual item, or null if it is not public domain.
 * A work that also carries any other license or rights statement is rejected.
 */
export function licenseOf(visual: RijksVisualItem): string | null {
  const ids = asArray(visual.subject_to).flatMap((right) => asArray(right.classified_as).map((type) => type.id));
  const licenses = ids.filter((id) => licenseUri.test(id));
  if (licenses.some((id) => !publicDomainRights[id])) return null;
  const label = licenses.map((id) => publicDomainRights[id]).find(Boolean);
  return label ?? null;
}

/** The IIIF base (https://iiif.micr.io/{id}) from a digital object's access point. */
export function iiifBaseOf(digital: RijksDigitalObject): string | null {
  const point = asArray(digital.access_point).find((p) => p.id.startsWith("https://iiif.micr.io/"))?.id;
  const match = point?.match(/^(https:\/\/iiif\.micr\.io\/[^/]+)\//);
  return match ? match[1] : null;
}

/** Builds the raw work once rights, image and size are known. */
export function toRawWork(
  object: RijksObject,
  license: string,
  iiifBase: string,
  size: { width: number; height: number },
  rank: number,
): RawWork | string {
  const small = sizeProblem(size.width, size.height);
  if (small) return small;
  const title = titleOf(object);
  return {
    sourceId: object.id.replace("https://id.rijksmuseum.nl/", ""),
    title,
    artist: artistOf(object),
    date: dateOf(object),
    lane: "fine-art",
    // Same width as AIC [D-019, D-024]; never wider than the scan.
    imageUrl: `${iiifBase}/full/${Math.min(size.width, fullWidth)},/0/default.jpg`,
    thumbSourceUrl: `${iiifBase}/full/843,/0/default.jpg`,
    width: size.width,
    height: size.height,
    license: `${license}. Rijksmuseum`,
    rank,
    group: fineArtGroup([title]),
  };
}

interface SearchPage {
  orderedItems: { id: string }[];
  next?: { id: string };
}

async function main() {
  // No published limit; one request a second [D-017].
  const client = createClient({ minIntervalMs: 1000 });
  const lists: string[][] = [];
  for (const type of types) {
    const ids: string[] = [];
    let url: string | undefined = searchUrl(type);
    // Three pages per type is far more than enough candidates.
    for (let page = 0; url && page < 3; page++) {
      const result: SearchPage = await client.json<SearchPage>(url);
      ids.push(...result.orderedItems.map((item) => item.id));
      url = result.next?.id;
    }
    lists.push(ids);
  }
  const eligible: RawWork[] = [];
  const skips: Skip[] = [];
  let capped = capPerArtist(eligible);
  for (const [rank, id] of interleave(lists).entries()) {
    if (capped.kept.length >= target) break;
    const sourceId = id.replace("https://id.rijksmuseum.nl/", "");
    let title = "";
    try {
      const result = await examine(client, id, rank, (t) => (title = t));
      if (typeof result === "string") skips.push({ sourceId, title, reason: result });
      else {
        eligible.push(result);
        capped = capPerArtist(eligible);
      }
    } catch (error) {
      if (error instanceof SourceRefused) throw error;
      skips.push({ sourceId, title, reason: `record could not be read: ${(error as Error).message}` });
    }
    if ((rank + 1) % 20 === 0) console.log(`rijks: ${capped.kept.length} kept of ${rank + 1} checked`);
  }
  await writeRaw("rijks", capped.kept.slice(0, target), [...skips, ...capped.skips]);
}

/** Follows one object to its rights and image; returns the work or the reason to skip it. */
async function examine(client: Client, id: string, rank: number, onTitle: (title: string) => void): Promise<RawWork | string> {
  const object = await client.json<RijksObject>(linkedArtUrl(id));
  onTitle(titleOf(object));
  const flagged = contentProblem([titleOf(object)]);
  if (flagged) return flagged;
  const visualId = asArray(object.shows)[0]?.id;
  if (!visualId) return "no image";
  const visual = await client.json<RijksVisualItem>(linkedArtUrl(visualId));
  const license = licenseOf(visual);
  if (!license) return "not public domain";
  const digitalId = asArray(visual.digitally_shown_by)[0]?.id;
  const digital = digitalId ? await client.json<RijksDigitalObject>(linkedArtUrl(digitalId)) : {};
  const iiifBase = iiifBaseOf(digital);
  if (!iiifBase) return "no image";
  const info = await client.json<{ width: number; height: number }>(`${iiifBase}/info.json`);
  return toRawWork(object, license, iiifBase, info, rank);
}

if (import.meta.main) await main();
