---
name: ui-spacing
description: HoyOS spacing and sizing standard — one 4 px scale, a small set of semantic tokens, the rules, and how to audit and fix spacing on any page. Use whenever you add or change UI (a page, a component, a module stylesheet), review a screen for polish, or a screen "looks off" (uneven gaps, cramped cards, misaligned edges, tiny targets, broken rhythm at 4K).
---

# UI spacing and sizing (HoyOS)

Source of truth: `src/design/tokens.ts` (D-01). The lint (`npm run lint:spacing`, also inside `npm run build`)
fails when raw px/rem spacing grows above `scripts/spacing-baseline.json`. Background: `docs/design-system.md`
→ "Spacing and sizing", decision D-0012.

## The scale (base 4 px, rem so the `--ui` band scales it)

| Token | px | Token | px |
| --- | --- | --- | --- |
| `--sp-0` | 0 | `--sp-lg` | 16 |
| `--sp-px` | 1 (hairline) | `--sp-xl` | 24 |
| `--sp-2xs` | 2 | `--sp-2xl` | 32 |
| `--sp-xs` | 4 | `--sp-3xl` | 48 |
| `--sp-sm` | 8 | `--sp-4xl` | 64 |
| `--sp-md` | 12 | `--sp-5xl` | 96 |

Old names `--sp-1 … --sp-16` still resolve (aliases) — do not use them in new code.

## Say what it is: semantic tokens (use these first)

| Token | Value | Use it for |
| --- | --- | --- |
| `--gap-inline` | 8 | icon ↔ label, chip contents, inline meta |
| `--gap-control` | 12 | between buttons, chips, inputs in a row |
| `--stack-tight` | 4 | eyebrow → heading, heading → lead, label → hint |
| `--stack` | 8 | lead → body, small lists, label → control |
| `--stack-loose` | 16 | form fields, paragraphs in a card, blocks in a `.stack` |
| `--block` | 24 | between blocks inside a card, a page or a section |
| `--card-pad` | 16 · 24 from 768 | card padding, all four sides |
| `--card-pad-lg` | 24 · 32 from 768 | feature cards, dialogs, plan cards |
| `--section` | 48 · 64 from 768 | between page sections |
| `--section-hero` | 64 · 96 from 768 | website hero and full-bleed bands |
| `--gutter` | 16 · 24 from 768 · 32 from 1280 | page side padding (`.container`, shells) |
| `--grid-gap` | 16 · 24 from 768 | card grids (`.grid`) |
| `--row-pad` | 12 × 16 | list rows (min-height `--h-ctl`) |
| `--btn-pad-x` | 16 | button side padding (sm 12, lg 24); vertical padding 0 |
| `--measure` | 65ch | body text line length (`.prose`) |
| `--h-ctl` / `--h-ctl-lg` | 44 / 48 | control height and square targets |
| `--h-ctl-sm` | 36 | visible height of `sm` buttons in a dense row (`RowActions`); hit area stays 44 |

Utilities already wired: `.stack` (stack-loose), `.stack-sm` (stack), `.row` / `.row-between` (gap-control),
`.grid` (grid-gap), `.container` (gutter), `.page-head` (block below it), `Card padding="md|lg"`, `.ctl-round`.

## Rules

1. Module CSS never writes a raw px/rem for margin, padding, gap, inset or the size of a control. Tokens only.
   Allowed: `1px` borders, and nudges up to 2 px marked `/* optical */`.
2. Layout sizes (column widths, max-widths, hero heights, type on the website) are rem, never px, so 3840 keeps
   the rhythm. Never multiply a rem token by `var(--ui)` — rem already scales (that doubles it).
3. Card padding is equal on all four sides. Inner corners: inner radius = outer radius − padding.
4. Text rhythm: eyebrow → h2 `--stack-tight`; heading → lead `--stack-tight`; lead → body `--stack`.
5. Buttons pad `0 × --btn-pad-x`; their height comes from `--h-ctl`. Icon-only controls are square (`.ctl-round`).
6. List rows use `--row-pad` and min-height `--h-ctl`. Grids use `--grid-gap`. Sections use `--section`;
   consecutive sections are one `--section` apart, not two.
7. Every target is ≥ 44 × 44 (text links in a card head included); nothing hover-only. Dense-row exception: inside
   `RowActions` a `Button size="sm"` is 36 px visible (`--h-ctl-sm`) and keeps a 44 px hit area through a transparent
   `::before` that extends ±4 px vertically (the audit counts it). Nowhere else is a visible control under 44.
8. Align to one edge: a block inside a section starts where the section heading starts (no stray centring).
9. Reuse the component; if the component's spacing is wrong, fix it in the component, not per page.

## Audit recipe

1. `npm run build`, then capture: `npm run screenshots -- --pages=<CODES> --widths=390,768,1280,1920,3840 --label=before`.
2. Measure: `npm run audit:spacing -- --route=/app --widths=390,1280,3840 [--grid] [--all]` — prints stacked
   sibling gaps (flags uneven and off-grid ones), card padding (flags unequal sides) and targets under 44 px;
   values are divided by `--ui`, so 3840 reports base px. `--grid` saves a 4 / 16 px grid overlay screenshot.
3. Look at the pairs side by side (390 and 1280, plus 3840): edges that do not line up, gaps that differ between
   siblings, cramped or airless cards, px-sized columns that shrink at 4K.

## Fix recipe

1. Name the relationship (control ↔ control, block ↔ block, section ↔ section) and pick the semantic token.
2. Change the shared component or utility first; a page rule only for a page-specific layout.
3. `npm run lint:spacing` (must not grow; lower the baseline with `--update-baseline` when it drops).
4. Re-capture, compare with the before, record the change in the changelog with the before/after sheet.

## Acceptance checklist

- [ ] No new raw px/rem spacing (lint green, baseline not raised)
- [ ] Gaps between siblings are equal and on the scale (audit clean or explained)
- [ ] Cards: equal padding on all sides; grids on `--grid-gap`
- [ ] Head → first block 24; sections one `--section` apart
- [ ] Targets ≥ 44 px at 390 and 1280
- [ ] 3840 capture: same rhythm as 1280, nothing capped in px, nothing tiny
- [ ] ES and EN both fit (Spanish runs ~20 % longer)
