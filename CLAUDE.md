# Feel First: instructions for Claude Code

This repository is Feel First, a prototype built by Scott Reasinger as an unsolicited concept for Trends International, the Indianapolis company that owns Art.com and AllPosters.com. It is deployed to art.reasinger.net.

Its audience is one person, the Trends CEO. He will read a short note, watch a 90-second video, open the link, and decide whether the idea and the person who built it are worth a conversation. Judge everything you build against that moment. Something beautiful that breaks once fails. Something plain that works every time and loads instantly can pass.

## Read these before doing anything, every session

1. `docs/spec.md` is the locked build spec (v2). It is the law of this repository.
   - Every requirement carries a citation tag such as [RB12], [Res #37] or [Gap G22].
   - Gap resolutions G1 to G20 live in `docs/spec-v1.md` Section 9. G21 to G33 are in `docs/spec.md` Section 10. Both are binding.
2. `docs/product-brief.md` explains what the product is and why it exists, in plain language. Read it when the spec tells you what but not why.
3. `docs/quality-bar.md` defines what "good enough" means. A milestone is not done until its quality-bar checks pass.
4. `docs/ai-jobs.md` gives the practical detail for the eight jobs (J1 to J8), their contracts and their limits.
5. `docs/asset-sources.md` explains where the art and posters come from and the rules for using them.
6. `docs/decisions.md` records every decision made after the spec was locked, plus open questions. `docs/design-log.md` records each design round in Milestone 4.
7. `docs/milestones.md` lists the milestones, their scope, and their exit criteria. Work only inside the current milestone.
8. `docs/testing.md` is the testing policy: what gets tested, risk tiers, mutation testing, functional gates, and the testing loop for every milestone. `docs/test-tiers.md` holds the triage tables.

## How to work in this repository

**The spec decides scope.** If a task needs something the spec does not cover, do not invent an answer. Do not quietly pick the option that seems sensible. Stop, describe the question and the options in two or three sentences, and ask Scott. When he answers, add the decision to `docs/decisions.md` with the date before you continue. The spec was built through a process designed to prevent silent judgment calls. One invented requirement undermines the whole method, and Scott will be asked in an interview how this was built.

**Stay inside the milestone.** Do not start work that belongs to a later milestone, even if it looks easy. If you notice something a later milestone will need, add it to "Open questions" in `docs/decisions.md`.

**Out of scope means not built.** Spec Section 1.7 lists what must not exist. Do not add any of these, including as temporary scaffolding:
- real checkout or payment
- user accounts
- art.com images or scraping
- licensed pop-culture assets
- AR or WebXR
- wall segmentation
- any database or storage service
- a working retailer service
- analytics or tracking scripts of any kind (including any analytics add-on from the hosting platform)
- artist, title or category pages
- GitHub Spec Kit

**Keep it boring and cheap.** Use Next.js on Upsun and precomputed JSON for all catalog data, with the fewest dependencies that do the job. Before adding a package, check whether the platform or a few lines of code already cover it. Cost control is one of the three things this prototype has to prove about Scott, and the build itself is the evidence.

**One config file for tunable values.** Every value in spec Section 7 lives in `src/config/feel.ts`. Components import from there. Nothing else in the codebase hard-codes page sizes, nudge steps, timeouts, prices, shipping, bucket cut points, frame and mat widths, rate limits, wall colors, contact details or the cost line.

**All catalog reads go through one module.** `src/lib/catalog.ts` is the only code that touches `data/catalog.json`, `data/copy.json` and `data/signals.json`. This keeps a later database swap to one file [Res #28].

**Secrets stay on the server.** The Anthropic API key is read only in server code, from the `ANTHROPIC_API_KEY` environment variable. It never appears in client bundles, logs, or committed files. Only J2 calls a model at request time. J1, J4 and J8 run as scripts in `scripts/`, by hand, never from the deployed app.

**No visitor data leaves the browser.** Session state (mood point, re-hangs, bag, the "your session" panel) lives in client memory only. Do not store it, send it, or log it.

## Testing (D-014, details in `docs/testing.md`)

- **Never call an outside party from a test.** Mock, stub, or replay recorded fixtures from `tests/fixtures/`. No exceptions. Only `scripts/smoke/live-smoke.mjs` touches live systems, Scott runs it by hand, and no test may import it.
- **Tier before you test.** Before writing tests for new or changed code, run the `test-evaluator` subagent on those units and save its table verbatim to `docs/test-tiers.md`. Show Scott the table. Write tests to the tier, not to a coverage number.
- **High tier gets mutation testing.** Stryker must catch at least 80% of mutants in High-tier files.
- **Sweep after you test.** Run the `test-sweeper` subagent on new tests and delete what it flags, unless Scott agrees a flagged test has real value.
- **Every interface with a defined send or return gets a functional gate**, listed in `docs/testing.md`.
- **Deploy, then test.** No pre-deploy gate. After a deploy, tell Scott to run the live smoke test. When the milestone adds something that faces the live world, add or activate its smoke check.
- Coverage is reported in milestone summaries for information only. Never write a test just to raise it.

## Message discipline (applies to every word on screen)

Spec Section 1.6 is binding. In short, nothing in the prototype does any of the following:
- Critiques the current Art.com or AllPosters sites, their platform, or their cost.
- Names the commerce platform vendor, or uses the word "replatform".
- Names competitors.
- Names any person, or says anything about Trends staff or teams.
- Covers licensing contracts, retailer data rights, or legal detail. The concept bar and image credits are exempt.

The experience is called Feel First. "Art.com" appears only as plain text in the concept bar and in Builder Notes. No art.com, Trends or AllPosters logos, colors or brand styling anywhere.

## Writing rules for anything a visitor or Scott will read

- Never use the em dash character. Use a period, comma, colon, or parentheses instead.
- Write plain, specific copy. No marketing filler. No exclamation points in UI text.
- Builder Notes are written in first person, in Scott's direct voice. Only two lines have fixed wording: the platform line and the cost line in spec Section 6.2. Use those exactly.

## Build log (required from the first commit)

At the end of every working session, append a row to `build-log.md`:

`| date | hours | Anthropic API $ | other spend $ | notes |`

This log is the only source for the cost line "Built in N days for $X in AI and hosting" [Res #40, Gap G31]. Never estimate those numbers. Leave the cost line hidden until Scott fills N and X on the day the video is recorded.

## Commits

- Write small commits with messages that say what changed and why, in plain English.
- Prefix each message with the milestone, for example `M2: add AIC ingest script`.

## Definition of done for any task

1. It does what the cited spec lines say, and nothing the spec does not say.
2. The relevant quality-bar checks pass.
3. Lint and type checks pass with no new warnings.
4. Tests meet `docs/testing.md`: units tiered, tier requirements met, mutation score at least 80% on High-tier files, sweeper flags resolved, functional gates in place, and no test calls an outside party.
5. It works at phone width (390px) and desktop width (1440px).
6. Scott has seen it running, locally or on an Upsun preview environment URL.
7. `build-log.md` has today's row.
