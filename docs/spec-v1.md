# Build Spec: Trends International Prototype (Feel First)

Status: LOCKED 2026-10-08. All 33 ambiguity items and all 20 spec-writing gaps resolved by Scott. Gap resolutions below are binding and are cited as [Gap Gn].

This spec is the build reference for the Next.js prototype. It draws only on rule-base entries (tagged [RBn]) and ambiguity-log resolutions (tagged [Res #n]). Where a resolution overrides or refines a provisional rule, both are cited. Anything a builder needs that these sources do not supply is listed in the final section, "Gaps found during spec-writing", and must not be decided during the build without a resolution.

Rule of interpretation: anything not stated in this spec's sources is undecided and must not be treated as agreed, permitted, or forbidden [RB1].

---

## 1. Purpose and constraints

### 1.1 What this is and who it is for

- The prototype is an unsolicited new art.com experience built for Trends International, the Indianapolis company that owns Art.com and AllPosters.com [RB3].
- Its goal is to get the Trends CEO to take a deeper conversation that leads to a senior technology role for Scott [RB4].
- The prototype is the hook for the broader pitch, not the full argument [RB5].
- It demonstrates the differentiated-user-journey half of the broader pitch [RB6, refined by Res #24].
- The prototype must show three things about Scott: fast prototyping, vision leadership, and cost control [RB8, refined by Res #24].
  - Cost control is shown through a cost panel in Builder Notes (see Section 6) [Res #24].
  - Fast prototyping is shown by the total build hours in that panel [Res #24].
  - Vision leadership is shown by the experience itself and by Builder Notes [Res #24].
- The data crux of the broader pitch (tying together Trends' retail and print data, which competitors lack) is shown in Builder Notes only, with no mock data screens [RB7, refined by Res #27].
- The "looks like every competitor" commerce-stack premise of the broader pitch stays out of the prototype [Res #33].

### 1.2 Hosting

- Vercel hosts the Next.js app [RB66, Res #1].
- The app is served at the subdomain art.reasinger.net [RB13, refined by Res #1].
- The existing reasinger.net site is not restructured [Res #1].

### 1.3 Delivery package

Delivery to the CEO consists of three items [RB9]:

- A link to the live prototype [RB9].
- A short intro note, under 120 words [RB9, refined by Res #31].
- A walkthrough video between 75 and 105 seconds long [RB9, refined by Res #31].

Further delivery rules:

- The delivery asks the CEO whether the prototype is worth a deeper conversation [RB10].
- The intro note is sent from scott@reasinger.net [RB11].
- The intro note must pass the gatekeeper panel before it ships [RB12].
- The intro note does not include the "looks like every competitor" premise [Res #33].
- The walkthrough video shows the Builder Notes toggle [Res #19].
- The proposed ask in the follow-up conversation is running the content and AI pipeline on a sample of Trends' licensed SKUs [RB41, Res #25].

### 1.4 Branding and disclaimer

- The prototype is labeled as a concept by Scott Reasinger, not affiliated with Trends or art.com [RB43].
- The label lives in a persistent thin concept bar that appears on every screen, including the Threshold [RB43, refined by Res #26, Res #20].
- No art.com logo is used [RB44].
- No art.com, Trends, or AllPosters logos or brand styling appear anywhere [RB44, refined by Res #26].
- The experience uses a neutral working name [Res #26].
- The text "art.com" appears only as plain text in the concept bar and in Builder Notes [Res #26].

### 1.5 Out of scope

The following are out of scope and must not be built:

- Real checkout or payment; the Close screen ends the prototype [RB33, RB71].
- User accounts [RB72].
- Scraping art.com, or reusing any art.com catalog images [RB42, RB73].
- Licensed pop-culture titles and assets [RB40, RB74].
- AR and WebXR [RB75].
- A segmentation model for wall photos [RB76].
- A production database [RB77].
- Postgres and pgvector in v1 [RB68, overridden by Res #28].
- Any storage service in v1, including a key-value or edge store [RB67, Res #8].
- GitHub Spec Kit [RB65].

---

## 2. Content and catalog

### 2.1 Lanes

Exactly two content lanes are in scope [RB36]:

1. Fine art from museum open-access collections [RB36, RB37].
2. A poster lane modeled on AllPosters [RB36, RB38].

### 2.2 Sources

Fine-art lane:

- Primary sources: the Art Institute of Chicago, the Met, and the Rijksmuseum [RB37, refined by Res #17].
- Backup source: the Cleveland Museum of Art [Res #17].
- Smithsonian Open Access is not used [RB37, overridden by Res #17].

Poster lane:

- The Library of Congress WPA poster collection [RB38, Res #18].
- NASA JPL "Visions of the Future" posters [RB38, Res #18].

### 2.3 Size and split

- Target catalog size is about 600 works across both lanes combined [RB45].
- Tolerance is plus or minus 100 works [RB45, refined by Res #16].
- Split is 70% fine art and 30% posters [RB45, refined by Res #16].

### 2.4 Licensing

- The prototype counts as non-commercial for JPL's usage terms because it is shown to a CEO and has no actual purchase ability [RB39, refined by Res #18].
- JPL posters are therefore included for the prototype [Res #18].
- JPL posters still need a licensing check before any other use [RB39, Res #18].
- No art.com catalog images are scraped or reused [RB42].
- Licensed pop-culture titles are not available from public sources and are excluded [RB40].

---

## 3. Data contracts

### 3.1 Catalog data access

- J1 output is precomputed into JSON for the app [RB50, RB66].
- All catalog data access goes through a single module so a database can be swapped in later [Res #28].
- Each work has a catalog ID; ties in ranking break by ascending catalog ID [Res #23].

### 3.2 J1 output schema (per work)

The spec is directed to define the full J1 JSON schema [Res #2]. The sources support the following fields and constraints. Exact JSON field names and the exact vocabulary words are not in the sources and are logged as gaps (G1, G2).

| Field (descriptive) | Type and range | Source |
|---|---|---|
| Catalog ID | Identifier, sortable ascending | [Res #23] |
| Valence | Float from -1 to 1 (endpoint mapping: gap G3) | [RB18, RB49, Res #2] |
| Arousal | Float from -1 to 1 (endpoint mapping: gap G3) | [RB18, RB49, Res #2] |
| Emotion tags | Words from a fixed 12-word vocabulary | [RB49, Res #2] |
| Palette | Exactly 5 colors, each a hex value | [RB49, Res #2] |
| Subject | One value from a fixed subject list | [RB49, Res #2] |

Notes on the axis direction mapping: the sources state valence runs from heavy to bright and arousal from calm to charged [RB18], and both are floats from -1 to 1 [Res #2]. Which endpoint maps to -1 is not stated and is logged as gap G3.

### 3.3 Mood buckets

- There are 9 mood buckets on a 3x3 grid over valence and arousal [Res #9].
- Each bucket has one room name; the 9 room names are written once and reviewed by Scott [Res #9].
- J4 text is keyed per piece per bucket [RB54, Res #9].
- Exact bucket boundaries on the -1 to 1 axes are not stated (gap G4).

### 3.4 Visitor mood state

- The visitor's mood is a point on the same two-dimensional field (valence, arousal) as J1 coordinates [RB18, RB53].
- The mood point is visible to the visitor and moves when Closer or Drift is used [Res #10].
- Closer and Drift reactions and the resulting nudges are session state only [RB57, RB72, Res #10].

### 3.5 Pricing inputs

- Each piece offers size, material, and frame choices, each with prices [RB27].
- Prices come from a rule-based formula modeled on typical print-on-demand ranges across size, material, and frame options [RB27, refined by Res #13].
- The chosen print size drives true scale on the Wall screen [Res #12].
- J2's size constraint, when present, preselects the print size on the Piece screen [Res #6].
- The specific option sets and formula values are not in the sources (gap G5).

### 3.6 Bag data

- The bag holds multiple pieces [Res #3].
- "Pieces chosen" equals the number of bag lines [Res #11].
- Totals are a subtotal plus a flat shipping estimate; no tax [RB31, refined by Res #14].
- The bag's mood center is used by the "feel together" summary and by J6 [Res #14, Res #15]. How the mood center is computed is not stated (gap G6).

### 3.7 J2 output

- J2 returns a mood position plus constraints such as room type or size [RB51].
- Constraints never filter or remove results [Res #6].
- Room type sets the default wall scene and informs the room name [Res #6].
- Size preselects the print size on the Piece screen [Res #6].
- The constraint vocabularies (room types, size values) are not in the sources (gap G7).

---

## 4. AI jobs J1 to J7

General rules:

- Each AI job is defined separately so its depth can be chosen independently [RB46].
- Every job J1 to J7 must be built at the depth listed below; none may be omitted or built shallower [RB47].
- Going deeper than the listed depth on any job is decided later, case by case, on time versus value [RB48].
- J1 and J2 must be real AI in the demo [RB58].
- The Claude API key lives on the server and is never exposed to the client [RB69].
- The cost cap governs all runtime model calls; at prototype depth that is only J2 [RB70, refined by Res #7].
- The cost cap is enforced by an Anthropic console spend limit plus a per-IP rate limit [RB70, refined by Res #7, Res #8].

### J1 Affect tagger

- When: build time, as a batch [RB50].
- Input: each catalog image [RB49].
- Output: the per-work record in Section 3.2, stored as JSON [RB49, RB50, Res #2].
- Depth: real AI, a Claude vision batch run through Anthropic's Message Batches API [RB50, RB58, refined by Res #2].
- Fallback and limits: none at runtime; output is precomputed [RB50].

### J2 Mood interpreter

- When: runtime [RB52].
- Input: the visitor's free-text description of a feeling or moment in the Room [RB22, RB51, Res #4]. (Explicit routing of the Room's free text to J2 is logged as gap G8.)
- Output: mood position plus constraints, per Section 3.7 [RB51, Res #6].
- Depth: real AI, a live Claude API call [RB52, RB58].
- Cache: a pre-warmed static cache shipped as JSON, holding about 50 likely phrases with real Claude output, so the demo path is real AI [RB52, refined by Res #7, Res #8].
- Any runtime cache beyond the static file is per-instance and best-effort [Res #8].
- Fallback: a local word-map fallback [RB52].
- Fallback triggers: API error, a 4-second timeout, or a reached cost cap [Res #7].
- Contents of the word map and the 50 phrases are not in the sources (gap G9).

### J3 Matcher

- When: runtime [RB53].
- Input: the visitor's mood point and every piece's J1 coordinates [RB53].
- Output: pieces ranked by distance from the visitor's mood [RB20, RB53].
- Depth: Euclidean distance on (valence, arousal) [RB53, refined by Res #23].
- Ties break by ascending catalog ID [Res #23].
- J2 constraints do not filter J3 results [Res #6].
- Pieces demoted by Drift are demoted for the session [Res #10]. The demotion amount is not stated (gap G10).

### J4 Curator voice

- When: build time, in batch [RB54, Res #9].
- Input: each piece and each of the 9 mood buckets [RB54, Res #9].
- Output: one AI-written "why this found you" line per piece per bucket [RB25, RB54, refined by Res #9].
- Room names: 9, one per bucket, written once and reviewed by Scott [RB54, Res #9].
- Depth: AI-generated at build time [Res #9].
- Fallback and limits: none at runtime; output is pre-generated [RB54].

### J5 Wall reader

- When: runtime [RB55].
- Input: a photo of the visitor's own wall, by file upload only, with no camera capture [RB30, RB55, refined by Res #12].
- Output: the wall photo used as background, with scale set manually [RB55, Res #12].
- Depth: no AI; manual scale [RB55].
- Manual scale: the visitor drags a line across a known object and enters its length [Res #12].
- No wall detection is performed [RB76, Res #12].

### J6 Room balancer

- When: runtime [RB56].
- Input: the bag contents and the catalog [RB56, Res #15].
- Output: one suggested catalog piece, the one nearest the bag's mood center that is not already in the bag [RB56, refined by Res #15].
- Where shown: the Bag screen [Res #15].
- Depth: rule-based, no AI [RB56].

### J7 Session learner

- When: runtime [RB57].
- Input: Closer and Drift reactions in the Room [RB23, RB57].
- Output: a nudged visitor mood point [RB57, Res #10].
- Depth: vector nudge, no AI [RB57].
- Closer moves the visible mood point 30% toward the piece; Drift moves it 30% away from the piece [RB23, refined by Res #10].
- Drift also demotes that piece for the session [Res #10].
- Behavior when a nudge would leave the -1 to 1 range is not stated (gap G11).

---

## 5. Screens in journey order

Journey-wide rules:

- The journey has six screens in this order: Threshold, Room, Piece, Wall, Bag, Close [RB16].
- Navigation is free between all screens; the visitor is not forced through linearly [RB16, refined by Res #3].
- The site is emotion-led and art-forward [RB14].
- Visitors choose by feel [RB15].
- No keyword search, no filters, and no category menus appear on any screen [RB15, RB19, refined by Res #4].
- Free-text description of a feeling or moment is allowed and is not search [Res #4, Res #11].
- Size, material, and frame choices on the Piece screen are product options and are allowed [Res #4].
- The concept bar appears on every screen [Res #26].
- The Builder Notes toggle is available on every screen and is off by default [RB35, Res #19].

### 5.1 Threshold

Required elements:

- A wordless mood-spectrum entry [RB17].
- A two-dimensional mood field: valence from heavy to bright, arousal from calm to charged [RB18].
- A movable point the visitor moves until it feels right [RB18].
- The persistent concept bar [Res #20, Res #26].

Allowed:

- A one-line prompt [Res #20]. Its wording is not in the sources (gap G12).
- Builder Notes, when toggled on [Res #20].

Prohibited:

- No search box and no category menu [RB19].
- No words required from the visitor [RB17, refined by Res #21].
- No axis labels on the mood field; color and motion carry the meaning [Res #21].

Behaviors:

- The visitor's first touch on the Threshold starts the "time to first piece" timer [Res #11].

### 5.2 Room

Required elements:

- An immersive gallery ordered by emotional distance from the visitor's mood, using J3 [RB20, RB53].
- Shows the top 12 matches, with more loading in batches on request [RB20, refined by Res #5].
- Never renders the full catalog at once [Res #5].
- A compact copy of the mood field for retuning [RB21, refined by Res #22].
- A free-text input to describe a moment in the visitor's own words [RB22, Res #4].
- Closer and Drift controls on pieces [RB23].
- The room name for the visitor's current mood bucket [RB54, Res #9].

Behaviors:

- Retuning the mood re-orders the Room [RB20, RB21].
- Closer pulls the room toward a piece and Drift pushes it away, via J7 [RB23, RB57, Res #10].
- The visible mood point moves on Closer and Drift [Res #10].
- J2 room type sets the default wall scene and informs the room name [Res #6].
- Every re-ordering of the Room counts as a re-hang for the Close screen [Res #11]. Which events count as a re-ordering is logged as gap G13.

### 5.3 Piece

Required elements:

- A detail view with the artwork [RB24].
- A short "why this found you" explanation from J4 for this piece and the visitor's current mood bucket [RB25, RB54, Res #9].
- An emotional fingerprint: the 2D valence and arousal field showing where the piece and the visitor sit, plus the piece's top 3 emotion tags [RB26, refined by Res #13].
- Size, material, and frame choices, each with prices from the pricing formula [RB27, Res #13].
- The bag holds multiple pieces [Res #3]. Where and how a piece is added to the bag is not stated (gap G20).

Behaviors:

- If J2 returned a size constraint, the print size is preselected [Res #6].
- The first Piece screen opened stops the "time to first piece" timer [Res #11].

### 5.4 Wall

Required elements:

- The chosen piece shown at true scale on a wall [RB28].
- True scale uses the selected print size [Res #12].
- Default wall: uses an 84-inch sofa as the scale reference [Res #12].
- Wall color choices [RB29]. The color set is not in the sources (gap G14).
- An option to use a photo of the visitor's own wall [RB30].

Behaviors:

- Photo mode accepts file upload only [Res #12].
- In photo mode the visitor drags a line across a known object and enters its length to set scale [RB55, Res #12].
- No wall detection and no segmentation [RB76, Res #12].
- J2 room type, when present, sets the default wall scene [Res #6]. The set of wall scenes is not in the sources (gap G7).

### 5.5 Bag

Required elements:

- Line items [RB31].
- Totals: subtotal plus a flat shipping estimate; no tax [RB31, refined by Res #14]. The shipping amount is not in the sources (gap G5).
- A summary of how the chosen pieces feel together [RB32].
- The J6 suggestion [Res #15].

Behaviors:

- The "feel together" summary is a template over J1 data: the bag's mood center mapped to its bucket's room name [RB32, refined by Res #14].
- No new AI job is created for the summary [Res #14].
- J6 suggests the catalog piece nearest the bag's mood center that is not already in the bag [Res #15].
- Behavior for an empty bag is not stated (gap G6).

### 5.6 Close

Required elements:

- The end of the prototype; checkout is not built [RB33].
- Scott's contact: scott@reasinger.net and Scott's LinkedIn profile URL [RB34, refined by Res #29]. The LinkedIn URL itself is not in the sources (gap G15).
- A statement of what the visitor just did, computed and displayed (not just logged) [Res #11]:
  - No search typed [Res #11].
  - Time to first piece, measured from first touch on the Threshold to the first Piece screen opened [Res #11].
  - Number of re-hangs, counting every re-ordering of the Room [Res #11].
  - Pieces chosen, equal to the number of bag lines [Res #11].

---

## 6. Builder Notes content requirements

Layer behavior:

- Builder Notes are a layer toggled by the viewer [RB35].
- They are off by default [Res #19].
- They explain, on each screen, how the production version would be built [RB35].
- They may appear on the Threshold when toggled on [Res #20].
- They are the in-product version of the technical brief, which is a build plan document to be produced later as a separate deliverable [RB35, refined by Res #19]. How Builder Notes content relates in time to that later document is logged as gap G16.

Required content:

- Per screen: one note naming the first-party data that step captures (for example mood vectors, Closer and Drift preference pairs) and how it would join Trends' retail and print data [RB7, refined by Res #27].
- On the Room screen: a plain statement that licensed titles slot into the same content and AI pipeline (J1 tagging plus J4 copy) [Res #25]. This is a content requirement (tracking-only), not a structural gate [Res #25].
- A cost panel showing hosting cost, Claude spend to date, and total build hours [Res #24]. Where these values come from is logged as gap G17.
- "art.com" may appear only as plain text [Res #26].
- No "looks like every competitor" premise [Res #33].
- No mock data screens [Res #27].

---

## 7. Configuration

Tunable values must live in one configuration file so they can be changed without code edits elsewhere [Res #10, Res #5].

Values the sources require in that file:

| Value | Default | Source |
|---|---|---|
| Room page size | 12 | [Res #5] |
| Closer and Drift step size | 30% | [Res #10] |
| Drift demotion | not stated (gap G10) | [Res #10] |

Res #10 also names "similar constants" as belonging in the file [Res #10]. Which other values count (the 4-second J2 timeout, the 84-inch sofa reference, the flat shipping amount, the per-IP rate limit, catalog split) is logged as gap G18.

---

## 8. Build process and repository

- Code lives in a new private GitHub repository and is built with Claude Code [RB59, refined by Res #30].
- Plain Claude Code builds from this spec [RB64].
- GitHub Spec Kit is not used [RB65].
- The stack is Next.js deployed to Vercel [RB66].
- Scott works with a mix of milestone prompts, a context folder, and his own direct prompting [RB60].
- Claude provides the milestone prompts [RB60, refined by Res #30].
- Claude Code reads the context folder every session to know what good enough means [RB60, RB61].
- The context folder is written in full prose, not compressed shorthand [RB62].
- Starting context files: product-brief.md, quality-bar.md, ai-jobs.md, asset-sources.md, decisions.md, all referenced from CLAUDE.md [RB63].
- That file list is a starting set and may grow [RB63, refined by Res #30].
- This spec lands in the repository at docs/spec.md [Res #30].
- Pipeline order: extract-rules-and-flag-ambiguity first, write-spec-from-resolutions second [RB2].
- Gate: write-spec-from-resolutions runs only after all ambiguity-log items are resolved [Res #32]. All 33 items carry resolutions [Res #32].

---

## 9. Gaps found during spec-writing

These items were needed to build but have no backing in a rule-base entry or resolution. They are not requirements. Each needs a resolution before the builder relies on it.

## Gap G1
Topic: J1 exact vocabularies
What is missing: Res #2 fixes a 12-word emotion tag vocabulary and a fixed subject list, but neither the 12 words nor the subject list appear in any rule or resolution.
Options: (a) Scott supplies both lists; (b) a published affect model's terms are adopted by decision; (c) the lists are drafted and then approved as a new resolution.
Why this matters: J1 prompts, J1 output validation, the Piece fingerprint's top 3 tags, and Builder Notes all depend on the exact words.
Resolution: Emotion tags (fixed 12): joyful, playful, energized, awe, serene, tender, contemplative, nostalgic, wistful, melancholy, tense, defiant. Subjects (fixed 12): landscape, seascape, cityscape, figure, still life, botanical, animal, abstract, interior, place, graphic, space. (Scott, 2026-10-08)## Gap G2
Topic: J1 JSON field names and file layout
What is missing: Res #2 says the spec defines the full JSON schema, but no source gives field names, nesting, file naming, or whether J4 text and catalog metadata (title, artist, source, image URL, lane) live in the same file.
Options: (a) one catalog JSON with all per-work fields; (b) separate files for J1 output, J4 text, and source metadata; (c) Scott specifies names.
Why this matters: Every runtime job and the single catalog module read this contract; renaming later causes rework.
Resolution: catalog.json is an array of works with fields: id, title, artist, date, source, sourceId, lane, imageUrl, thumbUrl, width, height, orientation, valence, arousal, tags (3 to 5 from the G1 list), palette (5 hex colors), subject (from the G1 list), license. copy.json maps each id to its 9 'why this found you' lines, one per mood bucket. (Scott, 2026-10-08)## Gap G3
Topic: Axis endpoint mapping to -1 and 1
What is missing: Sources say valence runs heavy to bright and arousal calm to charged, and both range from -1 to 1, but not which endpoint is -1.
Options: (a) heavy = -1, bright = 1, calm = -1, charged = 1; (b) another mapping.
Why this matters: J1 prompts, bucket assignment, and the mood field rendering must agree or matching inverts.
Resolution: Valence: -1 is heavy, +1 is bright. Arousal: -1 is calm, +1 is charged. (Scott, 2026-10-08)## Gap G4
Topic: Mood bucket boundaries
What is missing: Res #9 sets a 3x3 grid but not where the cell lines fall on the -1 to 1 axes, or how a point exactly on a boundary is assigned.
Options: (a) equal thirds with fixed boundary rules; (b) boundaries tuned to the catalog distribution; (c) boundaries as config values.
Why this matters: It decides which J4 line and room name a visitor sees and how the Bag summary maps.
Resolution: Bucket boundaries at -1/3 and +1/3 on each axis, giving equal thirds. (Scott, 2026-10-08)## Gap G5
Topic: Pricing option sets, formula values, and flat shipping amount
What is missing: Res #13 calls for a rule-based formula modeled on typical print-on-demand ranges, and Res #14 a flat shipping estimate, but no sizes, materials, frames, prices, or shipping amount are given.
Options: (a) Scott supplies a price table; (b) a formula is drafted and approved; (c) values go in the config file.
Why this matters: Piece, Wall, and Bag screens all read these values; Wall true scale needs physical print dimensions.
Resolution: Sizes: 12x16 $39, 18x24 $69, 24x36 $119, 30x40 $179. Materials: paper print at base price; canvas at 1.6x base; framed print at base plus $60 plus $1.50 per inch of width. Frames: black, natural oak, white, brass, all the same price. Shipping: $9.95 flat. (Scott, 2026-10-08)## Gap G6
Topic: Bag mood center definition and empty-bag behavior
What is missing: Res #14 and Res #15 use "the bag's mood center" without defining it (mean of piece coordinates, weighted by quantity, or other). Neither says what the summary and J6 do when the bag is empty or when every catalog piece is in the bag.
Options: (a) unweighted mean of distinct pieces' coordinates; (b) mean weighted by quantity; (c) empty bag hides summary and J6, or J6 falls back to the visitor's mood point.
Why this matters: Both the summary and J6 depend on it, and the Bag screen is reachable empty under free navigation (Res #3).
Resolution: The bag's mood center is the unweighted average of valence and arousal across bag lines. An empty bag shows a link back to the Room and no J6 suggestion. (Scott, 2026-10-08)## Gap G7
Topic: J2 constraint vocabularies and wall scenes
What is missing: Res #6 says room type sets the default wall scene and informs the room name, and size preselects print size, but no room type list, size vocabulary, size-to-print mapping, or set of wall scenes is given. Res #9 also fixes 9 room names per bucket, so how room type "informs" a fixed name is not stated.
Options: (a) a small fixed room type list with one wall scene each, and room type shown as a qualifier next to the bucket name; (b) room type ignored for naming until revisited; (c) Scott specifies.
Why this matters: J2's output schema and prompt, the Wall default scene, and the room name logic all need it.
Resolution: Room types: living room, bedroom, office, kitchen, nursery, entry. Size words: small, medium, large map to 12x16, 18x24, 30x40. Wall scenes: sofa, bed, desk; room types without a scene use the sofa. Room type appends 'for the <room type>' to the bucket's room name. (Scott, 2026-10-08)## Gap G8
Topic: Routing the Room's free-text input to J2
What is missing: The rule base notes (RB22) that routing the Room's free text to J2 is inferred, not stated. Res #6 resolves constraint usage but does not explicitly state the routing.
Options: (a) confirm the Room free-text input is J2's only input; (b) also allow free text elsewhere.
Why this matters: It defines the only live AI call and the cost cap surface.
Resolution: The Room's free-text box routes to J2. (Scott, 2026-10-08)## Gap G9
Topic: Word-map fallback contents and pre-warmed phrase list
What is missing: No source gives the word map's entries, how it scores text to a mood point, whether it extracts constraints, or the roughly 50 pre-warmed phrases.
Options: (a) phrases drafted and approved by Scott, word map derived from J1 vocabulary; (b) Scott supplies both.
Why this matters: The demo path's real-AI guarantee rests on the phrase list, and the fallback is what the CEO sees if the API fails.
Resolution: Claude drafts a word map of about 150 words and a list of about 50 pre-warm phrases at build time; Scott reviews both before deploy. (Scott, 2026-10-08)## Gap G10
Topic: Drift demotion amount
What is missing: Res #10 says Drift demotes the piece for the session but not by how much (removed, pushed to end, fixed rank penalty, distance penalty).
Options: (a) move to the end of the ordering; (b) add a distance penalty set in config; (c) hide for the session.
Why this matters: It changes J3 output and the Room's feel; Res #6 forbids removing results via J2 constraints, so whether Drift may hide a piece needs a decision.
Resolution: Drift moves the piece to the end of the ranked list for the rest of the session. (Scott, 2026-10-08)## Gap G11
Topic: Mood point bounds after nudges
What is missing: A 30% move away from a piece can push the visitor's point outside -1 to 1. No source says whether to clamp, and what "30% away" means when the point equals the piece's coordinates.
Options: (a) clamp to the field; (b) allow and render off-field; (c) define away-moves relative to the field center.
Why this matters: J3, bucket lookup, and the compact mood field all assume a point inside the field.
Resolution: After any nudge the mood point is clamped back inside the field's unit circle. (Scott, 2026-10-08)## Gap G12
Topic: Threshold one-line prompt wording
What is missing: Res #20 allows a one-line prompt but does not give its text or say whether it is required.
Options: (a) Scott writes it; (b) omit it.
Why this matters: It is the first text the CEO sees.
Resolution: Threshold prompt text: 'Move the light until it feels right.' (Scott, 2026-10-08)## Gap G13
Topic: What counts as a re-ordering (re-hang)
What is missing: Res #11 counts every re-ordering of the Room, but not whether the initial ordering, loading the next batch, or a nudge that leaves the order unchanged counts.
Options: (a) count only events that change the order of shown pieces, excluding initial load and batch loads; (b) count every retune, description, Closer, and Drift event.
Why this matters: The Close screen displays this number to the CEO.
Resolution: A re-hang is any reorder of the Room caused by a retune, a describe submission, Closer, or Drift. (Scott, 2026-10-08)## Gap G14
Topic: Wall color choices
What is missing: RB29 requires wall color choices but no set of colors is given.
Options: (a) a small neutral set; (b) colors derived from the piece's J1 palette; (c) Scott specifies.
Why this matters: Visual design of the Wall screen.
Resolution: Wall colors: plaster, sage, ink blue, clay, charcoal. (Scott, 2026-10-08)## Gap G15
Topic: LinkedIn profile URL and neutral working name
What is missing: Res #29 requires Scott's LinkedIn URL and Res #26 a neutral working name; neither value is in the sources.
Options: Scott supplies both.
Why this matters: The Close screen call to action and every screen's naming.
Resolution: LinkedIn URL: https://www.linkedin.com/in/scottreasinger/ . Neutral working name: Feel First. (Scott, 2026-10-08)## Gap G16
Topic: Builder Notes versus the later technical brief
What is missing: RB35 says Builder Notes are the in-product version of the technical brief, and Res #19 says that brief is produced later. No source says whether Builder Notes content is written now independently or waits on, and must match, that document.
Options: (a) write Builder Notes now and derive the brief from them; (b) draft the brief first; (c) write both together.
Why this matters: It decides build sequencing for Builder Notes content.
Resolution: Builder Notes are written first; the technical brief is produced later and derived from them. (Scott, 2026-10-08)## Gap G17
Topic: Cost panel data sources
What is missing: Res #24 requires hosting cost, Claude spend to date, and total build hours, but with no storage service (Res #8) no source says whether these are static values updated at deploy time or read live, nor where build hours are recorded.
Options: (a) static values in config updated each deploy; (b) live read of spend from an external API; (c) a hybrid.
Why this matters: The cost-control claim must be checkable, and live reads add a server dependency.
Resolution: Cost panel values are static config values updated at each deploy and shown with an 'as of' date. Claude spend comes from the Anthropic console; build hours come from a build log Scott keeps. (Scott, 2026-10-08)## Gap G18
Topic: Full list of config values and per-IP rate limit
What is missing: Res #10 puts "similar constants" in one config file but does not list them, and Res #7 requires a per-IP rate limit with no threshold. With no storage service (Res #8), how a per-IP limit is enforced across serverless instances is also not stated.
Options: (a) all numeric constants in this spec go in config, with a rate-limit value supplied by Scott and per-instance enforcement accepted; (b) only Res #5 and Res #10 values in config.
Why this matters: It decides what can be tuned without code edits and how the cost cap actually behaves.
Resolution: Config file holds at least: Room page size (12), nudge step (0.30), J2 timeout (4s), bucket cut points, price table, shipping, Drift behavior, and a J2 rate limit of 20 calls per IP per hour. The rate limit is best-effort per instance; the Anthropic console spend cap is the hard stop. (Scott, 2026-10-08)## Gap G19
Topic: Backup source trigger and poster sub-split
What is missing: Res #17 names Cleveland as a backup but not when it is used. Res #16 sets 70/30 between lanes but no split within the poster lane between WPA and JPL, or across the three museums.
Options: (a) use Cleveland only if primary sources fall short of the fine-art target; (b) fix per-source counts; (c) leave per-source counts to availability.
Why this matters: Asset pipeline scope and the catalog's feel.
Resolution: Fine art splits evenly across the Art Institute of Chicago, the Met and the Rijksmuseum. Cleveland is used only if usable fine-art works fall short of about 420. Posters: every available JPL 'Visions of the Future' poster, with the remainder from Library of Congress WPA posters. (Scott, 2026-10-08)## Gap G20
Topic: Add-to-bag control and quantity
What is missing: Res #3 says the bag holds multiple pieces and Res #11 counts bag lines, but no source says which screen carries the add-to-bag control, whether the same piece with different options makes a new line, or whether quantity per line is editable.
Options: (a) add from Piece and Wall, each distinct option combination is a new line, quantity fixed at 1; (b) add from Piece only with editable quantity; (c) Scott specifies.
Why this matters: It defines the bag data model, the "pieces chosen" metric, and the J6 and summary inputs.
Resolution: Add to bag appears on both the Piece and Wall screens. Different size, material or frame choices create a separate bag line. Quantity is fixed at 1 per line; lines can be removed. (Scott, 2026-10-08)