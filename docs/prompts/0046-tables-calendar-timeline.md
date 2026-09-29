# Tables system: calendar and timeline views, saved-view rename and delete

Source: Slack thread (#hoy) · 2026-09-29 · Justin Massion

## Prompt

it looks liek the other views arent wired. Finish it up lease

## Response

Shipped as **v0.20.0** on branch `feat/tables-calendar-timeline` (from `main` at v0.19.1). The two placeholders left by 0044 are real now, and the rest of the "not wired" surface around them is closed.

- **Calendar.** New `CalendarView` organism: month, week (all-day row plus hour rows) and agenda, Monday first, a ring on today, "+N more" opening the day's agenda; arrows move the day, PageUp / PageDown the month, `t` goes to today, Enter opens the row; clicking an empty day creates a row with that date for roles with `tables.write`. The phone opens on the agenda.
- **Timeline.** New `TimelineView` organism: bars from a start column to an end column (a diamond when there is no end), lanes by the view's group-by, zoom day / week / month / quarter with `+` `−`, a today line, scroll-snap and arrow-key scrolling.
- **Date picker.** A "Fecha / Hasta" picker in the toolbar (date and timestamp columns plus `created_at` / `updated_at`; `time` columns excluded) drives both views; `TableViewConfig` gained `dateColumn`, `endColumn`, `calendarMode`, `timelineZoom`.
- **Seeded views** (`SEED_VERSION` 8): classes on the week calendar and by teacher on a timeline, events by month, memberships by plan over a quarter, hours overrides on a calendar, payroll runs on a timeline. `class_sessions` now opens on the week calendar; "Próximas clases" stays as a grid.
- **Saved views** can be renamed and deleted (their creator or `tables.write`), and a freshly saved view now appears in the menu at once (`MockProvider.list()` returned the live array, a 0044 bug).
- **Machine surface.** Six new `tables.*` actions (17 in all), `tables.setView` accepts calendar and timeline, and `?date=`, `?mode=` and `?zoom=` make the views linkable; 57 actions in `actions.json`.
- Captures at 390 / 1280 / 3840 in ES and EN, light and dark; the four `_tables/0046-*` sheets; the stale `-before` files are deleted.
- Deferred: titles for date and slug `titleColumn`s in chips and bars (B1), a compact toolbar at 1280, the capture script cutting the sticky sidebar; carded in `docs/kanban.md`.

Changelog: `docs/changelog/0046-tables-calendar-timeline.md`. Page: `docs/pages/M-03.md`. No new decision: it extends D-0021.

Model routing: Fable 5.1 (brief and review) · Opus 5.5 (calendar, timeline, date picker, view rename/delete) · Sonnet 5.5 (docs, integration).
