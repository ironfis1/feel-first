# Test tiers

The test-evaluator subagent's triage tables are saved here verbatim, newest first. Scott reviews each table before tests are written. Mutation survivors accepted as harmless are also recorded here, each with its reason. See `docs/testing.md`.

## Mutation results

### 2026-10-09: src/lib/schemas.ts (M2 Part A)

Score 90.21% (129 killed, 14 survived, 0 without coverage). Break threshold 80.

Accepted survivors. All 14 are string literals that change only the wording of an error, never whether bad data is rejected. In every case the tests still see the issue raised at the right path.
- Issue code `"custom"` replaced with `""` (lines 85, 94, 151, 155, 159, 164): zod still records an issue and the parse still fails. Nothing reads the code.
- Issue message replaced with `""` (lines 85, 151, 155, 159, 164) and refine message replaced with `""` (line 76 unique tags, line 116 cut points, line 143 em dash): the message is for the person reading a failed build. Asserting exact wording would test prose, not behavior. The duplicate-id message is the exception and is asserted, because it names the offending id.

Tooling note: Stryker's Vitest runner 10.0.0 did not activate runtime mutants under Vitest 5.0.3, so every mutant inside a refine callback was falsely reported as surviving (53%). Activating the same mutant by hand showed the tests kill it. The project pins Vitest 4.1, which the runner supports.

## Sweep results

### 2026-10-09 (M2 Part A)

Kept 156, flagged 1. Deleted: workSchema "derives orientation from dimensions" (flag 3, duplicate). The orientation tests through the schema already cover all three branches. Mutation score unchanged by the deletion.

## Triage 2026-10-09 (M2 Part A, new and changed units)

**Scott's review, 2026-10-09:** table approved. Instead of pinning the four loose spots in workSchema, the schema is tightened (D-016): unknown keys rejected, unique tags, orientation must match dimensions, thumbUrl must start with "/". Tests that would only check zod's own behavior (superRefine skipped on invalid input, whitespace scene names, duplicate print size ids) are left out.

| Unit | File | I | Si | Su | C | B | Total | Tier |
|---|---|---|---|---|---|---|---|---|
| workSchema | src/lib/schemas.ts | 3 | 3 | 2 | 2 | 3 | 13 | High |
| catalogFileSchema (with duplicate-id rule, D-015) | src/lib/schemas.ts | 3 | 3 | 2 | 2 | 3 | 13 | High |
| configSchema (with superRefine cross-checks) | src/lib/schemas.ts | 3 | 2 | 1 | 3 | 3 | 12 | High |
| sortById | src/lib/catalog.ts | 2 | 3 | 1 | 2 | 2 | 10 | Medium |
| Catalog module load (parse, sort, freeze, byId) | src/lib/catalog.ts | 2 | 2 | 1 | 2 | 3 | 10 | Medium |

`getAllWorks`, `getWorkById` and `getWorksByLane` keep their earlier scores and tiers (all Medium, 9, 10 and 9). The freeze does not move any score. The vocabulary constants moved to `schemas.ts` unchanged and are not re-scored.

### Evidence and required tests

Caller note: Grep over the repo shows `schemas.ts` is imported only by `catalog.ts` (line 6). `configSchema` has no caller at all, and `src/config/feel.ts` does not import or use it. `sortById` is called once, inside `catalog.ts` (line 24). `catalog.ts` itself is still imported by nothing in `src`. Surface scores reflect usage today. Tests must target the schemas' contracts, so they keep working when M2 points them at `data/catalog.json`.

