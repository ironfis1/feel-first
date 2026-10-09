// Validates the committed data files against their schemas before every build, so a bad file
// fails the build rather than the demo (docs/testing.md, Functional gates: data files).
// Runs as npm's prebuild step, locally and on Upsun.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { metadataCatalogFileSchema } from "../src/lib/schemas.ts";

const root = path.resolve(import.meta.dirname, "..");

/** Checks beyond the schema: about 600 works within plus or minus 100 [RB45, Res #16], and a thumbnail file for each [D-001]. */
export function catalogProblems(catalog: readonly { thumbUrl: string }[], thumbExists: (url: string) => boolean): string[] {
  const problems: string[] = [];
  if (catalog.length < 500 || catalog.length > 700) problems.push(`catalog has ${catalog.length} works, outside 600 plus or minus 100`);
  const noThumb = catalog.filter((w) => !thumbExists(w.thumbUrl));
  if (noThumb.length) problems.push(`${noThumb.length} works have no thumbnail file, for example ${noThumb[0].thumbUrl}`);
  return problems;
}

async function main() {
  const file = path.join(root, "data/catalog.json");
  const catalog = metadataCatalogFileSchema.parse(JSON.parse(await readFile(file, "utf8")));
  const problems = catalogProblems(catalog, (url) => existsSync(path.join(root, "public", url)));
  if (problems.length) {
    for (const problem of problems) console.error(`data/catalog.json: ${problem}`);
    process.exit(1);
  }
  console.log(`data/catalog.json: ${catalog.length} works valid`);
}

if (import.meta.main) await main();
