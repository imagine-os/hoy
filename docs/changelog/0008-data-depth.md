version: 0.5.0
date: 2026-09-17
prompt: docs/prompts/0008-data-depth.md
intent: "continue building the HoyOS system better and deeper" — turn the roadmap's P1 "Data" lane into real tables. Six groups of data that customer pages faked (derived from other tables or kept in localStorage) become nine tables with metadata, typed rows, seed data and RLS intent, and the pages that faked them read and write them through useData()/useTable().
decision: Nine additive TableDefs in `src/data/schema.ts` — `notifications`, `notification_prefs`, `reviews`, `invites`, `events`, `event_rsvps`, `payment_methods`, `content_articles`, `faq_entries` (29 → 38 tables); no existing column renamed or removed. Access intent lives on the schema as a new `TableDef.rls: string[]`, which `scripts/gen-sql.mjs` emits as `-- access:` comments above each `create table` and as a "Who may read / write" list per table in `docs/data-model.md`; `docs/roles.md` carries the same matrix in role form. Bilingual content is `{es,en}` jsonb everywhere (notification title/body, article title/summary/body_md, FAQ question/answer, event title/kind/description/bring), so a new language is a key, not a migration. `notification_prefs` is channel × category with **no row meaning enabled**, so only real choices are stored and a new category never arrives silently muted; C-19's three channel toggles are the master switch for that channel's five categories, and C-24 carries the full matrix behind a `SegmentedControl`. `group`/`order` are SQL reserved words, so the FAQ columns are `group_key` and `sort`; the section title and lead ride on each entry (`group_title`, `group_lead`) rather than in a tenth table. Event money is stored per event as `price_cop` / `member_price_cop` (0 = included) and seeded from `src/tenant/pricing.ts`, so no figure is invented off-canvas; an event charge is an ordinary `payments` row with `plan_id = null`, linked from `event_rsvps.payment_id`, which keeps C-11 history, S-04 and M-09 finance correct for free. `payment_methods.token_ref` is a demo placeholder from a new `wompiTokenise()` seam next to `wompiCheckout()` in `src/modules/customer/payments.ts` — the row shape is what Wompi will fill, and the card number never reaches HoyOS. Reviews default to `visibility = 'anonymous'`; writing one recomputes `teachers.rating_avg` from every review of that teacher, which is what the teacher app and M-06 read. `src/modules/customer/content.ts` is deleted: the rules, the about text, the FAQ and the events are rows now, seeded from `src/data/seed/content.ts`. Seed data is deterministic and derived from what happened to each demo person (their next booking, their last approved payment, the class they have not rated), so the inbox reads like a real inbox. The 23 dictionary keys the derived inbox needed are pruned with it. New component: `RatingSummary` (molecule, with `.meta.ts` and states), used read-only by `/teach/class/:id`.
rejected: (1) Keeping the derived C-24 inbox as a fallback when `notifications` is empty — two sources of truth for one screen, and "empty" would have been unreachable, so the empty state could never be tested; the table is now the only source and E-01-style emptiness is real. (2) Storing notification prefs as a JSON blob on `profiles` — one row per person is tempting, but a channel × category table is what an automation queries before sending (`where user_id = … and channel = … and category = … and enabled = false`), and a blob cannot be indexed or audited per category. (3) Seeding a `notification_prefs` row for every customer × channel × category (31 × 15 = 465 rows) — the "no row means enabled" rule makes them unnecessary noise in the mock DB and in M-03; only the demo customer gets the full matrix, plus a few real mutes elsewhere. (4) A separate `faq_groups` table for the six section headers — a tenth table, a join and an M-02 screen for six strings; denormalised `group_title`/`group_lead` on the entry is the cheaper truth until a CMS needs to rename a section in one place. (5) Reusing `bookings` for event attendance (an event as a `class_sessions` row) — events have their own capacity, their own price pair, no credits and their own cancellation policy; overloading class sessions would have leaked event rows into C-02's schedule, the capacity meters and teacher payroll. (6) Storing a real card brand/last4 pair as if tokenised (what C-05 used to derive from approved payments) — it implied HoyOS held card data it never had; the saved method is now an explicit row whose token is visibly a placeholder. (7) Giving invite rewards from the client (insert `credits` when status becomes `joined`) — free credits from the browser; the seed shows the rewarded state and the grant stays a server/staff action, documented in the table's RLS notes. (8) Keeping the C-13 read receipts and the C-20 auto-claim switch in a table — those are genuinely per-viewer conveniences, so `useLocalPref` stays for exactly those two and its doc comment now says so.
files: src/data/schema.ts src/data/seed/content.ts src/data/seed/index.ts scripts/gen-sql.mjs supabase/schema.sql docs/data-model.md docs/roles.md src/modules/customer/hooks.ts src/modules/customer/payments.ts src/modules/customer/specs.ts src/modules/customer/strings.ts src/modules/customer/content.ts(deleted) src/modules/customer/pages/{NotificationsPage,RatePage,InvitePage,EventPage,PaymentMethodsPage,RulesPage,FaqPage,ProfilePage}.tsx src/components/molecule/RatingSummary/{RatingSummary.tsx,RatingSummary.css,RatingSummary.meta.ts} src/modules/teacher/{ClassPage.tsx,specs.ts,strings.ts} docs/kanban.md docs/prompts/0008-data-depth.md docs/changelog/0008-data-depth.md
codes: C-05 C-10 C-13 C-14 C-15 C-16 C-19 C-23 C-24 S-03 M-03 D-02 K-01

