// Validates the committed data files against their schemas before every build, so a bad file
// fails the build rather than the demo (docs/testing.md, Functional gates: data files).
// Runs as npm's prebuild step, locally and on Upsun.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";
import {
  catalogFileSchema,
  copyFileSchema,
  j2CacheFileSchema,
  j2WordmapFileSchema,
  signalsFileSchema,
  signalsSeedFileSchema,
} from "../src/lib/schemas.ts";

const root = path.resolve(import.meta.dirname, "..");

/** Checks beyond the schema: about 600 works within plus or minus 100 [RB45, Res #16], and a thumbnail file for each [D-001]. */
export function catalogProblems(catalog: readonly { thumbUrl: string }[], thumbExists: (url: string) => boolean): string[] {
  const problems: string[] = [];
  if (catalog.length < 500 || catalog.length > 700) problems.push(`catalog has ${catalog.length} works, outside 600 plus or minus 100`);
  const noThumb = catalog.filter((w) => !thumbExists(w.thumbUrl));
  if (noThumb.length) problems.push(`${noThumb.length} works have no thumbnail file, for example ${noThumb[0].thumbUrl}`);
  return problems;
}

/** copy.json holds only the 24 J4 pilot works until the J4 full run; set to false after it (D-042). */
export const copyMayBePartial = true;

/**
 * copy.json must hold lines for exactly the catalog's works [Gap G2]. Partial allows missing works,
 * never unknown ones, until the J4 full run (D-042).
 */
export function copyProblems(copy: Record<string, unknown>, catalogIds: ReadonlySet<string>, partial = false): string[] {
  const problems: string[] = [];
  const missing = partial ? [] : [...catalogIds].filter((id) => !(id in copy));
  const unknown = Object.keys(copy).filter((id) => !catalogIds.has(id));
  if (missing.length) problems.push(`${missing.length} works have no lines, for example ${missing[0]}`);
  if (unknown.length) problems.push(`${unknown.length} entries are not catalog works, for example ${unknown[0]}`);
  return problems;
}

/** The seeded dataset uses real catalog IDs [Res #38]. */
export function seedProblems(seed: { sessions: readonly { views: readonly string[] }[] }, catalogIds: ReadonlySet<string>): string[] {
  const unknown = new Set(seed.sessions.flatMap((s) => s.views.filter((id) => !catalogIds.has(id))));
  return unknown.size ? [`${unknown.size} viewed ids are not catalog works, for example ${[...unknown][0]}`] : [];
}

async function readJson(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(root, "data", name), "utf8"));
}

/** Parses one file and returns its problems, prefixed with the file name. */
function check<T>(name: string, schema: z.ZodType<T>, json: unknown, extra: (data: T) => string[] = () => []): string[] {
  const parsed = schema.safeParse(json);
  if (!parsed.success) return parsed.error.issues.slice(0, 5).map((i) => `data/${name}: ${i.path.join(".")}: ${i.message}`);
  return extra(parsed.data).map((problem) => `data/${name}: ${problem}`);
}

async function main() {
  const catalogJson = await readJson("catalog.json");
  const problems = check("catalog.json", catalogFileSchema, catalogJson, (catalog) =>
    catalogProblems(catalog, (url) => existsSync(path.join(root, "public", url))),
  );
  const ids = new Set((catalogJson as { id: string }[]).map((w) => w.id));

  // The Milestone 3 files must exist, except copy.json, which is written by the deferred J4 full run (D-039).
  const required: Record<string, (json: unknown) => string[]> = {
    "signals-seed.json": (json) => check("signals-seed.json", signalsSeedFileSchema, json, (seed) => seedProblems(seed, ids)),
    "signals.json": (json) => check("signals.json", signalsFileSchema, json),
    "j2-cache.json": (json) => check("j2-cache.json", j2CacheFileSchema, json),
    "j2-wordmap.json": (json) => check("j2-wordmap.json", j2WordmapFileSchema, json),
  };
  for (const [name, validate] of Object.entries(required)) {
    if (existsSync(path.join(root, "data", name))) problems.push(...validate(await readJson(name)));
    else problems.push(`data/${name}: missing`);
  }
  if (existsSync(path.join(root, "data/copy.json"))) {
    problems.push(...check("copy.json", copyFileSchema, await readJson("copy.json"), (copy) => copyProblems(copy, ids, copyMayBePartial)));
  }

  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log(`data/catalog.json: ${ids.size} works valid`);
}

if (import.meta.main) await main();
