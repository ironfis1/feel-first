# Milestone 1 prompt: Foundation

## Before you paste this (Scott, about 15 minutes)

1. Create a new **private** GitHub repository named `feel-first`.
2. Copy this kit into the repo root: `CLAUDE.md`, `build-log.md`, `docs/`, `prompts/`.
3. Make the first commit: `M1: add spec and context folder`. This starts the clock for N.
4. Open Claude Code in the repo folder.
5. Have your Vercel account and your reasinger.net DNS settings open. You will add one DNS record when Claude Code tells you to.

Then paste everything below the line.

---

You are starting Milestone 1 of Feel First.

Before writing any code, read `CLAUDE.md` and every file it lists, in order. Then summarize back to me in five lines or fewer:
- what Feel First is,
- who it is for,
- what Milestone 1 covers,
- what it must not include.

Wait for me to confirm before you start.

## Milestone 1 scope

This comes from `docs/milestones.md`. Do only this.

1. **App.** A Next.js app (current stable, App Router, TypeScript, strict mode) with lint and type-check scripts.
   - Use plain CSS modules or a minimal styling approach. Do not install a UI component library; the visual direction is chosen in Milestone 4.
   - Add no analytics, tracking or third-party scripts of any kind (spec Section 1.7).

2. **Config.** Create `src/config/feel.ts` holding every value in spec Section 7, with the defaults given there, typed and commented with its spec citation.
   - Include the cost line text with N and X as unset values and a `showCostLine: false` flag (spec Section 8, Gap G31).
   - Include the model name used by J1, J2, J4 and J8 as a config value.

3. **Data module.** Create `src/lib/catalog.ts` as the only code that reads catalog data (Res #28).
   - For now it reads `data/fixtures/catalog.fixture.json`: 12 fine-art and 12 poster records matching the catalog.json field list in spec Section 3.2.
   - Use plausible placeholder values for every field, with `"source": "FIXTURE"` on every record so fixture data can never be mistaken for real data.
   - Expose typed functions the screens will need later: get all works, get a work by id, get works by lane. Do not implement ranking yet; that is J3 in Milestone 4.

4. **Routes.** Create stub routes for all seven screens in spec Section 5: Threshold (`/`), Room, Piece (by id), Wall, Bag, Close, Signals.
   - Each stub shows the screen name and nothing else.
   - The persistent concept bar appears on every screen (spec Section 1.5). Its text names this as a concept by Scott Reasinger, not affiliated with Trends International or art.com. Write that text, show it to me, and wait for my approval before committing it.

5. **Deploy.** Deploy to Vercel, then walk me through serving it at `art.reasinger.net`. Tell me exactly which DNS record to add, using the value Vercel shows. Confirm the site loads over HTTPS at that address.

6. **Build log.** Add today's row to `build-log.md` at the end of the session.

## Rules for this session

- If anything in this scope is unclear or conflicts with the spec, stop and ask me. Do not choose for me.
- Commit in small steps with messages prefixed `M1:`.
- Never use the em dash character in any file, comment or UI text.

## When you think M1 is done

Check each exit criterion in `docs/milestones.md` for M1 and show me the evidence for each one: the live URL, the seven routes, the concept bar text, the absence of third-party scripts, and the build-log row. Then stop. Do not start Milestone 2.