## Tables added

| Table | Owns | Read by | Written by |
| --- | --- | --- | --- |
| `notifications` | the member's inbox (title/body `{es,en}`, `read_at`, `deep_link`, `sent_via`) | member (own), staff | staff + automations insert; member updates `read_at` |
| `notification_prefs` | channel × category mutes (no row = enabled) | member, admin (before sending) | member |
| `reviews` | rating 1–5, tags, comment, visibility | teacher (own sessions, anonymised), M-06 | member, once per booking |
| `invites` | referral code, invitee, status, reward credit | member (own), front desk (by code) | member inserts; staff/server moves the status |
| `events` | published events with capacity and a price pair | everyone (published) | M-02 |
| `event_rsvps` | who is going, with the payment | member (own), staff | member; staff marks attended |
| `payment_methods` | saved Wompi methods (brand, last4, token ref, default) | member (own), front desk (brand/last4) | member |
| `content_articles` | club rules (C-13) and the about text | everyone (published) | M-02 |
| `faq_entries` | C-14/C-15 questions, grouped and paged | everyone (published) | M-02 |

## What stopped being fake

- **C-24** no longer derives an inbox from `message_log` + waitlist offers + upcoming bookings, and read receipts are no
  longer in `localStorage`: it lists `notifications`, marks one or all read (`read_at`), and carries the preference
  matrix. **C-19**'s three toggles write the same table.
- **C-10** wrote `bookings.rated` and kept the stars locally; it now inserts a `reviews` row and updates
  `teachers.rating_avg`. **`/teach/class/:id`** shows that average, the count and the top tags, read-only.
- **C-16** kept sent invites per user in `localStorage`; every send is an `invites` row with the member's code.
- **C-23** read two demo events from `content.ts` with local RSVPs; it lists published `events` with live counts and
  writes `event_rsvps`, paying through the same Wompi seam and `payments`/`invoices` rows as a class.
- **C-05** derived "saved methods" from approved payments; it manages `payment_methods` (add via `wompiTokenise()`,
  remove, make default) with the seam stated in the UI.
- **C-13** and **C-14/C-15** read `content.ts`; they read `content_articles` and `faq_entries`, editable from M-03
  today and from a real M-02 editor later.

## Verification
- `npm run build` zero TypeScript errors; `npm run sql` wrote 38 tables; `npm run screenshots -- --smoke` no console errors.
- The eight rewired routes opened in Chromium as the demo customer: C-24 10 rows / 3 unread, C-23 3 events with the
  "going" badge, C-05 2 saved methods, C-13 6 articles, C-14 17 answers across 6 sections, C-16 2 invites with codes,
  C-19 the channel toggles and the link to the matrix.
- Not done: a full screenshot pass for the rewired pages (captures still show the pre-0008 screens).
