# Build Spec: Trends International Prototype (Feel First)

LOCKED v2, 2026-10-08 (hosting updated to Upsun by Res #59). Regenerated from the amended brief; supersedes v1. All 59 ambiguity items and gaps G1 to G33 are resolved. Gap G1 to G20 resolutions live in specs/spec-v1.md Section 9; G21 to G33 resolutions are in Section 10 below. All gap resolutions are binding and cited as [Gap Gn].

This spec is the build reference for Claude Code. Every requirement traces to a rule-base entry [RBn], an ambiguity resolution [Res #n], or a spec v1 gap resolution [Gap Gn]. Where a later resolution overrides an earlier rule or resolution, both are cited, for example [RB45, Res #16, overridden by Res #37]. Anything a builder needs that these sources do not supply is listed in Section 10 and must not be decided during the build without a resolution.

Rule of interpretation: anything not stated in this spec's sources is undecided and must not be treated as agreed, permitted, or forbidden [RB1].

---

## 1. Purpose, audience and constraints

### 1.1 Goal and audience

- The prototype is an unsolicited new art.com experience built for Trends International, the Indianapolis company that owns Art.com and AllPosters.com [RB3].
- Its goal is to get the Trends CEO to take a deeper conversation that leads to a senior technology role for Scott [RB4].
- The CEO, and the recipient of the pitch, is Greg Czerpak, appointed President and CEO on August 26, 2025 [RB79].
- The CEO's stated mandate is to expand both Trends' online and retail positions; this mandate is the reference point for framing the note and the video [RB81].
- The prototype is the hook for the broader pitch, not the full argument [RB5].

### 1.2 Framing

- The prototype demonstrates the differentiated-user-journey half of the broader pitch [RB6].
- It must also demonstrate how that journey feeds retail decisions [RB78].
- Both directions are shown: online feeds retail through the Signals screen, and retail feeds online through the per-screen Builder Notes data notes [RB78, RB86, Res #44].
- Signals is the single permitted data screen; the per-screen data notes in Builder Notes remain [RB7, Res #27, narrowed by Res #34].
- The prototype must show three things about Scott: fast prototyping, vision leadership, and cost control [RB8].
  - Cost control and fast prototyping are shown by the Builder Notes cost line (Section 8) [RB8, Res #24, overridden by Res #40].
  - Vision leadership is shown by the experience itself and by Builder Notes [Res #24].
- The prototype is never framed as a fix for, or a critique of, the current Art.com site [RB83].
- The framing "what Art.com could do with assets only Trends has" guides the note and the video [RB82, Res #46].
- "Assets only Trends has" means Trends' retail and print data, licensed catalog and framing capability, represented in the prototype by Signals and the licensed-SKU ask [Res #46].
- The rationales "premium framing is part of why Trends bought Art.com" and "posters are Trends' core business" are internal reasoning for the builder and never appear as on-screen copy [Res #57].

### 1.3 Delivery package

Delivery to the CEO consists of three items [RB9]:

- A link to the live prototype [RB9].
- A short intro note [RB9].
- A walkthrough video [RB9].

The delivery asks the CEO whether the prototype is worth a deeper conversation [RB10].

Intro note rules:

- The note is sent from scott@reasinger.net [RB11].
- The note is under 120 words [RB9, Res #31, upheld by Res #49].
- The note's first sentence states the online and retail mandate [RB84, Res #49].
- The note may name the CEO's mandate, since it is addressed to him [Res #47].
- The note presents the prototype as what it looks like when online and retail feed each other [RB86, Res #44].
- The note must pass the gatekeeper panel before it ships [RB12].
- The gatekeeper panel may change the note's wording but may not remove the mandate opening [Res #49].
- The "60-slot rack" detail may be used in messaging to the CEO [Res #47].

Walkthrough video rules:

- The video is between 75 and 105 seconds long [RB9, Res #31, upheld by Res #48].
- The video opens with the online and retail mandate [RB85, Res #48].
- No person's name appears in the video [Res #47].
- The video presents the prototype as what it looks like when online and retail feed each other [RB86, Res #44].
- The video reaches the poster lane within its first 20 seconds; "reaches the poster lane" means a poster is visible on screen [RB87, Res #48].
- The poster lane gets equal billing with fine art in the walkthrough [RB112, Res #48].
- Video order: mandate opening (0 to 10 seconds), then the Threshold into a Room showing posters (by 20 seconds), then Piece, Wall, Close, and Signals [Res #48].
- The poster appearance by 20 seconds is guaranteed by the Room's 6 plus 6 lane interleave (Section 5.2) [Res #37, Res #48].
- The video shows the Builder Notes toggle [Res #19].

Follow-up conversation:

- The proposed ask is running the content and AI pipeline (J1, J4 and J8) on a sample of Trends' licensed SKUs [RB41, RB102, Res #45].
- The ask also appears at the end of the Signals screen [RB102, Res #45].

### 1.4 Hosting

- Upsun hosts the Next.js app as a Node.js application, deployed by git push through Upsun's GitHub integration, with configuration in .upsun/config.yaml [RB66, Res #1, overridden by Res #59].
- The app is served at the subdomain art.reasinger.net [RB13, Res #1].
- The existing reasinger.net site is not restructured [Res #1].
- No analytics or tracking script of any kind is included on art.reasinger.net, accepting that Scott will not know whether the link was opened [RB127, Res #36].

### 1.5 Branding and concept bar

- The prototype is labeled as a concept by Scott Reasinger, not affiliated with Trends or art.com [RB43].
- The label lives in a persistent thin concept bar on every screen, including the Threshold and Signals [RB43, Res #26, Res #20, Res #35].
- The experience uses the neutral working name Feel First [Res #26, Gap G15].
- No art.com, Trends or AllPosters logos or brand styling appear anywhere [RB44, Res #26].
- On screen, "Art.com" appears only as plain text in the concept bar and in Builder Notes [Res #26, upheld by Res #46].
- The concept bar and image credits are exempt from the Message discipline bar on legal detail [Res #53].

### 1.6 Message discipline

Scope: these rules apply to the prototype, the intro note and the walkthrough video [RB119, Res #54]. The prototype includes Builder Notes and Signals [RB119, Res #43, Res #47]. Res #33 is folded into this list [Res #33, Res #54].

Nothing in the prototype, the note or the video:

1. Critiques the current Art.com or AllPosters sites, their platform, or their cost [RB120].
   - Explicit critique is banned [Res #52].
   - Implied contrast is allowed where another rule requires it [Res #52].
   - "No search typed" stays on the Close screen [Res #11, upheld by Res #52].
2. Names the commerce platform vendor, mentions that vendor's cost or contract terms, or uses the word "replatform" [RB121, refined by Res #43].
3. Shows competitor analysis or names competitors [RB122].
4. Names or implies anything about Trends staff or teams [RB123].
   - No person's name appears in the prototype or the video [Res #47].
   - The intro note may name the CEO's mandate [Res #47].
   - The founder is not mentioned anywhere [RB80, Res #47].
   - Business functions such as merchandising and licensing may be named generically [Res #47].
   - The "60-slot rack" detail does not appear in the prototype [Res #47].
5. Covers licensing contracts, retailer data rights, or legal detail [RB124].
   - The concept bar and image credits are exempt [Res #53].
   - No licensing-contract or retailer data-rights content appears [Res #53].
   - The retailer-facing Builder Notes line is an architecture statement, not retailer data-rights detail, and is allowed [Res #50].
6. States the "looks like every competitor" commerce-stack premise [Res #33, Res #54].

These topics belong in the follow-up interview, not the hook [RB125].

### 1.7 Out of scope

The following are out of scope and must not be built:

- Real checkout or payment; Close is the end of the shopping journey [RB33, RB71, Res #35].
- User accounts [RB72].
- Scraping art.com, or reusing any art.com catalog images [RB42, RB73].
- Licensed pop-culture titles and assets [RB40, RB74].
- AR and WebXR [RB75].
- A segmentation model for wall photos [RB76].
- A production database [RB77].
- Postgres and pgvector in v1 [RB68, overridden by Res #28].
- Any storage service in v1 [RB67, Res #8].
- A working retailer MCP service; it is represented by one Builder Notes line only [RB126, Res #58].
- Real visitor analytics or tracking [RB127, Res #36].
- Artist, title or category pages [Res #51].
- GitHub Spec Kit [RB65].

---

## 2. Content and catalog

### 2.1 Lanes

Exactly two content lanes are in scope [RB36]:

1. Fine art from museum open-access collections [RB36, RB37].
2. A poster lane modeled on AllPosters [RB36, RB38].

The poster lane gets equal billing with fine art in the Room [RB111, Res #37].

### 2.2 Sources

Fine-art lane:

- About 100 works each from the Art Institute of Chicago, the Met and the Rijksmuseum [RB37, Res #17, Gap G19, overridden by Res #37].
- The Cleveland Museum of Art is not needed [Res #17, Gap G19, overridden by Res #37].
- Smithsonian Open Access is not used [RB37, Res #17].

Poster lane:

- Every available NASA JPL "Visions of the Future" poster [RB38, Res #18, Res #37].
- The remainder from the Library of Congress WPA poster collection [RB38, Res #37].

### 2.3 Size and split

- Target catalog size is about 600 works across both lanes [RB45].
- Tolerance is plus or minus 100 works [RB45, Res #16].
- Split is 50/50: about 300 fine-art works and about 300 posters [RB45, Res #16, Gap G19, overridden by Res #37].

### 2.4 Licensing

- The prototype counts as non-commercial for JPL's usage terms because it is shown to a CEO and has no actual purchase ability [RB39, Res #18].
- JPL posters are included in the poster lane [Res #18].
- JPL posters still need a licensing check before any other use [RB39, Res #18].
- No art.com catalog images are scraped or reused [RB42].
- Licensed pop-culture titles are not available from public sources and are excluded [RB40].

---

## 3. Data contracts

### 3.1 Catalog data access

- J1 output is precomputed into JSON for the app [RB50, RB66].
- All catalog data access goes through a single module so a database can be swapped in later [Res #28].
- Ranking ties break by ascending catalog ID [Res #23].

### 3.2 catalog.json (J1 output plus metadata)

catalog.json is an array of works [Gap G2]. Each work has these fields [Gap G2]:

| Field | Type and constraint | Source |
|---|---|---|
| id | Catalog ID, sortable ascending | [Gap G2, Res #23] |
| title | Text | [Gap G2] |
| artist | Text | [Gap G2] |
| date | Text | [Gap G2] |
| source | Source collection | [Gap G2] |
| sourceId | Identifier at the source | [Gap G2] |
| lane | One of the two lanes | [Gap G2, RB36] |
| imageUrl | Image URL | [Gap G2] |
| thumbUrl | Thumbnail URL | [Gap G2] |
| width | Number | [Gap G2] |
| height | Number | [Gap G2] |
| orientation | Text | [Gap G2] |
| valence | Float from -1 to 1; -1 is heavy, +1 is bright | [RB18, RB49, Res #2, Gap G3] |
| arousal | Float from -1 to 1; -1 is calm, +1 is charged | [RB18, RB49, Res #2, Gap G3] |
| tags | 3 to 5 emotion tags from the fixed 12-word vocabulary | [RB49, Res #2, Gap G1, Gap G2] |
| palette | Exactly 5 hex colors | [RB49, Res #2, Gap G2] |
| subject | One value from the fixed 12-subject list | [RB49, Res #2, Gap G1, Gap G2] |
| license | License information | [Gap G2] |

Emotion tag vocabulary (fixed 12): joyful, playful, energized, awe, serene, tender, contemplative, nostalgic, wistful, melancholy, tense, defiant [Gap G1].

Subject list (fixed 12): landscape, seascape, cityscape, figure, still life, botanical, animal, abstract, interior, place, graphic, space [Gap G1].

### 3.3 copy.json (J4 output)

- copy.json maps each work id to its 9 "why this found you" lines, one per mood bucket [Gap G2, Res #9].

### 3.4 Mood buckets

- There are 9 mood buckets on a 3x3 grid over valence and arousal [Res #9].
- Bucket boundaries sit at -1/3 and +1/3 on each axis, giving equal thirds [Gap G4].
- Each bucket has one room name; the 9 room names are written once and reviewed by Scott [Res #9].
- When J2 returns a room type, the room name gets "for the <room type>" appended [Res #6, Gap G7].

### 3.5 Visitor mood state

- The visitor's mood is a point on the same two-dimensional field (valence, arousal) as J1 coordinates [RB18, RB53].
- The mood point is visible to the visitor and moves when Closer or Drift is used [Res #10].
- After any nudge the mood point is clamped back inside the field's unit circle [Gap G11].
- Closer and Drift reactions and their nudges are session state only [RB57, RB72, Res #10].
- Session state is read in the browser only and is never stored or sent anywhere [Res #36, Res #8].

### 3.6 Pricing

- Each piece offers size, material and frame choices, each with prices [RB27].
- Prices come from a rule-based formula modeled on typical print-on-demand ranges [RB27, Res #13].

| Item | Value | Source |
|---|---|---|
| Size 12x16 | $39 | [Gap G5] |
| Size 18x24 | $69 | [Gap G5] |
| Size 24x36 | $119 | [Gap G5] |
| Size 30x40 | $179 | [Gap G5] |
| Paper print | Base price | [Gap G5] |
| Canvas | 1.6x base | [Gap G5] |
| Framed print | Base plus $60 plus $1.50 per inch of width | [Gap G5] |
| Frames | Black, natural oak, white, brass, all the same price | [Gap G5, upheld by Res #42] |
| Shipping | $9.95 flat | [Gap G5] |

- The chosen print size drives true scale on the Wall screen [Res #12].
- J2's size constraint, when present, preselects the print size on the Piece screen [Res #6].

### 3.7 Frame dimensions

- Frames render at true scale using a 1.25-inch frame width and a 2-inch mat [Res #41].

### 3.8 Bag

- The bag holds multiple pieces [Res #3].
- Each distinct size, material or frame combination is a separate bag line [Gap G20].
- Quantity is fixed at 1 per line; lines can be removed [Gap G20].
- "Pieces chosen" equals the number of bag lines [Res #11].
- Totals are a subtotal plus a flat shipping estimate; no tax [RB31, Res #14].
- The bag's mood center is the unweighted average of valence and arousal across bag lines [Gap G6].

### 3.9 J2 output

- J2 returns a mood position plus constraints such as room type or size [RB51].
- Constraints never filter or remove results [Res #6].
- Room types: living room, bedroom, office, kitchen, nursery, entry [Gap G7].
- Room type sets the default wall scene and informs the room name [Res #6].
- Wall scenes: sofa, bed, desk; room types without a scene use the sofa [Gap G7].
- Size words: small maps to 12x16, medium to 18x24, large to 30x40 [Gap G7].
- Size preselects the print size on the Piece screen [Res #6].

### 3.10 Seeded Signals dataset

- Signals data is seeded and simulated, not real visitor data [RB96, Res #34].
- The seeded dataset is generated by a script with a fixed seed [Res #38].
- It uses real catalog IDs [Res #38].
- It segments by the 3x3 mood buckets [Res #38, Res #9, Gap G4].
- Conversion in the dataset means a simulated add-to-bag rate, since checkout is not built [Res #38].

### 3.11 J8 output

- J8 output is pre-computed from the seeded dataset [RB114].
- The output is four findings: a retail rack candidate, a frame or size attach pattern, an under-converting mood segment, and a licensing gap (a mood segment with thin inventory) [RB101, Res #38].
- Each finding names a business action [RB101].
- Every figure in a finding comes from the seeded data [Res #38].
- Finding text is written by Claude at build time [Res #38].
- The example finding in the brief shows the intended format (mood segment, behavior, lift against catalog average, named action) and is not required text [RB95, Res #38].

---

## 4. AI jobs J1 to J8

General rules:

- Each AI job is defined separately so its depth can be chosen independently [RB46].
- Every job J1 to J8 must be built at the depth listed below; none may be omitted or built shallower [RB47, Res #56].
- Going deeper than the listed depth on any job is decided later, case by case, on time versus value [RB48].
- J1 and J2 must be real AI in the demo [RB58].
- The Claude API key lives on the server and is never exposed to the client [RB69].
- Live calls have a cost cap [RB70].
- The cost cap governs all runtime model calls; at prototype depth that is only J2 [RB70, Res #7].
- The cost cap is an Anthropic console spend limit plus a per-IP rate limit [RB70, Res #7].
- The console spend limit is the hard stop; the per-IP rate limit is best-effort per instance [Gap G18].

### J1 Affect tagger

- When: build time, as a batch [RB50].
- Input: each catalog image [RB49].
- Output: the per-work fields in Section 3.2, stored as JSON [RB49, RB50, Res #2, Gap G2].
- Depth: real AI, a Claude vision batch run through Anthropic's Message Batches API [RB50, RB58, Res #2].
- Fallback and limits: none at runtime; output is precomputed [RB50].

### J2 Mood interpreter

- When: runtime [RB52].
- Input: the Room's free-text box, describing a feeling or moment [RB22, RB51, Res #4, Gap G8].
- Output: mood position plus constraints, per Section 3.9 [RB51, Res #6].
- Depth: real AI, a live Claude API call [RB52, RB58].
- Cache: a pre-warmed static cache shipped as JSON, holding about 50 likely phrases with real Claude output, so the demo path is real AI [RB52, Res #7, Res #8].
- Any runtime cache beyond the static file is per-instance and best-effort [Res #8].
- Fallback: a local word map of about 150 words [RB52, Gap G9].
- Fallback triggers: API error, a 4-second timeout, or a reached cost cap [Res #7].
- Rate limit: 20 calls per IP per hour, best-effort per instance [Gap G18].
- Claude drafts the word map and the pre-warm phrase list at build time; Scott reviews both before deploy [Gap G9].

### J3 Matcher

- When: runtime [RB53].
- Input: the visitor's mood point and every piece's J1 coordinates [RB53].
- Output: within each lane, pieces ranked by distance from the visitor's mood [RB20, RB53, Res #37].
- Depth: Euclidean distance on (valence, arousal) [RB53, Res #23].
- Ties break by ascending catalog ID [Res #23].
- The Room shows the 6 nearest works from each lane, interleaved; ordering within each lane stays pure Euclidean distance [Res #5, refined by Res #37].
- J2 constraints do not filter J3 results [Res #6].
- Drift moves the piece to the end of the ranked list for the rest of the session [Res #10, Gap G10].

### J4 Curator voice

- When: build time, in batch [RB54, Res #9].
- Input: each piece and each of the 9 mood buckets [RB54, Res #9].
- Output: one AI-written "why this found you" line per piece per bucket, stored in copy.json [RB25, RB54, Res #9, Gap G2].
- Room names: 9, one per bucket, written once and reviewed by Scott [RB54, Res #9].
- Depth: AI-generated at build time [Res #9].
- Fallback and limits: none at runtime; output is pre-generated [RB54].

### J5 Wall reader

- When: runtime [RB55].
- Input: a photo of the visitor's own wall, by file upload only, with no camera [RB30, RB55, Res #12].
- Output: the wall photo as background, with scale set manually [RB55, Res #12].
- Depth: no AI; manual scale [RB55].
- Manual scale: the visitor drags a line across a known object and enters its length [Res #12].
- No wall detection is performed [RB76, Res #12].

### J6 Room balancer

- When: runtime [RB56].
- Input: the bag contents and the catalog [RB56, Res #15].
- Output: one suggested catalog piece, the one nearest the bag's mood center that is not already in the bag [RB56, Res #15, Gap G6].
- Where shown: the Bag screen [Res #15].
- Depth: rule-based, no AI [RB56].
- An empty bag shows no J6 suggestion [Gap G6].

### J7 Session learner

- When: runtime [RB57].
- Input: Closer and Drift reactions in the Room [RB23, RB57].
- Output: a nudged visitor mood point [RB57, Res #10].
- Depth: vector nudge, no AI [RB57].
- Closer moves the visible mood point 30% toward the piece; Drift moves it 30% away [RB23, Res #10].
- Drift also demotes that piece for the session [Res #10, Gap G10].
- After any nudge the point is clamped inside the field's unit circle [Gap G11].

### J8 Signals generator

- When: build time [RB114, Res #55].
- Input: the seeded simulated dataset in Section 3.10 [RB113, RB114, Res #38].
- Output: the four merchandising and licensing findings in Section 3.11 [RB113, Res #38].
- Depth: pre-computed; Claude writes the finding text at build time; no live AI [RB114, RB115, Res #38].
- Structural gate: no J8 code path runs at request time [Res #55].
- Signals reads only precomputed J8 output plus in-browser session state [Res #55].

---

## 5. Screens in journey order

Journey-wide rules:

- The journey has seven screens: Threshold, Room, Piece, Wall, Bag, Close, and Signals [RB16, superseded by RB90, Res #35].
- Signals is an epilogue reached after Close; Close remains the end of the shopping journey [RB33, RB91, RB110, Res #35].
- Navigation is free between all screens, including Signals [Res #3, Res #35].
- The site is emotion-led and art-forward [RB14].
- Visitors choose by feel [RB15].
- No keyword search, no filters and no category menus appear on any screen [RB15, RB19, Res #4, upheld by Res #51].
- Free-text description of a feeling or moment is allowed and is not search [Res #4, Res #11].
- Size, material and frame choices on the Piece screen are product options and are allowed [Res #4].
- The concept bar appears on every screen [Res #26, Res #35].
- The Builder Notes toggle is available on every screen and is off by default [RB35, Res #19, upheld by Res #39].

### 5.1 Threshold

Required elements:

- A wordless mood-spectrum entry [RB17].
- A two-dimensional mood field: valence from heavy to bright, arousal from calm to charged [RB18].
- A movable point the visitor moves until it feels right [RB18].
- The persistent concept bar [Res #20, Res #26].

Allowed:

- A one-line prompt: "Move the light until it feels right." [Res #20, Gap G12].
- Builder Notes, when toggled on [Res #20].

Prohibited:

- No search box and no category menu [RB19].
- No words required from the visitor [RB17, Res #21].
- No axis labels on the mood field; color and motion carry the meaning [Res #21].

Behaviors:

- The visitor's first touch on the Threshold starts the "time to first piece" timer [Res #11].

### 5.2 Room

Required elements:

- An immersive gallery ordered by emotional distance from the visitor's mood, using J3 [RB20, RB53].
- The 6 nearest works from each lane, interleaved [Res #5, refined by Res #37].
- More works load in batches on request [Res #5].
- The full catalog is never rendered at once [Res #5].
- A compact copy of the mood field for retuning [RB21, Res #22].
- A free-text box to describe a moment in the visitor's own words, routed to J2 [RB22, Res #4, Gap G8].
- Closer and Drift controls on pieces [RB23].
- The room name for the visitor's current mood bucket [RB54, Res #9].

Allowed:

- "for the <room type>" appended to the room name when J2 returned a room type [Res #6, Gap G7].

Prohibited:

- J2 constraints never filter or remove works [Res #6].

Behaviors:

- Retuning the mood re-orders the Room [RB20, RB21].
- Closer pulls the room toward a piece and Drift pushes it away, via J7 [RB23, RB57, Res #10].
- The visible mood point moves on Closer and Drift [Res #10].
- A Drifted piece moves to the end of the ranked list for the rest of the session [Gap G10].
- A re-hang is any reorder of the Room caused by a retune, a describe submission, Closer, or Drift [Res #11, Gap G13].
- J2 room type sets the default wall scene [Res #6, Gap G7].

### 5.3 Piece

Required elements:

- A detail view with the artwork [RB24].
- A short "why this found you" line from copy.json for this piece and the visitor's current mood bucket [RB25, RB54, Res #9].
- An emotional fingerprint: the 2D valence and arousal field showing where the piece and the visitor sit, plus the piece's top 3 emotion tags [RB26, Res #13].
- Size, material and frame choices, each with prices from Section 3.6 [RB27, Res #13, Gap G5].
- Frame choices presented as a premium experience [RB88].
- Each frame option shows a large corner close-up [Res #42].
- The Piece image shows a live framed preview [Res #42].
- An Add to bag control [Gap G20].

Behaviors:

- If J2 returned a size constraint, the print size is preselected [Res #6].
- The first Piece screen opened stops the "time to first piece" timer [Res #11].

### 5.4 Wall

Required elements:

- The chosen piece shown at true scale on a wall [RB28].
- True scale uses the selected print size [Res #12].
- Default wall: an 84-inch sofa is the scale reference [Res #12].
- Framed versions render on the wall at true scale, on both the preset wall and photo mode [RB89, Res #41].
- Wall color choices: plaster, sage, ink blue, clay, charcoal [RB29, Gap G14].
- An option to use a photo of the visitor's own wall [RB30].
- An Add to bag control [Gap G20].

Behaviors:

- The frame chosen on the Piece screen carries over and can be changed on the Wall [Res #41].
- Changing the frame on the Wall updates the current selection; a bag line is created only on Add to bag [Res #41, Gap G20].
- Photo mode accepts file upload only [Res #12].
- In photo mode the visitor drags a line across a known object and enters its length to set scale [RB55, Res #12].
- No wall detection and no segmentation [RB76, Res #12].
- J2 room type, when present, sets the default wall scene (sofa, bed or desk) [Res #6, Gap G7].

### 5.5 Bag

Required elements:

- Line items, each removable [RB31, Gap G20].
- Totals: subtotal plus a $9.95 flat shipping estimate; no tax [RB31, Res #14, Gap G5].
- A summary of how the chosen pieces feel together [RB32].
- The J6 suggestion [Res #15].

Behaviors:

- The "feel together" summary is a template over J1 data: the bag's mood center mapped to its bucket's room name [RB32, Res #14, Gap G6].
- No new AI job is created for the summary [Res #14].
- J6 suggests the catalog piece nearest the bag's mood center that is not already in the bag [Res #15].
- An empty bag shows a link back to the Room and no J6 suggestion [Gap G6].

### 5.6 Close

Required elements:

- Close is the end of the shopping journey; checkout is not built [RB33, Res #35].
- Scott's contact: scott@reasinger.net and https://www.linkedin.com/in/scottreasinger/ [RB34, Res #29, Gap G15].
- A statement of what the visitor just did, computed and displayed, not just logged [Res #11]:
  - No search typed [Res #11, upheld by Res #52].
  - Time to first piece, from first touch on the Threshold to the first Piece screen opened [Res #11].
  - Number of re-hangs, per the Room definition [Res #11, Gap G13].
  - Pieces chosen, equal to the number of bag lines [Res #11].
- A link to Signals, shown at all times, independent of Builder Notes [RB110, Res #39].

### 5.7 Signals

Required elements:

- One screen [RB90].
- Reachable from Close [RB91, RB110] and from Builder Notes [RB92].
- Shows what session data from this experience would tell merchandising and licensing [RB93].
- Closes the loop from site to shelf [RB94, Res #44].
- The four J8 findings, each naming a business action [RB101, Res #38].
- A visible label that the data is simulated [RB97, Res #34].
- The concept bar [Res #35].
- The follow-up ask: run this pipeline (J1, J4 and J8) on a sample of Trends' licensed SKUs [RB102, Res #45].
- The Close contact block repeated: scott@reasinger.net and the LinkedIn URL [Res #35].

Allowed:

- A "your session" panel showing the visitor's own session alongside the simulated data, reading in-browser session state only [RB98, Res #36].
- Merchandising and licensing named generically as business functions [Res #47].

Prohibited:

- No identifiable visitor tracking [RB99].
- Simulated figures are aggregate only [RB100, Res #36].
- The "your session" panel is never stored or sent anywhere [Res #36].
- No "60-slot rack" text [Res #47].
- No person's name [Res #47].
- No licensing-contract or retailer data-rights content [Res #53].
- No runtime model calls and no J8 code at request time [RB115, Res #55].

Behaviors:

- The screen ends with the follow-up ask [RB102, Res #35].

---

## 6. Builder Notes

### 6.1 Layer behavior

- Builder Notes are a layer toggled by the viewer [RB35].
- They are off by default [Res #19, upheld by Res #39].
- The toggle pulses once on first visit [Res #39].
- They explain, on each screen, how the production version would be built [RB35].
- They may appear on the Threshold when toggled on [Res #20].
- They are the in-product version of the technical brief, a build plan document produced later as a separate deliverable [RB35, Res #19].
- Builder Notes are written first; the technical brief is derived from them later [Gap G16].
- Signals is reachable from Builder Notes [RB92].
- "Art.com" may appear in Builder Notes only as plain text [Res #26].
- Builder Notes follow Message discipline (Section 1.6) [RB119, Res #43].

### 6.2 The five required lines

Builder Notes must include five lines [RB103]. They are written in first person in Scott's direct voice [RB103, Res #39]. Placement is by topic [Res #39]:

| Line | Placement | Content | Source |
|---|---|---|---|
| Platform | Threshold notes | Exact text: "Runs on what you have: a layer on top of your existing commerce platform. Nothing underneath changes." | [RB104, Res #39, overridden by Res #43] |
| SEO | Threshold notes | SEO is protected: mood is a second front door; artist, title and category pages stay indexable and untouched. Describes the production version only. | [RB105, Res #39, Res #51] |
| Licensed titles | Room notes | Licensed titles slot into the same content and AI pipeline (J1, J4 and J8). | [RB109, Res #25, Res #39, superseded by Res #45] |
| Cost | Close notes | Exact text: "Built in N days for $X in AI and hosting." Hidden until the end of the build. | [RB106, RB107, Res #39, Res #40] |
| Retailer | Signals notes | One line only: retailers send their priorities, Trends returns a finished assortment plan, and nobody's raw data moves. | [RB108, Res #39, Res #50] |

Rules for these lines:

- The platform line names no vendor [Res #43].
- The SEO line does not add artist, title or category pages to the prototype [Res #51].
- The retailer line is the single Builder Notes line covering the retailer service; the word "MCP" does not appear [RB126, Res #50, Res #58].
- Only the platform and cost lines have fixed wording [Res #39, Res #43].

### 6.3 Licensed-titles gate

- The licensed-titles line is a required element (structural gate) in the Room's Builder Notes, superseding the tracking-only typing in Res #25 [RB109, Res #25, superseded by Res #45].
- "Pipeline" in this line means the content and AI pipeline J1, J4 and J8, not the spec pipeline [Res #25, Res #45].

### 6.4 Per-screen data notes

- Each screen's Builder Notes include one note naming the first-party data that step captures (for example mood vectors, Closer and Drift preference pairs) and how it would join Trends' retail and print data [RB7, Res #27, upheld by Res #34].
- These notes are the retail-feeds-online half of "one feeds the other" [Res #44].

### 6.5 Per-screen data reads (builder reference)

| Screen | Reads | Source |
|---|---|---|
| Threshold | Mood field state | [RB18] |
| Room | catalog.json via the catalog module, J3 ranking, J2, J7, bucket room names | [RB20, RB53, Res #28, Res #9, Gap G8] |
| Piece | catalog.json, copy.json, price table | [RB25, Res #13, Gap G2, Gap G5] |
| Wall | Selected print size and frame, wall colors, wall scenes, uploaded photo | [Res #12, Res #41, Gap G7, Gap G14] |
| Bag | Bag lines, price table, bucket room names, J6 | [Res #14, Res #15, Gap G5, Gap G20] |
| Close | In-session metrics, contact values | [Res #11, Res #29, Gap G15] |
| Signals | Precomputed J8 output plus in-browser session state | [Res #55] |

---

## 7. Configuration

Tunable values live in one configuration file so they can be changed without code edits elsewhere [Res #10].

Values required in that file [Gap G18]:

| Value | Default | Source |
|---|---|---|
| Room page size | 6 per lane, interleaved | [Res #5, refined by Res #37, Gap G18] |
| Closer and Drift step | 0.30 | [Res #10, Gap G18] |
| J2 timeout | 4 seconds | [Res #7, Gap G18] |
| Bucket cut points | -1/3 and +1/3 on each axis | [Gap G4, Gap G18] |
| Price table | Section 3.6 | [Gap G5, Gap G18] |
| Shipping | $9.95 flat | [Gap G5, Gap G18] |
| Drift behavior | Move to end of ranked list for the session | [Gap G10, Gap G18] |
| J2 rate limit | 20 calls per IP per hour | [Gap G18] |

Gap G18 sets this as a minimum list ("at least") [Gap G18]. Other tunable values the sources give, which that minimum permits in the same file:

| Value | Default | Source |
|---|---|---|
| Default wall scale reference | 84-inch sofa | [Res #12] |
| Frame width | 1.25 inches | [Res #41] |
| Mat width | 2 inches | [Res #41] |
| Wall colors | plaster, sage, ink blue, clay, charcoal | [Gap G14] |
| Room types | living room, bedroom, office, kitchen, nursery, entry | [Gap G7] |
| Size word mapping | small 12x16, medium 18x24, large 30x40 | [Gap G7] |
| Wall scenes | sofa, bed, desk; default sofa | [Gap G7] |
| Fingerprint tag count | 3 | [Res #13] |
| Threshold prompt | "Move the light until it feels right." | [Gap G12] |
| Contact email | scott@reasinger.net | [Res #29] |
| LinkedIn URL | https://www.linkedin.com/in/scottreasinger/ | [Gap G15] |
| Working name | Feel First | [Gap G15] |

---

## 8. Cost and build tracking

### 8.1 Cost line rules

- Builder Notes include a cost line: "Built in N days for $X in AI and hosting." [RB106].
- The cost line replaces the Res #24 cost panel and Gap G17 [Res #24, Gap G17, overridden by Res #40].
- The line sits in the Close screen's Builder Notes [Res #39].
- The line is hidden until the end of the build [Res #40].
- N and X are filled from actual build time and actual spend at the end of the build, and are never estimated in advance [RB107].
- N is calendar days with at least one commit [Res #40].
- X is Anthropic API spend plus the hosting cost this project adds on Upsun (its project fee plus compute and storage; Scott's existing Upsun user license is excluded) plus the Claude subscription prorated to build days [Res #40, refined by Res #59].
- The tracked days and spend are the source for N and X [RB118].

### 8.2 build-log.md

- Actual build days are tracked from the first commit [RB116, Res #40].
- Actual AI and hosting spend is tracked from the first commit [RB117, Res #40].
- Tracking lives in build-log.md [Res #40].

---

## 9. Build process and repository

- Code lives in a new private GitHub repository and is built with Claude Code [RB59, Res #30].
- Plain Claude Code builds from this spec [RB64].
- GitHub Spec Kit is not used [RB65].
- The stack is Next.js deployed to Upsun, with J1 output precomputed into JSON [RB66, RB50, Res #59].
- The first version uses no database and no storage service [RB67, Res #8].
- All catalog data access goes through a single module [Res #28].
- Scott works with a mix of milestone prompts, a context folder, and his own direct prompting [RB60].
- Claude provides the milestone prompts [RB60, Res #30].
- Claude Code reads the context folder every session to know what good enough means [RB60, RB61].
- The context folder is written in full prose, not compressed shorthand [RB62].
- Starting context files: product-brief.md, quality-bar.md, ai-jobs.md, asset-sources.md, decisions.md, all referenced from CLAUDE.md [RB63].
- That file list is a starting set and may grow [RB63, Res #30].
- This spec lands in the repository at docs/spec.md [Res #30].
- build-log.md tracks days and spend from the first commit [RB116, RB117, Res #40].
- Pipeline order: extract-rules-and-flag-ambiguity first, write-spec-from-resolutions second [RB2].
- Gate: write-spec-from-resolutions runs only after all ambiguity items are resolved [Res #32]. All items #1 to #59 carry resolutions [Res #32].

---

## 10. Gaps found during spec-writing

These items are needed to build but have no backing in a rule-base entry, resolution or gap resolution. They are not requirements. Each needs a resolution before the builder relies on it.

## Gap G21
Topic: Fine-art shortfall fallback
What is missing: Res #37 sets about 100 works from each of three museums and says Cleveland is not needed, which removes the Gap G19 backup trigger. No source says what happens if a museum cannot supply about 100 usable works.
Options: (a) make up the shortfall from the other two primary museums; (b) reinstate Cleveland as a backup; (c) accept a smaller fine-art lane within the plus or minus 100 tolerance [RB45, Res #16].
Why this matters: Asset gathering starts before the build, and equal billing [RB111, Res #37] depends on both lanes having enough works near every mood.
Resolution: If a museum yields fewer than 100 usable works, fill the shortfall from the other two primary museums. The Cleveland Museum of Art is used only if fine art falls below 270 works in total. (default accepted by Scott, 2026-10-08)

## Gap G22
Topic: Room interleave order, batch loading, and Drift within lanes
What is missing: Res #37 says the Room shows the 6 nearest works from each lane, interleaved, but not which lane leads the interleave, what one "batch on request" loads under the per-lane rule [Res #5], or whether Drift's "end of the ranked list" [Gap G10] means the end of the piece's own lane list.
Options: (a) poster first, next batch is 6 more per lane, Drift moves to the end of its lane; (b) fine art first, same batch and Drift rule; (c) lead lane set in config.
Why this matters: It decides the first piece the CEO sees and the Room's ranking code.
Resolution: A poster leads the Room interleave (position 1 is the nearest poster, position 2 the nearest fine-art work, alternating). 'Show more' loads the next 6 from each lane. Drift sends a piece to the end of its own lane's ranked list for the session. (default accepted by Scott, 2026-10-08)

## Gap G23
Topic: Default mood and metrics when the Threshold is skipped
What is missing: Free navigation [Res #3] lets a visitor reach the Room, Piece or Close without touching the Threshold. No source gives a default mood point for the Room in that case, or what "time to first piece" [Res #11] shows when the timer never started.
Options: (a) default mood at the field center and the metric shown as not measured; (b) redirect to the Threshold until a mood is set; (c) Scott specifies.
Why this matters: J3 needs a mood point to rank, and the Close screen displays the metric.
Resolution: A visitor who reaches any screen without touching the Threshold starts at the center mood (0, 0). The time-to-first-piece clock starts at the visitor's first interaction on any screen. (default accepted by Scott, 2026-10-08)

## Gap G24
Topic: Where the Builder Notes link to Signals sits
What is missing: RB92 requires Signals to be reachable from Builder Notes. Res #39 adds a Close link independent of Builder Notes but does not say where the Builder Notes link appears (every screen's notes, some screens, or the toggle control).
Options: (a) a Signals link in Builder Notes on every screen; (b) only in the Close and Signals notes; (c) on the toggle control.
Why this matters: It changes Builder Notes layout on every screen, including the wordless Threshold [Res #20].
Resolution: A 'See the signals' link sits at the foot of every Builder Notes panel. (default accepted by Scott, 2026-10-08)

## Gap G25
Topic: Builder Notes content on the Signals screen
What is missing: Res #27 requires one data note per screen naming the first-party data that step captures, and RB35 requires each screen's notes to explain how production would be built. Signals captures no visitor data and was added after Res #27. No source says whether Signals carries a data note, a production-build note, or only the retailer line [Res #39].
Options: (a) retailer line only; (b) retailer line plus a production-build note; (c) all three.
Why this matters: It decides Signals' Builder Notes content.
Resolution: Builder Notes on the Signals screen carry three items: the retailer line, a note on where the aggregate figures come from (the seeded simulated dataset), and how J8 runs at build time. (default accepted by Scott, 2026-10-08)

## Gap G26
Topic: "Your session" panel contents and Signals layout order
What is missing: RB98 makes the own-session view optional and Res #36 governs how a "your session" panel reads state, but no source says whether the panel is required, what it shows (Close metrics, the visitor's mood bucket, bag lines), how it maps onto the seeded segments, what it shows when the session is empty, or whether the repeated contact block [Res #35] sits before or after the final ask [RB102].
Options: (a) required, shows the visitor's mood bucket and Close metrics next to the matching segment, hidden when empty, contact block above the ask; (b) omitted; (c) Scott specifies.
Why this matters: It decides whether Signals has any runtime component and what the last thing on the last screen is.
Resolution: The 'your session' panel is required. It shows the visitor's mood point on the segment grid, their mood bucket, and their bag contents. Layout order on Signals: findings, your session, the follow-up ask, then the contact block. (default accepted by Scott, 2026-10-08)

## Gap G27
Topic: Seeded dataset shape and J8 output file
What is missing: Res #38 fixes a script, a fixed seed, real catalog IDs and bucket segments, but no source gives the number of simulated sessions, the dataset fields, the seed value, the file names and locations for the dataset and J8 output, how "lift against catalog average" is computed, or how "thin inventory" is measured for the licensing gap finding.
Options: (a) Claude drafts the schema and file names for Scott's approval; (b) Scott specifies; (c) minimal: one signals.json holding the four findings plus the aggregate figures they cite.
Why this matters: J8 and the Signals screen read this contract, and every figure must trace to it [Res #38].
Resolution: The seeded dataset is 20,000 simulated sessions generated with fixed seed 20261008 into data/signals-seed.json; J8 findings are written to data/signals.json. Lift is a segment's pick rate for a group of works divided by the catalog-average pick rate. Thin inventory is the mood bucket with the fewest catalog works per expected session. (default accepted by Scott, 2026-10-08)

## Gap G28
Topic: Frame and mat geometry and which materials take a frame
What is missing: Res #41 gives a 1.25-inch frame width and a 2-inch mat, but not whether these are per side, whether the mat appears on every framed piece, whether frame choice applies only to the "framed print" material [Gap G5], or whether the $1.50 per inch of width uses print width or framed width.
Options: (a) per side, mat on framed prints only, frame choice enabled only for framed print, price on print width; (b) Scott specifies.
Why this matters: True scale on the Wall [RB89] and the framed price both depend on it.
Resolution: Frame (1.25 inches) and mat (2 inches) apply to framed prints only, not to canvas or paper prints. The framed price uses the print width, not the outer frame width. (default accepted by Scott, 2026-10-08)

## Gap G29
Topic: Frame imagery assets
What is missing: Res #42 requires a large corner close-up per frame option and a live framed preview, and Res #41 requires frames rendered on the wall, but no source says where the imagery for the four finishes comes from (rendered in code, generated, or photographed) given that art.com images may not be reused [RB42].
Options: (a) frames drawn in code (CSS or canvas) with simple textures; (b) generated or sourced texture images with a recorded license; (c) Scott supplies.
Why this matters: It is a new asset class the asset plan does not cover.
Resolution: Frames, frame close-ups and framed wall renders are drawn in code (CSS or SVG). No photographic frame assets are sourced. (default accepted by Scott, 2026-10-08)

## Gap G30
Topic: Scale reference for bed and desk wall scenes
What is missing: Res #12 gives an 84-inch sofa as the default wall's scale reference. Gap G7 adds bed and desk scenes but no reference dimension for them.
Options: (a) a standard queen bed width and a standard desk width, set in config; (b) all scenes scale from a stated wall width; (c) Scott specifies.
Why this matters: True scale [RB28] is wrong on any scene without a reference.
Resolution: Scale references for the other wall scenes: a queen bed 60 inches wide and a desk 60 inches wide. (default accepted by Scott, 2026-10-08)

## Gap G31
Topic: Cost line fill mechanics
What is missing: Res #40 says the line is hidden until the end of the build and gives N and X definitions, but not what event marks "the end of the build", where N and X are stored and how the line is unhidden, the format and location of build-log.md, or the proration formula for the Claude subscription.
Options: (a) end of build is the deploy Scott tags as final before the video; N and X go in the config file; build-log.md at the repo root with one row per day; subscription prorated as monthly fee times build days over 30; (b) Scott specifies.
Why this matters: The cost line is the cost-control and fast-prototyping evidence [RB8, Res #40].
Resolution: The end of the build is the day the walkthrough video is recorded. N and X are filled and frozen that day, before recording, and stored in the config file. The milestone plan includes an explicit step that flags this to Scott before the video is recorded. Each build-log.md line records date, hours, Anthropic API dollars, other spend, and notes. N is calendar days with at least one commit, from the first commit through the recording day. The Claude subscription share is the monthly fee times build days divided by 30. (Scott, 2026-10-08; end point changed from the proposed 'day the note ships')

## Gap G32
Topic: How "first visit" is detected for the toggle pulse
What is missing: Res #39 says the Builder Notes toggle pulses once on first visit. With no storage service [Res #8] and no tracking [RB127, Res #36], no source says whether "first visit" means first screen of a browser session or first visit in that browser (local storage).
Options: (a) once per browser session; (b) once per browser via local storage; (c) once per page load of the Threshold.
Why this matters: It decides whether the CEO sees the pulse on a return visit.
Resolution: The Builder Notes toggle pulses once per page load. No storage is used to remember it. (default accepted by Scott, 2026-10-08)

## Gap G33
Topic: Image credits display
What is missing: Res #53 exempts image credits from the legal-detail bar, and Gap G2 includes a license field, but no source says whether credits are displayed, on which screens, or with which fields.
Options: (a) credit line on the Piece screen (artist, source, license); (b) credits in Builder Notes only; (c) Scott specifies.
Why this matters: Museum and Library of Congress attribution, and JPL usage terms [RB39], may depend on visible credits.
Resolution: The Piece screen shows image credits: title, artist, date, source institution and license. (default accepted by Scott, 2026-10-08)