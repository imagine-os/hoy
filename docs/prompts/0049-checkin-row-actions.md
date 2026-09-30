# Check-in row actions: compact, clear buttons

Source: Slack thread (#hoy) · 2026-09-30 · Justin Massion

## Prompt

check in and novino isnt perfect. the button height for check in seems obnoxiously large, and novino isnt clear its a button , or maybe this is a switch? or what? those buttons are just not clear.

_(Screen: S-02 Check-in, `/#/staff/checkin`, the "Esperados" roster rows. Each row showed a 44 px filled deep-blue pill "Check-in" with the accent shadow, "No vino" as a bare ghost text link, and an "Esperado" chip on every row.)_

## Brief (decided before the build)

1. Row actions are a pair of compact buttons of one height: `Button size="sm"` at 36 px visible (`--h-ctl-sm`, new
   D-01 token), padding `0 × --sp-md`, one type step smaller, 16 px icon, and a 44 px hit area through a transparent
   `::before` (the "dense row" exception, recorded in the ui-spacing skill rule 7 and `docs/design-system.md`).
2. Check-in = `variant="tonal"` (light brand-blue tint, brand text, no shadow, hover deepens) with the `check` icon.
3. No vino / No-show = `variant="outline"` (1 px border, default text, hover fills surface-2) with `user-x`.
4. No shadows on buttons inside list rows — a `RowActions` slot, not page CSS.
5. Drop the redundant "Esperado" chip (the section header says it); keep chips that differ per row. Registrados:
   outline "Deshacer"; Lista de espera: tonal "Dar cupo". Behaviour unchanged.
6. Same pair everywhere staff rows carry actions (S-02 all sections, the S-03 teacher attendance roster); customer
   rows untouched.
7. Component library (Button, RosterRow, the new RowActions) updated with states.
8. Focus order name → check-in → no-show, visible ring, 44 px hit area (`npm run audit:spacing`, 0 under 44).
9. ES / EN through `useT()`; existing keys stay.

## Response

Shipped as **v0.21.2** on branch `fix/checkin-row-actions` (numbered 0049: 0048 / v0.21.1 landed on `main` while this
was being built).

- **Button** gains two variants: `tonal` (mid brand blue `--color-accent` at 24 % over the surface, `--color-primary`
  text, no shadow; hover 34 %, active 40 %) and `outline` (1 px `--color-border-strong`, `--color-text`, transparent;
  hover `--color-surface-2`, active `--color-surface-3`). Focus is the global 2 px ring.
- **RowActions** (new molecule) is the action slot of a dense row. Inside it (`.is-dense`) no button casts a shadow and
  `size="sm"` is 36 px visible (`--h-ctl-sm`, new token), `--fs-xs` text and a 16 px icon, with a transparent `::before`
  that reaches 44 px. `RosterRow` renders its `actions` in it and gains `showStatus` (default true).
- **S-02 Check-in.** Esperados: tonal "Check-in" (`check`) + outline "No vino" (`user-x`), no "Esperado" chip.
  Llegaron: outline "Deshacer" (the "Llegó" chip, late chip and time stay). No vinieron: tonal "Check-in". Lista de
  espera: tonal "Dar cupo", no "En espera" chip (the position `#n` stays). Walk-in candidates: tonal "Entrar", no
  "Esperado" chip (they are not booked, so that chip was wrong).
- **S-03 Teacher class roster.** Presente tonal (`check`) + Ausente outline; "Deshacer" outline. Chips stay (the list
  mixes states).
- **Audit.** `scripts/spacing-audit.mjs` counts a transparent `::before` hit area; `/staff/checkin` at 390 and 1280
  reports no target under 44 px.
- **Not touched:** S-01's "Próxima clase" is a single `ClassCard` CTA, not a row list, so it keeps its button; S-04
  (Register) has no roster rows; `size="sm"` outside a dense row is still 44 px, so the 222 other small buttons
  (customer app included) are unchanged.

Before / after: `docs/screenshots/_brand/checkin-row-actions-2026-09-30.jpg`. Changelog:
`docs/changelog/0049-checkin-row-actions.md`.

Model routing: Opus 5.5 (build).
