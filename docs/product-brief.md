# Product brief: Feel First

## The situation

Trends International owns Art.com and AllPosters.com, and its CEO has a stated mandate to grow both the online and the retail business. Feel First shows what it looks like when those two feed each other. The online experience produces a kind of customer insight nobody else has, and that insight flows straight into retail and licensing decisions.

Scott Reasinger is building it as an unsolicited prototype. Its job is to earn a deeper conversation that leads to a senior technology role for Scott at Trends. It is framed as "what Art.com could do with assets only Trends has." It is never a fix for, or a comment on, the current sites.

## The idea

People don't decorate by catalog attribute. Nobody walks into a room thinking "I need a 24 by 36 abstract in blue." They think "this room feels cold," or "I want the office to feel braver," or "the nursery should feel like a slow morning." Feel First starts from that feeling. Every piece of art and every poster has a position on a simple map of feeling. The store hangs itself around wherever the visitor is.

That map does a second job. Every move a visitor makes is a signal about what people want to feel, captured before anyone buys anything. Aggregated, those signals tell merchandising which posters to put on a retail rack, which frame and size combinations to push, which moods are under-served, and which licenses would fill the gaps. That is the bridge from online to retail.

## What the visitor experiences

**Threshold.** A dark, quiet screen holds a single field of color and light, with one line of text: "Move the light until it feels right." There is no search box and no menu. Moving the point changes the color, motion and mood of the whole screen.
- Left to right runs from heavy to bright.
- Bottom to top runs from calm to charged.
- There are no labels.

**Room.** A gallery hung for that feeling. A poster leads, then the nearest fine-art work, alternating: six of each lane, nearest first.
- **Retune:** a small copy of the field.
- **Describe:** a moment typed in their own words, such as "Sunday coffee while it rains."
- **Closer:** pulls the room toward a piece.
- **Drift:** pushes it away.

Every change re-hangs the room.

**Piece.** The work shown large, with:
- One line on why it found them.
- A small chart showing where the piece and the visitor sit on the same map.
- Credits: title, artist, date, source, license.
- Product choices: size, material, and frame.

Framing gets premium treatment: large corner close-ups of each frame and a live framed preview.

**Wall.** The piece at true scale above an 84-inch sofa, framed if they chose a frame, on a wall color of their choice. They can also upload a photo of their own wall and set its scale by marking something they know the size of.

**Bag.** What they chose, a sentence on how those pieces feel together, and one suggested piece that would round out the set.

**Close.** The end of the shopping journey. Checkout is not built. The screen shows:
- No searches typed.
- How long it took to reach the first piece.
- How many times the room re-hung itself.
- How many pieces were chosen by feel.

It ends with Scott's contact details and a link to Signals.

**Signals.** The other half of the story: what thousands of sessions like this one would tell Trends. The data is seeded and clearly labeled as simulated. It shows four findings, each naming a business action:
- A retail rack candidate.
- A frame or size attach pattern.
- An under-converting mood segment.
- A licensing gap.

The visitor's own session appears alongside, read from their browser only. The screen ends with the ask: run this pipeline on a sample of Trends' licensed titles.

**Builder Notes.** A toggle, off by default, that pulses once when the page loads. It turns every screen into a technical walkthrough of how production would work. It also covers what first-party data each step captures and how that data would join Trends' retail and print data. It carries five lines Scott wants the CEO to read:
- It runs on what Trends already has.
- SEO is protected.
- Licensed titles slot into the same pipeline.
- What it cost to build.
- What a retailer-facing version would do.

## The content

About 600 works, split evenly so posters get equal billing:
- **Fine art (about 300):** from the open-access collections of the Art Institute of Chicago, the Metropolitan Museum of Art and the Rijksmuseum.
- **Posters (about 300):** NASA JPL's "Visions of the Future" travel posters, with the rest from the Library of Congress WPA poster collection.

Every work is tagged once at build time by a Claude vision model. It gets a position on the map, emotion words, a five-color palette and a subject.

## What it is not

It is not a store. Nothing can be bought, and there are no accounts and no analytics. It uses no art.com images, logos or branding. It does not include licensed pop-culture posters, which are Trends' core poster business. Builder Notes say plainly that those would run through the same pipeline, and testing that on Trends' own licensed titles is the proposed next step.

## How it reaches the CEO

A note of under 120 words from scott@reasinger.net. Its first sentence is his online and retail mandate. A link to art.reasinger.net. A walkthrough video of 75 to 105 seconds that:
- opens on the mandate,
- shows a poster by 20 seconds,
- ends on Signals.

The ask is simple: is this worth a deeper conversation?
