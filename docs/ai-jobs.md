# AI jobs: practical notes for J1 to J8

Feel First has eight jobs. Only J1 and J2 must be real AI in the demo. J4 and J8 use Claude at build time to write text. J3, J5, J6 and J7 are plain math with no model.

This split is deliberate. It keeps the prototype cheap and predictable. It also lets Builder Notes say honestly which parts are AI and which are arithmetic.

Spec Section 4 is the authority. This file adds the practical detail.

## Shared coordinate space

- **Valence** runs from -1 (heavy) to +1 (bright).
- **Arousal** runs from -1 (calm) to +1 (charged).
- The visitor's mood and every work's position live in this same space.
- **Mood buckets** divide it into a 3 by 3 grid, with cut points at -1/3 and +1/3 on each axis. Each bucket has one room name, written once and approved by Scott.

The model name used by J1, J2, J4 and J8 is a config value, not hard-coded.

**Build-time jobs** (J1, J4, J8, and the J2 pre-warm and word-map drafts) are scripts in `scripts/`. They are run by hand. They write JSON into `data/`, and that JSON is committed. The deployed app never runs them.

---

## J1 Affect tagger (build time, real AI)

**Purpose.** Look at each catalog image once and record where it sits emotionally.

**Input.** A mid-size rendition of the image, around 800px on the long edge. Add title, artist and date as context.

**Output fields.** These are added to each record in `data/catalog.json` (spec Section 3.2):

| Field | Content |
|---|---|
| `valence` | -1 to 1 |
| `arousal` | -1 to 1 |
| `tags` | 3 to 5 tags from the fixed list below |
| `palette` | exactly 5 hex colors |
| `subject` | one subject from the fixed list below |

- **Tags (fixed 12):** joyful, playful, energized, awe, serene, tender, contemplative, nostalgic, wistful, melancholy, tense, defiant.
- **Subjects (fixed 12):** landscape, seascape, cityscape, figure, still life, botanical, animal, abstract, interior, place, graphic, space.

**How.** Use Anthropic's Message Batches API.

**Prompt.** Ask the model to judge how the work feels to live with on a wall, not what it depicts. Explain both axes with their endpoints. Require JSON only. Reject any tag or subject outside the fixed lists.

**Validation.** Validate every response against a schema and re-queue failures.

**Calibration (required, D-003).** Scott reviews 20 placements spread across the field, plus the per-lane distribution, before the batch is accepted. If they feel wrong, fix the prompt and re-run. Do not hand-edit numbers.

**Posters.** Tag them with the same prompt as fine art. They must land across the whole field, not cluster in "playful". Check the distribution per lane before accepting.

---

## J2 Mood interpreter (runtime, real AI)

**Purpose.** Turn the sentence typed in the Room ("Sunday coffee while it rains") into a mood point plus optional constraints.

**Output shape:**

```json
{ "valence": -0.2, "arousal": -0.5, "roomType": "kitchen", "size": null, "heard": ["rain", "coffee", "sunday"] }
```

- `roomType`: one of living room, bedroom, office, kitchen, nursery, entry, or null. It sets the default wall scene (sofa, bed or desk; others use sofa). It also appends "for the <room type>" to the room name.
- `size`: one of small, medium or large, or null. Small maps to 12x16, medium to 18x24, large to 30x40. It preselects the print size.
- Constraints never filter results.
- `heard` lists the words the model relied on. They are shown as chips.

**Where it runs.** A server route handler. The key comes from the environment.

**Order of answers:**

1. **Pre-warmed cache.** `data/j2-cache.json` holds about 50 likely phrases with real Claude output, generated at build time. Normalize the input (lowercase, trim, collapse spaces) and check here first.
2. **Live call.** Wait up to 4 seconds.
3. **Word-map fallback.** `data/j2-wordmap.json` holds about 150 words with coordinates. It is used on API error, timeout, the console spend cap, or the per-IP rate limit (20 calls per IP per hour, best-effort in memory). The visitor never sees an error.

