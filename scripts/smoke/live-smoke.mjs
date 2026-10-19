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
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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

/** How the project identifies itself to sources (D-017). JPL's CDN accepts it as is. */
const sourceHeaders = {
  'User-Agent': 'Feel First prototype (scott@reasinger.net)',
  'AIC-User-Agent': 'Feel First prototype (scott@reasinger.net)',
};

const catalog = JSON.parse(await readFile(path.join(here, '../../data/catalog.json'), 'utf8'));

/**
 * A small fixed sample, so each run makes the same few requests: the first fine-art work, the first
 * poster and the middle work; or, with onePerSource, the first work from each institution.
 */
function catalogSample({ onePerSource = false } = {}) {
  if (onePerSource) {
    const seen = new Map();
    for (const work of catalog) if (!seen.has(work.source)) seen.set(work.source, work);
    return [...seen.values()];
  }
  const picks = [catalog.find((w) => w.lane === 'fine-art'), catalog.find((w) => w.lane === 'poster'), catalog[Math.floor(catalog.length / 2)]];
  return [...new Set(picks.filter(Boolean))];
}

/** POSTs a body to the J2 route and reads its answer path, status, body and time (D-066). */
async function postJ2(body) {
  try {
    const { res, ttfbMs } = await get(`${baseUrl}/api/j2`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const headers = Object.fromEntries(res.headers);
    return { status: res.status, source: res.headers.get('x-j2-source'), body: await res.json(), headers, ms: ttfbMs, error: null };
  } catch (err) {
    return { error: err.message };
  }
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

  // ---------- M2 assets ----------
  {
    id: 'm2.museum-apis',
    description: 'AIC, Met, Rijksmuseum, LOC and JPL sources reachable with one request each',
    async run() {
      // JPL's gallery page challenges scripts (D-017), so JPL is checked at the CDN that serves its posters.
      const sources = [
        ['AIC', 'https://api.artic.edu/api/v1/artworks/search?limit=1&fields=id', 'json'],
        ['Met', 'https://collectionapi.metmuseum.org/public/collection/v1/objects/436535', 'json'],
        ['Rijksmuseum', 'https://data.rijksmuseum.nl/search/collection?type=painting&imageAvailable=true', 'json'],
        ['LOC', 'https://www.loc.gov/collections/works-progress-administration-posters/?fo=json&c=1', 'json'],
        ['JPL', 'https://d2pn8kiwq2w21t.cloudfront.net/original_images/mars.jpg', 'image'],
      ];
      const problems = [];
      for (const [name, url, kind] of sources) {
        try {
          const { res } = await get(url, { headers: { ...sourceHeaders, ...(kind === 'image' ? { Range: 'bytes=0-0' } : {}) } });
          const type = res.headers.get('content-type') ?? '';
          await res.body?.cancel();
          if (!res.ok) problems.push(`${name} ${res.status}`);
          else if (kind === 'json' && !type.includes('json')) problems.push(`${name} answered ${type || 'no content type'}, not JSON`);
          else if (kind === 'image' && !type.startsWith('image/')) problems.push(`${name} answered ${type || 'no content type'}, not an image`);
        } catch (err) {
          problems.push(`${name}: ${err.message}`);
        }
      }
      return problems.length ? fail(problems.join('; ')) : pass(`${sources.length}/${sources.length} sources answered`);
    },
  },
  {
    id: 'm2.thumbnails',
    description: 'A sample of catalog thumbnails is served from the app',
    async run() {
      const sample = catalogSample();
      const problems = [];
      for (const work of sample) {
        try {
          const { res } = await get(baseUrl + work.thumbUrl);
          const type = res.headers.get('content-type') ?? '';
          await res.body?.cancel();
          if (res.status !== 200 || type !== 'image/webp') problems.push(`${work.thumbUrl} -> ${res.status} ${type}`);
        } catch (err) {
          problems.push(`${work.thumbUrl}: ${err.message}`);
        }
      }
      return problems.length ? fail(problems.join('; ')) : pass(`${sample.length}/${sample.length} thumbnails served as WebP`);
    },
  },
  {
    id: 'm2.full-images',
    description: 'A sample of full-size image URLs resolve at the source institutions',
    async run() {
      const sample = catalogSample({ onePerSource: true });
      const problems = [];
      for (const work of sample) {
        try {
          const { res } = await get(work.imageUrl, { headers: { ...sourceHeaders, Range: 'bytes=0-0' } });
          const type = res.headers.get('content-type') ?? '';
          await res.body?.cancel();
          if (!res.ok || !type.startsWith('image/')) problems.push(`${work.source}: ${res.status} ${type}`);
        } catch (err) {
          problems.push(`${work.source}: ${err.message}`);
        }
      }
      return problems.length ? fail(problems.join('; ')) : pass(`${sample.length}/${sample.length} institutions served the full-size image`);
    },
  },

  // ---------- M3 build-time AI ----------
  {
    id: 'm3.anthropic-key',
    costly: true,
    description: 'One minimal Anthropic API call succeeds with the build key',
    async run() {
      // The key comes from the environment or .env.local and is never printed. The call costs a fraction of a cent.
      if (!process.env.ANTHROPIC_API_KEY) {
        try {
          process.loadEnvFile(path.join(here, '../../.env.local'));
        } catch {
          return fail('ANTHROPIC_API_KEY is not set and .env.local was not found');
        }
      }
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const { claudeModel } = await import('../../src/config/feel.ts');
      try {
        const message = await new Anthropic({ timeout: config.timeoutMs }).messages.create({
          model: claudeModel,
          max_tokens: 16,
          messages: [{ role: 'user', content: 'Reply with the word ready.' }],
        });
        return pass(`${claudeModel} answered (${message.usage.input_tokens} in, ${message.usage.output_tokens} out)`);
      } catch (err) {
        return fail(`${err.status ?? ''} ${err.name}`.trim());
      }
    },
  },

  // ---------- M4 core journey ----------
  {
    id: 'm4.room-poster-first',
    description: 'The Room hangs works with a poster at position 1',
    async run() {
      const p = await page('room');
      if (p.status !== 200) return fail(`room returned ${p.error ?? p.status}`);
      const list = p.html.match(/<ol[^>]*aria-label="The room"[^>]*>([\s\S]*?)<\/ol>/);
      if (!list) return fail('no hang list in the Room');
      const lanes = [...list[1].matchAll(/data-lane="([^"]+)"/g)].map((m) => m[1]);
      if (!lanes.length) return fail('the hang is empty');
      return lanes[0] === 'poster' ? pass(`${lanes.length} works hung, a poster first`) : fail(`position 1 is ${lanes[0]}`);
    },
  },
  {
    id: 'm4.piece-pages',
    description: 'Sample Piece screens show title, source and Add to bag; an unknown work is 404',
    async run() {
      const problems = [];
      const sample = catalogSample();
      for (const work of sample) {
        try {
          const { res } = await get(`${baseUrl}/piece/${work.id}`);
          const text = visibleText(await res.text());
          if (res.status !== 200) problems.push(`${work.id} -> ${res.status}`);
          else for (const want of [work.title, work.source, 'Add to bag']) if (!text.includes(want)) problems.push(`${work.id}: missing "${want}"`);
        } catch (err) {
          problems.push(`${work.id}: ${err.message}`);
        }
      }
      try {
        const { res } = await get(`${baseUrl}/piece/no-such-work`);
        await res.body?.cancel();
        if (res.status !== 404) problems.push(`unknown work -> ${res.status}, expected 404`);
      } catch (err) {
        problems.push(`unknown work: ${err.message}`);
      }
      return problems.length ? fail(problems.join('; ')) : pass(`${sample.length}/${sample.length} Piece screens complete, unknown work 404`);
    },
  },
  {
    id: 'm4.fonts-self-hosted',
    description: 'No route loads fonts from Google; the font files come from the site',
    async run() {
      const pages = await allPages();
      const problems = [];
      const fonts = new Set();
      for (const p of pages) {
        if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(p.html)) problems.push(`${p.routeName}: Google font host`);
        // Font files appear in preload links and, escaped, in the streamed page data.
        for (const m of p.html.matchAll(/\/_next\/static\/media\/[\w.-]+\.woff2/g)) fonts.add(m[0]);
      }
      if (!fonts.size) problems.push('no woff2 font file referenced');
      for (const href of fonts) {
        const url = new URL(href, baseUrl);
        if (url.host !== baseHost) {
          problems.push(`font from ${url.host}`);
          continue;
        }
        try {
          const { res } = await get(url.href);
          await res.body?.cancel();
          if (res.status !== 200) problems.push(`${url.pathname} -> ${res.status}`);
        } catch (err) {
          problems.push(`${url.pathname}: ${err.message}`);
        }
      }
      return problems.length ? fail(problems.join('; ')) : pass(`${fonts.size} font file(s) served from ${baseHost}`);
    },
  },
  {
    id: 'm4.journey-copy',
    description: 'The Room shows a feeling sentence; Close shows "No search typed" and the Signals link',
    async run() {
      const { feelingSentences } = await import('../../src/config/feel.ts');
      const room = visibleText((await page('room')).html);
      const closeHtml = (await page('close')).html;
      const problems = [];
      if (!Object.values(feelingSentences).some((line) => room.includes(line))) problems.push('room: no feeling sentence');
      if (!visibleText(closeHtml).includes('No search typed')) problems.push('close: no "No search typed"');
      if (!/<a[^>]*href="\/signals"/.test(closeHtml)) problems.push('close: no Signals link');
      return problems.length ? fail(problems.join('; ')) : pass('feeling sentence, "No search typed" and the Signals link present');
    },
  },

  // ---------- M5 live AI, Wall and Signals ----------
  {
    id: 'm5.j2-cache',
    description: 'J2 answers a pre-warmed phrase from the cache',
    async run() {
      const { describePlaceholder } = await import('../../src/config/feel.ts');
      const r = await postJ2({ text: describePlaceholder });
      if (r.error) return fail(r.error);
      if (r.status !== 200 || r.source !== 'cache') return fail(`${r.status}, x-j2-source ${r.source}`);
      if (r.body?.roomType !== 'bedroom' || r.body?.size !== 'large') return fail(`answered ${JSON.stringify(r.body)}`);
      return pass(`cache answered in ${r.ms}ms: bedroom, large`);
    },
  },
  {
    id: 'm5.j2-live',
    costly: true,
    description: 'J2 answers a novel phrase from a live call within 4 seconds',
    async run() {
      // One novel phrase, never in the cache. Costs a fraction of a cent and counts toward this IP's hourly limit.
      const { j2TimeoutMs } = await import('../../src/config/feel.ts');
      const r = await postJ2({ text: 'rain on the studio skylight after a long week, something to calm me down' });
      if (r.error) return fail(r.error);
      // A fallback at or past the timeout is the accepted slow call (D-081); a faster one means the call failed.
      if (r.status === 200 && r.source === 'fallback' && r.ms >= j2TimeoutMs) return warn(`fallback after ${r.ms}ms: the live call ran past the ${j2TimeoutMs}ms timeout (accepted, D-081)`);
      if (r.status !== 200 || r.source !== 'live') return fail(`${r.status}, x-j2-source ${r.source} after ${r.ms}ms: the live call failed or was rate limited`);
      if (!Number.isFinite(r.body?.valence) || !Number.isFinite(r.body?.arousal)) return fail(`answered ${JSON.stringify(r.body)}`);
      return r.ms <= j2TimeoutMs ? pass(`live answer in ${r.ms}ms`) : warn(`live answer in ${r.ms}ms, over ${j2TimeoutMs}ms`);
    },
  },
  {
    id: 'm5.j2-bad-request',
    description: 'J2 turns away an oversized or malformed body with 400 and the fallback header, no model call',
    async run() {
      const { describeMaxChars } = await import('../../src/config/feel.ts');
      const problems = [];
      const cases = [
        ['oversized', { text: 'a'.repeat(describeMaxChars + 1) }],
        ['extra key', { text: 'calm', mood: [0, 0] }],
      ];
      for (const [label, body] of cases) {
        const r = await postJ2(body);
        if (r.error) problems.push(`${label}: ${r.error}`);
        else if (r.status !== 400 || r.source !== 'fallback' || r.body !== null) problems.push(`${label}: ${r.status}, ${r.source}, ${JSON.stringify(r.body)}`);
      }
      return problems.length ? fail(problems.join('; ')) : pass('oversized and extra-key bodies answered 400 with x-j2-source fallback');
    },
  },
  {
    id: 'm5.wall',
    description: 'The Wall serves its scene stage, its scene, color, size, frame and photo choices, and Add to bag',
    async run() {
      const p = await page('wall');
      if (p.status !== 200) return fail(`wall returned ${p.error ?? p.status}`);
      const text = visibleText(p.html);
      const missing = ['Scene', 'Wall color', 'Size', 'Frame', 'No frame', 'Use a photo of your wall', 'Add to bag'].filter((w) => !text.includes(w));
      if (!/data-scene="(sofa|bed|desk)"/.test(p.html)) missing.push('the scene stage');
      return missing.length ? fail(`missing ${missing.join(', ')}`) : pass('scene stage and every Wall choice present');
    },
  },
  {
    id: 'm5.signals',
    description: 'Signals shows four findings, each action, the simulated label, the ask and the contact',
    async run() {
      const signals = JSON.parse(await readFile(path.join(here, '../../data/signals.json'), 'utf8'));
      const { contactEmail } = await import('../../src/config/feel.ts');
      const p = await page('signals');
      if (p.status !== 200) return fail(`signals returned ${p.error ?? p.status}`);
      const text = visibleText(p.html);
      const want = ['Simulated data.', 'Next step', 'licensed SKUs', contactEmail, ...signals.findings.flatMap((f) => [f.text, f.action])];
      const missing = want.filter((w) => !text.includes(w));
      if (signals.findings.length !== 4) missing.push(`four findings (file has ${signals.findings.length})`);
      return missing.length ? fail(`missing: ${missing.map((m) => m.slice(0, 40)).join(' | ')}`) : pass('four findings with their actions, the label, the ask and the contact');
    },
  },
  {
    id: 'm5.key-not-served',
    description: 'No served page, script or J2 response holds the Anthropic key or its variable name',
    async run() {
      // The key value, when it is available here, is read from the environment or .env.local and never printed.
      if (!process.env.ANTHROPIC_API_KEY) {
        try {
          process.loadEnvFile(path.join(here, '../../.env.local'));
        } catch {
          // No local key: the check still looks for the variable name.
        }
      }
      const name = 'ANTHROPIC_API_KEY';
      const value = process.env[name];
      const leaks = (s) => s.includes(name) || Boolean(value && s.includes(value));
      const pages = await allPages();
      const problems = [];
      const scripts = new Set();
      for (const p of pages) {
        if (leaks(p.html)) problems.push(`${p.routeName} page`);
        for (const m of p.html.matchAll(/\/_next\/static\/[\w./-]+\.js/g)) scripts.add(m[0]);
      }
      for (const src of scripts) {
        try {
          const { res } = await get(new URL(src, baseUrl).href);
          if (leaks(await res.text())) problems.push(src);
        } catch (err) {
          problems.push(`${src}: ${err.message}`);
        }
      }
      // A cached phrase and a refused body: two J2 answer paths with no model call, so this check costs nothing.
      const { describePlaceholder } = await import('../../src/config/feel.ts');
      for (const body of [{ text: describePlaceholder }, { text: 'calm', mood: [0, 0] }]) {
        const r = await postJ2(body);
        if (r.error) problems.push(`j2: ${r.error}`);
        else if (leaks(JSON.stringify(r.body) + JSON.stringify(r.headers))) problems.push(`j2 ${r.source} response`);
      }
      if (!scripts.size) problems.push('no scripts found to check');
      return problems.length ? fail(`key found or unchecked: ${problems.join(', ')}`) : pass(`${pages.length} pages, ${scripts.size} scripts and two J2 responses (cache, refused) clean${value ? '' : ' (name only; no key value here)'}`);
    },
  },

  // ---------- planned for later milestones ----------
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

// Set the exit code and let Node exit on its own: calling process.exit while the Anthropic SDK's sockets
// are still closing trips a libuv assertion on Windows.
process.exitCode = results.some((r) => r.status === 'FAIL') ? 1 : 0;
