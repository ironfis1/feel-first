// Build check (M5 prompt, quality-bar section 2): fails the build if the Anthropic key, or the name of its
// variable, appears in anything the browser can be served: the client bundle in .next/static and the prerendered
// pages and payloads in .next/server/app. Runs after `next build` as npm's postbuild step.
// The key's value is read from the environment or .env.local and is never printed.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const name = "ANTHROPIC_API_KEY";

function keyValue() {
  if (process.env[name]) return process.env[name];
  const local = path.join(root, ".env.local");
  if (!existsSync(local)) return null;
  const line = readFileSync(local, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  const value = line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  return value || null;
}

function* files(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* files(full);
    else yield full;
  }
}

const served = [
  ...files(path.join(root, ".next/static")),
  ...[...files(path.join(root, ".next/server/app"))].filter((f) => /\.(html|rsc|body|meta|json)$/.test(f)),
];
if (!served.length) {
  console.error("check-bundle: no build output found; run next build first");
  process.exit(1);
}

const value = keyValue();
const found = [];
for (const file of served) {
  const text = readFileSync(file, "utf8");
  if (text.includes(name)) found.push(`${path.relative(root, file)}: the variable name`);
  if (value && text.includes(value)) found.push(`${path.relative(root, file)}: the key's value`);
}

if (found.length) {
  console.error(`check-bundle: the Anthropic key leaks into served files:\n  ${found.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-bundle: ${served.length} served files clean of the key name${value ? " and value" : " (no key value set to check)"}`);
