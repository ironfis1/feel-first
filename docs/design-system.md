# Design system

Settled by Scott on 2026-10-15 after four design rounds (docs/design-log.md, Rounds 0 to 3). The direction is **Nocturne on the even feeling wheel**: a dark, quiet room where the visitor's mood is a single glow of light, the 12 feelings are soft colored lights around it, and the art hangs on a charcoal wall at its own proportions.

Every value below lives in one file, `src/styles/tokens.css`, and every screen uses those tokens. Base element styles are in `src/app/globals.css`. Nothing uses framework default styling. Milestones 5 and 6 build Wall, Signals and Builder Notes from this document.

## Principles

- The art is the brightest thing on the screen. Interface stays quiet: thin lines, muted text, no filled panels except mats.
- Color carries feeling. The only saturated color in the interface is the current feeling's color (`--glow`), used for the light, the wash, the focus ring and a tint on feeling headings. The 12 feeling colors never appear as decoration.
- Posters and fine art get identical treatment on every screen.
- One typeface. Hierarchy comes from size, weight (300 and 400), italic and tracked uppercase labels, not from extra fonts.
- No exclamation points, no em dashes, no marketing language (CLAUDE.md).

## Color tokens

| Token | Value | Use |
|---|---|---|
| `--c-night` | #0c0c10 | Page and Threshold background |
| `--c-wall` | #121216 | Room, Piece, Bag and Close walls |
| `--c-field` | #1a1920 | Center of the feeling wheel |
| `--c-raised` | 4% warm white | Quiet panels and mats |
| `--c-text` | #ece8df | Body text, headings |
| `--c-muted` | #a39f97 | Labels, meta, secondary lines |
| `--c-faint` | #8d8982 | Concept bar |
| `--c-placeholder` | muted at 80% (4.9:1 on the wall, AA) | Input placeholders |
| `--c-hair` | text at 14% | Rules, outlines of controls |
| `--c-hair-faint` | text at 8% | Concept bar rule, wheel ring |
| `--c-shadow` | black at 80% | Hung-work shadow |
| `--glow` | current feeling color | Light, wash, focus ring, heading tint |
| `--glow-soft` | glow at 20% | Wash behind the Threshold and Room headers |

Feeling colors (`--feel-<word>`): nostalgic #c99256, joyful #f4c64e, playful #ff8f5e, awe #7f78f2, energized #ee5a36, defiant #d43d80, tense #b8283c, melancholy #33508f, contemplative #5b84b1, wistful #a795cc, serene #5fc4b0, tender #eaa2b8.

Headings that name a feeling mix 35 to 40% of `--glow` into `--c-text`. The site is dark only; it does not switch with the system color scheme.

## Type

One serif, Newsreader, self-hosted through `next/font` (`--font-serif`), normal and italic.

| Token | Size | Weight and style | Use |
|---|---|---|---|
| `--t-display` | 46 to 92px | 300 | Room feeling heading |
| `--t-feeling` | 44 to 72px | 300 | Threshold feeling name |
| `--t-title` | 30 to 48px | 300 | Piece, Bag and Close headings |
| `--t-lede` | 19 to 25px | 300 italic | Feeling sentence, "why this found you" line |
| `--t-prompt` | 18 to 22px | 300 italic, muted | Threshold prompt |
| `--t-also` | 20px | 300 italic, muted | "a little <feeling>" |
| `--t-body` | 18px | 400 | Body text, inputs |
| `--t-caption` | 17px | 400 italic | Work titles |
| `--t-small` | 15px | italic, muted | Field labels such as "Or describe the moment" |
| `--t-meta` | 14px | 400, muted | Artist and date, prices beside choices |
| `--t-label` | 13px | uppercase, tracked 0.22em | Room name label, buttons |
| `--t-bar` | 12px | italic, faint | Concept bar |

Line height is 1 for display sizes, 1.35 for ledes, 1.45 for body. Long headings wrap; a single long feeling word must fit at 390px.

## Spacing

Scale: `--s-1` 4px, `--s-2` 8px, `--s-3` 12px, `--s-4` 16px, `--s-5` 24px, `--s-6` 32px, `--s-7` 48px, `--s-8` 64px.

