# Quality bar: what "good enough" means

This prototype has one viewer who matters, and he will spend a few minutes with it. "Good enough" does not mean feature-complete or production-hardened. It means nothing the CEO sees, touches or hears breaks the feeling that this is a real product built by someone who knows what he is doing.

**Status:** Message discipline, equal billing, honest data, nothing-leaves-the-browser and real-AI checks restate the spec. The numeric thresholds and other standards were proposed by Claude and adopted by Scott (D-003). All checks are binding.

Each section gives the standard, the reasoning, and concrete pass and fail examples. A milestone is done only when the checks relevant to it pass. Milestone 6 runs the whole list.

## 1. The demo path never breaks

The demo path is the route in the walkthrough video:

1. Threshold
2. Room (a poster visible)
3. Describe a moment
4. Closer on a piece
5. Open a piece and choose a frame
6. Wall
7. Add to bag
8. Bag
9. Close
10. Signals

It must work every time, on the first try, with no console errors.

- Pass: ten runs in a row in a fresh browser on art.reasinger.net with no errors, no layout jumps, and no wait longer than one second.
- Fail:
  - the describe box returns nothing
  - an image is missing
  - the bag count is wrong after a removal
  - the Signals link is missing on Close
  - any uncaught console error

## 2. AI that must be real is real

J1 and J2 must be real AI in the demo (spec Section 4).

- Pass:
  - Every phrase on the pre-warm list returns real Claude output from the cache instantly.
  - A novel phrase returns a live result within 4 seconds.
  - If the live call fails, the word map answers with a sensible result, and the visitor never sees an error.
- Fail:
  - The phrase used in the video is answered by the word map.
  - An error message or empty state appears.
  - The API key is visible in any client bundle or network response.

## 3. Posters get equal billing

Posters are half the story.

- Pass: every Room view, at any mood, opens with a poster and alternates poster and fine art. Poster Piece views get the same framing treatment as fine art.
- Fail: a Room view with no posters in the first row; a poster with a missing image or a weaker presentation than fine art.

## 4. It feels fast

Speed is part of the feeling. Slow reads as unfinished.

- Pass:
  - On a normal home connection, the Threshold is interactive in under 2 seconds.
  - The Room's first 12 images appear within 1.5 seconds of entering.
  - Moving the mood point updates the screen smoothly, with no stutter, on a recent laptop or phone.
- Fail:
  - Images pop in one at a time over several seconds.
  - The mood field lags behind the finger.
  - The page jumps because image space was not reserved.

## 5. It looks deliberate

The visual direction is chosen by Scott at the start of Milestone 4. After that, consistency beats flourish.

- Pass:
  - Type, spacing and color follow one system across all seven screens.
  - Art is always the visual priority.
  - Every interactive element looks interactive and has a visible focus state.
  - Frames look like real frames at true scale.
- Fail:
  - Default framework styling anywhere.
  - Two button styles for the same action.
  - Text over art with poor contrast.
  - Generic store UI that could belong to anyone.

## 6. It works on a phone

The CEO may open the link on his phone first.

- Pass: every screen works at 390px wide with touch. The mood field drags without scrolling the page. Nothing scrolls sideways.
- Fail: the mood field does not drag on iOS Safari; tap targets are too small; the Wall scene overflows.

## 7. The words are right, and on message

Copy is part of the product, and Message discipline (spec Section 1.6) is a hard gate.

- Pass:
  - Language is plain and specific.
  - No em dashes, no exclamation points, and no placeholder text, including in alt text.
  - "Why this found you" lines read as if a thoughtful curator wrote them.
  - The platform and cost lines match spec Section 6.2 exactly.
- Fail:
  - Any critique of the current sites.
  - The platform vendor's name, or the word "replatform".
  - A competitor's name, a person's name, or "60-slot rack".
  - Any art.com, Trends or AllPosters logo or brand styling.
  - Generic AI phrasing such as "a captivating piece that evokes emotion".

## 8. The data is honest

Every number shown must be true or clearly labeled.

- Pass:
  - Close metrics are computed from what the visitor actually did.
  - Prices follow the config.
  - Every Signals figure traces to `data/signals-seed.json`, and the screen says the data is simulated.
  - The cost line is hidden until Scott fills it from `build-log.md`.
  - Credits match the source record.
- Fail:
  - Hard-coded metrics.
  - A Signals figure that cannot be reproduced from the seed.
  - An estimated cost.
  - A work credited to the wrong institution.

## 9. Nothing leaves the browser

- Pass: no analytics script, no tracking pixel, no cookie beyond what the framework requires, and no request that sends session state anywhere. The only server call is J2, and it sends only the typed sentence.
- Fail: any third-party script; any request that includes the mood history, bag or metrics.

## 10. Accessible enough to be respectful

- Pass:
  - Arrow keys move the mood point.
  - Every control is reachable by keyboard.
  - Images have meaningful alt text.
  - Motion respects `prefers-reduced-motion`.
  - Text meets WCAG AA contrast.
- Fail: the mood field is mouse-only; focus is invisible; the Threshold animation cannot be reduced.

## 11. Tested where it matters

Testing follows `docs/testing.md` (D-014). The point is to spend test effort where a failure would hurt, and nowhere else.

- Pass:
  - Every unit has a tier in `docs/test-tiers.md`, and Scott has reviewed the table.
  - High-tier units have a test for every branch and named edge case, and Stryker catches at least 80% of mutants in their files.
  - Medium-tier units have tests for their main behavior and named edge cases.
  - Every functional gate in `docs/testing.md` that applies so far is in place and passing.
  - The test-sweeper's flags are resolved.
  - No test makes a network call to an outside party.
  - After each deploy, the live smoke test passes.
- Fail:
  - A test hits the Anthropic API, a museum API or any other outside service.
  - A High-tier file below 80% mutation score with no recorded, accepted reason.
  - Tests written to raise a coverage number.
  - An interface with a defined send or return and no contract test.

## 12. Cheap to run

- Pass: the app runs on the smallest Upsun resource allocation that meets the speed standards, with no database or storage service. Claude spend stays inside the console cap Scott sets. `build-log.md` has a row for every working day.
- Fail: a new paid service with no entry in `decisions.md`; per-visitor API calls the pre-warm cache should have absorbed.
