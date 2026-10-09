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

---

## Open questions

Add new questions here as they come up, in the same format as the decisions above.

### Q-005: Framed price width on landscape pieces (Milestone 4)
Raised: 2026-10-09
Question: Print sizes are listed width x height (12x16), but a landscape piece hangs 16 inches wide. Does the framed price "$1.50 per inch of width" [Gap G5, Gap G28] use the listed width or the hung width?
Options: (a) the listed width, so the price is the same for both orientations; (b) the hung width, so landscape framing costs more.

### Q-006: Room type to wall scene mapping (Milestone 5)
Raised: 2026-10-09
Question: Gap G7 says room types without a scene use the sofa, but does not state which room types map to the bed and desk scenes.
Options: (a) bedroom uses bed, office uses desk, all others use sofa; (b) Scott specifies.

### Q-007: Cost line dollar format (Milestone 7)
Raised: 2026-10-09
Question: The cost line reads "Built in N days for $X in AI and hosting." If X has cents, how is it written? Today costLineText prints the number as given, so 340.5 becomes "$340.5". A test pins this until it is decided.
Options: (a) round to whole dollars; (b) always two decimals; (c) Scott enters X already formatted.

### Q-008: Em-dash checks versus source credits (Milestones 4 and 6)
Raised: 2026-10-09
Question: Under D-022, credits in data/catalog.json and data/raw may contain em dashes, and the Piece screen shows credits. The live smoke check m1.copy-discipline fails on any em dash in rendered pages, and the M6 exit string search expects none. How should those checks treat source credits?
Options: (a) the checks skip credit text (for example, the smoke check strips the credits block before searching, and the M6 search excludes data files); (b) Scott specifies.