- Phone side gutter is `--s-4` (16px); content max width is `--page-max` (1240px), centered.
- The hang uses `--s-8` between rows and 56px between columns; captions sit `--s-3` to `--s-4` under the work.
- Sections are separated by `--s-6` to `--s-8` and a hairline rule (`--c-hair`), never by boxes.

## Focus

Every interactive element shows `outline: 2px solid var(--glow)` with a 3px offset on `:focus-visible` (`--focus-ring`, `--focus-offset`). The wheel shows the ring on its edge. Focus is never removed without this replacement.

## Buttons and controls

All controls are at least 44px tall (`--hit`).

- **Pill button** (primary actions: Step in, Show more, Add to bag): transparent, 1px `--c-hair` border, `--radius-pill`, 12px by 28px padding, `--t-label` uppercase tracked. Hover turns the border to `--glow`.
- **Text button** (Closer, Drift, Hang it, Remove): no border, `--t-label` uppercase tracked, an underline in `--glow` appears on hover, 6px underline offset.
- **Text input** (describe a moment): no box, a single `--c-hair` underline, `--t-body` serif, placeholder in `--c-placeholder`, the submit text button on the same line.
- **Choice groups** (size, material, frame): a row of pill buttons; the chosen one has a `--c-text` border and `aria-pressed="true"`; the price sits beside the label in `--t-meta`.
- **Links** inherit color, underline on hover in `--glow`.

## The feeling wheel

- A disc with no hard edge: the 12 feelings are blurred lights (feeling color at about 55% alpha, fading out by 30% of the disc) at radius 0.75, 30 degrees apart (D-049), over a `--c-field` to `--c-night` radial ground. A faint `--c-hair-faint` ring marks the edge.
- The visitor's point is a glow of `--glow` with a white core, blended with `screen`. It is larger and slower when calm and tighter and quicker when charged.
- The named feeling sits below the Threshold wheel, never on it. "a little <feeling>" sits under it in italic.
- Full size on the Threshold is `min(86vw, 54vh, 560px)`; the compact copy in the Room header is 96 to 150px (84px on a phone, top right).
- Slim bar (D-055): once the Room header scrolls away, a fixed bar slides in at the top (`--c-wall` at 92% with a blur, a `--c-hair` rule under it) holding a 56px wheel, the feeling in `--t-lede` tinted like the heading, and the room name as a label on desktop. It slides with the Arrive timing and is inert while hidden.
- Dragging never scrolls the page (`touch-action: none`). Arrow keys move the point (Shift for larger steps).

## Image treatment

- Works are shown whole, never cropped, at their own proportions (`object-fit: contain`) [D-002].
- In the Room, works hang on a shared bottom line: one per row on a phone, two from 640px, three from 1024px. Each casts a soft drop shadow (`0 30px 50px -20px --c-shadow`) and a 1px 4% white edge.
- Image space is reserved from the work's known width and height so nothing jumps while thumbnails load.
- Framed previews are drawn in code (Gap G29): frame 1.25 inches and mat 2 inches per side, scaled to the image.
- Captions: title in italic `--t-caption`, then artist and date in `--t-meta` muted.

## Motion

| Name | Duration | Use |
|---|---|---|
| Breathe | 7s calm to 1.1s charged, looping | The point's glow |
| Lights up | 700ms ease-out fade | A screen arriving |
| Arrive | 500ms fade | A feeling name or a work appearing |
| Enter | 650ms | The light opening from the Threshold into the Room |
| Quick | 200ms | Hover and border changes |

- The wash and light follow the point with a 400 to 600ms ease.
- The Room re-hangs live during a drag; works do not fly around, they fade in place.

**Reduced motion** (`prefers-reduced-motion: reduce`): all animation and transitions are off, globally, in `globals.css`. The point is a still glow, screens and works appear instantly, and the Threshold goes to the Room without the opening light. Every state change is still visible.

## Screen frame

- The concept bar sits at the top of every screen in `--t-bar` italic on `--c-night`, with a `--c-hair-faint` rule under it.
- Every screen is usable at 390px with a 16px gutter and no horizontal scroll, and at 1440px within the 1240px column.
