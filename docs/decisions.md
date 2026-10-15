# Decisions log

Every decision made after the spec was locked goes here, with its date and the reason. The spec (`docs/spec.md`, with gap resolutions G1 to G20 in `docs/spec-v1.md`) is the baseline. Nothing in this file may contradict the spec. If a decision would change the spec, Scott decides whether to amend the source brief and re-run the pipeline.

Format for each entry:

```
## D-001: <short title>
Date:
Decided by: Scott
Question:
Decision:
Why:
Spec reference: <section or tag this refines>
```

---

## Decisions

### D-000: Spec v2 locked
Date: 2026-10-08
Decided by: Scott
Decision: Build from spec v2. All 58 ambiguity items and gaps G1 to G33 are resolved. The end of the build, when the cost line's N and X are filled and frozen, is the day the walkthrough video is recorded. Claude must flag this to Scott before recording [Gap G31].
Spec reference: spec.md status line, Gap G31.

### D-001: Images use the hybrid approach
Date: 2026-10-08
Decided by: Scott
Question: Q-001, where images are served from.
Decision: Resized thumbnails are copied into the deployed app so the Room loads instantly. Full-size images on the Piece and Wall screens are linked from the source institutions (AIC IIIF, Met image server, Library of Congress, JPL).
Why: The Room's first impression depends on instant thumbnails, and roughly 600 small thumbnails fit in the repo. Full-size images would bloat git history.
Spec reference: Gap G2 (imageUrl, thumbUrl).

### D-002: Asset curation rules adopted
Date: 2026-10-08
Decided by: Scott
Question: Q-003.
Decision: The three proposed rules in docs/asset-sources.md are binding. Thumbnails are resized, never cropped. Images under 1,200px on the long edge and heavily damaged items are skipped. Works with graphic violence, nudity, or imagery that would read badly in a CEO demo are skipped, and every skip is logged with a reason for Scott's review. The WPA selection note stands as guidance.
Spec reference: Section 2.

### D-003: Quality-bar thresholds adopted, with a J1 placement review
Date: 2026-10-08
Decided by: Scott
Question: Q-004.
Decision: The numeric standards in docs/quality-bar.md are binding: Threshold interactive in under 2 seconds, the first 12 Room images within 1.5 seconds, and ten clean demo-path runs in a row. Milestone 3 includes a step where Scott reviews J1 placements (a sample of 20 across the field plus the per-lane distribution) before the batch is accepted.
Spec reference: Section 4, J1.

### D-004: Visual direction by iteration
Date: 2026-10-08
Decided by: Scott
Question: Q-002.
Decision: At the start of Milestone 4, Claude Code builds two contrasting static directions for the Threshold and Room. Scott picks one. The chosen direction is then iterated with Scott, round by round, until he declares the design settled. No other screen is styled until then, and each round's changes are recorded in docs/design-log.md.
Spec reference: none; the spec sets no visual design.

### D-005: Hosting moves to Upsun
Date: 2026-10-08
Decided by: Scott
Question: Use Upsun instead of Vercel?
Decision: Upsun hosts Feel First, in a new project under Scott's existing Upsun organization (which already runs the Learner's Permit demo). Deploys go by git push through the GitHub integration, configured in .upsun/config.yaml. For the cost line, hosting spend counts only what this project adds (project fee, compute, storage), not the existing user license.
Why: One platform Scott already runs and knows. The user license is already paid, so the marginal cost is the project fee plus compute.
Spec reference: Res #59, which overrides RB66 and Res #1 and refines Res #40. Spec v2 Sections 1.4, 8.1 and 9 are updated.

### D-006: Model for the AI jobs
Date: 2026-10-08
Decided by: Scott
Question: Which Claude model do J1, J2, J4 and J8 use? The spec says only that it is a config value.
Decision: claude-opus-5-5, stored in src/config/feel.ts.
Why: Best available quality for J1 vision tagging and the curator copy. Spend is still bounded by the console cap and the J2 cache.
Spec reference: Section 4; docs/ai-jobs.md.

### D-007: Route paths
Date: 2026-10-08
Decided by: Scott
Question: The spec names the seven screens but not their URLs.
Decision: Threshold `/`, Room `/room`, Piece `/piece/[id]`, Wall `/wall`, Bag `/bag`, Close `/close`, Signals `/signals`.
Why: Short and literal, one path per screen.
Spec reference: Section 5.

### D-008: Catalog field formats
Date: 2026-10-08
Decided by: Scott
Question: Section 3.2 gives field names and types but not the formats of several fields.
Decision: `lane` is "fine-art" or "poster". `id` is a zero-padded string (fixtures use "fx-0001") so ascending string sort equals catalog order. `orientation` is "portrait", "landscape" or "square". `license` is a plain string.
Why: Simple values that sort and compare without parsing.
Spec reference: Section 3.2, Gap G2, Res #23.

### D-009: Wall colors stored by name only
Date: 2026-10-08
Decided by: Scott
Question: Gap G14 names five wall colors but gives no color values.
Decision: Config holds the five names only for now. Color values are set during Milestone 4 design work.
Why: Color values are a visual design choice, which D-004 places in Milestone 4.
Spec reference: Gap G14, D-004.

