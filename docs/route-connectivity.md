# Route connectivity

**Rule: a route enters `LAUNCH_ROUTES` (`src/config/launchRoutes.ts`) only when `scripts/test-route-connectivity.mjs` is
green for it.** Waves 2–4 add the cut routes back through this check; a route added to the list never gets an `OPEN`
entry, it must be connected, unless the owner approved launching it with named gaps: then each of its `OPEN` entries
carries `approved` (who, when, where recorded) and names the wave that closes it, the check prints it "owner-approved",
and an entry on a route added after the audit (`ADDED_ROUTES`) without both fails. Today that is `/teach` and
`/admin/content` (owner, 2026-10-31, lane H plan; P-03b). (Hoy all-roles programme, lane G, 2026-10-31; plan
`lovely-beaming-candy`, Wave 1; the approval rule: review round 1, M4.)

The check runs in `.github/workflows/auth-checks.yml` next to `test-launch-routes.mjs`:

```
node scripts/test-route-connectivity.mjs            # the check
node scripts/test-route-connectivity.mjs --report   # plus the inventory below, for every production route (launch and cut)
```

## What it proves

For every route the production build registers (and the app shell every route renders in, shown as `*`): every table
read or write, provider method and mock-only branch the check can see in the page's code, as the production build sees
it, goes through a working Company OS adapter (`src/data/companyos/mapping.ts`) or a method `CompanyOSProvider` really
has. It is a static check with the limits below; the Wave 5 walk covers what it cannot see.

How it traces a route (signed-out pages: see *Signed-out pages* after the limits):

1. **Routes.** Each module's `index.ts` (minus vite.config.ts `REVIEW_ONLY_MODULES`): its production block when it has one
   (`PRODUCTION_BUILD ? [...]`, `productionRoutes()`), else every route; the page is the `lazyPages` export (or the
   component of `createElement(X)`). A route in `LAUNCH_ROUTES` is enforced; the others are reported only.
2. **Page code.** esbuild bundles the page export with `PRODUCTION_BUILD` (and `SERVER_RULES`) folded to `true`, the
   review-only demo data side-effect free (as in `vite.config.ts`), dynamic imports followed as static ones and
   barrel wrappers (`export const X = withEdition(Y)`) marked pure, then tree-shakes. What survives is what the
   production page can reach, split back into its source modules.
3. **Uses.** In each module: `useTable`/`useRow`, `list`/`get`/`insert`/`update`/`remove`/`peek` with their table,
   tables passed through helper hooks (`DYNAMIC`), provider methods, `request(method, path)` paths, page code that throws
   `not_in_launch`, and branches on `data.name === 'mock'`.
4. **Judgement**, against the adapters and the provider source:

