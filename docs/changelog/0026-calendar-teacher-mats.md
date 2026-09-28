version: 0.10.1
date: 2026-09-28
prompt: docs/prompts/0026-calendar-teacher-mats.md
intent: Justin, after the 0025 merge: "on mobile the calendar had some issues on week and month view. We need a better way to handle those. And also check that the teacher app is all correct, when i was looking at it before it was too wide. Note, the mat layout isnt responsive, meaning the 16 mats are always 2 rows of 8"
decision: (1) `SessionCalendar` gets phone views below the `shell` breakpoint (900 px): the week is a snap-scrolling strip of seven 44 px day chips with per-class movement dots, the month a compact 7-column grid of 44 px day cells with dots; both sit above the selected day's classes rendered as `ClassRow`s (the day view's list, shared). The seven-column card grids stay as they were from 900 px. The C-02 movement chips wrap under 480 px of column (QA I-04). (2) The teacher pages are capped at a new D-01 token `--w-teach` (60rem) from 900 px; the 75rem `--w-app` container stays for the two-column customer pages. (3) `MatPicker` derives its columns from the room's measured inline size and the tenant row length (`tenant.studio.mats / matRows`): `matColumns()` picks the largest divisor of the row length whose mats stay at least `--mat-size` (3.5rem) wide with the `--sp-2` gap, so a row of 8 shows as 8, 4 or 2 per line; each physical row is its own grid with a "Fila n · mats a–b" label when it wraps. Mat heights move to rem and the rule is scoped so the global 44 px button floor no longer overrides it. Patch bump to 0.10.1: no new surface or route.
rejected: (1) Keeping the phone week / month as horizontal scroll regions with a bigger hint, or dropping to Day view only on phones — the user asked for "a better way", and a strip + list is the phone pattern every calendar app uses; also rejected a CSS-only container query for the calendar (the view needs a different DOM, not a narrower grid). (2) A two-column `SplitSections` layout for the teacher home — the pages are hard-coded lists, not `useLayout` sections, and rosters / statements read best as one column; a width cap fixes the stretch with one rule. Also rejected reusing `--w-content` (70rem is still too wide for a roster). (3) `repeat(auto-fill, minmax(--mat-size, 1fr))` alone — the column count would land on 5, 6 or 7 and a line would no longer map to a whole part of a physical row, so row semantics (front / back) would be lost; per-breakpoint `--mat-cols` (the 0025 container query) — one breakpoint, not the room width, and it did not know the tenant's row length. A JS measurement with a pure `matColumns()` keeps the maths testable and tenant-driven; no new tenant config was needed.
files: package.json; package-lock.json; src/design/tokens.ts; src/design/tokens.css (generated); src/components/organism/SessionCalendar/{SessionCalendar.tsx,SessionCalendar.css,SessionCalendar.meta.ts}; src/components/organism/MatPicker/{MatPicker.tsx,MatPicker.css,MatPicker.meta.ts}; src/modules/website/strings.ts; src/modules/website/specs.ts; src/modules/customer/{customer.css,specs.ts}; src/modules/teacher/{teacher.css,specs.ts}; docs/prompts/0026-calendar-teacher-mats.md; docs/changelog/0026-calendar-teacher-mats.md; docs/kanban.md; docs/README.md; README.md; ROADMAP.md; docs/qa/responsive-2026-09-28.md; docs/pages/{C-02,C-02b,C-04,W-04,S-03}.md; docs/screenshots/{C-02,C-02b,C-04,W-04,S-03}/ (360 · 390 · 768 · 1280 · 1920 · 3840, ES + EN; S-03 payroll label at 390 / 1280)
codes: C-02 C-02b C-04 W-04 S-03 D-01 D-02

