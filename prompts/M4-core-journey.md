# Milestone 4 prompt: Core journey

## Before you paste this (Scott, about 5 minutes)

1. Save this file into the repo as `prompts/M4-core-journey.md` and commit it.
2. Have your phone handy. Design rounds are judged on a laptop and a phone, and the phone view matters as much as the desktop one.
3. Block real time for the design rounds. This milestone has no fixed number of rounds. It moves at the speed of your feedback.
4. Run `claude` in the repo and paste everything below the line.

---

You are starting Milestone 4 of Feel First: the core journey. It has two parts. **Part A** settles the visual design by iteration (D-004). **Part B** builds Threshold, Room, Piece, Bag and Close on real data. Do not start Part B until I declare the design settled.

Before writing any code, read `CLAUDE.md` and every file it lists, including `docs/spec.md` Section 5, `docs/quality-bar.md`, `docs/testing.md`, `docs/test-tiers.md`, and every decision added to `docs/decisions.md` during Milestones 2 and 3. Summarize back to me in five lines or fewer what M4 covers, what stays out of it, and where you will stop for my input. Then wait for me to confirm.

## Ground rules for this milestone

- **Out of scope here:** the live J2 call and its cache lookup (M5), the Wall screen (M5), Signals content (M5), Builder Notes and the toggle (M6), the cost line (M7). Wall and Signals stay as the M1 stubs. Links to them stay in place so free navigation works.
- **Real data only.** Every screen reads `data/catalog.json`, `data/copy.json` and config through `src/lib/catalog.ts` and `src/config/feel.ts`. Remove any remaining fixture reads from the app path.
- **Nothing leaves the browser.** No analytics, no third-party scripts, no runtime requests to any outside host. Fonts are self-hosted (for example through `next/font`, which serves them from the app). No server call is added in this milestone.
- **No keyword search, filters or category menus** on any screen (spec Section 5).
- **Message discipline** (spec Section 1.6) applies to every string, alt text included. No art.com, Trends or AllPosters logos or brand styling.

## Two decisions to log first

Add these to `docs/decisions.md` as decided by Scott, dated today, then commit:

- **D-007: Session state lives in memory only.** Mood point, re-hang count, timers, Closer and Drift demotions, and bag lines live in a client-side store that persists across screens through client-side navigation. Nothing is written to localStorage, sessionStorage, cookies or the server. A full page reload resets the session to the center mood (0, 0) with an empty bag. Why: spec Section 3.5 says session state is never stored, and Gap G32 already set the no-storage precedent. Spec reference: Section 3.5, Res #36, Gap G32.
- **D-008: One re-hang per completed gesture.** A retune counts as one re-hang when the gesture ends (pointer up, touch end, or each arrow-key step), not on every frame of a drag. Each describe submission, Closer and Drift counts as one re-hang. The Room may re-order live during a drag, but the counter moves only at gesture end. Why: Gap G13 defines what causes a re-hang but not how a continuous drag counts, and counting frames would make the Close metric meaningless. Spec reference: Gap G13, Res #11.

## Part A: design by iteration (D-004)

### Round 0: two directions

1. Build two contrasting static directions, A and B, for the **Threshold** and the **Room** only.
   - Use real catalog thumbnails and real room names, so I judge the design on the actual art.
   - "Static" means layout, type, color, spacing and the look of the mood field and the gallery. Light interaction is fine where it shows the feel (dragging the mood point). No ranking logic is needed yet.
   - Make the two directions genuinely different in type, color, density and how the mood field looks, not two shades of one idea. Each must respect the spec: no axis labels on the mood field (color and motion carry the meaning), the one-line prompt "Move the light until it feels right.", the concept bar, art as the visual priority, posters given equal presentation.
   - Each direction must work at 390px and 1440px.
2. Serve them at local-only review routes, for example `/design-review/a` and `/design-review/b`, that return a 404 in production builds. Do not deploy them.
3. Write one short paragraph per direction in `docs/design-log.md` under Round 0, describing its idea. If `docs/design-log.md` does not exist, create it with a heading per round recording: date, what Scott saw, what he asked to change, what changed.
4. Tell me how to view both on my laptop and on my phone over the local network. **Stop for my pick.**

### Rounds 1 to n: iterate

- Apply my feedback to the chosen direction, one round at a time.
- After each round, record it in `docs/design-log.md` and **stop for my feedback.**
- Do not style any other screen during these rounds.
- The design is settled only when I say so in plain words. Do not propose that it is settled.

### When I declare it settled

1. Write `docs/design-system.md`: the type scale, color tokens, spacing scale, focus style, button and control styles, image treatment, and motion rules (including the `prefers-reduced-motion` behavior). This file is what keeps M5 and M6 consistent, so add it to the list in `CLAUDE.md`.
2. Put the tokens in one place in code. Every screen uses them. No default framework styling anywhere.
3. Delete the review routes and the unchosen direction.
4. Commit: `M4: design settled`.

## Part B: build the journey on real data

### Shared logic first, in `src/lib/`

Pure functions, no UI, each driven by config values (spec Section 7):

