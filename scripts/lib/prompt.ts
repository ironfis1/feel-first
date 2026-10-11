// Prompts for the build-time jobs live in docs/ai-jobs.md between named markers, so the text Scott
// reads there is the text the scripts send. A hash of each prompt tags the results it produced.

import { createHash } from "node:crypto";

/** The text between <!-- name:start --> and <!-- name:end --> in docs/ai-jobs.md, with line endings normalized. */
export function promptBetween(markdown: string, name: string): string {
  const match = markdown.match(new RegExp(String.raw`<!-- ${name}:start -->\r?\n([\s\S]*?)\r?\n<!-- ${name}:end -->`));
  if (!match) throw new Error(`docs/ai-jobs.md has no prompt between the ${name} markers`);
  return match[1].replace(/\r\n/g, "\n").trim();
}

/** A short hash of a prompt: results tagged with an older hash are never mixed with newer ones. */
export const hashOf = (prompt: string) => createHash("sha256").update(prompt).digest("hex").slice(0, 12);