**Review.** Claude drafts the phrase list and the word map. Scott approves both. The phrase used in the video must be in the cache.

**Logging.** Log only which path answered (cache, live or fallback). Never log the visitor's text.

---

## J3 Matcher (runtime, no AI)

**Ranking.** Within each lane, rank works by Euclidean distance between the visitor's mood and each work's (valence, arousal). Ties break by ascending catalog ID.

**The Room view.** It interleaves the two lanes: nearest poster, nearest fine art, next poster, and so on, six of each. "Show more" adds the next six from each lane.

**Drift.** A drifted work moves to the end of its own lane's list for the session.

---

## J4 Curator voice (build time, Claude-written text)

**Output.** One "why this found you" line per work per mood bucket, which is 9 lines per work. They go in `data/copy.json`, keyed by work id and bucket.

**Style.** One or two sentences. Name something specific in the work (light, color, gesture, subject) and connect it to that bucket's feeling.

**Banned:**
- em dashes
- exclamation points
- people's names other than the artist
- generic phrasing such as "captivating" or "evokes emotion"

**Room names.** Claude also drafts the 9 room names. Scott approves them, and they live in config.

---

## J5 Wall reader (runtime, no AI)

**True scale.** The scene shows the selected print size at true scale. When the material is a framed print, it adds a 1.25-inch frame and a 2-inch mat per side.

**Scale references:**

| Scene | Reference |
|---|---|
| Sofa (default) | 84 inches |
| Queen bed | 60 inches |
| Desk | 60 inches |

**Wall colors:** plaster, sage, ink blue, clay, charcoal.

**Photo mode.**
- Upload only, no camera.
- The visitor drags a line across a known object and enters its length in inches. That sets pixels per inch.
- The photo stays in the browser.
- There is no wall detection.

**Frames.** The frame chosen on the Piece screen carries over and can be changed here. Frames are drawn in code (CSS or SVG), not photographs.

---

## J6 Room balancer (runtime, no AI)

On the Bag screen, suggest the catalog work nearest the bag's mood center that is not already in the bag. The mood center is the unweighted average of the bag lines' valence and arousal. An empty bag shows a link back to the Room and no suggestion.

---

## J7 Session learner (runtime, no AI)

| Action | Effect on the mood point |
|---|---|
| Closer | Moves 30% of the way toward the work's position |
| Drift | Moves 30% directly away, and the work is demoted (see J3) |

After any nudge:
- The point is clamped back inside the unit circle.
- It moves visibly.
- The Room re-hangs.
- The re-hang counter goes up.

The 0.30 step lives in config.

---

## J8 Signals generator (build time, Claude-written text, no runtime AI)

**Seeded dataset.** A script with fixed seed 20261008 generates 20,000 simulated sessions into `data/signals-seed.json`.
- It uses real catalog IDs.
- Sessions are segmented by the 3 by 3 mood buckets.
- Conversion means a simulated add-to-bag rate, because checkout does not exist.
- Give the simulation realistic structure, with real differences between segments, so the findings are meaningful rather than noise. Every structural assumption must be written down in the script's header comment.

**Findings.** J8 computes four findings into `data/signals.json`, each naming a business action:

1. A retail rack candidate: a group of posters with high lift in one mood segment.
2. A frame or size attach pattern.
3. An under-converting mood segment.
4. A licensing gap: the mood bucket with the fewest catalog works per expected session.

**Lift.** A segment's pick rate for a group of works, divided by the catalog-average pick rate.

**Wording.** Claude writes each finding's sentence at build time, from the computed figures. Every number in the sentence must come from the computation.

**Banned in finding text:**
- names
- "60-slot rack"
- licensing-contract or data-rights language

**Gate.** No J8 code runs at request time. The Signals screen reads `data/signals.json` plus in-browser session state only.