#### workSchema (High)
- Impact 3: It is the data contract for every work (spec Section 3.2, Gap G2, D-008). A loose rule lets bad data feed the mood coordinates, tags, palette, lane and subject that ranking and display depend on. A wrong figure here corrupts the numbers the CEO sees.
- Silence 3: Several fields are only weakly checked, so plausible-looking wrong data passes. `thumbUrl` is only `min(1)` (line 58) while `imageUrl` is `z.url()` (line 57). `date`, `source`, `license` and `artist` accept any non-empty string. `orientation` is never cross-checked against `width` and `height`. `tags` has no uniqueness rule (line 64). `z.object` strips unknown keys silently, so a misspelled field is dropped rather than rejected.
- Surface 2: Used only by `catalog.ts` today (lines 6, 16, 24). Once M2 validates the real `catalog.json` with it, every screen's data passes through it.
- Complexity 2: About 18 field rules with enums, bounds, a hex regex, and array length and count limits (lines 44-68). There is no cross-field logic.
- Boundary 3: It is the data contract with `catalog.json`, J1 output and the ingest scripts. `docs/testing.md` lists "the zod schemas" as a High worked example.
- Must test:
  - A fully valid work parses.
  - Each required field missing is rejected, and empty strings are rejected for `id`, `title`, `artist`, `date`, `source`, `sourceId`, `thumbUrl` and `license`.
  - `lane` accepts only `fine-art` and `poster`. `orientation` accepts only the three values.
  - `valence` and `arousal` accept exactly -1 and 1 and reject -1.0001, 1.0001 and NaN.
  - `tags` accepts 3, 4 and 5 entries and rejects 2 and 6. Every one of the 12 emotion words is accepted and an unlisted word is rejected. Pin whether duplicate tags are accepted (currently they are).
  - `palette` accepts exactly 5 colors and rejects 4 and 6. Hex accepts 3 and 6 digits, upper and lower case. It rejects a missing `#`, 4 or 8 digits and non-hex characters.
  - `subject` accepts each of the 12 values, including "still life" with a space, and rejects others.
  - `width` and `height` reject 0, negatives and non-numbers.
  - `imageUrl` rejects a non-URL. Pin that `thumbUrl` accepts any non-empty string.
  - Pin that unknown keys are stripped, not rejected.
  - Pin that mismatched `orientation` and dimensions are currently accepted.
  - Every record in `data/fixtures/catalog.fixture.json` parses. After the M2 swap, every record in `data/catalog.json` parses.
- Functional gate: Data-file zod schema validation in tests and at build time (`docs/testing.md`, Functional gates, "Data files").

#### catalogFileSchema (High)
- Impact 3: Without the D-015 rule, a duplicate id makes `byId` (catalog.ts line 26) silently return the wrong work, the last one written.
- Silence 3: The failure is silent by nature. `new Map` overwrites quietly, and both duplicates would still appear in `getAllWorks` (the earlier triage flagged this).
- Surface 2: Called once at module load (catalog.ts line 24). It gates the whole catalog, including the real file after M2.
- Complexity 2: A `superRefine` that keeps a `Set` and loops with the index (lines 71-79). It adds an issue per duplicate, and the first occurrence passes.
- Boundary 3: The data contract for the whole catalog file.
- Must test:
  - An empty array parses.
  - A single work parses.
  - Two works with distinct ids parse.
  - Two works with the same id are rejected. The issue message is `duplicate id <id>` and the path is `[index, "id"]`, where the index is that of the second occurrence, not the first.
  - Three works with the same id produce two issues, at the second and third positions.
  - Duplicates that are not adjacent are caught.
  - Ids differing only by case or by a trailing space are NOT duplicates. Pin this, because comparison is exact.
  - An invalid work inside the array is rejected with a path that starts at its index.
  - A non-array input is rejected.
  - A duplicate id between records that are each otherwise valid still fails when other fields differ.
  - Check how `superRefine` behaves when an element is already invalid, and pin it.
- Functional gate: Data-file zod schema validation in tests and at build time. Also covered by the Catalog module contract test.