The branch is `claude/calendar-teacher-mats`, from `main` at `e688ee2` (PR #1 merged). `npm run build`, `npm run test:dates`
and `node scripts/test-mat-bookings.mjs` passed before every commit that touches `src/`. Model routing: Fable 5.1 for
the three components (shared code), the token and the docs.

## What was wrong (reproduced 2026-09-28, DOM audit + captures)

- **Calendar, 360 / 390, ES and EN (C-02 `/app/schedule`, W-04 `/site/schedule`).** Week: `.calendar-grid` 950 px wide in a
  326–356 px `.calendar-window` (310–340 on the site), columns 129 px, so Monday to Wednesday were visible and Thursday
  onward needed a swipe (`desliza el calendario`). Month: grid 740 px, columns 99 px, cells 210 px tall (`min-height`),
  3.5 columns visible, most cells "Sin clases", so a month was 6 screens tall and 2 screens wide. Every control was
  already 44 px and text 12 px or more (the 0025 floor); the defect was layout, not sizes. QA I-05, and I-04 for the
  clipped chip row at 360 (`Fluye` cut, `Filtrar` half visible).
- **Teacher app, 390 · 768 · 1280 · 1920 · 3840 (S-03, four routes).** `document.documentElement.scrollWidth ===
  innerWidth` everywhere: no horizontal overflow, no fixed px width or `min-width` besides `.teach-month` (150 px, now rem).
  From 900 px the content column was the 75rem `--w-app` container (1200 px at 1280, 1350 at 1920, 2100 at 3840), so the
  roster rows, payroll lines and the bio form stretched to full width with the status badge or amount at the far right
  — the "too wide" Justin saw.
- **Mat grid (C-04 `/app/checkout/:id`).** 4 × 4 at 360 / 390 (the 0025 container query at 23.75rem), but a 2 × 8 strip of
  50 × 48 px mats at 768 (560 px column) and 69 × 48 at 1280; the column count came from one breakpoint, not the room's
  width, and the mats were 48 px tall because the global `button:not(…)` 44 px floor (specificity 0,2,1) beat
  `.mat-place { min-height: 58px / 72px }` (0,1,0).

## Phone calendar (`SessionCalendar`)

- `compact = !useMinWidth('shell')`. Below 900 px: `view === 'week'` renders `.calendar-strip` (grid, `grid-auto-columns:
  minmax(var(--h-ctl), 1fr)`, `scroll-snap-type: x mandatory`, hidden scrollbar) of seven `.calendar-strip-day` buttons
  (weekday, date, `.calendar-dots`), then the selected day's list; `view === 'month'` renders `.calendar-month-compact`
  (7 columns, weekday header, 42 `.calendar-cell` buttons ≥ 44 px, outside-month dimmed), then the list. Tapping a day
  selects it (`aria-pressed`, `aria-label` = long date · "{n} clases"); the toolbar (arrows, Today, Day / Week / Month,
  date input) is unchanged. Dots: one per class (max 4, then `+n`), coloured by movement (`--mv-*-dot`), dimmed when
  cancelled / completed.
- `.is-compact .calendar-window { overflow: visible }` — no scroll region; sizes in rem and tokens (`--h-ctl`, `--fs-xs`,
  `--sp-*`), so the 4K band scales them. Day view and the ≥ 900 px grids are byte-for-byte the same markup as before.
- Strings: `site.calendar.weekStrip`, `site.calendar.monthGrid` (new), `site.calendar.note` (no longer mentions swiping).
  D-02 meta: states `week (compact strip, < 900 px)`, `month (compact grid, < 900 px)`, `selected day`; `usedBy` corrected
  to `W-04`.
- C-02 chips: `@container app (max-width: 480px) { .cust-filters { flex-wrap: wrap } .cust-filters-scroll { display:
  contents } }` — the chips and the Filter button flow as one wrapping row, no mask, no swipe (I-04).
- Audit after: `.calendar-window` `scrollWidth === clientWidth` at 360 / 390 / 768, ES and EN, both routes, Week and Month;
  0 controls under 44 px inside the calendar. At 360 on the site the strip is 332 px in a 310 px window, so the seventh
  chip is one snap away (the strip is a scroll-snap row by design; in the app column all seven fit from 360).

## Teacher column (`--w-teach`)

- D-01: `'w-teach': '60rem'` beside `w-app` (`src/design/tokens.ts` → `--w-teach` in the generated `tokens.css`).
- `teacher.css`: `@media (min-width: 900px) { .appshell-main > .teach.container { max-width: var(--w-teach) } }` — beats
  the shell's `.appshell-main > .container` rule by specificity. Column: 960 px at 1280, 1080 at 1920, 1680 at 3840
  (was 1200 / 1350 / 2100). `.teach-month` `min-width` 150 px → 9.375rem. Below 900 px nothing changes.
- S-03 spec: `checkedAt: [390, 768, 1280, 1920, 3840]`, note updated.

## Mat grid (`MatPicker`)

- `matColumns(width, perRow, matMin, gap)` (exported): the largest divisor `d` of `perRow` with `d·matMin + (d−1)·gap ≤
  width`, else 1. `useMatColumns(ref, perRow)` measures `.mat-room` (clientWidth minus padding) with a `ResizeObserver`
  (window resize fallback), `matMin = 3.5rem`, `gap = 0.5rem` in current root px, so the answer follows `--ui`.
- Markup: `.mat-rows` > one `.mat-row` per physical row (`tenant.studio.matRows`), each a `role="group"` `.mat-grid`
  named "Fila n" with `--mat-cols` inline, preceded by `.mat-row-label` ("Fila 1 · mats 01–08") only when `cols < perRow`.
  Front (teacher) edge and entrance labels unchanged. `data-cols` on `.mat-room` for tests and the inspector.
- CSS: `--mat-size: 3.5rem` on `.mat-picker`; `.mat-picker .mat-grid .mat-place { min-height: calc(var(--mat-size) +
  var(--sp-4)) }` (72 px; 60 px under 600 px) — scoped so it wins over the global button floor. The 0025 `@container`
  rule and `container-type` are gone. Closes the 0025 kanban note "`MatPicker .mat-place` heights to rem".
- Measured: 360 → 4 × 4, 70 × 60 px; 390 → 4 × 4, 77 × 60; 768 → 4 × 4, 116 × 72; 1280 → 2 × 8, 73 × 72; 1920 → 2 × 8,
  82 × 54 → 72+ after the fix; 3840 → 2 × 8, 128 × 81. Never clipped (`gridRight ≤ innerWidth`). No tenant config was
  added; `docs/data-model.md` unchanged.

## Docs and captures

- Page docs C-02, C-02b, C-04, W-04, S-03: "Responsive layout (0026)" and a `Verified 2026-09-28` line at the six widths.
- QA matrix `docs/qa/responsive-2026-09-28.md`: I-04 and I-05 carry a `fixed 0026` note. Kanban: the "C-02 / W-04 calendar
  on phones" card moves to Done; the `MatPicker` heights note is struck; new deferred items listed there.
- Captures: `node scripts/screenshots.mjs --pages=C-02,C-02b,C-04,W-04,S-03 --widths=360,390,768,1280,1920,3840` and
  `--only=/teach/payroll --label=payroll --widths=390,1280`.