### D-010: Concept bar wording
Date: 2026-10-09
Decided by: Scott
Question: What exact text does the concept bar show?
Decision: "A concept by Scott Reasinger. Not affiliated with any company or website." No company is named in the bar.
Why: A generic disclaimer covers both companies without naming either.
Spec reference: RB43, Res #26, Section 1.5. This refines the label wording; the bar still says the prototype is a concept by Scott and is not affiliated.

### D-011: No search indexing or crawling
Date: 2026-10-09
Decided by: Scott
Question: Should art.reasinger.net allow search engines to index or crawl it? The spec is silent.
Decision: No. robots.txt disallows all crawlers, and every page carries a noindex, nofollow robots meta tag.
Why: The prototype is for one reader and should not appear in search results.
Spec reference: none; the spec does not cover indexing.

### D-012: Claude subscription prorated by hours
Date: 2026-10-09
Decided by: Scott
Question: How is the Claude subscription prorated into X for the cost line? The build log header said monthly fee times build days, divided by 30.
Decision: Prorate by build hours: $100 monthly fee times hours logged, divided by 160. Upsun cost is added later from actual invoices, not estimated.
Why: Scott's instruction when logging the first two sessions (1.5 hours at $100 per month over 160 hours).
Spec reference: Res #40, Gap G31. The cost line wording is unchanged; this sets how X is computed.

### D-013: Upsun Blackfire monitoring allowed for now
Date: 2026-10-09
Decided by: Scott
Question: Upsun sends a Blackfire post-deploy event. Does the platform's server monitoring count as an "analytics add-on from the hosting platform" that the build rules forbid?
Decision: Blackfire is allowed for now. It adds no script to visitor pages (checked on art.reasinger.net: no scripts outside /_next/). Scott will check its cost impact later and revisit if it adds hosting cost.
Why: Scott's call on 2026-10-09.
Spec reference: Section 1.7 (no analytics or tracking scripts). This covers server-side platform monitoring only; no browser analytics is added.

### D-014: Testing policy
Date: 2026-10-09
Decided by: Scott
Question: How rigorous should testing be, without paying for low-value tests?
Decision:
- All logic is unit tested, and components get render tests. The amount of testing is set by risk tier, not coverage.
- An independent test-evaluator subagent (Sonnet) triages each unit before tests are written. It scores impact, silence, surface, complexity and boundary, citing evidence for each score. Scott reviews the tier table.
- High-tier files must reach an 80% mutation score with Stryker.
- A test-sweeper subagent (Haiku) flags low-value tests after they are written, and flagged tests are deleted.
- Every interface with a defined send or return gets a functional gate.
- Tests never call outside parties: mock, stub, or replay recorded fixtures only.
- Coverage is reported, never gated.
- Deploy, then test: there is no pre-deploy gate. Scott runs a manual live smoke test after each deploy, and the script grows by milestone.
- The M1 code gets a test backfill at the start of M2.
- The milestone exit-criteria process continues unchanged, with the testing loop added to every milestone's exit.
Why: Coverage numbers reward trivial tests. Risk tiers plus mutation testing put effort where silent or demo-breaking failures would occur. Outside calls in tests cost money, fail randomly and need secrets. A prototype with no outside exposure does not need a pre-deploy gate.
Spec reference: none; this is build process. Details in docs/testing.md.
Note: the kit drafted this as D-006, but D-006 was already used in M1 for the AI model. Scott chose to number it D-014 on 2026-10-09.

### D-015: Catalog IDs must be unique
Date: 2026-10-09
Decided by: Scott
Question: Spec Section 3.2 says the catalog ID is sortable ascending but does not say IDs are unique. Should the catalog file schema reject duplicate IDs?
Decision: Yes. The catalog file schema rejects any file with a duplicate id.
Why: A duplicate id would make a lookup by id silently return the wrong work.
Spec reference: Section 3.2, Gap G2, Res #23, D-008.

### D-016: Catalog record schema is strict
Date: 2026-10-09
Decided by: Scott
Question: The test-evaluator found four places where the catalog record schema accepts plausible bad data. Pin that behavior in tests, or tighten the schema?
Decision: Tighten it. (1) A record with a field not in the Section 3.2 list is an error, not silently dropped. (2) Tags must be unique. (3) Orientation must match the dimensions: width greater than height is landscape, height greater than width is portrait, equal is square. (4) thumbUrl must be a local path starting with "/".
Why: A test that pins a loophole guards nothing. These catch ingest and J1 mistakes at build time.
Spec reference: Section 3.2, Gap G2, D-001, D-008.

