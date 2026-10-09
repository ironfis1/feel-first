#!/usr/bin/env node
/*
 * Feel First live smoke test.
 *
 * MANUAL ONLY. This script talks to real, deployed systems. It must never run
 * inside the unit or functional test suites, and nothing in the test suites may
 * import it (decision D-014: tests never call outside parties).
 *
 * Usage (Git Bash or any shell, Node 18 or later):
 *   node scripts/smoke/live-smoke.mjs                  run all active, free checks
 *   node scripts/smoke/live-smoke.mjs --list           list every check and its status
 *   node scripts/smoke/live-smoke.mjs --only m1.routes,m1.concept-bar
 *   node scripts/smoke/live-smoke.mjs --include-costly also run checks that spend money
 *   node scripts/smoke/live-smoke.mjs --base-url https://some-preview-url
 *
 * Exit code is 1 if any check fails, 0 otherwise. Warnings never fail the run.
 * A JSON report of the last run is written to .smoke/last-run.json (gitignored).
 *
 * Extending: add an entry to CHECKS below. Each check has an id prefixed with
 * the milestone that introduced it, a description, a `costly` flag (true if it
 * spends money, for example an Anthropic API call), and a `run(ctx)` function
 * that returns { status, detail } where status is PASS, FAIL or WARN.
 * Checks planned for later milestones are listed with `pending` set to the
 * milestone; they report PENDING until someone implements them.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const { values: args } = parseArgs({
  options: {
    'base-url': { type: 'string' },
    only: { type: 'string' },
    'include-costly': { type: 'boolean', default: false },
    list: { type: 'boolean', default: false },
    config: { type: 'string', default: path.join(here, 'smoke.config.json') },
  },
});

const config = JSON.parse(await readFile(args.config, 'utf8'));
const baseUrl = (args['base-url'] ?? config.baseUrl).replace(/\/+$/, '');
const baseHost = new URL(baseUrl).host;

// ---------- helpers ----------

const pageCache = new Map();

async function get(url, init = {}) {
  const started = performance.now();
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(config.timeoutMs) });
  const ttfbMs = Math.round(performance.now() - started);
  return { res, ttfbMs };
}

async function page(routeName) {
  if (pageCache.has(routeName)) return pageCache.get(routeName);
  const routePath = config.routes[routeName];
  const url = baseUrl + routePath;
  let result;
  try {
    const { res, ttfbMs } = await get(url);
    const html = await res.text();
    result = { routeName, url, status: res.status, ttfbMs, html, error: null };
  } catch (err) {
    result = { routeName, url, status: 0, ttfbMs: null, html: '', error: err.message };
  }
  pageCache.set(routeName, result);
  return result;
}

async function allPages() {
  return Promise.all(Object.keys(config.routes).map(page));
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function scriptSrcHosts(html) {
  const hosts = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const src = m[1];
    try {
      hosts.push(new URL(src, baseUrl).host);
    } catch {
      hosts.push(`unparseable:${src}`);
    }
  }
  return hosts;
}

const pass = (detail) => ({ status: 'PASS', detail });
const fail = (detail) => ({ status: 'FAIL', detail });
const warn = (detail) => ({ status: 'WARN', detail });

// ---------- checks ----------

const CHECKS = [
  {
    id: 'm1.https',
    description: 'Site loads over HTTPS with a valid certificate',
    async run() {
      if (!baseUrl.startsWith('https://')) return fail(`base URL is not https: ${baseUrl}`);
      const p = await page('threshold');
      if (p.error) return fail(`request failed: ${p.error}`);
      if (p.status !== 200) return fail(`threshold returned ${p.status}`);
      return pass(`${baseUrl} returned 200 over HTTPS`);
    },
  },
  {
    id: 'm1.http-redirect',
    description: 'Plain HTTP redirects to HTTPS',
    async run() {
      const httpUrl = baseUrl.replace(/^https:/, 'http:') + '/';
      try {
        const { res } = await get(httpUrl, { redirect: 'manual' });
        const loc = res.headers.get('location') ?? '';
        if (res.status >= 300 && res.status < 400 && loc.startsWith('https://')) {
          return pass(`${res.status} to ${loc}`);
        }
        return fail(`expected a redirect to https, got ${res.status} location="${loc}"`);
      } catch (err) {
        return fail(`request failed: ${err.message}`);
      }
    },
  },
  {
    id: 'm1.routes',
    description: 'All seven screen routes return 200',
    async run() {
      const pages = await allPages();
      const bad = pages.filter((p) => p.status !== 200);
      if (bad.length) {
        return fail(bad.map((p) => `${p.routeName} ${p.url} -> ${p.error ?? p.status}`).join('; '));
      }
      return pass(`${pages.length}/${pages.length} routes returned 200`);
    },
  },
  {
    id: 'm1.concept-bar',
    description: 'Concept bar text is present on every screen',
    async run() {
      const pages = await allPages();
      const missing = [];
      for (const p of pages) {
        const text = visibleText(p.html).toLowerCase();
        for (const phrase of config.conceptBarMustInclude) {
          if (!text.includes(phrase.toLowerCase())) missing.push(`${p.routeName}: "${phrase}"`);
        }
      }
      return missing.length ? fail(`missing: ${missing.join('; ')}`) : pass('present on all routes');
    },
  },
  {
    id: 'm1.no-third-party-scripts',
    description: 'No external or analytics scripts on any screen',
    async run() {
      const pages = await allPages();
      const problems = [];
      for (const p of pages) {
        for (const host of scriptSrcHosts(p.html)) {
          if (host !== baseHost) problems.push(`${p.routeName}: script from ${host}`);
        }
        const lower = p.html.toLowerCase();
        for (const a of config.analyticsHosts) {
          if (lower.includes(a)) problems.push(`${p.routeName}: mentions ${a}`);
        }
      }
      return problems.length ? fail(problems.join('; ')) : pass('only same-origin scripts, no analytics hosts');
    },
  },
  {
    id: 'm1.copy-discipline',
    description: 'Rendered copy has no em dashes and no banned terms',
    async run() {
      const pages = await allPages();
      const problems = [];
      for (const p of pages) {
        const raw = p.html;
        const text = visibleText(raw).toLowerCase();
        if (text.includes('\u2014') || /&mdash;|&#8212;|&#x2014;/i.test(raw)) {
          problems.push(`${p.routeName}: em dash`);
        }
        for (const term of config.bannedCopy) {
          if (text.includes(term.toLowerCase())) problems.push(`${p.routeName}: "${term}"`);
        }
      }
      return problems.length ? fail(problems.join('; ')) : pass('clean on all routes');
    },
  },
  {
    id: 'm1.ttfb',
    description: 'Time to first byte per route (information only)',
    async run() {
      const pages = await allPages();
      const parts = pages.map((p) => `${p.routeName} ${p.ttfbMs ?? 'n/a'}ms`);
      const slow = pages.filter((p) => p.ttfbMs != null && p.ttfbMs > config.ttfbWarnMs);
      const detail = parts.join(', ');
      return slow.length ? warn(`over ${config.ttfbWarnMs}ms: ${detail}`) : pass(detail);
    },
  },

  // ---------- planned for later milestones ----------
  { id: 'm2.museum-apis', pending: 'M2', description: 'AIC, Met, Rijksmuseum, LOC and JPL sources reachable with one request each' },
  { id: 'm2.thumbnails', pending: 'M2', description: 'A sample of catalog thumbnails is served from the app' },
  { id: 'm2.full-images', pending: 'M2', description: 'A sample of full-size image URLs resolve at the source institutions' },
  { id: 'm3.anthropic-key', pending: 'M3', costly: true, description: 'One minimal Anthropic API call succeeds with the build key' },
  { id: 'm5.j2-cache', pending: 'M5', description: 'J2 answers a pre-warmed phrase from the cache' },
  { id: 'm5.j2-live', pending: 'M5', costly: true, description: 'J2 answers a novel phrase from a live call within 4 seconds' },
  { id: 'm5.signals', pending: 'M5', description: 'Signals screen shows four findings and the simulated label' },
  { id: 'm7.cost-line', pending: 'M7', description: 'Cost line is visible with real N and X' },
];

// ---------- runner ----------

if (args.list) {
  for (const c of CHECKS) {
    const tag = c.pending ? `pending ${c.pending}` : 'active';
    console.log(`${c.id.padEnd(28)} ${tag.padEnd(11)} ${c.costly ? 'costly ' : '       '}${c.description}`);
  }
  process.exit(0);
}

const only = args.only ? new Set(args.only.split(',').map((s) => s.trim())) : null;
if (only) {
  const unknown = [...only].filter((id) => !CHECKS.some((c) => c.id === id));
  if (unknown.length) {
    console.error(`Unknown check id(s): ${unknown.join(', ')}. Run with --list to see them.`);
    process.exit(2);
  }
}

console.log(`Feel First live smoke test against ${baseUrl}`);
console.log(`Started ${new Date().toISOString()}\n`);

const results = [];
for (const c of CHECKS) {
  if (only && !only.has(c.id)) continue;
  let r;
  if (c.pending) {
    r = { status: 'PENDING', detail: `not built yet (${c.pending})` };
  } else if (c.costly && !args['include-costly']) {
    r = { status: 'SKIP', detail: 'spends money; rerun with --include-costly' };
  } else {
    try {
      r = await c.run();
    } catch (err) {
      r = fail(`check threw: ${err.message}`);
    }
  }
  results.push({ id: c.id, description: c.description, ...r });
  console.log(`${r.status.padEnd(8)} ${c.id.padEnd(28)} ${r.detail}`);
}

const counts = results.reduce((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
console.log(`\n${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);

await mkdir(path.join(process.cwd(), '.smoke'), { recursive: true });
await writeFile(
  path.join(process.cwd(), '.smoke', 'last-run.json'),
  JSON.stringify({ baseUrl, ranAt: new Date().toISOString(), results }, null, 2),
);

process.exit(results.some((r) => r.status === 'FAIL') ? 1 : 0);