- **Mood buckets:** point to bucket, cut points at -1/3 and +1/3, and bucket to room name.
- **J3 matcher:** per-lane Euclidean ranking, ties by ascending catalog ID; the interleave with a poster at position 1 (Gap G22); "Show more" adds the next 6 per lane; Drift sends a work to the end of its own lane's list for the session.
- **J7 learner:** Closer moves 30% toward the work, Drift moves 30% away, then clamp inside the unit circle (Gap G11).
- **Pricing:** sizes, materials, frames and shipping from spec Section 3.6. Frame choice applies to framed prints only, and the framed price uses print width (Gap G28).
- **Bag:** each distinct size, material and frame combination is its own line, quantity fixed at 1, removable lines, subtotal plus $9.95 flat shipping, no tax (Gap G20).
- **J6 balancer:** the unweighted mood center of the bag lines, and the nearest catalog work not already in the bag. Empty bag returns no suggestion.
- **Word-map interpreter:** turns typed text into a mood point using `data/j2-wordmap.json` only, normalizing input the same way the cache keys are normalized in M3. This is the function M5 will reuse as the J2 fallback, so put it where the M5 route can import it. Before building it, propose to me how matched words combine into one point and what happens when no word matches. **Stop for my answer.**
- **Session metrics:** the clock starts at the first interaction on any screen (Gap G23) and stops when the first Piece screen opens; the re-hang count per D-008; pieces chosen equals bag lines; "No search typed" is always shown.

### Screens

Build each to spec Section 5 and the settled design system.

- **Threshold (5.1):** the mood field with pointer, touch and keyboard control. Arrow keys move the point. Dragging on a phone never scrolls the page. Entry into the Room is part of the settled design.
- **Room (5.2):**
  - the J3 interleave, poster first
  - "Show more"
  - the compact mood field for retuning
  - Closer and Drift on each work, with the mood point moving visibly
  - the room name for the current bucket
  - the describe box, answering from the word map only until M5. A submission moves the mood point and re-hangs the Room. Do not call any server route.
  - Image space is reserved so nothing jumps as thumbnails load.
- **Piece (5.3):**
  - the full-size image from the source institution (D-001), with a live framed preview drawn in code (Gap G29)
  - the "why this found you" line from `copy.json` for this work and the visitor's current bucket
  - the emotional fingerprint: the field showing the work and the visitor, plus the top 3 tags. If the J1 prompt asked for tags in order of strength, take the first three. If it did not, stop and ask me.
  - size, material and frame choices with prices, each frame option with a large corner close-up drawn in code
  - the credits line: title, artist, date, source institution and license (Gap G33)
  - Add to bag, and a link to the Wall stub
- **Bag (5.5):** lines with remove, totals, the "feel together" summary (the bag's mood center mapped to its room name), and the J6 suggestion. An empty bag shows a link back to the Room and no suggestion.
- **Close (5.6):** the four computed metrics, the contact block (scott@reasinger.net and the LinkedIn URL from config), and the Signals link, always visible.

Posters get the same framing, preview and presentation as fine art on every screen.

## Testing loop (`docs/testing.md`)

- Run the `test-evaluator` on all new and changed units, save the table to `docs/test-tiers.md`, and **stop to show me the table.**
- Write tests to the tiers. Functional gates required this milestone:
  - J3 ranking and interleave: poster at position 1 at every bucket center and at the four corners of the field, tie-breaking, "Show more", and Drift demotion within the lane
  - J7 nudge and clamp, including a point that would leave the unit circle
  - pricing for every size, material and frame combination, against the Section 3.6 table
  - bag line identity, removal, totals, and the J6 suggestion, including the empty bag
  - the word-map interpreter, including the no-match case we agree on
  - session metrics, including a visitor who never touched the Threshold
- **Playwright demo-path test:** Threshold, Room (a poster visible in position 1), describe a moment, Closer on a work, open a Piece and choose a frame, Add to bag, Bag, Close (all four metrics present and the Signals link present). Run it at 390px and 1440px. Fail on any uncaught console error. Wire `npm run test:prod` to run the same test against art.reasinger.net. The Wall step is added in M5.
- Run Stryker on High-tier files and reach 80%.
- Run the `test-sweeper` and resolve its flags.

## Deploy and wrap-up

1. Propose the smoke checks this milestone adds (named `m4.*`) for anything new that faces the live world, then implement and activate them in `scripts/smoke/live-smoke.mjs`.
2. Deploy. Tell me to run `npm run smoke:live` and `npm run test:prod`.
3. **Build log:** add today's row. If any API spend happened this milestone, take it from the Anthropic console and ask me for the figure. Otherwise record $0 API spend.

## Rules for this session

- If anything is unclear or conflicts with the spec or the decisions log, stop and ask me. Do not choose for me.
- Commit in small steps with messages prefixed `M4:`.
- Never use the em dash character in any file, comment, prompt or output.

## When you think M4 is done

Check every exit criterion for M4 in `docs/milestones.md`, including the standing testing criteria at the top of that file. For quality-bar sections 3, 5, 6 and 10, show me the evidence for each pass item, not a summary. Then stop. Do not start Milestone 5.
