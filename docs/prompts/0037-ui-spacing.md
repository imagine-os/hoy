# UI spacing and sizing standard

Source: Slack thread (#hoy) · 2026-09-29 12:52 (America/Bogota) · requester: Justin Massion

## Prompt

when ready, please create or gather some skills for ui spacing. so that everything in the ui is wow.  Client First by FinSweet may have some good suggestions. But i dont necessarily like the complexity and confusion of it from a human perspective. not that it matters if you do a good job yourself as the ai.   But essentially i want you to make sure all spacing and sizing across everything is picture perfect. You an build those standards into the design system as appropraite

## Response

Branch `feat/spacing-standard` from `main` at `3a2376e` (merged with `926ffeb`, 0032 manual content and 0038 manual
QA), version **0.14.0**. Full record in `docs/changelog/0037-spacing-standard.md`; the decision is D-0012.

- **The standard, in D-01** (`src/design/tokens.ts`): one 4 px scale in rem (`--sp-2xs` 2 … `--sp-5xl` 96) and a
  small semantic layer that says what a space is for — `--gap-inline`, `--gap-control`, `--stack-tight / --stack /
  --stack-loose`, `--block`, `--card-pad(-lg)`, `--section(-hero)`, `--gutter`, `--grid-gap`, `--row-pad`,
  `--btn-pad-x`, `--measure` — stepping up at 768 and 1280. Radii moved to rem on the same scale. Client-First's
  good idea (name the relationship, not the number) without its utility classes.
- **The skill**: `.claude/skills/ui-spacing/SKILL.md` — the tables, nine rules, an audit recipe, a fix recipe and a
  checklist, short enough to read in two minutes. CLAUDE.md points at it.
- **The guard**: `npm run lint:spacing` runs in every build and fails when raw px/rem spacing grows. The sweep took it
  from 774 raw values to 71 (component geometry, listed in the baseline). `npm run audit:spacing` measures a live page.
- **The sweep**, only spacing, sizing, alignment and rhythm, across the website, customer app, teacher, front desk,
  admin, manual and hub. The biggest visible fixes: the website at 4K (px hero, type and columns now scale — the hero
  no longer shrinks to a strip), the hub's controls no longer scale twice on large screens, the check-in side column
  fits at 3840, page head → first block is 24 px everywhere (was 40), consecutive website sections are one section
  apart (were two), P-01's membership block lines up with the page edge, the capacity meter no longer leaves a hole
  before "7 cupos", list rows and buttons share one height and padding, the M-08a hours rows work on a phone.
- Before/after sheets: `docs/screenshots/_spacing/{website,app,staff,admin,manual,hub}-2026-09-29.jpg`.
