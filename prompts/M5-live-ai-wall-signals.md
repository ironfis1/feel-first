# Milestone 5 prompt: Live AI, Wall and Signals

## Before you paste this (Scott, about 10 minutes)

1. Save this file into the repo as `prompts/M5-live-ai-wall-signals.md` and commit it.
2. Confirm `ANTHROPIC_API_KEY` is set on the Upsun production environment as a runtime variable, not a build variable, and that it is not exposed to the client (no `NEXT_PUBLIC_` prefix).
3. In the Anthropic console, set a monthly spend limit on the workspace that owns this key. This limit is the J2 cost cap: when it is reached, the API errors and the word map answers.
4. Have your phone handy, plus a photo of one of your own walls with an object in it whose width you know (a doorway, a sofa, a framed print). Photo mode is judged on the phone.
5. Run `claude` in the repo and paste everything below the line.

---

You are starting Milestone 5 of Feel First: live AI, the Wall and Signals. It has three parts. **Part A** puts the live J2 route behind the describe box. **Part B** builds the Wall. **Part C** builds Signals. Do them in that order and stop where this prompt says to stop.

Before writing any code, read `CLAUDE.md` and every file it lists, including `docs/spec.md` Sections 3.9 to 3.11, J2, J5 and J8 in Section 4, and 5.4 and 5.7 in Section 5; `docs/ai-jobs.md` J2, J5 and J8; `docs/design-system.md`; `docs/quality-bar.md`; `docs/testing.md`; `docs/test-tiers.md`; and every decision added to `docs/decisions.md` during Milestone 4 (D-040 to D-060). Summarize back to me in five lines or fewer what M5 covers, what stays out of it, and where you will stop for my input. Then wait for me to confirm.

## Ground rules for this milestone

