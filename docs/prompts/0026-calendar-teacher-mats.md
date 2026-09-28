# Phone calendar views, teacher app width, responsive mat grid

Source: Slack thread (HoyOS channel, the 0025 thread) · 2026-09-28 · requester: owner

## Prompt

Justin Massion, 2026-09-28 21:36 UTC, verbatim (Slack mention tokens removed), right after PR #1 (0025, v0.10.0) merged:

> Oh, on mobile the calendar had some issues on week and month view. We need a better way to handle those.
>
> And also check that the teacher app is all correct, when i was looking at it before it was too wide.
>
> Note, the mat layout isnt responsive, meaning the 16 mats are always 2 rows of 8

## Response

Three fixes on top of `main` at `e688ee2`, branch `claude/calendar-teacher-mats`, version **0.10.1** (patch: no new
surface, three components and one token changed). Model: Fable 5.1 (shared component code and the docs).
Full record in `docs/changelog/0026-calendar-teacher-mats.md`.

1. **Calendar on phones (C-02, C-02b, W-04).** Reproduced at 360 and 390 in ES and EN: the Week grid is 950 CSS px and
   the Month grid 740 px inside a 310–356 px window, so 2.5 / 3.5 of the seven columns were visible and the rest was
   swipe-only (QA I-05); the month cells were 210 px tall and mostly "Sin clases". `SessionCalendar` now has phone views
   below 900 px (`useMinWidth('shell')`): the week is a snap-scrolling strip of seven 44 px day chips with movement dots,
   the month a 7-column grid of 44 px day cells with dots, both above the selected day's classes as `ClassRow`s. No
   horizontal scroll region, sizes in rem / tokens. Desktop (≥ 900 px) grids unchanged. The C-02 movement chips wrap to
   two rows under 480 px of column instead of clipping (QA I-04).
2. **Teacher app (S-03).** No horizontal overflow on any of the four routes at 390 · 768 · 1280 · 1920 · 3840 (DOM audit).
   "Too wide" was the desktop pass of 0025: from 900 px the teacher pages took the whole 75rem `--w-app` container, so
   rosters, statement lines and the profile form stretched to 1200 px with the amount or badge 1000 px from the name. New
   D-01 token `--w-teach` (60rem) caps the teacher column from 900 px; it still grows with `--ui`.
3. **Mat grid (`MatPicker`, C-04 and the W-04 reserve sheet).** The column count now comes from the room's measured width
   and the row length in tenant config (16 mats · 2 rows → 8 per row): a row shows as 8, 4 or 2 mats per line, whichever is
   the largest divisor that keeps every mat at least 3.5rem wide (`matColumns()`, ResizeObserver). Each physical row is
   its own grid with a "Fila 1 · mats 01–08" label when it wraps, so the front / entrance reading survives. Mats are
   60–72 px tall (rem; the 0025 44 px button floor had been overriding the old px height). 4 × 4 at 360 / 390 / 768,
   2 × 8 from 1280; never clipped.

Verification: `npm run build` (tokens + tsc + vite), `npm run test:dates`, `node scripts/test-mat-bookings.mjs` green
before every `src/` commit; DOM audit (scrollWidth, widest elements, control sizes) at 360 · 390 · 768 · 1280 · 1920 ·
3840; captures for C-02, C-02b, C-04, W-04, S-03 at those six widths in ES and EN under `docs/screenshots/<code>/`.