#### configSchema (High)
- Impact 3: It guards the values behind prices and shipping (`printSizes`, `materials`, `shippingFlat`), the nudge step, the bucket cut points, timeouts and the cost line. A bad value that passes would put a wrong price or a hidden-rule violation in front of the CEO. The cost line rule (line 143) protects a Res #40, Gap G31 number.
- Silence 2: A missed check lets a plausible bad config through, but the values are single literals in `feel.ts` that a reviewer can check against spec Section 7. Many checks (for example, `defaultWallScene` is a member of `wallScenes`) catch errors that would otherwise show only as a missing scene.
- Surface 1: No callers. `feel.ts` does not use the schema, and `docs/testing.md` says config is "covered by a schema check on config". Today it would be exercised only by tests.
- Complexity 3: Roughly 35 field rules. There is a tuple refine for ordered cut points (line 96) and a `superRefine` with four cross-checks (lines 127-146), including nested loops over `Object.entries` and `wallScenes`.
- Boundary 3: It is the data contract for the config file (`docs/testing.md`, "config to be validated against a schema").
- Must test:
  - The real exports of `src/config/feel.ts`, assembled into one object, parse. This is the key test.
  - Each cross-check fails alone on an otherwise valid object:
    - A `sizeWordToPrintSize` value pointing at an id not in `printSizes` is rejected, with the path including the word.
    - A `defaultWallScene` not in `wallScenes` is rejected.
    - A scene with no entry in `wallSceneReferenceWidthIn` is rejected, with the scene in the path.
    - `showCostLine: true` with `days` null, with `dollars` null, and with both null is rejected. It is accepted when both are filled, and accepted when `showCostLine` is false with nulls.
  - `bucketCutPoints` is rejected when equal, descending, or outside -1..1. It is accepted at the edges, for example `[-1, 1]`.
  - `nudgeStep` rejects 0, 1, negatives and values above 1. It accepts 0.3.
  - `fingerprintTagCount` rejects 0, 4 and 2.5, and accepts 1 through 3.
  - `driftBehavior` accepts only `"end-of-lane"`.
  - `thresholdPrompt` containing an em dash is rejected, and an empty prompt is rejected.
  - `contactEmail` and `linkedInUrl` are rejected when malformed.
  - `costLine.days` accepts null and rejects 0 and 1.5. `costLine.dollars` accepts null and 0, and rejects negatives.
  - Positive-number fields reject 0 and negatives: `shippingFlat`, `frameWidthIn`, `matWidthIn`, every size's `widthIn`, `heightIn` and `basePrice`, and every material's multipliers and framed amounts.
  - Empty arrays are rejected for `roomTypes`, `printSizes`, `frameFinishes`, `wallColors` and `wallScenes`.
  - `j2RateLimit` and `j2TimeoutMs` reject 0 and non-integers.
  - Pin that the `superRefine` rules do not run when the base object is invalid (the zod default). Pin that duplicate `printSizes` ids and a `defaultWallScene` that is only whitespace are not checked.
- Functional gate: Config validation against a schema (`docs/testing.md`, "config to be validated against a schema").

