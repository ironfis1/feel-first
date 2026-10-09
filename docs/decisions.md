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

---

## Open questions

None at present. Add new questions here as they come up, in the same format as the decisions above.
