# Milestone 6 prompt: Builder Notes and polish

## Before you paste this (Scott, about 10 minutes)

1. This file is already in the repo at `prompts/M6-builder-notes-polish.md`. Commit it.
2. Have these ready, because the banned-term list needs them and they never go into this prompt or any committed file in plain text: the commerce platform vendor's name (and any product names), the competitor names you want blocked, the Trends founder's name, and any Trends staff names besides the CEO's.
3. Block real time for the copy review. Builder Notes are in your first-person voice and you approve every line. This milestone moves at the speed of that review.
4. Have your phone handy. The panel layout is judged on a phone and a laptop.
5. Run `claude` in the repo and paste everything below the line.

---

You are starting Milestone 6 of Feel First: Builder Notes and polish. It has four parts. **Part A** writes every Builder Notes string for my approval. **Part B** builds the Builder Notes layer on all seven screens. **Part C** builds the Message discipline sweep. **Part D** runs the full quality bar on production. Do them in that order and stop where this prompt says to stop.

Before writing any code, read `CLAUDE.md` and every file it lists, including `docs/spec.md` Sections 1.2, 1.5, 1.6, 5 (every screen's Builder Notes items), 6 and 8.1, and Gaps G21, G26, G32 and G33; `docs/design-system.md`; `docs/quality-bar.md` in full; `docs/testing.md`; `docs/test-tiers.md`; and every decision added to `docs/decisions.md` during Milestone 5 (D-061 to D-082). Summarize back to me in five lines or fewer what M6 covers, what stays out of it, and where you will stop for my input. Then wait for me to confirm.

## Ground rules for this milestone

- **Out of scope here:** the cost line's figures and its visibility (M7), the walkthrough video and the intro note (M7), any new screen, feature or AI job, and any change to journey behavior beyond what the Builder Notes layer, a quality-bar fix or a sweep fix needs. A quality-bar fix that changes journey behavior is proposed to me first.
- **Real data only.** Builder Notes copy lives in one data file read through one module. No string is hard-coded in a component.
- **Nothing leaves the browser.** The layer adds no server call, no storage and no outside request. The only non-asset request stays POST `/api/j2`.
- **The design is settled** (`docs/design-system.md`). The panel and toggle are built from its tokens. If the panel needs a token the system does not have, propose it to me and add it to `docs/design-system.md` once I approve.
- **Message discipline** (spec Section 1.6) applies to every Builder Notes string. These are the strings the CEO reads most closely.

## Decisions to log first

Add these to `docs/decisions.md` as decided by Scott, dated today. Then commit.

- **D-083: Milestone 5 is done.** Decision: Yes ("M5 is done"). Evidence: the 2026-10-19 build-log row (live J2 route with the browser fallback, the Wall at true scale with photo mode, Signals, 1,262 unit tests, Stryker 94.49% on M5 files, sweeper resolved, demo path through Signals with network assertions, build-time key check, smoke:live 21 pass, test:prod passes at both widths). Carried forward: D-057 (four feelings below the D-050 bar) and the D-062 first-byte finding, which Part D settles. Spec reference: docs/milestones.md M5.
- **D-084: Builder Notes copy lives in `data/builder-notes.json`.** One entry per screen, read through `src/lib/builderNotes.ts`. Each screen's entry holds its production notes, its data note (spec 6.4) and the required lines placed on it (spec 6.2). A schema check in the data check fails the build if a screen is missing, a required line is missing from its placement or appears anywhere else, or the platform line differs from spec 6.2 by one character. Why: one file is one place to review, sweep and later derive the technical brief from (Gap G16). Spec reference: Sections 6.2 to 6.4, Gap G16.
- **D-085: Panel order.** Production notes, then the data note, then the required lines for that screen, then the "See the signals" link at the foot (Gap G21). The Signals screen carries the three Gap G26 items (the retailer line, where the aggregate figures come from, how J8 runs at build time) and its link reads as the foot of the panel the same way, pointing to the top of Signals. Why: what gets built first, then what it learns, then the commitments. Spec reference: Gap G21, Gap G26.
- **D-086: The cost line is absent from the page until M7, not hidden by style.** The Close entry holds the cost line template. A config flag `costLineVisible` (false) decides whether it renders. While false, the string is not in the served HTML, the client bundle or the DOM. Why: a hidden string can still be found by view-source, a screen reader or the sweep; M7 flips the flag once N and X are real. Spec reference: Section 8.1, Res #40, Gap G31.
- **D-087: Toggle state lives in the session store.** Builder Notes on or off is held with the rest of the D-007 session state: it persists across client-side navigation and resets to off on a full reload. Nothing is stored. Why: a viewer who turns notes on should not have to turn them on again on every screen, and D-007 already forbids storage. Spec reference: Section 6.1, D-007, Gap G32.
- **D-088: The pulse respects reduced motion.** The toggle pulses once per page load (Gap G32). Under `prefers-reduced-motion: reduce` it does not move; it shows the same attention state as a static outline for the same duration. Why: the design system's motion rules already require a reduced-motion behavior for every animation. Spec reference: Gap G32, docs/design-system.md motion rules.
- **D-089: The banned-term list stays out of the repo in plain text.** The sweep reads vendor, competitor and personal names from `BANNED_TERMS` in `.env.local` (gitignored) and from an Upsun build variable for the production build. The committed script holds only the generic terms (em dash, en dash, "replatform", "60-slot rack", "MCP", exclamation points in copy, placeholder text). Why: a committed list of the names we must never show would itself put those names in the codebase the sweep is checking. Spec reference: Section 1.6, quality-bar section 7.

## Part A: write the copy

1. Draft `data/builder-notes.json` for all seven screens:
   - **Production notes:** two to four short lines per screen on how the production version of that screen would be built, in first person, in my direct voice (spec 6.2 rule). Plain and specific. No vendor, no "replatform", no critique of the current sites, no competitor, no person, no licensing-contract or retailer data-rights detail. "Art.com" only as plain text, and only where it earns its place.
   - **Data note:** one per screen, naming the first-party data that step captures and how it would join Trends' retail and print data (spec 6.4).
   - **Required lines** in their placements (spec 6.2): platform and SEO on the Threshold, licensed titles on the Room, cost on Close (template only, D-086), retailer on Signals. The platform line uses the exact spec text. The retailer line does not contain "MCP".
2. Run the sweep rules from Part C by hand over the draft and fix anything they catch before showing me.
3. **Stop and show me every string, grouped by screen, as plain text.** I approve, edit or reject each one. Do not wire anything until I say the copy is approved. Log the approval as a decision with the date.

## Part B: build the layer

1. Propose the toggle and panel layout on the Threshold and the Room, at 390px and 1440px: where the toggle sits relative to the concept bar and screen links, how the panel opens (it must not cover the mood field while the viewer is dragging on a phone), how it closes, and how it reads on the Wall and Signals, which are the busiest screens. **Stop for my approval on a phone and a laptop before building the other five screens.**
2. Build it on all seven screens to the approved layout:
   - The toggle is a real button with `aria-pressed` and a visible label, keyboard reachable, and a 44px tap height.
   - Opening the panel moves focus to it; Escape and the toggle close it and return focus to the toggle.
   - The panel never hides the concept bar, never shifts the page layout behind it, and never blocks the demo path when it is open.
   - "See the signals" works from every panel, including on the Signals screen itself (D-085).
   - The cost line does not render (D-086).
3. **When the layer is built, stop.** Tell me to check it on my phone, on every screen, with notes on and off. Fix what I flag before Part C.

## Part C: the Message discipline sweep

1. Write `scripts/check-strings.mjs` and wire it as `npm run check:strings`. It scans every file that can reach a visitor: `src/`, `data/` (excluding `data/raw/` and `data/runs/`, which are build inputs and model logs, never served), `public/`, and the built `.next` output after `npm run build`. It does not scan `docs/`, `prompts/`, `scripts/` or tests, which discuss the rules by name.
2. It fails on:
   - the em dash or en dash character
   - "replatform", "60-slot rack", and "MCP" in any visitor-facing string
   - every term in `BANNED_TERMS` (D-089), case-insensitive, whole word
   - an exclamation point in visitor-facing copy
   - placeholder text ("lorem", "TODO", "TBD", "placeholder", "xxx") in visitor-facing copy, alt text included
   - "Art.com", "AllPosters" or "Trends" anywhere except the concept bar, Builder Notes, the Signals copy that D-079 approved and the contact block
3. Report each hit with the file, line and rule. Before fixing anything, **stop and show me the full hit list.** Some hits may be allowed by the spec (image credits and the concept bar are exempt from the legal-detail rule, Res #53). I decide each one.
4. Fix the approved hits. Run it after every build, the same way the bundle key check runs.

## Part D: the full quality-bar pass

Run every section of `docs/quality-bar.md`, 1 to 12, against art.reasinger.net. For each pass item and each fail condition, show me the evidence: a measurement, a screenshot path, a test name, a command and its output. Not a summary.

Two items need attention before you start:

- **Section 4, speed.** D-062 asked for the first byte of the Wall, Bag, Close and Signals to be measured before and after M5 and the cause found. That finding is not in `docs/decisions.md`. Find what M5 recorded (git log, the M5 session commits, the smoke output) and tell me. Then measure all seven routes now. If the four screens still lag the Room and Piece, find the cause, propose the fix and **stop for my answer** before changing a rendering mode. Log the result as a decision either way.
- **Section 11 and D-057.** The four D-050 test failures for the feelings below the bar are expected failures today. Section 11 has to pass at the end of this milestone. Show me the four failures and propose how to settle them (for example a recorded accepted reason, or a J1 or wheel change). **Stop for my answer.** Do not change the catalog, the wheel or the tests to make them pass on your own.

Then:

1. Run the demo path ten times in a row on production, each in a fresh browser context, at both widths: `npm run test:prod` repeated ten times, or Playwright's repeat with a fresh context per run. Every run must pass with no console error and no wait over one second. Report all ten.
2. Extend the Playwright demo path: turn Builder Notes on at the Threshold, confirm they stay on through the Room and the Wall, follow "See the signals" from one panel, and confirm the cost line is absent from the DOM on Close.

## Testing loop (`docs/testing.md`)

- Run the `test-evaluator` on all new and changed units (`builderNotes.ts`, the toggle and panel, the sweep script, any quality-bar fixes), save the table to `docs/test-tiers.md`, and **stop to show me the table.**
- Then write the tests the table requires. At minimum:
  - The D-084 schema check: every screen present, each required line in its placement only, the platform line exact, no "MCP" in the retailer line.
  - D-086: with `costLineVisible` false, the cost text is in neither the rendered Close page nor the client bundle.
  - D-087: the toggle state survives client-side navigation and resets on reload.
  - D-088: the pulse runs once per page load, and not as motion under reduced motion.
  - The sweep: one fixture per rule that it must catch, and the exempt cases it must not.
- Run Stryker on High-tier files and reach 80%.
- Run the `test-sweeper` and resolve its flags.

## Deploy and wrap-up

1. Propose `m6.*` smoke checks for anything new that faces the live world, at least: the toggle is present and off in the served HTML of all seven routes; no served page or script contains the cost line text; and the sweep's generic rules pass on every served page. Implement and activate them in `scripts/smoke/live-smoke.mjs`.
2. Deploy. Tell me to run `npm run smoke:live` and `npm run test:prod`.
3. **Build log:** add today's row. If any API spend happened, ask me for the figure from the Anthropic console. Never estimate it.

## Rules for this session

- If anything is unclear or conflicts with the spec or the decisions log, stop and ask me. Do not choose for me.
- Never write a Builder Notes string I have not approved into the app.
- Commit in small steps with messages prefixed `M6:`.
- Never use the em dash character in any file, comment, prompt or output.

## When you think M6 is done

Check every exit criterion for M6 in `docs/milestones.md`, including the standing testing criteria at the top of that file: every quality-bar section passes including section 11, ten clean production runs, and `npm run check:strings` clean against the production build. Show me the evidence for each, not a summary. Then stop. Do not start Milestone 7.
