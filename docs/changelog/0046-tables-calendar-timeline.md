version: 0.20.0
date: 2026-09-29
prompt: docs/prompts/0046-tables-calendar-timeline.md
intent: Justin: "it looks like the other views aren't wired. Finish it up please" — the calendar and timeline of M-03 were visible not-wired placeholders after 0044, and saved views could not be renamed or deleted.
decision: Extends D-0021, no new decision: calendar and timeline are view kinds over the same `table_views` rows (`kind` already listed them), so a saved calendar is a row with `config.dateColumn` and friends, written through `DataProvider`. Two organisms (`CalendarView`, `TimelineView`) on tokens and `Intl`, one date picker in the toolbar, seeded calendar and timeline views, rename / delete of saved views, six actions and three URL params.
rejected: A calendar library dependency (FullCalendar and the like): rejected, the organisms are about two files each on tokens and `Intl`, and CLAUDE.md keeps dependencies minimal. Drag-to-reschedule in the timeline: out of scope, the views open rows only (a drag-only path would also break the input rule).
files: docs/data-model.md; src/components/atom/Icon/Icon.tsx; src/components/organism/CalendarView/CalendarView.css; src/components/organism/CalendarView/CalendarView.meta.ts; src/components/organism/CalendarView/CalendarView.tsx; src/components/organism/CalendarView/eventTone.css; src/components/organism/CalendarView/events.ts; src/components/organism/TimelineView/TimelineView.css; src/components/organism/TimelineView/TimelineView.meta.ts; src/components/organism/TimelineView/TimelineView.tsx; src/data/MockProvider.ts; src/data/relations.ts; src/data/schema.ts; src/data/seed/views.ts; src/hub/hubMap.data.ts; src/i18n/core.ts; src/modules/admin/TablesPage.tsx; src/modules/admin/actions.ts; src/modules/admin/specs.ts; src/modules/admin/strings.ts; src/modules/admin/tables.css; src/modules/admin/tables/Panels.tsx; src/modules/admin/tables/TimeViews.tsx; supabase/schema.sql; docs/screenshots/M-03/*; docs/screenshots/_tables/0046-*; public/actions.json; public/hub-map.json; docs/pages/M-03.md; docs/reference/surfaces.md; docs/plans/tables-system.md; docs/kanban.md; docs/README.md; docs/prompts/0046-tables-calendar-timeline.md; docs/changelog/0046-tables-calendar-timeline.md; package.json; package-lock.json
codes: M-03, D-02

Model routing: Fable 5.1 (brief and review) · Opus 5.5 (calendar, timeline, date picker, view rename/delete) · Sonnet 5.5 (docs, integration).

Checks: build green (34 s on the branch, again after merging `main` at v0.19.1) · tsc 0 errors · lint:spacing 61 / 61 (baseline unchanged) · manual-lint 0 · hub-map and actions.json regenerated (57 actions, version 0.20.0) · smoke (`npm run screenshots -- --smoke`) no console errors on M-03 and D-02 · Playwright checks of the calendar keyboard, create-on-day, rename / delete, the timeline zoom keys and `tenants` refusing the date views · dark and 3840 checked by eye · captures M-03 390 / 1280 / 3840 in ES and EN, light and dark, plus four `_tables/0046-*` sheets. The Rollup circular-chunk warning between `src/actions/bus.ts` and `src/actions/index.ts` appears in the build; this branch does not touch those files (carded).

## Why

0044 shipped the tables system with five real views and two disabled entries, Calendar and Timeline, marked "not wired
yet". Justin saw the switcher and asked for the rest. Both views are the point of tables that hold time: class sessions,
events, hours overrides, memberships and payroll runs are read by date, not by column. Saved views also had a
loose end from 0044: they could be created but never renamed or removed.

## What changed

- **Calendar (`CalendarView`).** New organism in `src/components/organism/CalendarView/` (`CalendarView.tsx`, `.css`,
  `.meta.ts`, `events.ts`, `eventTone.css`). Three modes: **month** (Monday first, up to three chips a day, "+N more" opens
  that day's agenda, a ring on today), **week** (an all-day row and hour rows) and **agenda** (a list by day; the phone
  default). Keyboard: arrows move the day, PageUp / PageDown move the month, `t` goes to today, Enter opens the row.
  Clicking an empty day creates a row with the date prefilled, for roles with `tables.write`. Weekday and month names come
  from `Intl`; chip tones come from the row's status (`eventTone.css`).
- **Timeline (`TimelineView`).** New organism in `src/components/organism/TimelineView/`. Bars run from the date column to
  the end column, or a diamond for a point; lanes follow the view's group-by; zoom is day / week / month / quarter with `+`
  and `-`; a today line; scroll-snap plus arrow-key scrolling; labels sit beside short bars. Both organisms have a
  `.meta.ts` with states and are used by M-03, so D-02 lists them.
- **Date picker.** `src/modules/admin/tables/TimeViews.tsx` (`CalendarTableView`, `TimelineTableView`, `DateColumnPicker`,
  `timeColumns`). The toolbar shows "Fecha / Hasta" in the calendar and timeline views: date and timestamptz columns plus
  `created_at` / `updated_at`; `time` columns cannot place a row on a day, so they are left out (by design). Without a
  choice the view uses `dateColumnOf` and `endColumnOf` from `src/data/relations.ts`. Tables with no date column keep the two
  entries disabled with a hint.
- **View config.** `TableViewConfig` gains `dateColumn`, `endColumn`, `calendarMode` and `timelineZoom`; new
  `CALENDAR_MODES` and `TIMELINE_ZOOMS` in `src/data/schema.ts`; `VIEW_ICON.calendar` is `calendar-days`, and the Icon atom
  adds `calendar-days` and `calendar-range`. `npm run sql` regenerated `supabase/schema.sql` and `docs/data-model.md`.
- **Seeds (`SEED_VERSION` 7 → 8).** `tvw_sessions_week` (`class_sessions`, week calendar, `starts_at` → `ends_at`, now the
  table default; "Próximas clases" stays as a grid), `tvw_sessions_timeline` (lanes by teacher, week),
  `tvw_events_month` (default), `tvw_memberships_timeline` (lanes by plan, quarter, end = `renews_at` because `ends_at` is
  empty on the seed rows), `tvw_hours_calendar` (`start_date` → `end_date`, month) and `tvw_payroll_timeline`
  (`period_start` → `period_end`, lanes by status, quarter).
- **Rename and delete saved views.** `Panels.tsx` adds both to the saved-views menu, for the view's creator or a role with
  `tables.write`, with an in-product confirm for delete and toast strings `admin.tables.views.renamed` / `deleted`.
- **URL params.** `?date=YYYY-MM-DD`, `?mode=month|week|agenda` and `?zoom=day|week|month|quarter`, used with
  `?view=calendar|timeline`. Without `?date=` the cursor is today when the period has rows, else the nearest row.
- **Actions (17 `tables.*`, was 11).** New: `tables.setDateColumn` (column, endColumn?), `tables.calendarMode` (month, week,
  agenda), `tables.timelineZoom` (day, week, month, quarter), `tables.goToDate` (YYYY-MM-DD, today, next, previous),
  `tables.renameView` and `tables.deleteView` (both `tables.write`). `tables.setView` now accepts calendar and timeline.
  `public/actions.json` regenerated: 57 actions.
- **Strings.** `core.calendar.*`, `core.timeline.*`, `admin.tables.views.rename / renameNamed / renamed / deleteNamed /
  deleteConfirm / deleteBody / deleted`, `admin.tables.date`, `date.group`, `dateEnd`, `dateEnd.none`, `lanes`,
  `calendar.aria`, `timeline.aria`; removed `admin.tables.view.calendar.what`, `view.timeline.what` and `view.soon`, so no
  "not wired yet" copy is left for these two views. The hub map tool purpose now reads "El gestor de datos con vistas:
  cuadrícula, lista, galería, tablero, calendario, línea de tiempo y grafo." (`public/hub-map.json` regenerated).
- **Shared-layer fix.** `MockProvider.list()` returned the live array, so `useTable` memos missed inserts (a 0044 bug: a
  freshly saved view did not appear in the menu until a reload). It now returns a copy on every call.

## Before / after

Before (0044): Calendar and Timeline were disabled placeholders and `class_sessions` opened on a filtered grid; the
0044 captures in `docs/screenshots/M-03/` showed that state. After: `docs/screenshots/M-03/{es,en}-{390,1280,3840}[-dark].jpg`
now open on the week calendar (the agenda on the phone), plus four sheets that show each mode:
`docs/screenshots/_tables/0046-calendar-month-1280.jpg`, `0046-calendar-week-1280.jpg`, `0046-timeline-1280.jpg` and
`0046-calendar-agenda-390.jpg`. The twelve stale `M-03/*-before.jpg` files from 0044 were deleted with this pass, per
`docs/rules/documentation.md` §4.

## Follow-ups

Carded in `docs/kanban.md` as "0046 follow-up": titles for date and slug `titleColumn`s in chips and bars belong to B1 labels
(Sonnet) · the toolbar wraps to three rows at 1280 with the date picker, so a compact toolbar is needed (Opus) · the Rollup
circular-chunk warning between `src/actions/bus.ts` and `src/actions/index.ts`, check whether `main` shows it (Sonnet) ·
the capture script still cuts the sticky sidebar (Sonnet). Note only: `time` columns cannot drive a calendar, by design.
Closed by this pass: Pass B **B2** (calendar and timeline) and the 0044 card "saved views cannot be renamed or deleted"
(which is also the first half of **B6**; sharing and per-role defaults remain).

**Numbering.** `main` moved to v0.19.1 (pass 0045, the developer brief) while this branch was open, so this pass took the
next free numbers: prompt and changelog 0046, version 0.20.0.
