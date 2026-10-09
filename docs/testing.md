# Testing policy

Decision D-014. This file says what gets tested, how much, and how test value is judged. The principle is that tests are spent where a failure would hurt, not spread evenly to hit a coverage number. Coverage is reported for information and gates nothing.

## The rules that never bend

1. **Tests never call outside parties.** No test may call the Anthropic API, a museum or library API, JPL, Upsun, or any other network service. External boundaries are mocked, stubbed, or replayed from recorded fixtures stored in `tests/fixtures/`. The only code that touches live systems is `scripts/smoke/live-smoke.mjs`, which Scott runs by hand and which no test may import.
2. **Every interface with a defined send or return has a functional gate.** See "Functional gates" below.
3. **Deploy, then test.** There is no pre-deploy gate. After each deploy, Scott runs the live smoke test. From Milestone 4 on, the end-to-end demo-path test also runs against production. It uses only cached J2 phrases, so even production testing never calls Anthropic.

## Tools

- **Vitest** for unit tests.
- **React Testing Library** for component tests.
- **Playwright** for end-to-end tests.
- **zod** for schemas. These schemas also validate J2 output and data files at runtime.
- **Stryker** (`@stryker-mutator/core` with the Vitest runner) for mutation testing.

## What gets tested

| Kind of code | Test type |
|---|---|
| Logic: `src/lib`, config validation, ranking, pricing, nudge math, bucket mapping, metrics, J8 computation, pure functions inside build scripts | Unit tests, sized by risk tier |
| React components | Render tests for behavior: what shows, what an interaction does, required elements present (for example the concept bar) |
| Pure styling and markup with no logic | No unit tests. The end-to-end run covers them. |
| Generated data files (`catalog.json`, `copy.json`, `signals.json`, J2 cache, word map) | Schema tests, plus validation at build time so a bad file fails the build |

## How much: risk tiers

Before tests are written for new or changed code, the **test-evaluator** subagent (`.claude/agents/test-evaluator.md`, runs on Sonnet) triages each code unit. It sees the code, the spec and this rubric. It does not see the reasoning of the session that wrote the code. It returns a table that is saved verbatim to `docs/test-tiers.md`, and Scott reviews the table before tests are written.

### Rubric

Each criterion is scored 1 to 3. Every score must cite evidence from the code: a line, a branch, a caller, or a spec tag.

| Criterion | 1 | 2 | 3 |
|---|---|---|---|
| **Impact**: what breaks if it fails | Cosmetic, nobody would care | A screen misbehaves but the demo can continue | The demo breaks, or a number the CEO sees is wrong (prices, metrics, Signals figures, cost line) |
| **Silence**: would anyone notice | Obvious on sight (blank page, crash) | Noticeable if you look | Silently wrong (a figure off by a little, ranking subtly off, wrong bucket) |
| **Surface**: how much depends on it | One element on one screen | One screen, or off the demo path | Several screens, or on the demo path |
| **Complexity** | Straight-line code, constants | Some branching or data shaping | Math, multiple branches, state, timing, async, or randomness |
| **Boundary** | Internal only | Internal interface used by other modules | Defined send or return with an outside party or a data contract |

**Tier assignment:**
- **High:** total 12 or more, or a 3 on Impact together with a 3 on Silence.
- **Medium:** total 8 to 11.
- **Low:** total 7 or less.
- **Boundary scores of 3** always also get a functional gate, whatever the tier.

**Worked examples for this project:**
- **High:** J3 ranking and lane interleave (Impact 3, Silence 3, Surface 3, Complexity 3, Boundary 2), J7 nudge and clamp, bucket mapping, pricing, J2 path selection, Close metrics, J8 lift computation, the zod schemas.
- **Medium:** bag line management, catalog module accessors.
- **Low:** route stubs, the concept bar component, the constants file (covered by a schema check on config instead).

### What each tier gets

| Tier | Required |
|---|---|
| **High** | A test for every branch and every edge case the evaluator names, plus a mutation score of at least 80% on the file |
| **Medium** | Tests for the main behavior and each edge case the evaluator names |
| **Low** | No unit tests required |

A unit's tier changes only when its code changes. Re-run the evaluator for changed units, not the whole codebase.

## Mutation testing (High tier only)

Stryker plants small bugs in the code (flipping a comparison, removing a `+ 1`, emptying a return) and checks whether the tests catch them. A test that asserts nothing catches nothing, so this score cannot be inflated the way coverage can.

- `stryker.config.json` lists only the High-tier files under `mutate`.
- The break threshold is 80. The run fails if fewer than 80% of mutants are caught.
- It runs locally. The only cost is machine time.
- When a surviving mutant reflects behavior that genuinely cannot matter, record it in `docs/test-tiers.md` with the reason. Do not raise or lower the threshold.

## Junk-test sweep

After tests are written, the **test-sweeper** subagent (`.claude/agents/test-sweeper.md`, runs on Haiku) reads the new tests and flags any test that:

- asserts nothing, or only asserts that something is defined,
- tests the framework or a library rather than our code,
- duplicates another test,
- mirrors the implementation line for line instead of checking behavior,
- snapshots a large structure with no specific assertion.

Flagged tests are deleted. If the session that wrote a flagged test believes it has real value, it explains why to Scott, and Scott decides.

## Functional gates

Every interface with a defined send or return gets a contract test. External parties are always stubbed or replayed.

| Interface | Gate |
|---|---|
| J2 route (`POST` a sentence, returns mood JSON) | Request and response schema. One test per path: cache hit, live call, 4-second timeout, cost cap reached, rate limit. Every path returns valid JSON and never an error to the visitor. A test confirms the API key never appears in any client bundle or response. |
| Catalog module | Contract test for every exported function, against the schema. |
| Data files | zod schema validation in tests and at build time. |
| Anthropic Batches calls (J1, J4, J8) | Contract tests against recorded responses. The validator rejects tags and subjects outside the fixed lists, and malformed JSON. |
| Museum and library ingest | Contract tests against one recorded response per source. |
| J8 seed | Determinism test: seed 20261008 reproduces every Signals figure exactly. |
| Demo path | Playwright end-to-end test, Threshold through Signals, at 390px and 1440px. This automates quality-bar check 1. |

## The testing loop for every milestone

1. Build the code for the milestone's scope.
2. Run the test-evaluator on new and changed units. Save the table to `docs/test-tiers.md`. Scott reviews it.
3. Write tests to the tier requirements, plus the functional gates for any new interface.
4. Run Stryker on High-tier files. Reach 80%.
5. Run the test-sweeper on the new tests. Delete what it flags, or take disagreements to Scott.
6. All tests pass, and lint and type checks pass.
7. Deploy. Scott runs `node scripts/smoke/live-smoke.mjs`. Add smoke checks for anything new that faces the live world, and promote the matching PENDING checks to active.
8. Report coverage in the milestone summary for information.

## npm scripts

| Script | Runs |
|---|---|
| `npm test` | Unit and component tests |
| `npm run test:e2e` | Playwright end-to-end tests against a local build |
| `npm run test:prod` | Playwright demo path against art.reasinger.net (from Milestone 4) |
| `npm run test:mutation` | Stryker on High-tier files |
| `npm run smoke:live` | The live smoke test. Manual only. |
