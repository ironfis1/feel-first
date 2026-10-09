# Milestone 2 prompt: Test backfill and assets

## Before you paste this (Scott, about 5 minutes)

The updated kit adds the testing policy, the two test subagents, and the live smoke script. It also changes `CLAUDE.md`, the quality bar, the milestones and the decisions log. Your repo may already hold M1 edits to some of those files, such as `build-log.md` rows or decisions logged during M1. So don't copy the kit over the repo. Unzip it into a holding folder and let Claude Code merge it:

```bash
cd /c/Users/sreas/GitHubRepo/feel-first
mkdir kit-update
unzip /c/Users/sreas/Downloads/feel-first-kit.zip -d kit-update
claude
```

Then paste everything below the line.

---

You are starting Milestone 2 of Feel First. It has two parts: **Part A** backfills tests for the Milestone 1 code, and **Part B** builds the asset pipeline. Do Part A completely, and get my confirmation, before starting Part B.

## Step 0: merge the kit update

`kit-update/feel-first-kit/` holds an updated kit. Merge it into the repo:

- **New files:** copy them as they are. These are:
  - `docs/testing.md`
  - `docs/test-tiers.md`
  - `.claude/agents/test-evaluator.md`
  - `.claude/agents/test-sweeper.md`
  - `scripts/smoke/live-smoke.mjs`
  - `scripts/smoke/smoke.config.json`
  - `prompts/M2-assets.md`
- **Changed files** (`CLAUDE.md`, `docs/quality-bar.md`, `docs/milestones.md`, `docs/decisions.md`): take the kit version, but keep anything that was added in the repo during M1 and is missing from the kit version. Examples are decisions logged during M1, or the approved concept bar text if it was recorded. Show me a short summary of what you kept from the repo side.
- **`build-log.md`:** keep the repo version. Do not overwrite it.
- **`docs/spec.md` and `docs/spec-v1.md`:** take the kit version. The only spec change is hosting (Res #59), which M1 already followed.
- Delete `kit-update/` when done.
- Commit: `M2: merge kit update (testing policy, smoke test)`.

Then read `CLAUDE.md` and every file it lists, in order, including the new `docs/testing.md`. Summarize back to me in five lines or fewer what changed in how you work, then wait for me to confirm.

## Part A: M1 test backfill

1. **Install the test tools** from `docs/testing.md`: Vitest, React Testing Library (with jsdom), Playwright, zod and Stryker with its Vitest runner. Add the npm scripts listed in `docs/testing.md`. `test:prod` can be a placeholder until M4. Add `.smoke/` and Stryker's output folders to `.gitignore`.

2. **Wire the live smoke test.** Add `npm run smoke:live`. Update `scripts/smoke/smoke.config.json` so the seven routes match the actual paths built in M1, and set the piece route to a real fixture ID. Do not run it yourself. Tell me when it is ready, and I will run it against production.

3. **Triage the M1 code.** Run the `test-evaluator` subagent on every unit built in M1: config, the catalog module, the route components, the concept bar and anything else with logic. Save its output verbatim to `docs/test-tiers.md`. **Stop and show me the table.** Wait for my review.

4. **Write the tests** to the tiers I approve. These include:
   - zod schemas for a catalog record (spec Section 3.2) and for the config (spec Section 7).
   - Config is validated against its schema in a test.
   - Contract tests for every function the catalog module exports (functional gate).
   - Whatever the tier table requires for the route components and the concept bar.

   Tests read only from `data/fixtures/` and `tests/fixtures/`. No network calls.

5. **Mutation testing.** Configure `stryker.config.json` with only the High-tier files under `mutate`, break threshold 80. Run it and reach 80% on each High-tier file. If a surviving mutant genuinely cannot matter, record it in `docs/test-tiers.md` with the reason.

6. **Sweep.** Run the `test-sweeper` subagent on the new tests. Delete what it flags. If you believe a flagged test has real value, tell me why and I will decide.

7. **Report and stop.** Show me:
   - the test count by tier,
   - the mutation scores,
   - the sweeper result,
   - coverage, for information.

   Commit `M2: test backfill for M1`. Wait for my confirmation before Part B.

## Part B: assets

Read `docs/asset-sources.md` and decisions D-001 (hybrid images) and D-002 (curation rules) before writing any code.

1. **Verify each source first.** Before writing an ingest script, read that source's current official API documentation. Confirm the endpoints, rate limits, license fields and any requested identifying header or User-Agent. Use "Feel First prototype (scott@reasinger.net)" as the identifier. If anything differs from `docs/asset-sources.md`, tell me before continuing and log it in `docs/decisions.md`.

2. **Ingest scripts**, one per source, in `scripts/ingest/`: Art Institute of Chicago, the Met, Rijksmuseum, NASA JPL "Visions of the Future", and Library of Congress WPA posters. Each script:
   - throttles to the source's limits,
   - writes `data/raw/{source}.json`,
   - applies the D-002 curation rules,
   - and logs every skip with a reason.

   While developing each script, save one real API response per source into `tests/fixtures/ingest/`. That recorded response is what the tests use. The tests themselves never call the source.

3. **Thumbnails (D-001).** Download and resize thumbnails into `public/thumbs/`. Resize, never crop. Before running this for the full catalog, propose a thumbnail width and an estimate of the total repo size it adds. **Stop and wait for my approval.**

4. **Merge step.** Produce `data/catalog.json` with about 300 fine-art works and about 300 posters (spec Section 2):
   - **Fine art:** about 100 each from AIC, the Met and the Rijksmuseum. Shortfalls follow Gap G21.
   - **Posters:** every available JPL poster, with the remainder from WPA.
   - Every record carries full credits and a license.
   - The J1 emotional fields (valence, arousal, tags, palette, subject) are not present yet. Use a metadata-stage schema that leaves them out, and keep the full schema for M3.
   - The file is validated against its schema at build time.

5. **Switch the catalog module** to read `data/catalog.json` for the app. Keep the fixture file for tests.

6. **Review materials for me:**
   - **Skip log:** a readable list of every skipped work with its reason.
   - **Contact sheet:** a local HTML file showing a random 60 works with their credits, so I can check quality and the fine-art and poster balance. It is generated by a script and not deployed.

   **Stop and wait for my review of both.**

7. **Testing loop** for all Part B code, per `docs/testing.md`:
   - triage, then show me the table,
   - tests to tier,
   - contract tests for each source's ingest against its recorded response,
   - schema tests for the catalog file,
   - Stryker on High-tier files,
   - sweep.

8. **Smoke checks.** Implement and activate `m2.museum-apis`, `m2.thumbnails` and `m2.full-images` in `scripts/smoke/live-smoke.mjs`, replacing their PENDING entries. They are free checks with one request each. Then deploy and tell me to run the smoke test.

9. **Build log.** Add today's row to `build-log.md`.

## Rules for this session

- Never call an outside party from a test. Ingest scripts call sources only when run by hand during development.
- If anything is unclear or conflicts with the spec or the decisions log, stop and ask me. Do not choose for me.
- Commit in small steps with messages prefixed `M2:`.
- Never use the em dash character in any file, comment or UI text.

## When you think M2 is done

Check every exit criterion for M2 in `docs/milestones.md`, including the standing testing criteria at the top of that file. Show me the evidence for each one. Then stop. Do not start Milestone 3.