| Finding | Meaning in production |
|---|---|
| `unknown <table>` | no adapter: reads are empty, writes refuse `not_in_launch` |
| `sink <table>` | `audit_log`, `activity_events`: reads are empty, writes are dropped (`message_log` reads through the `messages` adapter since round 1; `/admin/activity` and the dashboard read `GET /audit`) |
| `read_only <table>` | a write to static content or a read-only entity, or removing the settings row, refuses |
| `member user_roles` | writing a role row refuses `not_in_launch` (update, remove, and an insert inside `atomic()`) |
| `stub <method>` | the provider method only throws (`promotion()` → `promotions_disabled`) |
| `missing <method>` | an optional `DataProvider` method `CompanyOSProvider` lacks (`editSession`, `contentBatch`, `appendClassPayRule`, `generateRecurrence`, `purchasedGift`, `peek`, `reset`…) |
| `voucher voucher` | `voucher()`: only issue-with-classes and claim are connected; the extras refuse |
| `not_in_launch <file>` | page code throws `not_in_launch` itself (the review build's `if (!cos) throw` guard after `cosOf()` is not one) |
| `mock_only <file>` | the flow runs only on the review build's MockProvider: on Company OS it throws `…_disconnected` or the control is hidden |
| `dynamic <arg>` | a table name the check cannot resolve (computed, reassigned, a template literal): add a `DYNAMIC` entry naming where its values come from. A write always needs a resolved name |
| `signed_out <table> (empty)` / `(write)`, `signed_out request <path>` | on a signed-out page: a read of a table outside the live public set, which the provider answers with nothing (no request); any table write (no session: the Hoy server answers 401); a `request()` the server does not forward signed out. See *Signed-out pages* below |

Hostile checks in the script: synthetic pages that read a sink table (directly and two imports away), an unknown table,
write a new table, write through a computed or reassigned name or a template literal, call a stub (also destructured),
insert a role row, write a static table, signed out read an entity outside the live set or the settings row, write
signed out, run a mock-only flow or throw `not_in_launch` must fail; a page on connected tables, a signed-out page on
every live table (`list` and `get`), the signed-out pages' tables read signed in, and a review-only branch must pass; a finding in no list,
and a list entry whose finding is gone, must fail.

**Limits.** It over-reports at module level, and it can miss what it cannot see in the text:
- A module counts when any statement of it survives tree-shaking; a `mock_only` file is reported even if the route calls
  only its safe part.
- Uses are found by pattern on the bundled code: `useTable`/`useRow`, `.list/.get/.peek/.insert/.update/.remove`,
  `.method(` and destructured `{ method }`, `.name === 'mock'`. A provider reached another way (a method held in a
  variable, a table name built and passed through an untraced helper, a branch on `name !== 'companyos'`) is not seen.
- Known findings are keyed by `kind subject` per route pattern, not by file: a new use of an already listed table on the
  same route does not fail. `BY_DESIGN` `sink audit_log` inserts are accepted everywhere.
- `clientCreate` drops (a `class_ledger` insert other than comp, gift or voucher) are judged connected. The ones on launch
  routes today sit inside flows already reported `mock_only`.
- The `@__PURE__` marking drops a top-level `const x = call()` whose result is unused (none today).
- The app shell `*` is traced as signed in. Run-time switches other than `PRODUCTION_BUILD` (`data.name === 'companyos'`, `reviewTools`)
  cannot be folded: the ones that send production elsewhere are listed in `RUNTIME_REVIEW` with the switch's text,
  which must stay in its file.
- `request()` paths are listed, not checked against the Company OS API: a wrong path fails at run time, which the
  Wave 5 access walk below catches.
- Signed-out pages are the public-surface routes, minus `/auth/callback` and `/no-access` (only a signed-in person
  reaches them). The check does not see what the `public_site` policies hide inside a live table (fields, rows): that is
  Company OS's `public-site.integration.test.ts` and Hoy's `test-website-signed-out-live.mjs`.

## Signed-out pages (lane F's model, lane G2)

Signed out, `CompanyOSProvider` reads a few tables live through the Hoy server's read-only `public_site` identity
(ADR 0029) and answers every other table with nothing, without asking Company OS. The check reads that model from the
code, never from a copy of its own:

- `PUBLIC_TABLES` and the signed-out guards of `list()` and `get()` in `src/data/companyos/CompanyOSProvider.ts`;
- `PUBLIC_ENTITIES` in `server/app.mjs` (the entities the server forwards signed out; anything else stays 401).

The **live set** is every `PUBLIC_TABLES` entry whose adapter is an entity the server forwards (today plans, teachers,
rooms, class_templates, class_sessions). On a signed-out page, a read of a static table or a live table is connected; any
other read is `signed_out <table> (empty)` (the visitor sees an empty or default answer); any table write, live tables
included, is `signed_out <table> (write)`; a `request()` other than `POST /query` and `GET /api/<public entity>[/<id>]`
is `signed_out request <path>`. The check fails closed: when a guard changes shape or either list cannot be read, or when a
`PUBLIC_TABLES` table is not forwarded by the server (the provider would ask and get 401). The `BY_DESIGN` settings
save holds only while `tenants` is not read live signed out (a check enforces it; lane H2 revisits it).

Limits of the signed-out model: the app shell `*` is judged signed in only (its reads today are user-scoped, and the
site's `tenants` read is already flagged through the site pages); provider commands that are not table writes or
`request()` (`uploadFile`, `fileBlob`) are not judged signed out; `PUBLIC_TABLES` and `PUBLIC_ENTITIES` are read as a list
of quoted names (a spread inside the literal would be missed), and the guard regexes do not pin the order of branches
inside `list()`.

## The lists in the script

- **`PENDING`**: a Wave 1 lane is closing it now (lane C, E or F). The check fails when the finding is gone and the entry
  is still there: the closing lane deletes it, or the coordinator at merge.
- **`OPEN`**: found by this audit on routes already in `LAUNCH_ROUTES`, with no lane closing it yet. Each names the wave
  or reuse-map row that would, or `unassigned`. Same staleness rule. **These need an owner decision**: assign, or take
  the route out of `LAUNCH_ROUTES` until it is connected.
- **`BY_DESIGN`**: unconnected on purpose, with the reason the empty or dropped answer is right in production (the
  layout editor's stored order, `peek()` as a first-render snapshot, the client's audit-row copy, the staff home's
  review-only timeline, device-local photos, the administrators' settings save that `useSettings()` returns to every
  reader and no visitor calls). Kept short; the check fails on an entry no launch route uses.
- **`DYNAMIC`**, **`RUNTIME_REVIEW`**: tracer inputs (helper hooks that forward a table name; run-time review branches).

## Findings on launch routes (2026-10-31)

### Closed by a Wave 1 lane (`PENDING`)

| Finding | Routes | Lane | Note |
|---|---|---|---|
| ~~`unknown memberships`~~ | `/app`, `/admin` | C (closed 2026-10-31) | the your-plan card (`customer/HomePage.tsx`) and the members tile (`admin/DashboardPage.tsx`) read packs |
| ~~`sink audit_log`~~ | `/admin/activity` | E (closed; round 1 deleted the stale entry: the production build drops the review branch) | `ActivityPage` reads `GET /t/:t/audit` |
| ~~`signed_out plans, teachers, rooms, class_templates, class_sessions`~~ | `/site/*` | F (closed 2026-10-31) | read live through the public_site identity; the check judges signed-out pages against that live set (lane G2). What remains signed out is in `OPEN` below |

### Found by this audit, no lane yet (`OPEN`)

| Finding | Routes | Proposed | What breaks |
|---|---|---|---|
| ~~`unknown memberships`~~ | `*` and 15 staff, admin and customer routes | C (closed 2026-10-31, scope extension) | `staff/people.ts`, `data/useAnalytics.ts` read the active pack (`data/packMemberships.ts`); `customer/hooks.ts` reads none in production (the pack is `pkg`) |
| `unknown`/`sink`/`mock_only` (lane C homes) | `/teach`, `/admin/content` | owner-approved (2026-10-31, lane H plan, P-03b; `approved` on each entry); each entry names its wave | H1: the Teacher home reads its classes, today's rosters (inline) and the week live; specials and substitutes (Wave 4), the payroll estimate (Wave 4) and the rating (Wave 3) say "available later". The Marketing home reads live and refuses every save with `content_later` before anything is sent (Wave 3 content entities). The hidden code is still on the route, so the entries stay, named by wave |
| ~~`signed_out tenants (empty)`~~ | `/site/*` (13 routes) | H2 (closed 2026-10-31): the public `studio_settings` record is read live; the pay data is in `studio_private` (decision F-01) | `useSettings()` (opening hours, contact, policies, legal texts) and the payment instructions on `/site/contact` read the `studio_settings` row, which also holds the payroll rate card and payout account, so `public_site` may not read it (decision F-01): visitors see the app defaults, not what the studio saved |
| ~~`signed_out bookings (empty)`~~ | `/site/schedule` (`/site/*`) | H2 (closed 2026-10-31): public_site reads a booking's class and mat only; the provider reads them as booked mats | the schedule drawer's mat map (`SchedulePage` `taken`, `MatPicker` without `taken`) shows every mat free; checkout refuses `spot_taken` after sign-in. Places left are right (`booked_count` is live) |
| ~~`sink audit_log`~~ | `/admin` | review round 1 (closed 2026-11-01): the card reads the Company OS audit trail like `/admin/activity` | the dashboard's recent-activity card is always empty |
| ~~`sink message_log`~~ | `*`, `/admin/crm/:id`, `/staff`, `/staff/inbox/*` | H2 (closed 2026-10-31): `message_log` reads `comms_log` + `staff_note`; a WhatsApp is logged (`logged`, wa.me), a note is a staff note; the unread badge is 0 by design (no inbound WhatsApp, R-04) | `data/comms.ts`: the inbox, member messages and notes, the unread badge read nothing; a sent note is dropped |
| ~~`unknown hours_overrides`~~ | `/admin/settings/*`, `/app/plans`, `/app/faq`, `/app/faq/2`, `/app/more`, `/site/*` | H2 (closed 2026-10-31): recipe entity `hours_override`; closed dates also go to bookings `review_closed_dates` | `useOpeningHours()`: holidays and special hours are never read |
| ~~`read_only legal_documents`~~ | `/admin/settings/*` | H2 (closed 2026-10-31): publishing a version customers accept bumps people `signup_consents`; other texts refuse `legal_document_in_build` | publishing a legal document refuses `read_only` |
| ~~`unknown special_charges`~~ | `/admin/finance` | H1 (closed 2026-10-31) | review-build only; production labels a product-less sale by `payment.concept` |
| ~~`mock_only customer/profileSave.ts`~~ | `/app/profile` | H1 (closed 2026-10-31) | the person (name, date of birth, emergency contact via H2, phone) in one keyed `/batch`, read back (`profile_unconfirmed`, never a silent save) |
| ~~`mock_only customer/notificationPrefs.ts`~~ | `/app/profile`, `/app/notifications` | H1 (closed 2026-10-31) | comms `notification_pref`; channels whatsapp, email, in_app (push hidden) |
| ~~`mock_only profile-review/contracts.ts`, `unknown email_change_previews`~~ | `/app/profile` | H1 (closed 2026-10-31) | by design: production says the studio changes a login email (people refuse a member's own change, `email_change_not_allowed`); the preview is chosen out of the production build, so no `BY_DESIGN` entry is needed (it would be unused) |
| ~~`mock_only customer/accountData.ts`~~ | `/app/account` | H1 (closed 2026-10-31) | export from the tables a member reads; the deletion request is a keyed `deletion_requests` insert (H2's `privacy_request` form, below) |
| ~~`mock_only customer/marketingConsent.ts`~~ | `/app/account` | H1 (closed 2026-10-31) | `notification_pref` marketing rows; the opt-in is worked out from them |
| ~~`mock_only data/trialEligibility.ts`~~ | 8 customer routes | H1 (closed 2026-10-31) | the person's own lots (trial product, or `lot_source` from H2) and pending or approved trial payments; the server's `trial_used` is final |
| ~~`mock_only classSchedule/studioCancellation.ts`~~ | `/app/class/:id`, `/app/booking/:id`, `/app/booking/:id/change` | H1 (closed 2026-10-31) | `ownStudioReturn.ts`: the person's `cancel_return` entry for the booking (credits `studio_cancel`; H3 for a paid single class). The admin cancel is already a status update (`scheduleOps.cancelOccurrenceOps`) |
| ~~`mock_only customer/payments.ts`~~ | `/app/plans`, `/app/classes` | H1 (closed 2026-10-31) | production never calls it: it refuses `checkout_server_only` under `SERVER_RULES`; `/app/classes` buy-more lists live prices and opens the payment page |
| ~~`mock_only quotes/hooks.ts`~~ | `/app/plans`, `/app/passes`, `/app/classes` | H1 (closed 2026-10-31) | the browser quote is review only by build flag (production prices on Company OS) |
| ~~`mock_only admin/paymentInstructions.ts`, `sink audit_log` (its receipt read)~~ | `/admin/settings/*` | H1 (closed 2026-10-31) | the settings adapter in one keyed `/batch`; a retry after a lost answer succeeds |
| ~~`sink audit_log` (receipt read)~~ | `/app/profile` | H1 (closed 2026-10-31) | the receipt read is review only |
| `unknown practice_goals`, `sink activity_events` | `/app`, `/admin/analytics`, `/admin/crm/:id` | Wave 2 (practice goals) | practice goals, milestones and streaks are empty and never saved |
| ~~`unknown deletion_requests`~~ | `/app/account` | H2 (closed 2026-10-31): a `privacy_request` form submission (forms) | the account screen's flow itself is `mock_only customer/accountData.ts` (H1) |
| `signed_out deletion_requests (write)` | `/site/delete-account` (`/site/*`) | unassigned (a submit-only forms identity and a Hoy server submit route, ADR 0042, as Between Gigs) | the website's deletion form (W-09) has no session: 401 |
| `unknown waitlist` | `/staff`, `/staff/checkin` | Wave 2 (waitlist) | the waitlist sections are empty |
| `unknown events` | `/admin/settings/*` | Wave 3 (events) | media use by events is not counted |
| `unknown reviews` | `/site` | Wave 3 (class reviews) | the site home's reviews are empty |
| `unknown payroll_runs`, `unknown payroll_lines` | `/admin/finance` | Wave 4 (teacher pay) | the payroll figures are empty |

Connected with no finding (43 of the 81 launch routes, after lane H1; the shell `*` has findings): `/`, `/coming-soon`,
`/auth`, `/auth/sign-in`, `/auth/sign-up`, `/auth/callback`, `/no-access`, `/dev`, `/app/schedule`, `/app/schedule/week`,
`/app/class/:id`, `/app/checkout/:id`, `/app/passes`, `/app/classes`, `/app/booking/:id`, `/app/booking/:id/change`,
`/app/history`, `/app/rules`, `/app/teachers`, `/app/teachers/:id`, `/app/profile`, `/app/notifications`,
`/app/legal/:kind`, `/app/access`, `/app/receipts`, `/app/receipts/:paymentId`, `/app/pay/:what/:id`, `/app/vouchers`,
`/app/vouchers/:code`, `/app/gift-voucher`, `/staff/register`, `/staff/expense`, `/staff/transfers/*`, `/staff/vouchers/*`,
`/staff/receipts/:paymentId`, `/admin/crm`, `/admin/emails/*`, `/admin/finance/expenses`, `/admin/class-schedule/*`,
`/admin/settings/booking-policies`, `/admin/products/*`, `/admin/vouchers/*`, `/admin/payments/report`.

Lane Y3 (Hoy test-fixes, 2026-11-01) added the Hub's Construction & testing band, connected with no finding, super
admin only (route roles): `/manual`, `/manual/decisions`, `/manual/:chapter`, `/docs`, `/docs/source`, `/docs/*`,
`/dev/knowledgebase`. The manual ships read-only: its LMS tables (`manual_progress`, `manual_training`,
`manual_requests`, `manual_overrides`) have no Company OS entity, so in production `ops-manual/manualData.ts` reads
none of them (no request) and every LMS write says `not_in_launch` and changes nothing; the stats block of a chapter
counts active packs from the credits ledger (R-05) instead of `memberships`.

## Inventory: launch routes

Generated by `node scripts/test-route-connectivity.mjs --write` (`--report` prints it); the check fails when these tables differ from the code (review round 2, L5), so regenerate after a change. R = read,
W = written, with each table's adapter kind (`none` = no adapter). Findings name who closes them.

| Route | Tables (read / written) → adapter | Methods, requests | Findings |
|---|---|---|---|
| `*` | R: class_ledger (entity), message_log (messages), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity)<br>W: tenants (settings) | — | none |
| `/admin` | R: bookings (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), rooms (entity), teachers (entity)<br>W: page_layouts (none) | GET /members, POST /query | none |
| `/admin/analytics` | R: bookings (entity), class_ledger (entity), class_sessions (entity), modalities (static), page_layouts (none), practice_goals (none), profiles (entity), teachers (entity), users (entity)<br>W: page_layouts (none) | — | unknown practice_goals → Wave 2 |
| `/admin/content` | R: audit_log (sink), class_pay_rules (none), class_templates (entity), events (none), media_assets (static), modalities (static), rooms (entity), teacher_profile_proposals (none), teachers (entity), user_roles (session), users (entity)<br>W: audit_log (sink), class_templates (entity), teacher_profile_proposals (none), teachers (entity) | appendClassPayRule(), contentBatch(), generateRecurrence() | unknown teacher_profile_proposals → Wave 3 (content entities) (owner-approved); sink audit_log → Wave 3 (content entities) (owner-approved); mock_only modules/profile-review/contracts.ts → Wave 3 (content entities) (owner-approved); unknown events → Wave 3 (content entities) (owner-approved); unknown class_pay_rules → Wave 3 (content entities) (owner-approved); missing appendClassPayRule → Wave 3 (content entities) (owner-approved); dynamic table → Wave 3 (content entities) (owner-approved); mock_only modules/admin/contentRecovery.ts → Wave 3 (content entities) (owner-approved); dynamic entity2 → Wave 3 (content entities) (owner-approved); missing contentBatch → Wave 3 (content entities) (owner-approved); missing generateRecurrence → Wave 3 (content entities) (owner-approved) |
| `/admin/emails` | R: —<br>W: — | POST /query | none |
| `/admin/crm` | R: —<br>W: — | POST /query | none |
| `/admin/crm/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), consents (entity), message_log (messages), payments (entity), plans (entity), practice_goals (none), profiles (entity), tenants (settings), user_roles (session), users (entity), vouchers (entity)<br>W: audit_log (sink), message_log (messages), tenants (settings) | — | unknown practice_goals → Wave 2 |
| `/admin/activity` | R: —<br>W: — | GET /members | none |
| `/admin/settings` | R: events (none), feature_flags (entity), hours_overrides (entity), legal_documents (legal), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings)<br>W: audit_log (sink), feature_flags (entity), hours_overrides (entity), legal_documents (legal), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown events → Wave 3 |
| `/admin/settings/hours` | R: events (none), feature_flags (entity), hours_overrides (entity), legal_documents (legal), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings)<br>W: audit_log (sink), feature_flags (entity), hours_overrides (entity), legal_documents (legal), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown events → Wave 3 |
| `/admin/settings/features` | R: events (none), feature_flags (entity), hours_overrides (entity), legal_documents (legal), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings)<br>W: audit_log (sink), feature_flags (entity), hours_overrides (entity), legal_documents (legal), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown events → Wave 3 |
| `/admin/settings/payments` | R: events (none), feature_flags (entity), hours_overrides (entity), legal_documents (legal), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings)<br>W: audit_log (sink), feature_flags (entity), hours_overrides (entity), legal_documents (legal), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown events → Wave 3 |
| `/admin/settings/communications` | R: events (none), feature_flags (entity), hours_overrides (entity), legal_documents (legal), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings)<br>W: audit_log (sink), feature_flags (entity), hours_overrides (entity), legal_documents (legal), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown events → Wave 3 |
| `/admin/settings/branding` | R: events (none), feature_flags (entity), hours_overrides (entity), legal_documents (legal), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings)<br>W: audit_log (sink), feature_flags (entity), hours_overrides (entity), legal_documents (legal), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown events → Wave 3 |
| `/admin/settings/content` | R: events (none), feature_flags (entity), hours_overrides (entity), legal_documents (legal), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings)<br>W: audit_log (sink), feature_flags (entity), hours_overrides (entity), legal_documents (legal), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown events → Wave 3 |
| `/admin/finance` | R: class_ledger (entity), expense_templates (entity), expenses (entity), invoices (entity (read-only)), payments (entity), payroll_lines (none), payroll_runs (none), plans (entity), profiles (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: tenants (settings) | — | unknown payroll_runs → Wave 4; unknown payroll_lines → Wave 4 |
| `/admin/finance/expenses` | R: expense_templates (entity), expenses (entity)<br>W: expense_templates (entity), expenses (entity) | — | none |
| `/admin/settings/booking-policies` | R: —<br>W: — | GET /modules/bookings/settings, PATCH /modules/bookings/settings | none |
| `/admin/class-schedule` | R: —<br>W: — | POST /batch, POST /query | none |
| `/` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/coming-soon` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/app` | R: activity_events (sink), bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), plans (entity), practice_goals (none), profiles (entity), rooms (entity), teachers (entity), users (entity)<br>W: activity_events (sink), page_layouts (none), practice_goals (none) | — | unknown practice_goals → Wave 2; sink activity_events → Wave 2 |
| `/app/schedule` | R: bookings (entity), class_sessions (entity), class_templates (entity), media_assets (static), modalities (static), page_layouts (none), rooms (entity), teachers (entity)<br>W: page_layouts (none) | — | none |
| `/app/schedule/week` | R: bookings (entity), class_sessions (entity), class_templates (entity), media_assets (static), modalities (static), page_layouts (none), rooms (entity), teachers (entity)<br>W: page_layouts (none) | — | none |
| `/app/class/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), media_assets (static), modalities (static), page_layouts (none), payments (entity), plans (entity), rooms (entity), teachers (entity)<br>W: page_layouts (none) | — | none |
| `/app/checkout/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), payments (entity), plans (entity), rooms (entity), teachers (entity)<br>W: bookings (entity) | POST /query | none |
| `/app/plans` | R: bookings (entity), class_ledger (entity), hours_overrides (entity), payments (entity), plans (entity), tenants (settings)<br>W: class_ledger (entity), tenants (settings) | POST /query, peek() | none |
| `/app/passes` | R: bookings (entity), class_ledger (entity), payments (entity), plans (entity)<br>W: — | peek() | none |
| `/app/classes` | R: bookings (entity), class_ledger (entity), payments (entity), plans (entity)<br>W: class_ledger (entity) | POST /query, peek() | none |
| `/app/booking/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), rooms (entity), teachers (entity), tenants (settings)<br>W: bookings (entity), page_layouts (none), tenants (settings) | — | none |
| `/app/booking/:id/change` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), rooms (entity), teachers (entity), tenants (settings)<br>W: bookings (entity), page_layouts (none), tenants (settings) | — | none |
| `/app/history` | R: bookings (entity), class_sessions (entity), class_templates (entity), invoices (entity (read-only)), modalities (static), payments (entity), plans (entity), rooms (entity), teachers (entity)<br>W: — | — | none |
| `/app/rules` | R: content_articles (static), media_assets (static)<br>W: — | — | none |
| `/app/faq` | R: faq_entries (static), hours_overrides (entity), tenants (settings)<br>W: tenants (settings) | — | none |
| `/app/faq/2` | R: faq_entries (static), hours_overrides (entity), tenants (settings)<br>W: tenants (settings) | — | none |
| `/app/teachers` | R: modalities (static), teachers (entity)<br>W: — | — | none |
| `/app/teachers/:id` | R: class_sessions (entity), class_templates (entity), media_assets (static), modalities (static), rooms (entity), teachers (entity)<br>W: — | — | none |
| `/app/profile` | R: bookings (entity), class_ledger (entity), notification_prefs (entity), page_layouts (none), payments (entity), plans (entity), profiles (entity), tenants (settings), users (entity)<br>W: notification_prefs (entity), page_layouts (none), profiles (entity), tenants (settings), users (entity) | — | none |
| `/app/notifications` | R: notification_prefs (entity), notifications (entity), users (entity)<br>W: notification_prefs (entity), notifications (entity) | — | none |
| `/app/more` | R: bookings (entity), class_ledger (entity), hours_overrides (entity), payments (entity), plans (entity), profiles (entity), tenants (settings), users (entity)<br>W: tenants (settings) | — | none |
| `/app/account` | R: deletion_requests (entity), invoices (entity (read-only)), legal_acceptances (entity), notification_prefs (entity), page_layouts (none), profiles (entity), tenants (settings), users (entity)<br>W: audit_log (sink), deletion_requests (entity), notification_prefs (entity), page_layouts (none), tenants (settings) | — | none |
| `/app/legal/:kind` | R: legal_acceptances (entity), legal_documents (legal), tenants (settings)<br>W: legal_acceptances (entity), tenants (settings) | — | none |
| `/auth` | R: —<br>W: — | — | none |
| `/auth/sign-in` | R: —<br>W: — | — | none |
| `/auth/sign-up` | R: —<br>W: — | — | none |
| `/dev` | R: —<br>W: — | — | none |
| `/dev/knowledgebase` | R: —<br>W: — | — | none |
| `/docs` | R: —<br>W: — | — | none |
| `/docs/*` | R: —<br>W: — | — | none |
| `/hub` | R: —<br>W: — | — | none |
| `/auth/callback` | R: —<br>W: — | — | none |
| `/app/access` | R: —<br>W: — | — | none |
| `/no-access` | R: —<br>W: — | — | none |
| `/app/receipts` | R: —<br>W: — | POST /query | none |
| `/app/receipts/:paymentId` | R: —<br>W: — | GET /api/payment/:x, GET /api/person/:x, GET /api/product/:x, GET /members, POST /query | none |
| `/staff/receipts/:paymentId` | R: —<br>W: — | GET /api/payment/:x, GET /api/person/:x, GET /api/product/:x, GET /members, POST /query | none |
| `/manual` | R: user_roles (session), users (entity)<br>W: — | — | none |
| `/manual/decisions` | R: profiles (entity)<br>W: — | — | none |
| `/manual/:chapter` | R: bookings (entity), class_ledger (entity), class_sessions (entity), hours_overrides (entity), profiles (entity), studio_policies (static), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: tenants (settings) | — | none |
| `/docs/source` | R: —<br>W: — | — | none |
| `/admin/products` | R: —<br>W: — | POST /batch, POST /query | none |
| `/staff` | R: audit_log (sink), bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), message_log (messages), modalities (static), payments (entity), plans (entity), profiles (entity), rooms (entity), teachers (entity), user_roles (session), users (entity), waitlist (none)<br>W: — | — | unknown waitlist → Wave 2 |
| `/staff/inbox` | R: class_ledger (entity), message_log (messages), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), message_log (messages), tenants (settings) | — | none |
| `/staff/inbox/:id` | R: class_ledger (entity), message_log (messages), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), message_log (messages), tenants (settings) | — | none |
| `/staff/checkin` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), plans (entity), profiles (entity), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity), waitlist (none)<br>W: bookings (entity), page_layouts (none), payments (entity), tenants (settings) | POST /batch | unknown waitlist → Wave 2 |
| `/staff/register` | R: class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), payments (entity), plans (entity), profiles (entity), rooms (entity), teachers (entity), user_roles (session), users (entity)<br>W: bookings (entity), payments (entity) | POST /batch | none |
| `/staff/expense` | R: expense_templates (entity), expenses (entity)<br>W: expense_templates (entity), expenses (entity) | — | none |
| `/teach` | R: audit_log (sink), bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), message_log (messages), modalities (static), practice_goals (none), profiles (entity), reviews (none), rooms (entity), space_bookings (none), special_charges (none), teachers (entity), tenants (settings), users (entity)<br>W: audit_log (sink), message_log (messages), tenants (settings) | — | sink audit_log → Wave 4 (teacher app: substitute requests log to the audit) (owner-approved); mock_only modules/teacher/substituteRequest.ts → Wave 4 (teacher app: substitute requests) (owner-approved); unknown practice_goals → Wave 2 (practice goals; "Mis números") (owner-approved); unknown reviews → Wave 3 (class reviews; the rating tile) (owner-approved); unknown space_bookings → Wave 4 (teacher app: specials) (owner-approved); unknown special_charges → Wave 4 (teacher pay: specials payouts) (owner-approved) |
| `/staff/transfers` | R: —<br>W: — | GET /me, GET /members, POST /batch, POST /query | none |
| `/app/pay/:what/:id` | R: tenants (settings)<br>W: — | GET /api/booking/:x, GET /api/occurrence/:x, POST /batch, POST /files, POST /files/:x/confirm, POST /query | none |
| `/admin/payments/report` | R: —<br>W: — | GET /members, POST /query | none |
| `/staff/vouchers` | R: payments (entity), plans (entity)<br>W: — | POST /api/:x, POST /query | none |
| `/admin/vouchers` | R: payments (entity), plans (entity)<br>W: — | POST /api/:x, POST /query | none |
| `/app/vouchers` | R: —<br>W: — | POST /api/:x, POST /query | none |
| `/app/vouchers/:code` | R: —<br>W: — | POST /api/:x, POST /query | none |
| `/app/gift-voucher` | R: plans (entity)<br>W: — | — | none |
| `/site` | R: class_sessions (entity), class_templates (entity), hours_overrides (entity), media_assets (static), modalities (static), page_layouts (none), plans (entity), reviews (none), rooms (entity), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | unknown reviews → Wave 3 |
| `/site/about` | R: hours_overrides (entity), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/classes` | R: hours_overrides (entity), media_assets (static), modalities (static), page_layouts (none), plans (entity), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/classes/:slug` | R: hours_overrides (entity), media_assets (static), modalities (static), page_layouts (none), plans (entity), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/modalities` | R: hours_overrides (entity), media_assets (static), modalities (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/schedule` | R: bookings (entity), class_sessions (entity), class_templates (entity), hours_overrides (entity), media_assets (static), modalities (static), page_layouts (none), rooms (entity), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/teachers` | R: hours_overrides (entity), media_assets (static), modalities (static), page_layouts (none), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/plans` | R: hours_overrides (entity), media_assets (static), page_layouts (none), plans (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/faq` | R: faq_entries (static), hours_overrides (entity), media_assets (static), page_layouts (none), plans (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/contact` | R: hours_overrides (entity), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/delete-account` | R: hours_overrides (entity), media_assets (static), page_layouts (none), tenants (settings)<br>W: audit_log (sink), deletion_requests (entity), page_layouts (none), tenants (settings) | — | signed_out deletion_requests (write) → unassigned (needs a submit-only forms identity and a Hoy server submit route, ADR 0042, as Between Gigs) |
| `/site/legal/terms` | R: hours_overrides (entity), legal_documents (legal), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |
| `/site/legal/privacy` | R: hours_overrides (entity), legal_documents (legal), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | none |

## Inventory: routes Waves 1–4 add back (not in `LAUNCH_ROUTES`)

Each must be green before it is listed. `/hub` (lane D) and `/dev` are launch routes now (the table above).

| Route | Tables (read / written) → adapter | Methods, requests | Findings |
|---|---|---|---|
| `/admin/finance/subscriptions` | R: —<br>W: — | — | none |
| `/admin/content/articles` | R: content_articles (static)<br>W: audit_log (sink), content_articles (static) | — | read_only content_articles |
| `/admin/content/faq` | R: class_templates (entity), faq_entries (static), users (entity)<br>W: audit_log (sink), class_templates (entity) | — | dynamic table; mock_only modules/admin/contentRecovery.ts |
| `/admin/content/events` | R: event_rsvps (none), events (none), rooms (entity), teachers (entity)<br>W: audit_log (sink), events (none) | — | unknown events; unknown event_rsvps |
| `/admin/content/media` | R: events (none), media_assets (static), modalities (static), teachers (entity)<br>W: audit_log (sink), media_assets (static) | — | unknown events; read_only media_assets |
| `/admin/tables` | R: audit_log (sink), expenses (entity), table_views (none), users (entity)<br>W: expenses (entity), table_views (none) | peek(), reset() | sink audit_log; mock_only modules/admin/tables/expenseDelete.ts; dynamic table; dynamic def?.name; unknown table_views; dynamic def.name; missing peek; missing reset |
| `/admin/tables/:table` | R: audit_log (sink), expenses (entity), table_views (none), users (entity)<br>W: expenses (entity), table_views (none) | peek(), reset() | sink audit_log; mock_only modules/admin/tables/expenseDelete.ts; dynamic table; dynamic def?.name; unknown table_views; dynamic def.name; missing peek; missing reset |
| `/admin/whatsapp` | R: automations (entity), class_ledger (entity), message_log (messages), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity), wa_templates (none)<br>W: audit_log (sink), automations (entity), message_log (messages), tenants (settings), wa_templates (none) | — | unknown wa_templates |
| `/admin/crm/deletions` | R: class_ledger (entity), deletion_requests (entity), plans (entity), profiles (entity), user_roles (session), users (entity)<br>W: audit_log (sink), deletion_requests (entity) | — | none |
| `/admin/integrations` | R: integrations (none), page_layouts (none)<br>W: audit_log (sink), integrations (none), page_layouts (none) | — | unknown integrations |
| `/admin/integrations/google-business` | R: hours_overrides (entity), integrations (none), page_layouts (none), tenants (settings)<br>W: integrations (none), page_layouts (none), tenants (settings) | — | unknown integrations |
| `/admin/finance/payouts` | R: integrations (none), payroll_lines (none), payroll_runs (none), teachers (entity), tenants (settings), users (entity)<br>W: audit_log (sink), integrations (none), payroll_lines (none), payroll_runs (none), tenants (settings) | — | dynamic t; unknown payroll_lines; unknown payroll_runs; mock_only modules/admin/payrollDraft.ts; unknown integrations |
| `/admin/finance/payouts/:id` | R: class_sessions (entity), payroll_lines (none), payroll_runs (none), space_bookings (none), special_charges (none), teachers (entity), tenants (settings), users (entity)<br>W: audit_log (sink), payroll_lines (none), payroll_runs (none), tenants (settings) | — | dynamic t; unknown payroll_lines; unknown payroll_runs; mock_only modules/admin/payrollDraft.ts; mock_only modules/admin/payrollApproval.ts; mock_only modules/admin/payrollSettlement.ts; unknown special_charges; unknown space_bookings |
| `/admin/class-pay` | R: class_pay_rules (none), class_templates (entity)<br>W: — | appendClassPayRule() | unknown class_pay_rules; missing appendClassPayRule |
| `/app/payment-methods` | R: payment_methods (none), tenants (settings)<br>W: payment_methods (none) | — | unknown payment_methods |
| `/app/rate/:id` | R: bookings (entity), class_sessions (entity), class_templates (entity), modalities (static), reviews (none), rooms (entity), teachers (entity)<br>W: bookings (entity), reviews (none), teachers (entity) | — | unknown reviews |
| `/app/invite` | R: class_sessions (entity), class_templates (entity), invites (none), modalities (static), rooms (entity), teachers (entity)<br>W: invites (none) | — | unknown invites |
| `/app/gift` | R: class_ledger (entity), payments (entity), plans (entity)<br>W: gift_cards (none) | peek() | unknown gift_cards; mock_only modules/customer/giftPurchase.ts |
| `/app/waitlist/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), plans (entity), profiles (entity), rooms (entity), teachers (entity), users (entity), voucher_bookings (none), waitlist (none)<br>W: audit_log (sink), bookings (entity), class_ledger (entity), class_sessions (entity), page_layouts (none), waitlist (none) | — | dynamic table; unknown waitlist; unknown voucher_bookings |
| `/app/events` | R: event_rsvps (none), events (none), memberships (none), teachers (entity), users (entity)<br>W: — | — | unknown memberships; unknown events; unknown event_rsvps; mock_only modules/customer/eventRsvp.ts |
| `/app/events/:id` | R: audit_log (sink), class_ledger (entity), event_rsvps (none), events (none), media_assets (static), memberships (none), payments (entity), plans (entity), teachers (entity), users (entity)<br>W: audit_log (sink), event_rsvps (none) | — | unknown event_rsvps; unknown memberships; unknown events; sink audit_log; mock_only modules/customer/eventRsvp.ts; mock_only modules/customer/pages/EventPage.tsx |
| `/app/practice` | R: bookings (entity), class_ledger (entity), class_sessions (entity), modalities (static), page_layouts (none), practice_goals (none), teachers (entity)<br>W: activity_events (sink), page_layouts (none), practice_goals (none) | — | unknown practice_goals; sink activity_events |
| `/app/state/empty` | R: bookings (entity), class_ledger (entity), payments (entity), plans (entity), profiles (entity), users (entity)<br>W: — | — | none |
| `/app/state/declined` | R: class_sessions (entity), class_templates (entity), modalities (static), rooms (entity), teachers (entity)<br>W: — | — | none |
| `/app/state/cancelled` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), payments (entity), rooms (entity), teachers (entity)<br>W: — | — | none |
| `/auth/recover` | R: —<br>W: — | — | none |
| `/auth/locked` | R: hours_overrides (entity), tenants (settings)<br>W: tenants (settings) | — | none |
| `/staff/maintenance` | R: audit_log (sink), maintenance_records (none), page_layouts (none), users (entity)<br>W: audit_log (sink), maintenance_records (none), page_layouts (none) | — | dynamic table; sink audit_log; unknown maintenance_records; mock_only modules/maintenance/maintenance.ts |
| `/admin/marketing` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/teach/promote` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_events (none), promotion_shares (none), voucher_bookings (none)<br>W: page_layouts (none) | promotion() | unknown promotion_campaigns; unknown promotion_shares; unknown promotion_claims; unknown promotion_events; unknown voucher_bookings; stub promotion |
| `/promotions/:code` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_shares (none)<br>W: page_layouts (none) | promotion() | unknown promotion_shares; unknown promotion_campaigns; unknown promotion_claims; stub promotion |
| `/promotions` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_shares (none)<br>W: page_layouts (none) | promotion() | unknown promotion_shares; unknown promotion_campaigns; unknown promotion_claims; stub promotion |
| `/admin/promotions` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_shares (none), voucher_bookings (none)<br>W: page_layouts (none) | promotion() | unknown promotion_campaigns; unknown promotion_shares; unknown promotion_claims; unknown voucher_bookings; stub promotion |
| `/hub/promotions` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/staff/rooms` | R: class_ledger (entity), class_sessions (entity), modalities (static), page_layouts (none), plans (entity), profiles (entity), rooms (entity), space_bookings (none), special_charges (none), teachers (entity), user_roles (session), users (entity)<br>W: audit_log (sink), page_layouts (none), space_bookings (none) | — | unknown space_bookings; unknown special_charges |
| `/teach/class/:id` | R: audit_log (sink), bookings (entity), class_sessions (entity), modalities (static), profiles (entity), reviews (none), rooms (entity), teachers (entity), tenants (settings), users (entity)<br>W: audit_log (sink), class_sessions (entity), tenants (settings) | — | sink audit_log; unknown reviews; mock_only modules/teacher/classOwnership.ts |
| `/teach/payroll` | R: bookings (entity), class_sessions (entity), class_templates (entity), payment_methods (none), payroll_lines (none), payroll_runs (none), teachers (entity), tenants (settings)<br>W: tenants (settings) | — | unknown payroll_runs; unknown payroll_lines; unknown payment_methods |
| `/teach/profile` | R: audit_log (sink), modalities (static), teacher_profile_proposals (none), teachers (entity), user_roles (session), users (entity)<br>W: audit_log (sink), teacher_profile_proposals (none), teachers (entity) | — | unknown teacher_profile_proposals; sink audit_log; mock_only modules/profile-review/contracts.ts |

