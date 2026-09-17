# 0008 — Data depth: the six faked tables become real

- **Source**: Justin in the Slack thread, relayed by the build coordinator to the data worker
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0008-data-depth.md`

## Prompt (verbatim)

> continue building the HoyOS system better and deeper

Coordinator brief (summarised): deepen the **data layer and customer pages**. The roadmap's P1 "Data" lane lists six
groups of tables that customer and admin pages fake with derived data or `localStorage` prefs — build them properly:
`notifications` + `notification_prefs`, `reviews`, `invites`, `events` + `event_rsvps`, `payment_methods`,
`content_articles` + `faq_entries`. Each needs a `TableDef` with metadata so M-03 shows it, typed rows, realistic seed
data for the 30 demo customers, RLS notes in the SQL generator's per-table notes, and `npm run sql`. Then rewire the
pages through `useTable`/`useData` and remove the fallbacks: C-24 notifications (list, mark read, prefs section),
C-10 rate → `reviews`, C-16 invite → `invites`, C-23 events → `events` + RSVP/pay through the existing checkout seam,
C-05 payment methods → `payment_methods` (add / remove / default, Wompi tokenisation marked as a seam), C-13 rules and
C-14/C-15 FAQ → `content_articles` / `faq_entries`. Keep every string ES + EN, give any new component a `.meta.ts`,
show the class's review average in the teacher app if trivial, and document who may read/write each new table.
Work in a worktree on `feat/data-depth`; the admin shell is being reworked in parallel, so do not touch
`src/modules/admin/**`, `DesktopShell`, `TopBar`, `NavBar`, `src/app/*`, `src/auth/*` or `MockProvider.ts`.

## Response

Built in one commit on `main` (decisions and rejected alternatives in the changelog):

- **Nine new tables** in `src/data/schema.ts`, all additive (no existing column renamed or removed), each with
  bilingual label/description, a `TableGroup` so `/#/dev/tokens`-style tooling and **M-03** pick them up automatically,
  and a new `TableDef.rls` field: `notifications`, `notification_prefs`, `reviews`, `invites`, `events`,
  `event_rsvps`, `payment_methods`, `content_articles`, `faq_entries` (29 → 38 tables).
- **`TableDef.rls` is the access contract.** `scripts/gen-sql.mjs` prints it as `-- access:` comments above each
  `create table` in `supabase/schema.sql` and as a "Who may read / write" list per table in `docs/data-model.md`,
  so the policy intent ships with the schema instead of living in a worker's head.
- **Seed**: content as data (6 rule/about articles, 17 FAQ entries in 6 sections across 2 pages, 3 upcoming events with
  RSVPs filling each between a third and three quarters), a review for every past class the seed had marked as rated
  (with `teachers.rating_avg` recomputed from them), 2–4 notifications per customer built from what actually happened
  to that person, the demo customer's full 3 × 5 preference matrix, saved payment methods for anyone who paid
  electronically, and 5 invites including one rewarded with a real `credits` row.
- **Pages rewired** (no `localStorage` left holding studio data): C-24, C-10, C-16, C-23, C-05, C-13, C-14/C-15, plus
  C-19's notification toggles. `src/modules/customer/content.ts` is deleted — the content lives in `content_articles`,
  `faq_entries` and `events` now.
- **Teacher app**: `/teach/class/:id` shows the session's review average, count and top tags, read-only, through the
  new `RatingSummary` molecule (with its `.meta.ts`, so D-02 stays a living inventory).
- **Docs**: this file, the changelog, the "Data" lane moved to Done in `docs/kanban.md`, a per-table access matrix in
  `docs/roles.md`, and `supabase/schema.sql` + `docs/data-model.md` regenerated with `npm run sql`.
- **Verified**: `npm run build` zero TypeScript errors; `npm run screenshots -- --smoke` no console errors; the eight
  rewired routes checked in a real browser as the demo customer (inbox 10 rows / 3 unread, 3 events with the RSVP
  badge, 2 saved methods + add/remove/default, 6 rule articles, 17 FAQ answers, 2 invites with their codes).

### Left for a follow-up
- A full screenshot pass (ES/EN × 390/1280) for the rewired pages: the smoke run is green, but the captures in
  `docs/screenshots/` still show the pre-0008 screens.
- M-03 shows and edits the new tables generically today; a real M-02 editor for `content_articles` / `faq_entries`
  and an M-02 event publisher are the natural next step (kanban "Product").
- `invites.status` only ever reaches `sent` from the client; moving it to `joined`/`rewarded` needs the server-side
  grant (Supabase function) that also writes `reward_credit_id`.
