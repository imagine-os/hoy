version: 0.2.0
date: 2026-09-17
prompt: docs/prompts/0002-customer-app.md
intent: Replace every customer stub with a real, data-backed page — the booking flow end to end first (C-02 → C-03 → C-04 → C-05 → C-08 → C-08b → C-20 with E-01…E-04), then account and plans, then the auth flow (A-01, A-02, A-03, C-21) — mobile-first inside PhoneShell, ES+EN, specs extended with the real section names.
decision: One module (`src/modules/customer`) with `pages/`, `auth/`, `hooks.ts` (entitlements, joined sessions, booking transactions), `policy.ts` (cancellation window 2 h, claim window 30 min, hold 10 min, IVA 19 %, pause ≤ 30 days, lockout 5/15), `payments.ts` (the Wompi seam: `wompiCheckout` simulator + `recordPayment` writing payments/invoices), `specs.ts` (every canvas code re-exported as `canvasSpecs` with real `layout`/`data`/`states`/`notes`, so the inspector, the layout editor and the screenshot script all read the same thing), `content.ts` (rules, FAQ, demo events until CMS tables exist). Booking is a real transaction on the DataProvider: bookings insert, class_sessions.booked_count update, credits ledger delta, waitlist promotion with claim_until, payments + invoices rows; every page follows change events through useTable, so capacity meters update live in the tab. Entitlement order follows the canvas (credits → membership → trial → single → packs). IVA is computed by `OrderSummary` from `policy.ivaRate` over IVA-inclusive prices — never typed. The bottom dock now carries four destinations (Home, Schedule, History, More) per the C-25 rule. Twelve new shared components, each with a meta: Skeleton, Notice, ListRow/ListGroup, SegmentedControl, DateStrip, CountdownRing, EmptyState, Accordion, RatingScale, OtpInput, OrderSummary, BreathingRings. Edge states are both real (inline in C-01, C-03, C-04, C-08, A-02) and reachable as demo routes (`/app/state/*`, `/auth/locked`) so they appear as built in `/#/dev/specs`.
rejected: (1) Editing `canvasSpecs.ts`/`gen-specs.mjs` to carry the real layouts — shared file; instead the module re-exports an extended copy under the same name. (2) A separate `auth` module — the brief scopes ownership to `src/modules/customer/**`, so the auth pages live in `customer/auth/` with their own `AuthShell`. (3) Adding tables (notifications, reviews, invites, events, payment_methods, content_articles, faq_entries) — schema is shared; C-24 derives its inbox from message_log + waitlist + bookings, C-10/C-16/C-23 keep their rows per user in localStorage (`useLocalPref`) and the need is listed below. (4) Real cross-tab realtime — needs MockProvider to reload on the `storage` event (shared). (5) Month view / online classes — removed by the canvas. (6) A bespoke bottom sheet — `Drawer side="bottom"` already exists and is reused for every sheet.
files: src/modules/customer/** (index.ts, strings.ts, specs.ts, policy.ts, payments.ts, hooks.ts, content.ts, ui.tsx, customer.css, HomePage.tsx, pages/*.tsx, auth/*.tsx) · src/components/atom/Skeleton/** · src/components/molecule/{Notice,ListRow,SegmentedControl,DateStrip,CountdownRing,EmptyState,Accordion,RatingScale,OtpInput,OrderSummary}/** · src/components/organism/BreathingRings/** · docs/prompts/0002-customer-app.md · docs/changelog/0002-customer-app.md · docs/kanban.md
codes: C-02 C-02b C-03 C-04 C-05 C-06 C-07 C-07b C-08 C-08b C-10 C-11 C-13 C-14/C-15 C-16 C-17 C-18 C-19 C-20 C-21 C-22 C-23 C-24 C-25 A-01 A-02 A-03 A-05 E-01 E-02 E-03 E-04 (C-01 gains the E-01 empty state)

## Routes

| Code | Route | Notes |
| --- | --- | --- |
| C-02 / C-02b | `/app/schedule` (`?view=week`) | useLayout wired |
| C-03 | `/app/class/:id` | useLayout wired |
| C-04 | `/app/checkout/:id` (`?pass=`, `?claim=`) | E-02 inline |
| C-05 | `/app/payment-methods` | Wompi seam |
| C-06 | `/app/plans` | |
| C-07 / C-07b | `/app/passes` · `/app/credits` | |
| C-08 / C-08b | `/app/booking/:id` · `/app/booking/:id/change` | E-03 inline |
| C-10 | `/app/rate/:id` | |
| C-11 | `/app/history` (`?tab=payments`) | |
| C-13 | `/app/rules` | |
| C-14 / C-15 | `/app/faq` · `/app/faq/2` | |
| C-16 / C-17 | `/app/invite` (`?session=`) · `/app/gift` | |
| C-18 | `/app/teachers` · `/app/teachers/:id` | |
| C-19 | `/app/profile` | useLayout wired |
| C-20 | `/app/waitlist/:id` | |
| C-22 | `/app/membership` | |
| C-23 | `/app/events` · `/app/events/:id` | |
| C-24 / C-25 | `/app/notifications` · `/app/more` | |
| A-05 | `/app/intention` | |
| E-01 / E-02 / E-03 | `/app/state/empty` · `/app/state/declined` · `/app/state/cancelled` | demo routes |
| A-01 / A-02 / A-03 / C-21 / E-04 | `/auth` · `/auth/sign-in` · `/auth/sign-up` · `/auth/recover` · `/auth/locked` | public surface |

## Shared-change requests for the coordinator (not done here, outside this module's ownership)

1. `src/modules/dev/LayoutEditorPage.tsx` — add `'C-02', 'C-03', 'C-19'` to `WIRED`.
2. `src/modules/hub/HubPage.tsx` "Customer app" card and `src/modules/website/SiteShell.tsx` / `pages/SchedulePage.tsx`
   sign-in prompt → link to `/auth/sign-in` instead of switching user directly.
3. `src/auth/SessionProvider.tsx` — accept any `users` row id (not only demo users) so A-03 can sign in as the account it
   just created; today it continues as the demo customer and says so.
4. `src/data/MockProvider.ts` — listen to `window` `storage` events and reload + emit `reset` so capacity meters update
   across tabs (in-tab realtime already works through change events).
5. `src/data/schema.ts` (+ seed + `npm run sql`) — tables the customer pages are waiting for: `notifications`
   (+ `notification_prefs`), `reviews` (C-10), `invites` (C-16), `events` + `rsvps` (C-23), `payment_methods` (C-05),
   `content_articles` / `faq_entries` (C-13, C-14/15). Until then the pages use derived data or `useLocalPref`.
6. `src/tenant/tenant.ts` / M-08 settings — move `policy.ts` values (cancel window, claim window, hold, IVA, pause cap,
   charge notice, lockout) into tenant settings; also bank account + NIT for transfer instructions.
7. `src/i18n/core.ts` — a `core.nav.history` key would let the dock label live with the other nav labels
   (`customer.nav.history` is used meanwhile).
8. Screenshot pass (`npm run screenshots`) for the 35 new routes; `[screenshot: <code>]` placeholders are in the prompt doc.

## Verification
`npm run build` — zero TypeScript errors. `npm run screenshots -- --smoke` — 84 routes, no console errors.
Headless probe of the flow (390 px, demo customer): schedule → class → checkout → confirm → booking → change sheet →
cancel returns the credit and the notice shows; account, auth and state routes render their h1.
