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