### D-017: Source APIs verified against current documentation
Date: 2026-10-09
Decided by: Scott (findings recorded for his review before any ingest code)
Question: Do the endpoints, rate limits, license fields and identification requests in docs/asset-sources.md match each source's current official documentation?
Decision: These findings were checked against official documentation on 2026-10-09 and the ingest scripts follow them. Every script identifies itself as "Feel First prototype (scott@reasinger.net)".
- Art Institute of Chicago (api.artic.edu/docs): differs. The identifying header is `AIC-User-Agent`, not `User-Agent` (the scripts send both). Anonymous use is limited to 60 requests per minute, and scrapers are asked to make no more than one request per second. Search returns at most 100 per page and 10,000 in total. The IIIF base should be read from the response's `config.iiif_url`, not hard-coded. AIC recommends 843px-wide IIIF images; 1686px is available for public-domain works. Filtering on `is_public_domain` works as described.
- The Met (metmuseum.github.io): differs. The `/search` endpoint was retired on 2026-10-01. Its replacement is `/public/collection/v1.1/search` with `offset` and `limit` (up to 500 per page, 10,000 in total). `isPublicDomain` is not a search filter, so it is checked on each object record, as before. The published limit is 80 requests per second. No identifying header is requested. Open access data and images are CC0.
- Rijksmuseum (data.rijksmuseum.nl/docs): the current official service is Rijksmuseum Data Services, with no API key. The old key-based REST API is superseded. Search is `https://data.rijksmuseum.nl/search/collection` (filters include `type` and `imageAvailable=true`, 100 per page, `pageToken` paging). Each object is read as Linked Art JSON-LD from `https://id.rijksmuseum.nl/{id}?_profile=la-framed&_mediatype=application/ld+json`. Images are IIIF at `iiif.micr.io`, reached through the object's visual item and digital object, so one work takes about three requests. Rights appear as Linked Art `subject_to` with a license URI (CC0 seen on a sample). The policy page says public-domain and CC0 material is free to use and asks for credit to the Rijksmuseum. No rate limit is published, so the script throttles to one request per second.
- NASA JPL Visions of the Future: no API. The series is the gallery page https://www.jpl.nasa.gov/galleries/visions-of-the-future/ with full-size files linked from each poster's page. The page text says 14 posters, but the gallery shows 19 entries. The JPL Image Use Policy says images "may be used for any purpose without prior permission", except that no endorsement by NASA, JPL or Caltech may be implied and their logos need approval. The policy's default credit is "Courtesy NASA/JPL-Caltech". No rate limit is published; the script throttles to one request per second.
- Library of Congress WPA posters: differs. The JSON API is limited to 20 requests per minute, and exceeding it blocks the client for an hour (the countdown restarts on any request during the block). Image downloads are limited to 150 per minute. The collection has 947 items, not about 900. Rights appear in `rights_advisory` (for example "No known restrictions on publication."). Listing results only link images up to 1024px, so each candidate needs an item request to find a file of at least 1,200px on the long edge.
Findings while running the scripts on 2026-10-09:
- The Met: its firewall (Incapsula) blocked requests at about 8 a second, well under the published 80. The script now makes one request a second and stops if a firewall page comes back.
- NASA JPL: www.jpl.nasa.gov refuses a user agent that does not start with "Mozilla/5.0", and after a handful of requests answers with a bot challenge. The script sends "Mozilla/5.0 (compatible) Feel First prototype (scott@reasinger.net)", makes a single request for the gallery page, can read a saved copy of it instead, and never tries to get past a challenge. Full-size files come from JPL's CDN, which does not challenge.
- Library of Congress: item and resource JSON endpoints answered 503 for a period while the collection listing worked.
- AIC: only 140 public-domain paintings, prints and drawings carry AIC's boost rank. After those, works are ordered by AIC's "viewed often" flag, AIC's own popularity signal.
- To keep one series from crowding a lane (for example Hokusai's Fifty-three Stations), each museum contributes at most 3 works per named artist. Extra works are logged as skips. This applies D-020's spread.
- Library of Congress (2026-10-09): for about 200 WPA posters, tile.loc.gov answers 500 to any scaled IIIF request on the master file but serves the same file at full size. The thumbnail script falls back to the full-size image and resizes it locally. Catalog records are unchanged.
Why: docs/asset-sources.md asks that each source be checked before an ingest script is written, and that differences are logged.
Spec reference: Section 2.2, Section 2.4, D-001, D-002.

### D-018: JPL poster scope
Date: 2026-10-09
Decided by: Scott
Question: The JPL gallery shows 19 entries but its text says the series is 14. Which count as "every available JPL poster" [RB38, Res #18]?
Decision: 17. All gallery entries, except that the three color versions of the Deep Space Atomic Clock design count as one poster. The red version is kept by default and the other two are logged as skips, so Scott can swap the color at the skip-log review.
Why: The Room should not show one design three times.
Spec reference: Section 2.2, D-017.

### D-019: AIC full-size image width
Date: 2026-10-09
Decided by: Scott
Question: AIC recommends 843px-wide IIIF images and offers 1686px for public-domain works. Which does imageUrl use for the Piece and Wall screens?
Decision: 1686px wide.
Why: Sharp on retina screens at the large Piece view. Every AIC work in the catalog is public domain.
Spec reference: Gap G2 (imageUrl), D-001, D-017.

### D-020: Fine-art selection criteria
Date: 2026-10-09
Decided by: Scott
Question: The spec sets about 100 works from each museum [Res #37] but not which works. Which does each script select?
Decision: Paintings, prints and drawings only. Candidates are ranked by the museum's own quality signal where it has one (for example AIC boost rank or Met highlights), and picks are spread across subject types (landscape, seascape, still life, figure, city, botanical and others) so the mood field is covered.
Why: These are the things people hang as wall art, and a subject spread gives J1 material across the whole field.
Spec reference: Section 2.2, Res #37, D-002.

### D-021: How the content curation rule is applied
Date: 2026-10-09
Decided by: Scott
Question: Curation rule 5 in docs/asset-sources.md (skip graphic violence, nudity, and imagery that would read badly in a CEO demo) needs judgment. How is it applied?
Decision: Two passes. First, the scripts skip any work whose title, subjects or tags match a list of flag words, logging the matched word. Second, Claude looks at every selected thumbnail in session and skips anything else that breaks the rule, also logged with a reason. Scott reviews both through the skip log and the contact sheet.
Why: A word list alone misses images whose metadata is bland; a visual pass in session costs nothing extra.
Spec reference: D-002.

### D-022: Source credits keep their own em dashes
Date: 2026-10-09
Decided by: Scott
Question: Some source titles contain em dashes (AIC: "A Sunday on La Grande Jatte" followed by an em dash and "1884"). The repository bans the em dash, but credits must match the source record (quality bar 8). Replace, skip, or keep?
Decision: Keep the source text. Credit fields copied from an institution (title, artist, date, license) keep any em dash exactly as the source wrote it. This is the only exception to the em-dash rule. Every word the project writes itself still never uses one.
Why: Credits must match the source record.
Spec reference: quality bar 7 and 8, Gap G33, CLAUDE.md writing rules.

### D-023: Thumbnail width and format
Date: 2026-10-09
Decided by: Scott
Question: What width and format do the thumbnails in public/thumbs/ use [D-001]?
Decision: 640px wide WebP, resized to width and never cropped. A sample of 12 real source images averaged about 50 KB each, which is about 29 MB for 600 works.
Why: A Room tile is about 300 CSS pixels wide on desktop and 190 on a phone, so 640 device pixels stays sharp on retina screens. WebP is about a third smaller than JPEG and works in every current browser.
Spec reference: D-001, D-002, quality bar 4.

### D-024: Rijksmuseum full-size image width
Date: 2026-10-09
Decided by: Scott
Question: The Rijksmuseum IIIF full scan can be 6000px and several megabytes. Which size does imageUrl link?
Decision: 1686px wide, the same as AIC (D-019), or the scan's own width if smaller.
Why: Consistent with AIC, and fast enough for the Piece screen.
Spec reference: Gap G2 (imageUrl), D-001, D-019.

### D-025: Catalog review outcomes
Date: 2026-10-10
Decided by: Scott
Question: The M2 review of the skip log and contact sheet raised five points the spec does not settle.
Decision: (1) The same WPA poster design may appear more than once in different printings. (2) JPL posters keep artist "NASA/JPL-Caltech" and date "Undated". (3) LOC dates drop the cataloguers' square brackets. (4) At most 3 works per artist stays. (5) The borderline works kept after the visual check (a funerary papyrus strip, Blake drawings, three WPA book-care posters with a silhouette imp) stay. The visual check skipped 44 works, listed in data/raw/visual-skips.json.
Why: Scott reviewed the catalog and accepted it as built.
Spec reference: D-002, D-017, D-020, D-021.

### D-026: J1 sees the local thumbnails
Date: 2026-10-10
Decided by: Scott
Question: docs/ai-jobs.md says J1 sees a rendition about 800px on the long edge. The committed thumbnails are 640px wide (D-023), so landscape works are 640px on the long edge. Use the thumbnails, or fetch an 800px rendition from each source?
Decision: Use the local thumbnails in public/thumbs/.
Why: 640px is enough to judge mood, palette and subject. It needs no source requests (the Library of Congress allows 20 a minute) and costs slightly fewer image tokens.
Spec reference: Section 4 J1, D-023.

### D-027: Mood bucket keys
Date: 2026-10-10
Decided by: Scott
Question: The spec fixes 9 buckets [Res #9, Gap G4] but not how they are keyed in copy.json, config and signals.json.
Decision: A bucket key is the valence band, a hyphen, then the arousal band. Valence bands are heavy, mid, bright; arousal bands are calm, mid, charged. Examples: heavy-calm, mid-mid, bright-charged.
Why: Readable in the data files and the review pages.
Spec reference: Section 3.4, Gap G3, Gap G4.

### D-028: The word-map fallback also extracts room type and size
Date: 2026-10-10
Decided by: Scott
Question: Gap G9 gives the word map about 150 mood words but does not say whether the fallback returns J2's room type and size.
Decision: data/j2-wordmap.json holds the mood words with coordinates plus the words for the fixed room types and size words (Gap G7), so the fallback returns constraints too.
Why: A visitor who types "small print for the nursery" while the API is down still gets the size preselected and the room qualifier.
Spec reference: Gap G7, Gap G9, Section 3.9.

### D-029: J8 file shapes
Date: 2026-10-10
Decided by: Scott
Question: Gap G27 names the files but not their fields.
Decision: data/signals-seed.json holds the seed, the session count and the sessions; each session has its mood bucket, the work ids viewed, and its add-to-bag lines (work id, size, material, frame or null). data/signals.json holds the seed, a simulated flag, the four findings (kind, bucket, action, text, and the named figures the text cites) and the per-bucket aggregate figures. Pick rate is adds divided by views. The app never imports signals-seed.json.
Why: Every figure in signals.json can be recomputed from the sessions in the seed file [Res #38].
Spec reference: Section 3.10, Section 3.11, Gap G27.

### D-030: A point on a bucket cut belongs to the middle band
Date: 2026-10-11
Decided by: Scott
Question: The cut points are -1/3 and +1/3 on each axis, but the spec does not say which bucket a value exactly on a cut belongs to.
Decision: A value exactly on a cut goes to the middle band. Only values below -1/3 are heavy or calm, and only values above +1/3 are bright or charged.
Why: It keeps the outer buckets strictly outside the cuts, and src/lib/buckets.ts already works this way.
Spec reference: Section 3.4, docs/ai-jobs.md shared coordinate space.

### D-031: J1 calibration fails on the first prompt, and the prompt is revised
Date: 2026-10-11
Decided by: Scott
Question: The first full J1 run (prompt 265c6a5d0fca) put 244 of 300 posters in the bright or charged buckets and only 3 in the calm row, tagged 288 of 300 posters "nostalgic", and crowded fine art into mid-calm and mid-mid. Accept it, or fix the prompt and re-run?
Decision: Fix the prompt and re-run all 600 works. The revision separates a poster's printing style from its feeling, limits "nostalgic" and "contemplative" to works that earn them, and gives an anchor description for each corner of the field.
Why: docs/ai-jobs.md requires posters to land across the whole field, checked per lane before the batch is accepted (D-003). AI output is never hand-edited, so the prompt is the only fix.
Spec reference: Section 4 J1, D-003.

### D-032: J1 calibration accepted on the revised prompt, with the poster skew as a known limit
Date: 2026-10-11
Decided by: Scott
Question: The revised prompt (a8a9b5008f5d) fixed the nostalgic tag (on 23 posters, down from 288) but posters still cluster: 240 of 299 are bright or charged, 13 sit in the calm row, and none are heavy-calm. Revise again, change the poster set, or accept?
Decision: Accept the revised prompt's placements. The poster skew is logged as a known limit of the poster set (WPA promotion and JPL travel posters are mostly upbeat, bold work), not a prompt fault. Works that fail validation are retried on the same prompt; only if they keep failing does the prompt change.
Why: Two prompts that both told the model to separate printing style from feeling gave nearly the same poster spread, and individual placements read correctly. Further prompt runs cost about $3.46 each with little expected change.
Spec reference: Section 4 J1, D-003, D-031.

### D-033: How the J4 validator enforces the ban on names
Date: 2026-10-11
Decided by: Scott
Question: J4 lines may not name any person other than the artist, but a validator cannot reliably tell a person's name from a place name, and some titles are people. Ban every proper noun except the artist's, or allow places?
Decision: Allow places. A capitalized word that does not start a sentence must come from the artist's name or the work's title. For works whose J1 subject is figure, title words are not allowed, since those titles usually name the sitter, and a capitalized title word that is not the artist's or a plain describing word (portrait, woman, young and the like) is rejected anywhere in the line, including at the start of a sentence. Any other capitalized word rejects the response, which is re-queued.
Why: Lines can stay specific ("the Thames at night") while the most common way a person's name gets in, a portrait title, is closed. Scott accepted that a person named in a non-figure title could still slip through.
Spec reference: Section 4 J4, docs/ai-jobs.md J4 banned list.

### D-034: J4 lines are at most 30 words
Date: 2026-10-11
Decided by: Scott
Question: The J4 pilot lines met "one or two sentences" but ran 27 to 54 words (median 37), a short paragraph rather than a line on the Piece screen. Cap the length?
Decision: Each line is at most 30 words, in addition to the two-sentence limit. The prompt asks for it and the validator rejects longer lines.
Why: Tighter lines read as a curator's note, and the cap cuts J4 output cost by about a third.
Spec reference: Section 4 J4, docs/ai-jobs.md J4 style.

### D-035: J4 aims at about 25 words and runs at low effort
Date: 2026-10-11
Decided by: Scott
Question: The second J4 pilot passed 21 of 24 works, with the 3 rejects at 31 or 32 words, and measured about $0.016 per work, putting the full run near $11. About two thirds of output was hidden thinking at medium effort. Change the prompt target and the effort?
Decision: The prompt asks for about 25 words, never more than 30; the validator still rejects lines over 30 (D-034). J4 effort in src/config/feel.ts moves from medium to low. A third 24-work pilot measures quality and cost before the full run.
Why: Aiming below the cap should stop near misses that re-queue a whole work, and low effort cuts thinking spend. The pilot shows whether line quality holds.
Spec reference: Section 4 J4, D-034.

### D-036: How J8 picks its four findings from the seeded data
Date: 2026-10-11
Decided by: Scott
Question: The spec names the four finding shapes (D-029) but not how a segment or group qualifies, or what the simulation assumes.
Decision: A poster group is the set of posters sharing a J1 subject. A group's lift counts only when it has at least 300 views in the segment. The attach finding needs at least 100 adds in the segment. The simulation follows assumptions A1 to A10 listed in the header of scripts/j8-seed.ts, with seed 20261008 and 20,000 sessions.
Why: J1 subject is the only grouping every poster has. The thresholds keep small, noisy cells from producing a finding. Stating the assumptions lets each finding be traced to a cause rather than to noise.
Spec reference: Section 3.10, Section 3.11, Res #38, Gap G27, D-029.

### D-037: The demo video phrase
Date: 2026-10-11
Decided by: Scott
Question: docs/ai-jobs.md J2 requires the phrase typed in the demo video to be in the pre-warm cache. Which phrase?
Decision: "a slow sunday morning in the bedroom, something large". It is passed to scripts/j2-draft.ts with --video and the draft validator rejects any phrase list without it.
Why: It should exercise every J2 output at once (a mood point, the bedroom room type and the large size), and its expected segment, Morning Light, is the segment of the J8 rack-candidate and licensing-gap findings.
Spec reference: Section 4 J2, Res #7, Res #8, docs/ai-jobs.md J2 review.

### D-038: J2 phrase list and word map approved
Date: 2026-10-12
Decided by: Scott
Question: Approve the Claude-drafted J2 lists (data/raw/j2-draft.json, prompt 450d18489769) as they are, or re-draft?
Decision: Approved as drafted: 52 phrases including the D-037 video phrase, 147 mood words, 21 room words and 12 size words. data/j2-wordmap.json is written from the draft, and the 52 phrases go to the live cache run.
Why: Every bucket has 14 to 19 words and the phrases cover all nine regions. Scott accepted the somber phrases and the odd word placements flagged in review.
Spec reference: Section 4 J2, Gap G9, D-028, D-037.

### D-039: The J4 full run is deferred until the Piece screen copy settles
Date: 2026-10-12
Decided by: Scott
Question: The J4 full run (576 works, about $6.20 to $7 measured on the third pilot) is the last M3 job. Run it now, or wait while M4 may still change the line style or prompt?
Decision: Defer it. M3 finishes everything else and closes with "copy.json is complete" as the one open exit item. M4 may start with J4 lines for only the 24 pilot works. The full run happens once the Piece screen copy is settled, and before the video is recorded at the latest. scripts/validate-data.ts requires copy.json only from then.
Why: Lines are keyed by a hash of the prompt and the work's J1 fields, so any prompt change after a full run would re-run and re-bill the affected works. Running once after iteration costs the least.
Spec reference: docs/milestones.md M3 exit, Section 4 J4, D-035.

### D-040: Session state lives in memory only
Date: 2026-10-14
Decided by: Scott
Question: Where does the visitor's session state live as they move between screens?
Decision: Mood point, re-hang count, timers, Closer and Drift demotions, and bag lines live in a client-side store that persists across screens through client-side navigation. Nothing is written to localStorage, sessionStorage, cookies or the server. A full page reload resets the session to the center mood (0, 0) with an empty bag.
Why: Spec Section 3.5 says session state is never stored, and Gap G32 already set the no-storage precedent.
Spec reference: Section 3.5, Res #36, Gap G32.
Note: the M4 prompt drafted this as D-007, which was already used for route paths. Scott chose D-040 on 2026-10-14.

### D-041: One re-hang per completed gesture
Date: 2026-10-14
Decided by: Scott
Question: Gap G13 defines what causes a re-hang but not how a continuous drag counts.
Decision: A retune counts as one re-hang when the gesture ends (pointer up, touch end, or each arrow-key step), not on every frame of a drag. Each describe submission, Closer and Drift counts as one re-hang. The Room may re-order live during a drag, but the counter moves only at gesture end.
Why: Counting frames would make the Close metric meaningless.
Spec reference: Gap G13, Res #11.
Note: the M4 prompt drafted this as D-008, which was already used for catalog field formats. Scott chose D-041 on 2026-10-14.

### D-042: copy.json starts with the 24 J4 pilot works
Date: 2026-10-14
Decided by: Scott
Question: copy.json does not exist yet (D-039), but the Piece screen needs "why this found you" lines. Which works get lines during M4?
Decision: copy.json is written now from the 24 pilot works in data/raw/j4.json. The J4 full run happens later in M4, once Scott approves the Piece screen copy, at about $6 to $7.
Why: Lets the Piece screen be built on real lines without spending on a full run that a copy change could invalidate.
Spec reference: Section 3.3, Section 4 J4, D-039.

### D-043: Smoke check skips source credits when searching for em dashes
Date: 2026-10-14
Decided by: Scott
Question: Q-008. Credits may contain source em dashes (D-022), but m1.copy-discipline fails on any em dash in a rendered page.
Decision: The check strips the credits block before it searches. The M6 string search likewise excludes data files.
Why: Credits must match the source record; every word the project writes still never uses an em dash.
Spec reference: D-022, Gap G33, quality bar 7 and 8.

### D-044: The mood field is a feeling wheel that names the feeling
Date: 2026-10-14
Decided by: Scott
Question: Round 0 showed two wordless, abstract mood fields. Scott rejected both: the field should be about how the visitor feels, and feelings should lead to descriptions.
Decision: The mood field stays a color field the visitor drags across, with no words printed on it, but its color comes from the 12 emotion words, and the feeling under the point is named in words as it moves. The 12 words are the fixed J1 vocabulary [Gap G1]. Each word's starting position is the average valence and arousal of the catalog works that carry it as their strongest tag; wistful, which leads no work, uses the average of every work that carries it at all. The visitor's mood is still a point on the same field, so J3, J7 and the buckets are unchanged.
Why: Scott's Round 0 feedback on 2026-10-14.
Spec reference: amends RB17 (wordless entry) and narrows Res #21 (color and motion still carry the field; no words sit on it, but the current feeling is named beside it). Whether the Gap G12 prompt changes is open (Q-009).

### D-045: The Room leads with the feeling, then a sentence
Date: 2026-10-14
Decided by: Scott
Question: How do feelings lead to descriptions in the Room?
Decision: The Room's heading is the feeling the visitor is on, followed by one short sentence describing the room it opens into, one sentence per emotion word. Claude drafts the 12 sentences; Scott approves them.
Why: Scott's Round 0 feedback on 2026-10-14.
Spec reference: adds to Section 5.2. Whether the bucket room name stays on the Room is open (Q-010), since RB54 and Res #9 require it.

### D-046: The Threshold prompt stays under the feeling wheel
Date: 2026-10-14
Decided by: Scott
Question: Q-009. With the feeling wheel (D-044), does the Gap G12 prompt "Move the light until it feels right." stay?
Decision: Keep it as written.
Why: Scott's answer on 2026-10-14.
Spec reference: Gap G12, D-044.

### D-047: The bucket room name stays on the Room, above the feeling
Date: 2026-10-14
Decided by: Scott
Question: Q-010. With the feeling and sentence leading the Room (D-045), does the bucket room name stay?
Decision: Keep it as a small label above the feeling heading. Bag and Signals keep using room names as the spec says.
Why: Scott's answer on 2026-10-14. It keeps RB54 and Res #9 intact.
Spec reference: RB54, Res #9, D-045.

### D-048: The framed per-inch charge uses the perimeter of the frame
Date: 2026-10-14
Decided by: Scott
Question: Q-005. Does the framed price "$1.50 per inch of width" use the listed width or the hung width?
Decision: Neither. The per-inch charge is on the total linear measurement of all four sides of the frame, measured on the outside of the frame: the print plus the 2-inch mat and the 1.25-inch frame on each side. The framed price is base plus $60 plus $1.50 per inch of that perimeter, so orientation no longer matters. Worked out: 12x16 is 18.5 x 22.5 outside, 82 inches, $123, framed total $222; 18x24 is 110 inches, $165, total $294; 24x36 is 146 inches, $219, total $398; 30x40 is 166 inches, $249, total $488.
Why: Scott's answers on 2026-10-14 ("total linear measurement of all sides", then "perimeter of the frame").
Spec reference: amends Gap G5 and Gap G28 (which priced on print width). The config field framedPerWidthInch and its comment change when pricing is built in Part B.
Update 2026-10-15: Scott confirmed the $1.50 per inch rate on the outer frame perimeter, with the framed totals above.

### D-049: The wheel places feelings evenly; the matcher uses catalog positions
Date: 2026-10-15
Decided by: Scott
Question: Under D-044 the feelings sat at their catalog positions on the wheel. How should the wheel place them?
Decision: The 12 feelings sit on the wheel at the same radius, 30 degrees apart, in the angle order of their D-044 catalog positions (counterclockwise from valence +1: nostalgic, joyful, playful, awe, energized, defiant, tense, melancholy, contemplative, wistful, serene, tender). The radius is 0.75 of the wheel's radius (feelingWheelRadius in src/config/feel.ts), so the whole disc is usable. The named feeling comes from the visitor's point on the wheel. The mood J3 uses is the D-044 catalog position of that feeling, blended linearly with the second feeling when the point sits between two, by angle. Distance from center scales how far the J3 mood moves from (0, 0) toward that position, so the center stays the neutral start.
Why: The D-044 positions all sit inside the middle 40% of the field, nine on the positive side. The center landed on nostalgic (9 works), small drags flickered the label between awe, nostalgic, defiant and playful, and melancholy (2 works) owned half the wheel, so its Room showed contemplative work under a melancholy heading.
Spec reference: amends D-044. J3, J7 and the buckets are unchanged.

### D-050: Each feeling's Room is tested against J3 in Part B
Date: 2026-10-15
Decided by: Scott
Question: Scott asked for a test that every feeling, at full radius, gives a Room whose top 12 works include at least 6 tagged with that feeling. J3 is Part B work, which waits until the design is settled. Test now against the review stand-in, in Part B against J3, or build J3 early?
Decision: Write the test in Part B against the real J3. A work counts when the feeling is any of its tags, not only its lead tag. Failures are reported to Scott, not tuned around.
Why: The stand-in ordering is deleted when the design settles, and building J3 early would break the M4 order.
Spec reference: D-049, Section 4 J3, docs/testing.md.
Note: an early read-only check on the review stand-in (nearest 6 works per lane at each feeling's catalog position) on 2026-10-15 found four feelings under 6 of 12: nostalgic 4, awe 4, defiant 5 and wistful 2. The other eight had 6 to 12.

### D-051: The 12 feeling sentences are approved
Date: 2026-10-15
Decided by: Scott
Question: D-045 has Claude draft one Room sentence per feeling for Scott's approval. Approve the 12 drafts?
Decision: Approved as drafted. joyful: "A room of bright color and easy laughter." playful: "A room of bold shapes and a little mischief." energized: "A room that moves, with strong color and somewhere to go." awe: "A room of big skies and things larger than you." serene: "A room of soft light and slow mornings." tender: "A room of warm light and quiet care." contemplative: "A room for slow looking and long thoughts." nostalgic: "A room of old places and the people we were there." wistful: "A room of faded afternoons and things just out of reach." melancholy: "A room of low light that lets a sad day be a sad day." tense: "A room of held breath, sharp edges and weather coming in." defiant: "A room that stands its ground, loud and unafraid."
Why: Scott's answer on 2026-10-15.
Spec reference: D-045, Section 5.2.

### D-052: How the word map turns typed words into one mood point
Date: 2026-10-15
Decided by: Scott
Question: The M4 prompt asks how matched words combine into one point and what happens when no word matches.
Decision: Typed text is normalized as the M3 cache keys are (normalizePhrase) and split into words as the J2 "heard" check splits them. Each word is matched exactly against data/j2-wordmap.json, with no stemming. The mood is the unweighted mean of the distinct matched mood words. Negation is ignored. Room-type and size words are matched from the same file, and the result has the J2 output shape (valence, arousal, roomType, size, heard) so the M5 route can use it as its fallback unchanged. The wheel point moves to the point whose mood lies nearest the result (wheelPointFor), as Closer and Drift do. When no mood word matches, the mood stays where it is, the Room does not re-order, the describe submission does not count as a re-hang, and a quiet line under the box suggests a feeling word.
Why: On the 52 cached J2 phrases, exact matching finds a word in 35, the plain mean lands 0.33 from J2 on average, and plural stripping, rescaling or first-word-only did no better. A no-match changes nothing on screen, so it is not a re-hang (Gap G13 defines a re-hang as a re-order); this narrows D-041's "each describe submission".
Spec reference: Gap G7, Gap G9, Gap G13, D-028, D-041.

### D-053: Smaller Piece, Bag and Close presentation choices
Date: 2026-10-15
Decided by: Scott
Question: Four presentation points the spec leaves open.
Decision: (1) The Piece fingerprint shows the work and the visitor as two points on a small feeling wheel, each placed with wheelPointFor. (2) Prices always show dollars and cents ($39.00). (3) Time to first piece shows "not measured" when the clock never started (for example, a visitor who opens a Piece from a direct link without interacting). (4) Until the J4 full run, a work with no copy.json line shows no "why this found you" line, and the data check allows a partial copy.json (D-042).
Why: Scott's answers on 2026-10-15.
Spec reference: Section 5.3, Section 5.5, Gap G23, D-042.

### D-054: What the Piece screen selects before the visitor chooses
Date: 2026-10-15
Decided by: Scott
Question: Q-011. Spec Section 5.3 preselects the size only when J2 returned one. Which size, material and frame are selected when a Piece opens otherwise?
Decision: 18x24, framed print, black frame (config pieceDefaults), so the live framed preview shows at once. A described size word still sets the size [Res #6].
Why: Scott's answer on 2026-10-15.
Spec reference: Section 5.3, Res #6, Res #42.


---

## Open questions

Add new questions here as they come up, in the same format as the decisions above.

### Q-006: Room type to wall scene mapping (Milestone 5)
Raised: 2026-10-09
Question: Gap G7 says room types without a scene use the sofa, but does not state which room types map to the bed and desk scenes.
Options: (a) bedroom uses bed, office uses desk, all others use sofa; (b) Scott specifies.

### Q-007: Cost line dollar format (Milestone 7)
Raised: 2026-10-09
Question: The cost line reads "Built in N days for $X in AI and hosting." If X has cents, how is it written? Today costLineText prints the number as given, so 340.5 becomes "$340.5". A test pins this until it is decided.
Options: (a) round to whole dollars; (b) always two decimals; (c) Scott enters X already formatted.
