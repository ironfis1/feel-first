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

## Triage 2026-10-09 (M2 Part B, asset pipeline)

**Scott's review, 2026-10-09:** table approved, with three changes. (1) Correction: the evaluator was right. A quoting slip had turned the Met pattern's word boundaries into invisible backspace characters, so the pattern matched almost nothing and the first Met run wrongly skipped American Wing paintings. The pattern is fixed to `\b(...)s?\b`, the Met was re-run, and its tests show "Blueprint" and "Imprint" are rejected. (2) Stryker runs on the 12 High-tier files, mutating only the pure-function line ranges; each script's `main()` does live network work and is checked by hand. (3) Four loopholes are fixed instead of pinned: Rijksmuseum rejects a work that also carries a restrictive license or rights statement, `loadRaw` checks the file's own source key, merge fails on a thumbnail-name collision, and a Met record with no title becomes "Untitled". The remaining pins stand.

Scoring notes. I applied the rubric as written. Surface 3 is given only to units that decide which works enter the catalog or build its image URLs, because every work then appears in the Room and on the Piece screen. Units that only shape one credit text field get Surface 2. Silence is lowered for errors that are systematic and visible, because the contact sheet prints title, artist, date, source and license for 60 random works. It stays at 3 for per-record variation that a 60-work sample would miss. Impact 3 is kept for what can put a work on screen that should not be there: rights, content and selection. Each `main()` is rated once in its own row.