- **Out of scope here:** Builder Notes and the toggle (M6), the cost line (M7), the four D-057 feelings below the D-050 bar (left as known gaps), and any change to the Threshold, Room, Piece, Bag or Close beyond what the J2 route and the Wall link need.
- **Real data only.** The Wall reads the catalog and the current selection through `src/lib/catalog.ts`, `src/config/feel.ts` and the in-memory session store (D-007). Signals reads `data/signals.json` and the session store only.
- **Nothing leaves the browser** except one thing: the describe box sends the typed sentence to the J2 route. No other server call is added. No analytics, no third-party scripts, no runtime requests to any outside host from the client.
- **No J8 code runs at request time** (spec Section 4 J8, Res #55). Signals renders precomputed output.
- **The design is settled** (`docs/design-system.md`). Wall and Signals are built from its tokens. Nothing uses framework default styling.
- **Message discipline** (spec Section 1.6) applies to every string, alt text included. On Signals in particular: no person's name, no "60-slot rack" text, no licensing-contract or retailer data-rights content, and merchandising and licensing are named only as business functions.

## Decisions to log first

Add these to `docs/decisions.md` as decided by Scott, dated today. Move Q-006 and Q-012 out of Open questions as they close. Then commit.

- **D-061: Room type to wall scene (closes Q-006).** Bedroom uses the bed scene, office uses the desk scene, and every other room type uses the sofa. Why: Gap G7 names the three scenes and says types without a scene use the sofa; a queen bed or a desk is not a true-scale reference for a nursery, kitchen or entry. Spec reference: Section 3.9, Gap G7.
- **D-062: The slow first byte is examined in M5 (closes Q-012).** Measure the first byte of the Wall, Bag, Close and Signals before and after this milestone's changes and find the cause. If the cause is a rendering mode the four routes share (for example dynamic rendering where static would do), fix it for all four in M5. If the fix is anything larger, report it to me and it moves to M6. Why: the Wall and Signals are rebuilt in this milestone, so checking now avoids building twice. Spec reference: quality-bar section 4.
- **D-063: The J2 rate limit counts live calls only.** Cache answers and word-map answers do not count toward 20 per IP per hour. A visitor over the limit gets the word map. Why: the limit exists to protect spend, and cache and word-map answers cost nothing. Spec reference: Gap G18.
- **D-064: The browser keeps its own fallback.** The describe box posts `{ "text": "..." }` and nothing else to the J2 route. The box caps input at 200 characters, and the route rejects a longer or malformed body. If the route returns anything but a valid J2 output, or has not answered within 5 seconds (the 4-second server timeout plus 1 second of network), the client answers with the D-052 word-map interpreter it already has. The visitor never sees an error. Why: quality-bar section 2 says the visitor never sees an error, and a failed network request would otherwise surface one. Spec reference: Section 4 J2, Res #7, D-052.
- **D-065: The route reports its answer path in a header.** The J2 route sets `x-j2-source: cache | live | fallback` on every response. The JSON body keeps the exact J2 output shape. Why: the smoke checks and the Playwright test need to see which path answered without changing the output contract. Spec reference: docs/ai-jobs.md J2 logging.
- **D-066: The wall photo never leaves the browser.** "Upload" means choosing a file in the browser. The image is shown from an object URL that is revoked when the visitor leaves the Wall, and it is never sent to the server or held in the session store. Why: spec Res #12 says file upload only, and quality-bar section 9 allows no request carrying anything but the typed sentence. Spec reference: Section 5.4, J5, Res #12.

## Part A: the live J2 route

- Build the route handler at `/api/j2` using the shared module `src/lib/j2.ts` (the same request and parser that `scripts/j2-cache.ts` used). The key comes from the environment and appears nowhere in client code or any response.
- Order of answers: normalized input checked against `data/j2-cache.json`; then the rate limit (D-063); then the live call under `j2TimeoutMs`; then the word map from `data/j2-wordmap.json` through the D-052 interpreter. API errors, a reached spend limit, a timeout, a parse failure and an over-limit visitor all land on the word map.
- Log only which path answered. Never log the visitor's text or IP.
- Wire the describe box to the route with the client fallback (D-064). The Room re-order, re-hang count, heard chips, room-name suffix and size preselection keep working exactly as they do with the word map today.
- Confirm the video phrase from D-037 answers from the cache with `x-j2-source: cache`, returns the bedroom room type, and preselects the large size.

## Part B: the Wall

Build spec Section 5.4 and docs/ai-jobs.md J5:

- The chosen piece at true scale for the selected print size. Framed prints add the 2-inch mat and 1.25-inch frame per side. Frames are drawn in code, not photographs.
- Three scenes with their reference widths from config (sofa 84 inches, queen bed 60, desk 60). The default scene follows D-061 when J2 returned a room type, and the sofa otherwise. The visitor can switch scenes.
- The five wall colors. Config holds names only (D-009); **propose values for all five in `src/styles/tokens.css` and stop for my approval on a phone and a laptop before you build the rest of the Wall.**
- The frame carries over from the Piece and can be changed here. Changing it updates the current selection. A bag line is created only by Add to bag (Gap G20).
- Photo mode: file upload only, no camera. The visitor drags a line across a known object and enters its length in inches, which sets pixels per inch. No wall detection, no segmentation. **Propose the accepted length range and what the visitor sees for an entry outside it, then wait for me.**
- Screen links as on every other screen.

**When the Wall is built, stop.** Tell me to check it on my phone with my own wall photo. Fix what I flag before Part C.

## Part C: Signals

Build spec Section 5.7 from `data/signals.json` and the session store:

- The four J8 findings, each naming its business action, every figure as it appears in `data/signals.json`.
- A visible label that the data is simulated.
- The "your session" panel showing this visitor's own session beside the simulated aggregates. It reads in-memory session state only and is never stored or sent.
- The Close contact block repeated (scott@reasinger.net and the LinkedIn URL from config).
- The concept bar, and the screen ends with the follow-up ask: run this pipeline (J1, J4 and J8) on a sample of Trends' licensed SKUs.
- Reachable from Close. The Builder Notes route to it comes in M6.

Draft the label, the panel headings and the ask line, then **stop and show me every new string on Signals for approval** before you finish the screen.

## Testing loop (`docs/testing.md`)

- Run the `test-evaluator` on all new and changed units, save the table to `docs/test-tiers.md`, and **stop to show me the table.**
- Write tests to the tiers. Functional gates required this milestone, none of which calls an outside party:
  - J2 route, all five paths with the SDK mocked: cache hit, live success, timeout, API error (including a spend-limit error and a malformed model response), and rate limited. Each asserts the body shape and the `x-j2-source` header. Add the oversized and malformed request cases.
  - The client fallback (D-064): route error, non-J2 body and a request past 5 seconds each answer from the word map with no visible error.
  - True-scale math: pixels per inch for each scene at each print size, framed and unframed, and photo-mode scale from a drawn line and an entered length, including the bounds we agree.
  - The D-061 scene mapping for every room type and for null.
  - Frame change on the Wall updates the selection and creates no bag line; Add to bag creates exactly one line with the current size, material and frame.
  - Signals honesty: a test recomputes every figure shown on Signals from `data/signals-seed.json` and fails on any mismatch, and asserts four findings, each with an action, and the simulated label.
- **Playwright demo path, extended:** Threshold, Room (a poster in position 1), type the D-037 video phrase (answered from the cache, bed scene and large size follow), Closer on a work, open a Piece and choose a frame, Wall (change the frame and the wall color), Add to bag, Bag, Close, Signals (four findings, the simulated label, the ask and the contact block). Run it at 390px and 1440px. Fail on any uncaught console error. Add these network assertions for quality-bar section 9: the only non-asset request the client makes is POST `/api/j2`, its body is exactly `{ "text": ... }`, and no request carries the mood history, bag or metrics. `npm run test:prod` runs the same test against art.reasinger.net.
- Check the built client bundle for the API key and its variable name, and fail the build check if either appears.
- Run Stryker on High-tier files and reach 80%.
- Run the `test-sweeper` and resolve its flags.

## Deploy and wrap-up

1. Activate `m5.j2-cache`, `m5.j2-live` and `m5.signals` in `scripts/smoke/live-smoke.mjs`. `m5.j2-live` stays marked costly and sends one novel phrase. Propose any further `m5.*` checks for anything new that faces the live world (at least the Wall route and the key not appearing in any served script), then implement and activate them.
2. Deploy. Tell me to run `npm run smoke:live` and `npm run test:prod`.
3. Report the D-062 first-byte measurements before and after, and what you changed or deferred.
4. **Build log:** add today's row. Live J2 calls and `m5.j2-live` cost money, so take the API figure from the Anthropic console by asking me for it. Never estimate it.

## Rules for this session

- If anything is unclear or conflicts with the spec or the decisions log, stop and ask me. Do not choose for me.
- Commit in small steps with messages prefixed `M5:`.
- Never use the em dash character in any file, comment, prompt or output.

## When you think M5 is done

Check every exit criterion for M5 in `docs/milestones.md`, including the standing testing criteria at the top of that file. For quality-bar sections 2, 8 and 9, show me the evidence for each pass item and each fail condition, not a summary. Then stop. Do not start Milestone 6.