## Wave 5: the access walk on test-hoy (described, not built)

The static check proves the code paths; the walk proves the running system, with Jas's roles and the seed's data.

- **Where:** test-hoy (real Clerk development instance, real Company OS test API, the seed from lane B). Adapted from
  `os` `check-access.js` (Santa María), as `scripts/test-access-walk.mjs`, run by hand and in a manual workflow.
- **Who:** one signed-in session per role (the 11 roles; test users invited per role, or the super admin's view-as from
  lane D for the read pass, plus a real session per role for the write probes), and one signed-out visitor.
- **What:** for every route in `LAUNCH_ROUTES` (patterns expanded with seed ids: a class, a booking, a payment, a
  voucher code, a member), as every role:
  1. open the route; expect the role's home or the route (the role matrix, `src/config/roleMatrix.ts`), never a crash;
  2. fail on any `console.error`, any uncaught page error, and any `/api/cos` response other than 2xx or a refusal
     code in Hoy's code→copy table;
  3. fail on an **empty-because-unconnected section**: each sectioned page names, per section, the tables it shows (the
     `PageSpec` sections and this check's inventory); with the seed's data present for that role, a section that
     renders its empty state while the role may read those rows (the recipe's grants) is a failure. Sections the role
     may not read must show the "not available" state, not crash (house rule);
  4. on a route with a write the role may make, run one harmless probe the seed allows (save a preference, add a note)
     and expect the record back, or a named refusal;
  5. record a screenshot per route and role (ES, desktop and 390 px) for the Wave 5 report.
- **Pass:** zero failures across routes × roles; the report lists, per role, the routes opened, sections shown,
  refusals met, and links the screenshots. Any failure names the route, role, section and request.
- **Uses this check's output:** `--report` gives the tables each route reads, so the walk knows which sections must
  not be empty for which role.