| Unit | File | I | Si | Su | C | B | Total | Tier |
|---|---|---|---|---|---|---|---|---|
| createClient (request, json, head, text; with identifier, identifyingHeaders, SourceRefused) | scripts/ingest/lib/http.ts | 1 | 2 | 2 | 3 | 3 | 11 | Medium |
| imageSize (JPEG and PNG) | scripts/ingest/lib/imageSize.ts | 2 | 3 | 2 | 3 | 2 | 12 | High |
| sizeProblem (with minLongEdge) | scripts/ingest/lib/curation.ts | 2 | 2 | 3 | 1 | 1 | 9 | Medium |
| contentProblem (with flagWords) | scripts/ingest/lib/curation.ts | 3 | 3 | 3 | 2 | 1 | 12 | High |
| fineArtGroup, posterGroup (with classify and the group tables) | scripts/ingest/lib/curation.ts | 1 | 2 | 1 | 2 | 1 | 7 | Low |
| pickSpread | scripts/ingest/lib/curation.ts | 3 | 3 | 3 | 3 | 1 | 13 | High |
| capPerArtist (with maxPerArtist) | scripts/ingest/lib/curation.ts | 2 | 2 | 2 | 2 | 1 | 9 | Medium |
| rawWorkSchema, skipSchema, rawFileSchema, sourceNames, sourceKeys | scripts/ingest/lib/raw.ts | 2 | 2 | 3 | 2 | 3 | 12 | High |
| writeRaw | scripts/ingest/lib/raw.ts | 1 | 1 | 2 | 1 | 2 | 7 | Low |
| AIC searchUrl (with artworkTypes, fields, target) | scripts/ingest/aic.ts | 2 | 2 | 1 | 2 | 3 | 10 | Medium |
| AIC parsePage (with fullWidth, thumbSourceWidth) | scripts/ingest/aic.ts | 3 | 3 | 3 | 3 | 3 | 15 | High |
| Met searchUrl, objectUrl (with departmentIds, classifications) | scripts/ingest/met.ts | 2 | 2 | 1 | 1 | 3 | 9 | Medium |
| Met isWallArt and screen | scripts/ingest/met.ts | 3 | 3 | 3 | 2 | 3 | 14 | High |
| Met toRawWork | scripts/ingest/met.ts | 2 | 2 | 2 | 2 | 3 | 11 | Medium |
| Met interleave | scripts/ingest/met.ts | 2 | 2 | 2 | 2 | 1 | 9 | Medium |
| Rijks searchUrl, linkedArtUrl (with types, fullWidth) | scripts/ingest/rijks.ts | 2 | 2 | 1 | 1 | 3 | 9 | Medium |
| Rijks titleOf and dateOf (with asArray) | scripts/ingest/rijks.ts | 2 | 2 | 2 | 2 | 3 | 11 | Medium |
| Rijks artistOf | scripts/ingest/rijks.ts | 2 | 3 | 2 | 3 | 3 | 13 | High |
| Rijks licenseOf (with publicDomainRights) | scripts/ingest/rijks.ts | 3 | 3 | 3 | 2 | 3 | 14 | High |
| Rijks iiifBaseOf | scripts/ingest/rijks.ts | 2 | 1 | 2 | 2 | 3 | 10 | Medium |
| Rijks toRawWork | scripts/ingest/rijks.ts | 2 | 2 | 2 | 2 | 2 | 10 | Medium |
| Rijks interleave | scripts/ingest/rijks.ts | 1 | 1 | 2 | 2 | 1 | 7 | Low |
| JPL parseGallery (with decode) | scripts/ingest/jpl.ts | 2 | 3 | 3 | 2 | 3 | 13 | High |
| JPL fullImageFor | scripts/ingest/jpl.ts | 2 | 1 | 2 | 1 | 3 | 9 | Medium |
| JPL screen (with keepAtomicClock) | scripts/ingest/jpl.ts | 2 | 2 | 2 | 1 | 2 | 9 | Medium |
| JPL toRawWork (with license, artist, date, jplUserAgent, galleryUrl) | scripts/ingest/jpl.ts | 2 | 2 | 2 | 1 | 2 | 9 | Medium |
| LOC listingUrl (with allowedRights) | scripts/ingest/loc.ts | 2 | 1 | 1 | 1 | 3 | 8 | Medium |
| LOC masterIiifId | scripts/ingest/loc.ts | 2 | 2 | 3 | 3 | 3 | 13 | High |
| LOC artistOf | scripts/ingest/loc.ts | 2 | 3 | 2 | 2 | 3 | 12 | High |
| LOC itemId and dateOf | scripts/ingest/loc.ts | 2 | 2 | 2 | 1 | 2 | 9 | Medium |
| LOC screen (rights gate) | scripts/ingest/loc.ts | 3 | 3 | 3 | 2 | 3 | 14 | High |
| LOC toRawWork | scripts/ingest/loc.ts | 2 | 2 | 2 | 2 | 3 | 11 | Medium |
| main() of aic, met, rijks, jpl, loc | scripts/ingest/*.ts | 2 | 1 | 2 | 3 | 3 | 11 | Medium (manual) |
| selectFineArt (with perMuseum, fineArtFloor, museums) | scripts/merge.ts | 3 | 3 | 3 | 3 | 2 | 14 | High |
| selectPosters (with posterTotal) | scripts/merge.ts | 3 | 3 | 3 | 1 | 2 | 12 | High |
| toCatalog | scripts/merge.ts | 3 | 3 | 3 | 2 | 3 | 14 | High |
| thumbName | scripts/merge.ts | 2 | 3 | 3 | 1 | 2 | 11 | Medium |
| withoutVisualSkips | scripts/merge.ts | 3 | 3 | 3 | 1 | 2 | 12 | High |
| loadRaw | scripts/merge.ts | 2 | 2 | 3 | 1 | 3 | 11 | Medium |
| loadVisualSkips (with visualSkipSchema) | scripts/merge.ts | 3 | 3 | 3 | 1 | 3 | 13 | High |
| merge main() | scripts/merge.ts | 3 | 2 | 3 | 2 | 3 | 13 | High (manual, see main row) |
| plan (with sourceKeyOf) | scripts/thumbs.ts | 3 | 3 | 3 | 2 | 2 | 13 | High |
| resize (with thumbWidth, webpQuality) | scripts/thumbs.ts | 2 | 2 | 3 | 1 | 2 | 10 | Medium |
| skipLogMarkdown (with reasonGroup) | scripts/review.ts | 2 | 2 | 1 | 2 | 1 | 8 | Medium |
| sample | scripts/review.ts | 1 | 3 | 1 | 3 | 1 | 9 | Medium |
| contactSheetHtml (with escape, sheetSize, sheetSeed) | scripts/review.ts | 1 | 1 | 1 | 1 | 1 | 5 | Low |
| catalogProblems and the prebuild check | scripts/validate-data.ts | 3 | 3 | 3 | 1 | 3 | 13 | High |
| orientationMatches | src/lib/schemas.ts | 2 | 2 | 3 | 1 | 2 | 10 | Medium |
| catalogOf | src/lib/schemas.ts | 3 | 3 | 3 | 2 | 2 | 13 | High |
| metadataWorkSchema | src/lib/schemas.ts | 3 | 3 | 3 | 2 | 3 | 14 | High |
| metadataCatalogFileSchema | src/lib/schemas.ts | 3 | 3 | 3 | 2 | 3 | 14 | High |
| workSchema, catalogFileSchema, configSchema (refactor effect only; scores unchanged) | src/lib/schemas.ts | 3 | 3 | 2 | 2 | 3 | 13 | High (unchanged) |

### Evidence and required tests

Caller note. Grep over `scripts/` shows the pure curation helpers are imported by every ingest script. `loadRaw` and `loadVisualSkips` are imported by `thumbs.ts` and `review.ts` as well as `merge.ts`. `jplUserAgent` is imported by `thumbs.ts`. `src/lib/schemas.ts` is now also imported by `merge.ts`, `thumbs.ts`, `review.ts` and `validate-data.ts`. `package.json` has no `prebuild` key (only `build` at line 8 and `test` at line 12), so the build-time gate is not wired yet. `tests/fixtures/ingest/` already holds one recorded response each for aic, met, rijks, jpl (gallery HTML) and loc, plus `tests/fixtures/catalog.metadata.json`.

#### createClient (Medium)
- Impact 1: A run-by-hand script. A bug stalls or gets the script blocked (LOC blocks for an hour, D-017). Nothing wrong reaches the screen.
- Silence 2: A throttle or retry fault is invisible until a source blocks us. A swallowed 5xx is returned as a response (line 69), so the caller must notice.
- Surface 2: All five ingest scripts and `thumbs.ts` use it, but it is off the demo path.
- Complexity 3: A retry loop with backoff, Retry-After, timeout, throttling, header merge and the HTML-body check (lines 49-84).
- Boundary 3: Defined send and return with outside parties.
- Must test: all with injected `fetchImpl`, `sleep` and `now`, so no real timers or network.
  - Two calls less than `minIntervalMs` apart sleep for the remainder. Calls already far enough apart do not sleep.
  - A 429 with `stopOn429` throws SourceRefused on the first response, with no retry.
  - A 429 without `stopOn429` retries, honors `Retry-After` seconds, and falls back to `minIntervalMs * 2 ** (attempt+1)` when the header is missing, 0 or not a number. After `retries` attempts it throws SourceRefused.
  - A 500 is retried, and after retries are exhausted the 5xx response itself is returned (not thrown). A 404 returns at once with no retry. `retries: 0` makes no retry.
  - A network error is retried with backoff and then rethrown. `fetchImpl` always receives an AbortSignal.
  - Header precedence is identifying headers, then `options.headers`, then `init.headers`. The JPL override replaces `User-Agent` and keeps `AIC-User-Agent`.
  - `json` throws a plain Error on a non-OK status, throws SourceRefused on a body starting with `<` (including leading whitespace), and throws SyntaxError on malformed JSON. `head` sends `Range: bytes=0-131071` and returns a Uint8Array. `text` throws on a non-OK status.
  - Pin that a very large `Retry-After` is slept in full. The comment at line 17 suggests a cap, but the code has none.
  - `identifier` equals `Feel First prototype (scott@reasinger.net)`, and `jplUserAgent` starts with `Mozilla/5.0`.
- Functional gate: Museum and library ingest (the HTTP contract shared by every source). Tests use a stub `fetchImpl`, never the network.

#### imageSize (High)
- Impact 2: It decides the 1,200px rule for Met and JPL (met.ts line 118, jpl.ts line 111). Its width and height are stored in the catalog and drive `orientation`.
- Silence 3: A misread dimension (wrong byte offset, wrong marker) looks plausible and lets a small image in or drops a good one. Only the later `rawWorkSchema` refine catches too-small images.
- Surface 2: Two sources, about 117 works. The result is stored in catalog width and height.
- Complexity 3: Marker walking, big-endian bit math, fill bytes, and a skip rule for the three non-frame markers C4, C8 and CC (lines 25-27).
- Boundary 2: A binary format contract with outside files. The function is internal.
- Must test:
  - A PNG gives its IHDR width and height. A PNG shorter than 24 bytes gives null.
  - A baseline JPEG (SOF0) gives the right size. A progressive JPEG (SOF2) does too.
  - A JPEG whose first segment is APP1/EXIF, including one with an embedded thumbnail, skips the segment by its length and returns the main frame size, not the thumbnail's.
  - DHT (C4) is not read as a frame.
  - A fill byte 0xFF 0xFF advances by 1. Truncated bytes before any frame marker give null. A missing 0xFF at a marker position gives null.
  - Bytes that are neither JPEG nor PNG (GIF, WebP, HTML) give null. An empty array gives null.
  - Portrait and landscape orientation are returned in the right order (height read before width in `jpegSize`).
  - The `i + 9 < b.length` boundary: a frame header ending exactly at the end of the buffer.
- Functional gate: none (internal pure function). It is exercised through the Met and JPL contract tests.

#### sizeProblem (Medium)
- Impact 2: Enforces D-002 for every source. A wrong boundary admits low-resolution art or drops good works.
- Silence 2: An off-by-one changes a handful of works, with no sign except the skip counts.
- Surface 3: It gates catalog membership in all five scripts. `rawWorkSchema` repeats the same rule, which only catches the lenient direction.
- Complexity 1: One comparison.
- Boundary 1: Internal.
- Must test: 1199 skips and 1200 passes, using either width or height as the long edge. A square image works. The reason text names the measured edge and the minimum. A non-positive size is not defended against, so pin the current result.
- Functional gate: none.

#### contentProblem (High)
- Impact 3: It is the first pass of the nudity, violence and slur screen (D-002, D-021). A miss puts a work on the CEO's screen that should not be there.
- Silence 3: A miss produces no signal. Scott's contact-sheet review looks at only 60 of about 600 works.
- Surface 3: All five scripts gate on it (aic.ts line 76, met.ts line 73, rijks.ts line 199, jpl.ts line 59, loc.ts line 68).
- Complexity 2: Pre-built case-insensitive patterns with `\b` word boundaries and regex escaping (lines 31-35). A first-match-wins order across reason groups.
- Boundary 1: Internal.
- Must test:
  - Each of the five reason groups produces its reason prefix and the matched word. A multi-word hit returns the first group in table order.
  - Whole-word matching only: "dead" matches "The Dead Christ" but not "deadline". "coon" does not match "raccoon". "blood" does not match "bloodhound".
  - Matching is case-insensitive.
  - Plurals match only if listed: "nude" and "nudes" match, and "nudity" matches.
  - Words inside punctuation or hyphens match (for example "naked-eye").
  - null, undefined and empty strings in the array are ignored. An all-null input gives null. A match in a later text (subject, tag, alt text) is found.
  - Pin known false positives, so any change is deliberate: "Dead Sea", "Battle of ...", "skull" in a vanitas, "Fragment" titles.
  - No `g` flag state leak: calling twice with the same text gives the same answer.
  - Every word in `flagWords` is lowercase, and no list has duplicates.
- Functional gate: none beyond the per-source contract tests, which cover the call sites.

#### fineArtGroup, posterGroup (Low)
- Impact 1: Groups only decide which equal-quality works get picked. A wrong group produces a less even spread, never wrong data.
- Silence 2: A mis-grouped work is plausible. It is not wrong on screen.
- Surface 1: Used only to feed `pickSpread` in the ingest scripts.
- Complexity 2: A first-match loop over word tables with a fallback.
- Boundary 1: Internal.
- Must test: none (Low). The word tables are data, and a test would mirror them. The per-source contract tests already run these functions on real records.
- Functional gate: none.

#### pickSpread (High)
- Impact 3: It chooses which 100 works per museum and which WPA posters are in the catalog (merge.ts lines 37, 42, 63). The catalog content on every screen follows from this.
- Silence 3: A subtly wrong rotation or rank order still yields a plausible 100 works. Nothing flags it.
- Surface 3: Every selected work.
- Complexity 3: Sort, group into a Map, a nested round-robin loop with an early exit, and `Infinity` as a count (line 42 of merge.ts).
- Boundary 1: Internal.
- Must test:
  - Output is the best rank first within a group. Groups take turns in order of their best item.
  - Rotation with uneven groups: a group that runs out drops from the rotation and the others keep going. Exactly `n` items are returned when enough exist, and fewer without error when not.
  - `n` of 0 returns []. `n` larger than the items returns all of them. `n = Infinity` returns every item.
  - Ties in rank keep input order (stable sort). Unsorted input is handled.
  - The input array is not mutated. The returned items are the same objects.
  - Stopping mid-round: with `n` smaller than the number of groups, only the first groups are used.
  - A single group degrades to plain rank order. An empty input returns [].
- Functional gate: none (internal). Selection correctness is checked through `selectFineArt`.

#### capPerArtist (Medium)
- Impact 2: Stops a series such as Hokusai's Fifty-three Stations from crowding a lane (D-017, D-020). A wrong cap changes variety, not correctness.
- Silence 2: Two spellings of one artist do not count together, and "Unknown artist" is exempt (line 117). The effect is a plausible-looking over-representation.
- Surface 2: AIC, Met and Rijks.
- Complexity 2: A Map counter and a conditional skip with a reason (lines 115-128).
- Boundary 1: Internal.
- Must test: the 3rd work by an artist is kept and the 4th is skipped with the reason text and source id. Input order decides who is kept. "Unknown artist" is never capped. Names are trimmed. A custom `max` works. Case differences are different artists (pin this). A multi-name Rijks artist string counts as its own artist (pin this). The empty list returns empty. Skips contain no kept work. Calling it twice on the same growing list gives a consistent result (main calls it again after each addition).
- Functional gate: none.

#### rawWorkSchema, skipSchema, rawFileSchema, sourceNames (High)
- Impact 2: It is the contract between ingest and merge. `sourceNames` supplies the institution name on the Piece screen (Gap G33).
- Silence 2: Most rules are `min(1)`, so a wrong but non-empty credit passes. Strictness and the refine catch structural errors loudly.
- Surface 3: Every source writes through it and `loadRaw` reads it.
- Complexity 2: `strictObject` plus a refine on long edge (line 41), an enum and `z.iso.datetime`.
- Boundary 3: A data contract with `data/raw/*.json`.
- Must test:
  - A valid work parses. An unknown key is rejected. Each field missing is rejected. Empty strings are rejected for each text field.
  - `imageUrl` and `thumbSourceUrl` must be URLs. `width` and `height` reject 0, negatives and non-integers.
  - The long-edge refine: 1199x1199 rejected, 1200x1 accepted, 1x1200 accepted.
  - `rank` accepts 0 and rejects -1 and 1.5. `lane` accepts only the two values.
  - `rawFileSchema` rejects an unknown `sourceKey`, a bad `fetchedAt`, and an unknown key. It accepts empty `works` and `skips`. A skip may have an empty title but not an empty reason.
  - `sourceNames` has one entry per `sourceKeys` value, with the exact credit strings.
  - The fixtures from `tests/fixtures/ingest/` pass through the schema once each source's parsing has run.
- Functional gate: Museum and library ingest, and Data files (zod schema validation).

#### writeRaw (Low)
- Impact 1: A fault is loud. Invalid data throws at `rawFileSchema.parse` (line 67) before any file is written.
- Silence 1: Failure is a thrown error.
- Surface 2: Called by all five scripts.
- Complexity 1: Parse, mkdir, write, log.
- Boundary 2: Writes the file merge reads.
- Must test: none (Low). The parse is covered through the schema tests. A mocked-fs test would only check the stub.
- Functional gate: none.

#### AIC searchUrl (Medium)
- Impact 2: A wrong query returns non-public-domain or wrong-type works. `parsePage` still re-checks `is_public_domain`.
- Silence 2: A changed sort order (boost_rank then viewed-often, D-017) quietly changes which works rank first.
- Surface 1: One request builder.
- Complexity 2: JSON parameters packed into a query string (lines 23-34).
- Boundary 3: A defined send to an outside party.
- Must test: the decoded `params` JSON contains the `is_public_domain` term, the three artwork types and the sort array in this order. The `fields` list includes every field `parsePage` reads. `page` and `limit` are set. Default limit is 100.
- Functional gate: Museum and library ingest (contract test against `tests/fixtures/ingest/aic.json`).

#### AIC parsePage (High)
- Impact 3: Gates public domain, image, size and content, and builds the title, artist, date, license and both image URLs for about 100 fine-art works (lines 62-94).
- Silence 3: Many fallbacks (title, artist from `artist_title` then the first line of `artist_display`, date, license) produce plausible but possibly wrong credits.
- Surface 3: About a third of fine art.
- Complexity 3: Eight sequential guards and several optional-field fallbacks.
- Boundary 3: Parses the AIC response contract.
- Must test: against the recorded fixture plus small hand-built pages.
  - `is_public_domain: false` is skipped as "not public domain" before the other checks, and the order of guards is pinned. Missing `image_id` is skipped. Missing thumbnail width or height is skipped. A 1199px long edge is skipped.
  - The content screen sees the title, the subject titles and the thumbnail alt text.
  - Title falls back to "Untitled". Artist uses `artist_title`, else the first line of `artist_display`, else "Unknown artist". Date falls back to "Undated". License is "Public domain. <credit>" when there is a credit line and "Public domain" when not.
  - `imageUrl` uses `min(width, 1686)` and `thumbSourceUrl` uses `min(width, 843)`, with the base taken from `config.iiif_url`. Pin that the stored width and height are the source dimensions, not the delivered ones.
  - `rank` is `startRank + index`, counting skipped items. The group comes from title, subjects and terms.
  - An em dash in a title is preserved (D-022).
- Functional gate: Museum and library ingest (one recorded response, `tests/fixtures/ingest/aic.json`).

#### Met searchUrl, objectUrl (Medium)
- Impact 2: A wrong endpoint returns nothing or the retired `/search` (D-017).
- Silence 2: A missing `isHighlight` quietly changes the quality ordering.
- Surface 1: Request builders.
- Complexity 1: Template strings.
- Boundary 3: A defined send.
- Must test: URL contains `/v1.1/search`, `departmentId`, `isHighlight=true`, `hasImages=true`, `offset` and `limit`. The default limit is 500. `departmentIds` is the five in D-020's note. `objectUrl` uses `/v1/objects/<id>`.
- Functional gate: Museum and library ingest.

#### Met isWallArt and screen (High)
- Impact 3: Gates rights (`isPublicDomain`), wall-art type, image presence and content (lines 69-74).
- Silence 3: The `wallArtObjectName` regex has no word boundaries (line 22), so substrings such as "Imprint", "Blueprint" or "Footprint" match and non-wall-art could pass quietly when classification is blank.
- Surface 3: About a third of fine art.
- Complexity 2: Four ordered checks and a regex.
- Boundary 3: Reads the Met object contract.
- Must test:
  - A non-public-domain object is skipped first. Classification "Paintings", "Prints" and "Drawings" pass. Blank classification with object name "Painting" passes.
  - The reason text for a non-wall-art object uses the classification, else the object name, else "unclassified".
  - A missing `primaryImage` or `primaryImageSmall` gives "no image". Content flags apply to the title, object name and tags, and null tags are safe.
  - Pin the substring behavior: "Blueprint" and "Imprint" currently match `print`.
  - Guard order is pinned.
- Functional gate: Museum and library ingest (`tests/fixtures/ingest/met.json`).

#### Met toRawWork (Medium)
- Impact 2: Builds one record's credits and URLs.
- Silence 2: Systematic format errors show on any contact-sheet sample. A null `title` would throw at `object.title.trim()` (line 81), and main reports it as "record could not be read".
- Surface 2: Credit text.
- Complexity 2: Fallbacks and a size check.
- Boundary 3: Consumes the Met object shape.
- Must test: a null size gives "image size could not be read". A small size gives the size reason. Fallbacks give "Untitled", "Unknown artist" and "Undated". License is "Public domain (CC0). <credit>" with or without a credit line. `imageUrl` is `primaryImage` and `thumbSourceUrl` is `primaryImageSmall`. `rank` is passed through. Group uses tag terms, and null tags work. Pin the null-title behavior.
- Functional gate: Museum and library ingest.

#### Met interleave (Medium)
- Impact 2: Decides candidate order. A duplicate id would put the same work in twice.
- Silence 2: Duplicates and order errors look plausible.
- Surface 2: Met candidates only.
- Complexity 2: A nested loop with a seen-set.
- Boundary 1: Internal.
- Must test: round-robin order a, b, c, a, b, c. Uneven lengths. A duplicate id across lists appears once at its first position. Empty lists and no lists return []. A single list is unchanged.
- Functional gate: none.

#### Rijks searchUrl, linkedArtUrl (Medium)
- Impact 2: A wrong query or profile returns the wrong payload shape.
- Silence 2: A wrong profile changes JSON shape.
- Surface 1: Request builders.
- Complexity 1: Template strings.
- Boundary 3: A defined send.
- Must test: `searchUrl` encodes the type and includes `imageAvailable=true`. `linkedArtUrl` appends `_profile=la-framed` and an encoded `_mediatype`. `types` is painting, print, drawing.
- Functional gate: Museum and library ingest. Check that `tests/fixtures/ingest/rijks.json` covers all four payload shapes parsed here (search page, object, visual item, digital object).

#### Rijks titleOf, dateOf, asArray (Medium)
- Impact 2: Title and date credit text.
- Silence 2: A wrong language pick still reads plausibly.
- Surface 2: Piece credit.
- Complexity 2: A fallback chain: English and preferred, then English, then any, then "Untitled" or "Undated".
- Boundary 3: Linked Art JSON-LD.
- Must test: English preferred beats English beats first. Names with blank content are ignored. `language` given as one object or an array. Empty gives "Untitled" and "Undated". `asArray` handles null, undefined, single and array.
- Functional gate: Museum and library ingest.

#### Rijks artistOf (High)
- Impact 2: Artist credit on the Piece screen.
- Silence 3: It reads the production and its parts, mixes notation languages and joins names. A wrong or duplicated artist looks plausible.
- Surface 2: Credits only.
- Complexity 3: Nested optional structures, a language-preference fallback to `_label`, trimming and de-duplication (lines 81-91).
- Boundary 3: Linked Art contract.
- Must test: single maker. Maker in `produced_by.part` only. Maker in both the main production and a part (appears once). Two makers (joined with ", "). English notation preferred over the first notation. Fallback to `_label`. Blank names dropped. No makers gives "Unknown artist". `carried_out_by` as an object and as an array.
- Functional gate: Museum and library ingest.

#### Rijks licenseOf (High)
- Impact 3: The only public-domain gate for Rijks images. A wrong accept is a rights problem on screen.
- Silence 3: A non-PD item that slips through looks identical to the rest.
- Surface 3: Gates membership.
- Complexity 2: A nested loop over rights and classifications.
- Boundary 3: Linked Art rights field.
- Must test: the PD Mark URL gives "Public Domain Mark 1.0". The CC0 URL gives "CC0 1.0". A CC BY or in-copyright URL gives null. `subject_to` and `classified_as` as one object and as an array. No rights gives null. A record with both a restrictive right and a PD right: pin which wins (currently any PD match wins). Near-miss URLs (http, no trailing slash) give null.
- Functional gate: Museum and library ingest.

#### Rijks iiifBaseOf (Medium)
- Impact 2: A wrong base breaks every image URL for the work.
- Silence 1: A null result is logged as "no image", and a wrong base fails when thumbnails are fetched.
- Surface 2: Rijks only.
- Complexity 2: Find and regex.
- Boundary 3: Linked Art contract.
- Must test: a valid access point returns `https://iiif.micr.io/<id>`. The first matching access point wins. Other hosts give null. No access point gives null. `access_point` as one object.
- Functional gate: Museum and library ingest.

#### Rijks toRawWork (Medium)
- Impact 2: Composes the record.
- Silence 2: Systematic errors show on any sample.
- Surface 2: Credit and image URLs.
- Complexity 2: A size check and URL building.
- Boundary 2: Takes values already extracted.
- Must test: small size gives the size reason. `sourceId` has the `https://id.rijksmuseum.nl/` prefix removed. `imageUrl` uses `min(width, 1686)`. `thumbSourceUrl` is 843 wide. License is "<label>. Rijksmuseum". Group comes from the title.
- Functional gate: none beyond the per-source contract test.

#### Rijks interleave (Low)
- Impact 1: Changes candidate order only.
- Silence 1: Obvious if wrong.
- Surface 2: Rijks.
- Complexity 2: Nested loop.
- Boundary 1: Internal.
- Must test: none (Low). It is a near-copy of the Met version without dedupe. Whatever tests the Met version gets can be reused if the two are ever shared.
- Functional gate: none.

#### JPL parseGallery (High)
- Impact 2: Finds all of the posters, and RB38 requires every available JPL poster.
- Silence 3: A markup change or an attribute order change makes the regex find fewer entries. Nothing asserts the count (D-017 says 19 entries).
- Surface 3: The whole JPL set.
- Complexity 2: A multi-attribute regex and entity decoding (lines 36-43). It needs `href`, `data-title` and `data-url` in this order.
- Boundary 3: Scrapes a page, not an API.
- Must test: the saved `tests/fixtures/ingest/jpl-gallery.html` yields 19 entries in page order with a title, image URL and page URL each. `&amp;`, `&#x27;`, `&#39;` and `&quot;` are decoded. An empty page gives []. An entry with the attributes in another order is not found (pin).
- Functional gate: Museum and library ingest (the recorded gallery page).

#### JPL fullImageFor (Medium)
- Impact 2: Wrong URL means no full-size image.
- Silence 1: Failure is a logged skip.
- Surface 2: JPL.
- Complexity 1: One regex.
- Boundary 3: CDN naming pattern.
- Must test: `…/images/mars.width-1024.jpg` becomes `…/original_images/mars.jpg`. A name with dots or nested folders. A non-matching pattern gives null.
- Functional gate: Museum and library ingest.

#### JPL screen (Medium)
- Impact 2: Applies D-018's one-poster rule (17, not 19) and the content screen.
- Silence 2: A typo in the kept title would skip all three Atomic Clock posters (logged).
- Surface 2: JPL.
- Complexity 1: Two checks.
- Boundary 2: Internal.
- Must test: "Deep Space Atomic Clock - Red" is kept. The other two color titles are skipped with the D-018 reason. A non-clock title passes. A content-flagged title is skipped. The 19 fixture entries produce 17 kept.
- Functional gate: none.

#### JPL toRawWork (Medium)
- Impact 2: The JPL license text and credit are fixed constants (Res #18).
- Silence 2: A wrong constant is systematic and visible.
- Surface 2: Credit.
- Complexity 1: Constants and a size check.
- Boundary 2: Takes a parsed entry.
- Must test: `sourceId` is the last path segment of the page URL, with or without a trailing slash. Lane is "poster", group "space", artist "NASA/JPL-Caltech", date "Undated". The license contains "Courtesy NASA/JPL-Caltech" and the no-endorsement clause. A small size gives the size reason. `jplUserAgent` starts with `Mozilla/5.0`.
- Functional gate: none beyond the per-source contract test.

#### LOC listingUrl (Medium)
- Impact 2: A malformed listing request wastes the 20-per-minute allowance.
- Silence 1: Loud.
- Surface 1: A request builder.
- Complexity 1: Template.
- Boundary 3: A defined send.
- Must test: URL contains the collection path, `fo=json`, `c=100` by default and `sp=<page>`. `allowedRights` equals "No known restrictions".
- Functional gate: Museum and library ingest.

#### LOC masterIiifId (High)
- Impact 2: Builds the archival-master IIIF id from a listing path. A wrong id means a 404 skip, or in rare cases the wrong image.
- Silence 2: A mismatch usually shows as a skip with a misleading "no master scan" reason.
- Surface 3: Image URL for the whole WPA set (about 283 posters).
- Complexity 3: A lazy-quantifier regex with an optional size suffix and extension alternatives.
- Boundary 3: Contract with LOC image paths.
- Must test: the example in the comment gives `master:pnp:cph:3b40000:3b49000:3b49000:3b49078u`. A path without the `_150px` suffix. A trailing letter suffix such as `v`. `.gif` and `.jpg` both work. The first matching URL in the list is used. Non-matching URLs and an empty list give null. A case-insensitive path.
- Functional gate: Museum and library ingest (`tests/fixtures/ingest/loc.json`).

#### LOC artistOf (High)
- Impact 2: Artist credit.
- Silence 3: It prefers an "artist" role and falls back to the sponsor. A playwright or other contributor could be credited silently if roles are named unexpectedly.
- Surface 2: Credit.
- Complexity 2: Two finds and a fallback.
- Boundary 3: LOC creator roles.
- Must test: an artist beats a sponsor. A sponsor is used when no artist exists. A playwright or contributor is never used. A blank title on the matching role is ignored. Roles match case-insensitively and as substrings ("artist, designer"). No creators gives "Unknown artist".
- Functional gate: Museum and library ingest.

#### LOC itemId, dateOf (Medium)
- Impact 2: `itemId` is the `sourceId` that keys thumbnail file names, visual skips and thumbnail source lookup. A collision silently mixes works.
- Silence 2: Wrong ids cause wrong lookups, quietly.
- Surface 2: WPA works.
- Complexity 1: String handling.
- Boundary 2: Internal.
- Must test: `http://www.loc.gov/item/98518971/` gives `98518971`. A missing trailing slash. A date with brackets "[between 1936 and 1938]" has them removed. Blank or missing gives "Undated".
- Functional gate: none.

#### LOC screen (High)
- Impact 3: The only rights gate for the WPA posters (line 66), plus the image and content checks.
- Silence 3: A loosened `startsWith` accepts something restricted without any sign.
- Surface 3: About 283 posters.
- Complexity 2: Three ordered checks.
- Boundary 3: LOC `rights_advisory` text.
- Must test: "No known restrictions on publication." passes. A statement beginning with another phrase gives "rights statement: …". Missing rights gives "none given". No usable image path gives "no image". A content-flagged title or subject is skipped. Order of checks is pinned. Leading whitespace is trimmed.
- Functional gate: Museum and library ingest.

#### LOC toRawWork (Medium)
- Impact 2: Builds the credit line (`rights_advisory` plus the collection credit) and URLs.
- Silence 2: Systematic format.
- Surface 2: Credit.
- Complexity 2: Fallbacks and a size check. It uses an `as string` cast at line 74.
- Boundary 3: Consumes the LOC result shape.
- Must test: small size gives the size reason. `imageUrl` is the master `full/full` URL and the thumb is `full/843,`. Title falls back to "Untitled". License is "<rights> Library of Congress, Prints and Photographs Division, WPA Poster Collection". Lane is "poster".
- Functional gate: Museum and library ingest.

#### main() of aic, met, rijks, jpl, loc (Medium, manual)
- Impact 2: Every output passes `rawFileSchema` in `writeRaw`, then merge's 270 floor and the prebuild check, so a faulty run cannot reach the screen unchecked.
- Silence 1: Each run prints per-page or per-batch counts and a final "kept, skipped" line.
- Surface 2: Hand-run only.
- Complexity 3: Paging loops, time-spaced requests, try/catch with a SourceRefused rethrow.
- Boundary 3: Live outside parties.
- Must test: not unit-tested (testing.md rule 1). Coverage comes from three things. First, the pure functions above, tested against the recorded fixtures. Second, the schema gates `writeRaw`, `loadRaw` and `validate-data`. Third, a manual checklist after each run: compare the printed kept and skipped counts to the D-017 and D-018 expectations (for example JPL 17 kept, AIC at least 180 eligible), then log the counts in `build-log.md`. Stryker's `mutate` for these files should list only the line ranges of the pure functions. Otherwise the unreachable `main()` code drags the score below 80.
- Functional gate: Museum and library ingest (contract tests against one recorded response per source).

#### selectFineArt (High)
- Impact 3: Sets the fine-art composition and enforces the Gap G21 floor of 270 (lines 55-57).
- Silence 3: A shortfall fill that is subtly wrong still gives a plausible 300-ish list.
- Surface 3: Fine-art lane.
- Complexity 3: Per-museum picks, a spare list per museum, a round-robin fill that adds to `picks[next.sourceKey]` (line 48), and a throw.
- Boundary 2: Internal, consumed by `toCatalog` and `main`.
- Must test:
  - All three pools of 100 or more give exactly 100 each, in AIC, Met, Rijks order.
  - One museum short (Rijks 80): 20 extra works come from the other two, alternating AIC then Met, with the spares not including works already picked.
  - Two museums short. Spares exhausted gives fewer than 300, and total 270 passes while 269 throws with the Gap G21 message.
  - Picks spread across groups within each museum. No work appears twice. A work is added to its own museum's list (by `sourceKey`).
  - Pin that fill works are appended after that museum's own picks, so final id order follows museum order.
- Functional gate: none (internal).

#### selectPosters (High)
- Impact 3: Sets the poster lane: all JPL, then WPA to 300 (line 63).
- Silence 3: There is no floor check for posters. A WPA shortfall silently gives fewer than 300, and only `catalogProblems` bounds the total.
- Surface 3: Poster lane.
- Complexity 1: One expression.
- Boundary 2: Internal.
- Must test: 17 JPL plus 283 WPA gives 300 with JPL first. WPA shorter than needed returns fewer with no error (pin). More than 300 JPL works returns all JPL and no WPA (pin that a negative count gives none). No JPL gives 300 WPA. WPA picks use the spread order.
- Functional gate: none.

#### toCatalog (High)
- Impact 3: Builds every catalog record: ids, credits, license, thumbnail path, orientation.
- Silence 3: Wrong mapping looks plausible. The schema cannot independently check `orientation` because both sides call `orientationFor`.
- Surface 3: Everything.
- Complexity 2: Padding width, ordering, mapping.
- Boundary 3: Writes the `catalog.json` contract.
- Must test:
  - Ids are `w-0001`… in input order. Width is `max(4, digits)`, so 10,000 works use five digits. Empty input gives [].
  - Each field maps from the right source field. `source` is the `sourceNames` value for the `sourceKey`. `thumbUrl` is `/thumbs/` plus `thumbName`.
  - Orientation uses explicit cases: wide gives landscape, tall gives portrait, equal gives square.
  - An em dash in a title, artist, date or license is preserved (D-022).
  - The output passes `metadataCatalogFileSchema` and contains no J1 fields.
- Functional gate: Data files (zod schema validation).

#### thumbName (Medium)
- Impact 2: Names files that `toCatalog`, `plan` and `validate-data` must agree on.
- Silence 3: Two different source ids that normalize alike would overwrite one thumbnail silently.
- Surface 3: Every thumbnail.
- Complexity 1: Lowercase and one regex.
- Boundary 2: Shared naming contract.
- Must test: lowercase output with a `.webp` suffix and a source-key prefix. Runs of characters outside `a-z0-9-` collapse to one hyphen. `/` and spaces are replaced. Pin the case-collision and `_`/`-` collision cases. Numeric ids are unchanged.
- Functional gate: none.

#### withoutVisualSkips (High)
- Impact 3: Removes works Claude flagged in the D-021 visual pass. If this fails, they return.
- Silence 3: A key mismatch silently keeps every flagged work.
- Surface 3: Catalog membership.
- Complexity 1: A Set and a filter.
- Boundary 2: Internal.
- Must test: a work is removed by the exact (`sourceKey`, `sourceId`) pair. The same `sourceId` under another source stays. An empty skip list returns all works. A skip for an absent work changes nothing. Order is preserved.
- Functional gate: none.

#### loadRaw (Medium)
- Impact 2: Loads each raw file.
- Silence 2: It tags works with the `key` argument and ignores the file's own `sourceKey` (line 98), so a mis-saved file would be mislabeled quietly.
- Surface 3: Feeds merge and thumbs.
- Complexity 1: Read, parse, map.
- Boundary 3: `data/raw/*.json` contract.
- Must test: with `readFile` mocked, a valid file returns works each tagged with the requested key. An invalid file throws. Pin the mislabeling behavior.
- Functional gate: Data files (zod schema validation).

#### loadVisualSkips (High)
- Impact 3: The persistent record of the D-021 visual pass.
- Silence 3: A missing or misnamed file returns [] without any warning (line 103), so every visually removed work comes back unnoticed. `review.ts` reads the same function, so Scott's skip log would not show the change either.
- Surface 3: Catalog membership.
- Complexity 1: One conditional.
- Boundary 3: A data-file contract (`visualSkipSchema`).
- Must test: with `existsSync` and `readFile` mocked, absent file gives [], present valid file gives its entries, an unknown key is rejected, an empty `reason` is rejected, malformed JSON throws, an empty array returns [].
- Functional gate: Data files (zod schema validation).

#### merge main() (High by score, manual)
- Impact 3: Writes the real `catalog.json`.
- Silence 2: It prints per-source counts, and `metadataCatalogFileSchema.parse` and the floor throw.
- Surface 3: The whole catalog.
- Complexity 2: Orchestration.
- Boundary 3: File I/O contract.
- Must test: not unit-tested. Covered by the unit tests for its parts, the schema parse before write, and the prebuild check. After each run, check the printed counts against 300 fine art and 300 posters.
- Functional gate: Data files.

#### plan (High)
- Impact 3: Chooses which thumbnails to download and which files to delete (`rm`, thumbs.ts line 80).
- Silence 3: Mapping a work to the wrong source URL puts a wrong image under a right credit. Existing files are never refreshed (line 45).
- Surface 3: Room tiles.
- Complexity 2: Wanted set, job and orphan logic, source-key lookup.
- Boundary 2: Internal, but it depends on `thumbName` and `sourceNames`.
- Must test: a work whose file exists gives no job. A missing file with a known source URL gives one job with the right key. An unknown institution name or missing URL goes to `missing`. A `.webp` file no work points to is an orphan. Non-`.webp` files are never orphans. Basename comes from `thumbUrl`. `sourceKeyOf` maps every `sourceNames` value back to its key and gives undefined for others. Two works with the same thumb name: pin.
- Functional gate: none.

#### resize (Medium)
- Impact 2: Wrong output gives cropped or blurry tiles (D-023).
- Silence 2: Slight quality or width drift is hard to notice.
- Surface 3: All thumbnails.
- Complexity 1: One sharp pipeline.
- Boundary 2: Uses the sharp library.
- Must test: using a generated in-memory image (no network): a wide image comes out 640 wide with the aspect ratio kept and no crop. A tall image is the same. An image under 640 is not enlarged. Output is WebP.
- Functional gate: none.

#### skipLogMarkdown (Medium)
- Impact 2: The review artifact for D-002 and D-021. A dropped or mis-counted skip hides a decision from Scott.
- Silence 2: A wrong count reads plausibly.
- Surface 1: A review file, never deployed.
- Complexity 2: Totals, grouping by `reasonGroup` (prefix before the first colon), sort by group size.
- Boundary 1: Internal.
- Must test: the total in the intro equals the sum of all skips. Each source heading shows its own count. Reasons that differ only after the colon group together. A reason with no colon forms its own group. Groups sort by size, largest first. An empty title shows "(no title)". A source with no skips still gets a heading. Visual-check reasons group under "visual check".
- Functional gate: none.

#### sample (Medium)
- Impact 1: Only affects which works Scott sees in review.
- Silence 3: A biased shuffle still looks random.
- Surface 1: Review only.
- Complexity 3: A seeded PRNG and Fisher-Yates.
- Boundary 1: Internal.
- Must test: the same seed and input give the same output twice. A different seed gives a different order. Output elements all come from the input, with no duplicates. Length is `min(n, items.length)`. The input is not mutated. `n = items.length` returns a permutation. `n = 0` and empty input return []. Pin the output for seed 20261009 on a fixed list, because the comment promises the same 60 each run.
- Functional gate: none.

#### contactSheetHtml (Low)
- Impact 1: A review page in a gitignored folder.
- Silence 1: A broken sheet is obvious.
- Surface 1: One file.
- Complexity 1: String templates and an escape function.
- Boundary 1: Internal.
- Must test: none (Low).
- Functional gate: none.

#### catalogProblems and the prebuild check (High)
- Impact 3: The last gate before deploy. If it passes bad data, the live Room shows broken images.
- Silence 3: A check that fails open produces no error at all.
- Surface 3: The whole deployed catalog.
- Complexity 1: A range test and a filter.
- Boundary 3: The "Data files" gate in docs/testing.md.
- Must test:
  - Catalog length 499 and 701 each give a problem. 500 and 700 each pass. The message includes the count.
  - Every thumbnail present gives no problems. One or more missing gives one problem that names the count and the first missing path.
  - A test that parses the real `data/catalog.json` with `metadataCatalogFileSchema` and runs `catalogProblems` with real `existsSync` over `public/`.
  - A test that `package.json` has a `prebuild` script that runs this file. Today no such key exists (see the caller note).
- Functional gate: Data files (zod schema validation in tests and at build time).

#### orientationMatches (Medium)
- Impact 2: The shared orientation cross-check (D-016).
- Silence 2: A mismatch passing would give odd layout, not wrong data.
- Surface 3: Now applied by `workSchema` and `metadataWorkSchema`.
- Complexity 1: One comparison.
- Boundary 2: Shared internal helper.
- Must test: through `metadataWorkSchema`: matching passes, mismatched is rejected with path `["orientation"]`, and the square case. The helper was extracted unchanged, so the existing `workSchema` orientation tests still apply.
- Functional gate: none.

#### catalogOf (High)
- Impact 3: The duplicate-id rule (D-015) is now one generic function.
- Silence 3: A duplicate id silently returns the wrong work.
- Surface 3: Guards both the M2 and the M3 catalog.
- Complexity 2: Set plus indexed loop.
- Boundary 2: Internal. Contract via the two schemas.
- Must test: every duplicate-id case already listed in this file's Part A triage, now run for `metadataCatalogFileSchema` as well as `catalogFileSchema` (second and third occurrence flagged at their own index, non-adjacent duplicates, exact-match ids, empty array).
- Functional gate: Data files (zod schema validation).

#### metadataWorkSchema (High)
- Impact 3: It is now the only gate on the real `catalog.json`.
- Silence 3: It is built by destructuring `workFields` (line 110). A later edit to `workFields` flows in without notice.
- Surface 3: Every screen's data until M3.
- Complexity 2: Destructure plus strict object plus refine.
- Boundary 3: Data contract with `data/catalog.json`.
- Must test: a full valid metadata work parses. Each of the five J1 fields (valence, arousal, tags, palette, subject) is rejected as an unknown key. Each remaining field is required. `thumbUrl` must start with `/` and have at least 2 characters. `imageUrl` must be a URL. Orientation enum and mismatch. The key set equals the Section 3.2 list minus the five J1 fields. `tests/fixtures/catalog.metadata.json` and the real `data/catalog.json` both parse.
- Functional gate: Data files (zod schema validation in tests and at build time).

#### metadataCatalogFileSchema (High)
- Impact 3: What `merge`, `thumbs`, `review` and `validate-data` all parse.
- Silence 3: Same duplicate-id risk as above.
- Surface 3: Whole catalog.
- Complexity 2: Generic wrapper over the metadata schema.
- Boundary 3: The catalog file contract.
- Must test: empty array, valid file, duplicate ids rejected at the later index, an invalid work rejected with a path starting at its index, non-array rejected. The real `data/catalog.json` parses.
- Functional gate: Data files.

#### workSchema, catalogFileSchema, configSchema (refactor effect: none)
- Impact 3, Silence 3, Surface 2 and Boundary 3 are unchanged for `workSchema` and `catalogFileSchema`. `configSchema` is untouched.
- The orientation check and the duplicate-id check were moved into shared helpers (`orientationMatches`, `catalogOf`). The conditions, messages and issue paths in the code (lines 86-87 and 95-98) match the Part A descriptions, so behavior does not change.
- Tier stays High. The existing tests should pass unchanged, and nothing new is needed for these three. Re-run Stryker on `schemas.ts` because the file changed and now holds new mutants (the two metadata schemas). The Part A survivors list refers to old line numbers (85, 94, 116, 143, 151-164), so it needs re-mapping to the new ones (87, 97, 134, 161, 169-182).
- Must test: none new. Functional gate: Data files (zod schema validation in tests and at build time).

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