#### sortById (Medium)
- Impact 2: Ascending id is catalog order and the ranking tie-break basis [Res #23, D-008]. A wrong order degrades J3 and Room order later, but does not break the demo.
- Silence 3: A subtly wrong order (numeric-aware or locale sort, or a flipped comparison) looks plausible. The comparator is hand-written with nested ternaries (line 20).
- Surface 1: One caller, `catalog.ts` line 24. It is exported, but nothing outside the module uses it yet.
- Complexity 2: A three-way comparator with `slice()` and `sort()`.
- Boundary 2: A newly exported internal interface that defines the catalog order contract for other modules.
- Must test:
  - Plain string comparison. "10" sorts before "9" and uppercase before lowercase, as the code does. Pin that locale and accents are ignored.
  - Input order does not matter: an ascending list stays, a descending list is reversed, a shuffled list is sorted.
  - The input array is not mutated (the `.slice()`), and the result is a new array, not the same reference.
  - An empty array returns an empty array. A single element is unchanged.
  - Equal ids return 0, so their relative order is kept (stable sort). The schema forbids this case, but the function should be pinned.
  - The comparator is antisymmetric. The returned works are the same objects (no cloning).
- Functional gate: none beyond the Catalog module contract test (exported ordering).

#### Catalog module load (Medium)
- Impact 2: A malformed catalog throws at import, so the build fails (the stated intent, line 23). Order and the `byId` map feed every accessor. The demo is unaffected unless the file is bad, and a bad file stops the build rather than the demo.
- Silence 2: A parse failure is loud. The quiet risks are the shallow freeze (it freezes only the array, not the work objects), and zod stripping unknown keys, which can drop a field the code later expects.
- Surface 1: No importers of `catalog.ts` yet. Every accessor depends on this load once M3 begins.
- Complexity 2: Parse, then sort, then freeze, then `Map` built at import (lines 24-26).
- Boundary 3: Reads a data file against a contract (`fixture` at line 5, `catalog.json` after the M2 swap). The earlier triage marked this as the unchecked contract. It is now checked.
- Must test:
  - Importing the module with the fixture succeeds.
  - A malformed or duplicate-id file makes the import throw. Do this by mocking the data import with `vi.doMock` and `vi.resetModules`, and never touch real files or the network.
  - `getAllWorks()` is frozen, so `Object.isFrozen` is true and a push or assignment throws in strict mode. Pin that the individual work objects are not frozen.
  - `getAllWorks()` is in ascending id order and is the same reference on repeated calls.
  - `getWorkById` and `getWorksByLane` still agree with `getAllWorks`.
  - `getWorksByLane` returns a new, unfrozen array on each call. Mutating that result must not change `getAllWorks()`.
  - The `byId` map covers every work with no collisions.
- Functional gate: Catalog module contract test for every exported function against the schema. Data-file zod validation in tests and at build time.

## Triage 2026-10-09 (M1 backfill, run in M2)

**Scott's review, 2026-10-09:** table accepted. ConceptBar stays Medium as scored. The catalog file schema rejects duplicate ids (D-015). getAllWorks returns a frozen array rather than pinning a mutation leak. costLineText pins today's cents behavior until Q-007 is decided. No robots.txt smoke check. No M1 unit is High, so the new zod schemas are triaged as their own unit, and Stryker mutates them if they come out High.

| Unit | File | I | Si | Su | C | B | Total | Tier |
|---|---|---|---|---|---|---|---|---|
| Config constants (all exported consts and types) | src/config/feel.ts | 2 | 2 | 1 | 1 | 1 | 7 | Low |
| costLineText | src/config/feel.ts | 3 | 2 | 1 | 1 | 1 | 8 | Medium |
| Catalog vocab constants and types (lanes, emotionTags, subjects, Work) | src/lib/catalog.ts | 2 | 2 | 1 | 1 | 3 | 9 | Medium |
| Catalog module-level sort and byId map | src/lib/catalog.ts | 2 | 3 | 1 | 2 | 3 | 11 | Medium |
| getAllWorks | src/lib/catalog.ts | 2 | 2 | 1 | 1 | 3 | 9 | Medium |
| getWorkById | src/lib/catalog.ts | 2 | 2 | 1 | 2 | 3 | 10 | Medium |
| getWorksByLane | src/lib/catalog.ts | 2 | 2 | 1 | 1 | 3 | 9 | Medium |
| Fixture data file | data/fixtures/catalog.fixture.json | 2 | 2 | 1 | 1 | 3 | 9 | Medium |
| ConceptBar | src/components/ConceptBar.tsx (+ .module.css) | 2 | 1 | 3 | 1 | 1 | 8 | Medium |
| RootLayout and metadata | src/app/layout.tsx | 3 | 2 | 3 | 1 | 1 | 10 | Medium |
| robots | src/app/robots.ts | 2 | 3 | 2 | 1 | 3 | 11 | Medium |
| Seven route stubs (grouped, identical in shape: one `<main><h1>Name</h1></main>`, no props, no logic) | src/app/page.tsx, room/page.tsx, piece/[id]/page.tsx, wall/page.tsx, bag/page.tsx, close/page.tsx, signals/page.tsx | 1 | 1 | 2 | 1 | 1 | 6 | Low |
| globals.css, ConceptBar.module.css | src/app/globals.css | 1 | 1 | 3 | 1 | 1 | 7 | Low |

### Evidence and required tests

Caller note, applying to every row: Grep over `src` today shows only three real imports. `layout.tsx` imports `ConceptBar` and `workingName`. `catalog.ts` is imported by nothing yet. No route reads any config or catalog value. Surface scores reflect usage today. `docs/milestones.md` (M2) says the catalog module switches from `data/fixtures/catalog.fixture.json` to `data/catalog.json`, and `catalog.ts` line 2 says the same. Tests written now should therefore target the module's contract, not the fixture's contents, so they survive the swap.

#### Config constants (Low)
- Impact 2: Values feed pricing (lines 77-102), nudge (line 32), buckets (line 38), timeouts and rate limits (lines 48-51). A wrong value would eventually show a wrong price. Nothing consumes them yet, so no figure is wrong today.
- Silence 2: A mistyped price or cut point is plausible-looking, but these are single literals a reviewer can check against spec Section 7 and Gap G5.
- Surface 1: Only `workingName` is imported (`layout.tsx` line 3). Surface will rise from M3 on, but the tier changes only when code changes.
- Complexity 1: Literals only, `as const` objects.
- Boundary 1: Internal only.
- Must test: none (Low). `docs/testing.md` already says the constants file is covered by a schema check on config. That check is a data-contract concern, not a tier requirement.
- Functional gate: none

#### costLineText (Medium)
- Impact 3: It renders the Close cost line, a number the CEO sees (spec Section 6.2, Res #40, Gap G31). Wording is fixed.
- Silence 2: Wrong wording or a wrong dollar sign would be noticeable only on reading the line. The function is guarded by `showCostLine = false` (line 152), so it is hidden today.
- Surface 1: No callers in `src`. Eventually one element on Close.
- Complexity 1: A single template string (line 156).
- Boundary 1: Internal.
- Must test: exact output for typical input (`costLineText(12, 340)` returns `Built in 12 days for $340 in AI and hosting.`); the dollar sign appears once before the figure; a non-integer dollar value such as 340.5 (the function does no rounding or formatting, so pin the current behavior or flag it); no em dash and no exclamation point in the output; `days` of 1 yields "1 days" (known wording limitation, pin it so any change is deliberate).
- Functional gate: none

#### Catalog vocab constants and types (Medium)
- Impact 2: `emotionTags` (lines 11-24) and `subjects` (lines 28-41) are the fixed vocabularies [Gap G1] that J1 validation and the fingerprint rely on.
- Silence 2: A dropped, duplicated or misspelled word would look plausible.
- Surface 1: No importers today. Later J1, J2 and J3 depend on them.
- Complexity 1: Literal arrays.
- Boundary 3: They are the data contract with `catalog.json` and the J1 validator (Functional gates table: "validator rejects tags and subjects outside the fixed lists").
- Must test: exactly 12 emotion tags, exactly 12 subjects, no duplicates, `lanes` equals `["fine-art","poster"]`; every fixture work's tags and subject belong to the lists.
- Functional gate: Catalog module contract test against the zod schema (every exported function and constant checked against the schema).

#### Catalog module-level sort and byId map (Medium)
- Impact 2: Ascending ID is catalog order and the tie-break basis for ranking [Res #23, line 48]. A wrong order degrades J3 later but does not break the demo today.
- Silence 3: A subtly wrong order (for example, a locale or numeric-aware sort) would not announce itself (lines 74-76).
- Surface 1: Used only inside this file, and `catalog.ts` has no callers.
- Complexity 2: Hand-written comparator with branches (`<`, `>`, equal, line 76) and a Map built at import (line 78).
- Boundary 3: Reads a data file whose shape is cast with `as Work[]` (line 74) and not validated, so the data contract is unchecked.
- Must test: IDs sort by plain string comparison (`"10"` before `"9"`, uppercase before lowercase, as the code does); input order does not matter (sort does not mutate the imported fixture because of `.slice()`); output is stable in order for equal IDs; duplicate IDs in the data (last one wins in `byId`, while both appear in `works`; decide whether the schema should forbid duplicates); every fixture record satisfies the Work schema (exactly 5 palette colors, 3 to 5 tags, valence and arousal within -1 to 1).
- Functional gate: Catalog module contract test against the schema; data-file zod validation in tests and at build time.

#### getAllWorks (Medium)
- Impact 2: Source of every list in the experience.
- Silence 2: A mutated or reordered return would look plausible.
- Surface 1: No callers today.
- Complexity 1: Returns the module constant (line 82).
- Boundary 3: Exported catalog interface.
- Must test: returns all fixture works; ascending ID order; returned array is the same read-only view on repeated calls and callers cannot change the module's order (note it is typed `readonly` only, not frozen, so pin whether a runtime mutation leaks).
- Functional gate: Catalog module contract test against the schema.

#### getWorkById (Medium)
- Impact 2: Powers Piece (`piece/[id]`) lookups later.
- Silence 2: A wrong match or silent miss returns `undefined` rather than failing.
- Surface 1: No callers; `piece/[id]/page.tsx` does not call it yet.
- Complexity 2: Map lookup with an undefined result path (line 87).
- Boundary 3: Exported catalog interface.
- Must test: known ID returns the matching work; unknown ID returns `undefined`; empty string returns `undefined`; IDs are case-sensitive and not trimmed; inherited-property names such as `"constructor"` and `"__proto__"` return `undefined` (Map, so expected safe).
- Functional gate: Catalog module contract test against the schema.

#### getWorksByLane (Medium)
- Impact 2: Both lanes feed the interleaved Room (Res #5, Res #37).
- Silence 2: A wrong filter would show the wrong lane's works, plausible-looking.
- Surface 1: No callers.
- Complexity 1: One filter (line 92).
- Boundary 3: Exported catalog interface.
- Must test: `"fine-art"` returns only fine-art works and `"poster"` only posters; the union of both equals `getAllWorks()` in count with no overlap; each result keeps ascending ID order; a lane with no works returns an empty array (relevant if the fixture ever lacks one).
- Functional gate: Catalog module contract test against the schema.

#### Fixture data file (Medium)
- Impact 2: Until M2 it is the only data the module serves.
- Silence 2: A malformed record (wrong palette count, tag outside the vocabulary) goes unnoticed because the module casts without validation (`catalog.ts` line 74).
- Surface 1: Read by `catalog.ts` only.
- Complexity 1: Static data (24 `"id"` matches, which includes `sourceId`, so about 12 works).
- Boundary 3: Data contract with the `catalog.json` field list [spec Section 3.2].
- Must test: schema validation of every record (zod); `source` is `"FIXTURE"` on all records; unique `id`; both lanes present; `orientation` consistent with `width` and `height`. This test should be written once against the schema so it also validates `data/catalog.json` after the M2 swap.
- Functional gate: Data-file zod schema validation in tests and at build time.

#### ConceptBar (Medium)
- Impact 2: The concept bar is required on every screen [RB43, Res #26, Res #35, D-010]. Missing it breaks message discipline, but the demo still runs.
- Silence 1: Missing text is visible on any page.
- Surface 3: Rendered once in `layout.tsx` line 16, so it appears on all seven routes.
- Complexity 1: Static markup (lines 5-9).
- Boundary 1: Internal.
- Must test: renders the exact wording "A concept by Scott Reasinger. Not affiliated with any company or website."; has `role="note"`; contains no em dash. Note: the rubric total (8) gives Medium, which differs from the worked example in `docs/testing.md` that lists the concept bar as Low. I followed the rubric as instructed. If Scott prefers the example, the required work is a single render test either way. The CSS module is pure styling (no unit tests, covered by end-to-end).
- Functional gate: none

#### RootLayout and metadata (Medium)
- Impact 3: Wraps every page. A broken layout drops the concept bar and the noindex setting everywhere.
- Silence 2: `robots: { index: false, follow: false }` (line 9) failing to apply would be invisible unless someone inspects the head.
- Surface 3: Every route.
- Complexity 1: Static JSX and a metadata object.
- Boundary 1: Internal. The robots meta is a crawler signal, but the actual contract is covered under `robots.ts`.
- Must test: `ConceptBar` renders before `children` in the body; children render; `html` has `lang="en"`; `metadata.title` equals `workingName`; `metadata.robots` has `index: false` and `follow: false` [D-011].
- Functional gate: none

#### robots (Medium)
- Impact 2: Accidentally allowing indexing would expose an unsolicited prototype, but the demo itself is unaffected [D-011].
- Silence 3: Wrong rules produce no error, only a different `/robots.txt`.
- Surface 2: One site-wide file, off the interactive demo path.
- Complexity 1: One returned object (line 5).
- Boundary 3: Defined return to outside parties (crawlers), the `/robots.txt` contract.
- Must test: returns `rules.userAgent === "*"` and `rules.disallow === "/"`; returns no `allow` entry and no `sitemap`.
- Functional gate: Contract test on the `robots()` return value; the live smoke test should also fetch `/robots.txt` on art.reasinger.net and check `Disallow: /` (add as a smoke check).

#### Seven route stubs (Low, grouped)
- Grouped because all seven (`page.tsx`, `room`, `piece/[id]`, `wall`, `bag`, `close`, `signals`) have identical shape: a parameterless function returning `<main><h1>Name</h1></main>` with no props, data, or logic. I read all seven.
- Impact 1: Placeholder headings; each will be replaced in M3 to M7.
- Silence 1: A wrong or missing page is obvious on sight.
- Surface 2: The routes are on the demo path, but each stub carries no behavior.
- Complexity 1: Static JSX.
- Boundary 1: Internal. `piece/[id]` ignores its `id` param and does not call `getWorkById`.
- Must test: none (Low). The end-to-end demo-path run will cover that each route responds. Each stub should be re-triaged when it gains logic.
- Functional gate: none

#### globals.css and ConceptBar.module.css (Low)
- Impact 1, Silence 1, Surface 3 (`layout.tsx` line 4 imports globals for every page), Complexity 1, Boundary 1. Pure styling; the policy says no unit tests, end-to-end covers it. Check at 390px and 1440px for the `overflow-x: hidden` base (lines 8-14), which could mask horizontal overflow bugs; that is a visual check, not a unit test.
- Must test: none (Low).
- Functional gate: none
