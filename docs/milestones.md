# Milestones

Seven milestones. Each has a scope, the open questions it depends on, and exit criteria. Work only inside the current milestone. Claude provides a prompt for each one in `prompts/` [Res #30]. Scott confirms a milestone is done before the next one starts.

The order puts the risky, slow work first: getting real images, then getting real AI output. Screens are built on top of real data, not fixtures that later get thrown away.

---

## M1 Foundation

**Scope**
- Next.js app (App Router, TypeScript) with lint and type checks.
- `src/config/feel.ts` holding every value in spec Section 7.
- `src/lib/catalog.ts` as the single data module, reading a small fixture file for now (`data/fixtures/catalog.fixture.json`, 12 works per lane, clearly marked as fixture).
- Routes for all seven screens as plain stubs, with the concept bar on every one.
- `build-log.md` started on the first commit.
- Deployed to Upsun and served at art.reasinger.net.

**Exit**
- art.reasinger.net loads.
- All seven routes resolve.
- The concept bar text is correct.
- No analytics or third-party scripts are present.
- `build-log.md` has its first row.

## M2 Assets

**Decided:** D-001 (hybrid image serving) and D-002 (curation rules).

**Scope**
- One ingest script per source.
- A merge step producing about 300 fine-art works and about 300 posters into `data/catalog.json`, with metadata and credits but no emotional fields yet.
- A skip log for Scott to review.

**Exit**
- About 600 works, split 50/50.
- Every record has credits and a license.
- Thumbnails load from the app and full-size images from the source institutions (D-001).
- Scott has reviewed the skip log and a contact sheet of a random 60 works.

## M3 Build-time AI

**Decided:** D-003. Scott's J1 placement review is a required step before the batch is accepted.

**Scope**
- J1 tagging batch.
- J4 lines and the 9 room names.
- J8 seeded dataset and four findings.
- J2 pre-warm cache and word map drafts.

**Exit**
- Every work has valid J1 fields.
- Scott has reviewed the J1 placement sample and the per-lane distribution.
- `copy.json` is complete.
- Room names are approved.
- `signals.json` exists and every figure reproduces from the seed.
- The J2 phrase list and word map are approved.
- API spend is logged in `build-log.md`.

## M4 Core journey

**Decided:** D-004. Design is settled by iteration before the screens are built.

**Scope**
- Two contrasting static design directions for Threshold and Room. Scott picks one.
- Iterate on the chosen direction with Scott, round by round, until he declares it settled. Record each round in `docs/design-log.md`. No other screen is styled before then.
- Then build, on real data:
  - Threshold with the mood field and keyboard control.
  - Room with the J3 lane interleave, retune, Closer and Drift (J7), and the room name.
  - Piece with the line, fingerprint, credits, options, prices, frame close-ups and framed preview.
  - Bag with lines, totals, summary and J6.
  - Close with live metrics and the Signals link.
- The describe box is present but answers from the word map only until M5.

**Exit**
- Scott has declared the design settled (D-004).
- The demo path from Threshold to Close works on desktop and phone.
- Posters lead every Room view.
- Quality-bar sections 3, 5, 6 and 10 pass.

## M5 Live AI, Wall and Signals

**Scope**
- J2 route with cache, 4-second timeout, word-map fallback and per-IP rate limit.
- Wall screen: true scale, three scenes, wall colors, framed rendering, frame change, photo mode with manual scale.
- Signals screen: findings, simulated label, "your session" panel, ask, contact block.

**Exit**
- Quality-bar sections 2, 8 and 9 pass.
- The demo path runs from Threshold through Signals.

## M6 Builder Notes and polish

**Scope**
- Builder Notes on all seven screens: toggle (off by default, pulses once per page load), per-screen data notes, production notes, the five required lines in their placements, and a "See the signals" link at the foot of every panel.
- The cost line stays hidden.
- Full quality-bar pass.
- A Message discipline sweep of every string in the codebase.

**Exit**
- Every quality-bar section passes.
- The demo path runs ten times clean on production.
- A string search finds:
  - no em dashes,
  - no vendor name and no "replatform",
  - no personal names and no "60-slot rack".

## M7 Freeze and record

**Scope**
1. **Flag to Scott before anything else:** the video is about to be recorded, so N and X must be filled now [Gap G31].
2. Compute N (calendar days with a commit, from the first commit through today) and X (API, plus hosting, plus prorated subscription) from `build-log.md`.
3. Scott confirms the figures.
4. Write them to config and unhide the cost line.
5. Freeze the deploy.
6. Scott records the video.
7. The intro note is drafted through the get-in-the-room workflow and passes the gatekeeper panel.

**Exit**
- The cost line shows actual figures.
- The production deploy is tagged.
- The video is recorded (75 to 105 seconds, mandate first, a poster by 20 seconds, ending on Signals).
- The note is approved.
