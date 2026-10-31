# Route connectivity

**Rule: a route enters `LAUNCH_ROUTES` (`src/config/launchRoutes.ts`) only when `scripts/test-route-connectivity.mjs` is
green for it.** Waves 2–4 add the cut routes back through this check; a route added to the list never gets an `OPEN`
entry, it must be connected. (Hoy all-roles programme, lane G, 2026-10-31; plan `lovely-beaming-candy`, Wave 1.)

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

How it traces a route:

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
| `sink <table>` | `audit_log`, `message_log`, `activity_events`: reads are empty, writes are dropped |
| `read_only <table>` | a write to static content or a read-only entity, or removing the settings row, refuses |
| `member user_roles` | writing a role row refuses `not_in_launch` (update, remove, and an insert inside `atomic()`) |
| `stub <method>` | the provider method only throws (`promotion()` → `promotions_disabled`) |
| `missing <method>` | an optional `DataProvider` method `CompanyOSProvider` lacks (`editSession`, `contentBatch`, `appendClassPayRule`, `generateRecurrence`, `purchasedGift`, `peek`, `reset`…) |
| `voucher voucher` | `voucher()`: only issue-with-classes and claim are connected; the extras refuse |
| `not_in_launch <file>` | page code throws `not_in_launch` itself (the review build's `if (!cos) throw` guard after `cosOf()` is not one) |
| `mock_only <file>` | the flow runs only on the review build's MockProvider: on Company OS it throws `…_disconnected` or the control is hidden |
| `dynamic <arg>` | a table name the check cannot resolve (computed, reassigned, a template literal): add a `DYNAMIC` entry naming where its values come from. A write always needs a resolved name |
| `signed_out <table> (built-in catalogue)` / `(empty)` / `(write)` | on a signed-out page: a read the provider answers from the catalogue built into the app (`SIGNED_OUT` in `CompanyOSProvider.ts`) or with nothing, or a write |

Hostile checks in the script: synthetic pages that read a sink table (directly and two imports away), an unknown table,
write a new table, write through a computed or reassigned name or a template literal, call a stub (also destructured),
insert a role row, write a static table, read an entity or the built-in catalogue signed out, run a mock-only flow or
throw `not_in_launch` must fail; a page on connected tables and a review-only branch must pass; a finding in no list,
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
  reaches them). When lane F removes the signed-out catalogue from `CompanyOSProvider.list()`, the check reads signed-out
  pages like signed-in ones (the server decides), and the `signed_out` entries go stale.

## The lists in the script

- **`PENDING`**: a Wave 1 lane is closing it now (lane C, E or F). The check fails when the finding is gone and the entry
  is still there: the closing lane deletes it, or the coordinator at merge.
- **`OPEN`**: found by this audit on routes already in `LAUNCH_ROUTES`, with no lane closing it yet. Each names the wave
  or reuse-map row that would, or `unassigned`. Same staleness rule. **These need an owner decision**: assign, or take
  the route out of `LAUNCH_ROUTES` until it is connected.
- **`BY_DESIGN`**: unconnected on purpose, with the reason the empty or dropped answer is right in production (the
  layout editor's stored order, `peek()` as a first-render snapshot, the client's audit-row copy, the staff home's
  review-only timeline, device-local photos, the administrators' settings save that sits in the module the site reads
  opening hours from). Kept short; the check fails on an entry no launch route uses.
- **`DYNAMIC`**, **`RUNTIME_REVIEW`**: tracer inputs (helper hooks that forward a table name; run-time review branches).

## Findings on launch routes (2026-10-31)

### Closed by a Wave 1 lane (`PENDING`)

| Finding | Routes | Lane | Note |
|---|---|---|---|
| `unknown memberships` | `/app`, `/admin` | C | the your-plan card (`customer/HomePage.tsx`) and the members tile (`admin/DashboardPage.tsx`) switch to packs |
| `sink audit_log` | `/admin/activity` | E | `ActivityPage` reads `GET /t/:t/audit` |
| `signed_out plans, teachers, rooms (built-in catalogue)`; `signed_out class_templates, class_sessions, bookings, tenants (empty)` | `/site/*` | F | the public_site identity (ADR 0029). Also read, outside the plan's list: `tenants` (opening hours, payment instructions) and `bookings` (places left, `MatPicker`, `SchedulePage`). When F lifts the signed-out model, the `BY_DESIGN` entry `signed_out tenants (write)` goes stale too: delete it |

### Found by this audit, no lane yet (`OPEN`)

| Finding | Routes | Proposed | What breaks |
|---|---|---|---|
| `unknown memberships` | `*` and 15 staff, admin and customer routes | C (scope extension) or Wave 2 | `staff/people.ts` (the people join of every staff screen), `data/useAnalytics.ts`, `customer/hooks.ts` also read `memberships`; the plan names only the two screens above |
| `sink audit_log` | `/admin` | E (scope extension) | the dashboard's recent-activity card is always empty |
| `sink message_log` | `*`, `/admin/crm/:id`, `/staff`, `/staff/inbox/*` | unassigned | `data/comms.ts`: the inbox, member messages and notes, the unread badge read nothing; a sent note is dropped |
| `unknown hours_overrides` | `/admin/settings/*`, `/app/plans`, `/app/faq`, `/app/faq/2`, `/app/more`, `/site/*` | unassigned (recipe entity, size S) | `useOpeningHours()`: holidays and special hours are never read |
| `read_only legal_documents` | `/admin/settings/*` | unassigned | publishing a legal document refuses `read_only` |
| `unknown special_charges` | `/admin/finance` | unassigned | missing from the finance totals |
| `mock_only customer/profileSave.ts` | `/app/profile` | unassigned | **saving the profile throws `profile_disconnected`** |
| `mock_only customer/notificationPrefs.ts` | `/app/profile`, `/app/notifications` | unassigned | saving notification preferences throws `prefs_disconnected` |
| `mock_only profile-review/contracts.ts`, `unknown email_change_previews` | `/app/profile` | unassigned | the email-change preview throws `review_disconnected` |
| `mock_only customer/accountData.ts` | `/app/account` | unassigned (Wave 2 account deletion) | data export and deletion request throw `disconnected` |
| `mock_only customer/marketingConsent.ts` | `/app/account` | unassigned | the marketing-consent switch throws `disconnected` |
| `mock_only data/trialEligibility.ts` | `/app`, `/app/class/:id`, `/app/checkout/:id`, `/app/plans`, `/app/passes`, `/app/classes`, `/app/profile`, `/app/more` | unassigned | `readTrialAssessment()` throws `trial_disconnected`: the trial state never resolves |
| `mock_only classSchedule/studioCancellation.ts` | `/app/class/:id`, `/app/booking/:id`, `/app/booking/:id/change` | unassigned | the "studio cancelled this class" return refuses `disconnected` |
| `mock_only customer/payments.ts` | `/app/plans`, `/app/classes` | unassigned (verify) | `recordPayment()` is reachable; a trial purchase there calls `assertTrialAvailable` (`trial_disconnected`). Check whether the production buy path calls it |
| `mock_only quotes/hooks.ts` | `/app/plans`, `/app/passes`, `/app/classes` | unassigned | `useOperationalCatalog().quote()` answers `null` unless the provider is the mock |
| `mock_only admin/paymentInstructions.ts`, `sink audit_log` (its receipt read) | `/admin/settings/*` | unassigned | saving the payment instructions throws `payment_settings_disconnected` |
| `sink audit_log` (receipt read) | `/app/profile` | unassigned | goes with the profile mock-only flows |
| `unknown practice_goals`, `sink activity_events` | `/app`, `/admin/analytics`, `/admin/crm/:id` | Wave 2 (practice goals) | practice goals, milestones and streaks are empty and never saved |
| `unknown deletion_requests` | `/app/account`, `/site/delete-account` | Wave 2 (account deletion) | a deletion request is refused |
| `unknown waitlist` | `/staff`, `/staff/checkin` | Wave 2 (waitlist) | the waitlist sections are empty |
| `unknown events` | `/admin/settings/*` | Wave 3 (events) | media use by events is not counted |
| `unknown reviews` | `/site` | Wave 3 (class reviews) | the site home's reviews are empty |
| `unknown payroll_runs`, `unknown payroll_lines` | `/admin/finance` | Wave 4 (teacher pay) | the payroll figures are empty |

Connected with no finding (33 of the 77 launch routes; the shell `*` has findings): `/`, `/coming-soon`, `/auth`, `/auth/sign-in`, `/auth/sign-up`,
`/auth/callback`, `/no-access`, `/app/schedule`, `/app/schedule/week`, `/app/history`, `/app/rules`, `/app/teachers`,
`/app/teachers/:id`, `/app/legal/:kind`, `/app/access`, `/app/receipts`, `/app/receipts/:paymentId`, `/app/pay/:what/:id`,
`/app/vouchers`, `/app/vouchers/:code`, `/app/gift-voucher`, `/staff/expense`, `/staff/transfers/*`, `/staff/vouchers/*`,
`/staff/receipts/:paymentId`, `/admin/crm`, `/admin/emails/*`, `/admin/finance/expenses`, `/admin/class-schedule/*`,
`/admin/settings/booking-policies`, `/admin/products/*`, `/admin/vouchers/*`, `/admin/payments/report`.

## Inventory: launch routes

Generated by `--report` on 2026-10-31 (regenerate after a change; the script is the source of truth). R = read,
W = written, with each table's adapter kind (`none` = no adapter). Findings name who closes them.

| Route | Tables (read / written) → adapter | Methods, requests | Findings |
|---|---|---|---|
| `*` | R: memberships (none), message_log (sink), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity)<br>W: tenants (settings) | — | unknown memberships → C (scope extension) or Wave 2; sink message_log → unassigned |
| `/admin` | R: audit_log (sink), bookings (entity), class_sessions (entity), class_templates (entity), memberships (none), modalities (static), page_layouts (none), payments (entity), plans (entity), profiles (entity), teachers (entity), user_roles (session), users (entity)<br>W: page_layouts (none) | — | unknown memberships → lane C; sink audit_log → E (scope extension) |
| `/admin/analytics` | R: bookings (entity), class_ledger (entity), class_sessions (entity), memberships (none), modalities (static), page_layouts (none), practice_goals (none), profiles (entity), teachers (entity), users (entity)<br>W: page_layouts (none) | — | unknown memberships → C (scope extension) or Wave 2; unknown practice_goals → Wave 2 |
| `/admin/emails` | R: —<br>W: — | POST /query | none |
| `/admin/crm` | R: —<br>W: — | POST /query | none |
| `/admin/crm/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), consents (entity), memberships (none), message_log (sink), payments (entity), plans (entity), practice_goals (none), profiles (entity), tenants (settings), user_roles (session), users (entity), vouchers (entity)<br>W: audit_log (sink), message_log (sink), tenants (settings) | — | unknown memberships → C (scope extension) or Wave 2; unknown practice_goals → Wave 2; sink message_log → unassigned |
| `/admin/activity` | R: audit_log (sink), memberships (none), plans (entity), profiles (entity), user_roles (session), users (entity)<br>W: — | — | unknown memberships → C (scope extension) or Wave 2; sink audit_log → lane E |
| `/admin/settings` | R: audit_log (sink), events (none), feature_flags (entity), hours_overrides (none), legal_documents (static), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), feature_flags (entity), legal_documents (static), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown events → Wave 3; sink audit_log → unassigned; mock_only modules/admin/paymentInstructions.ts → unassigned; read_only legal_documents → unassigned |
| `/admin/settings/hours` | R: audit_log (sink), events (none), feature_flags (entity), hours_overrides (none), legal_documents (static), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), feature_flags (entity), legal_documents (static), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown events → Wave 3; sink audit_log → unassigned; mock_only modules/admin/paymentInstructions.ts → unassigned; read_only legal_documents → unassigned |
| `/admin/settings/features` | R: audit_log (sink), events (none), feature_flags (entity), hours_overrides (none), legal_documents (static), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), feature_flags (entity), legal_documents (static), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown events → Wave 3; sink audit_log → unassigned; mock_only modules/admin/paymentInstructions.ts → unassigned; read_only legal_documents → unassigned |
| `/admin/settings/payments` | R: audit_log (sink), events (none), feature_flags (entity), hours_overrides (none), legal_documents (static), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), feature_flags (entity), legal_documents (static), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown events → Wave 3; sink audit_log → unassigned; mock_only modules/admin/paymentInstructions.ts → unassigned; read_only legal_documents → unassigned |
| `/admin/settings/communications` | R: audit_log (sink), events (none), feature_flags (entity), hours_overrides (none), legal_documents (static), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), feature_flags (entity), legal_documents (static), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown events → Wave 3; sink audit_log → unassigned; mock_only modules/admin/paymentInstructions.ts → unassigned; read_only legal_documents → unassigned |
| `/admin/settings/branding` | R: audit_log (sink), events (none), feature_flags (entity), hours_overrides (none), legal_documents (static), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), feature_flags (entity), legal_documents (static), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown events → Wave 3; sink audit_log → unassigned; mock_only modules/admin/paymentInstructions.ts → unassigned; read_only legal_documents → unassigned |
| `/admin/settings/content` | R: audit_log (sink), events (none), feature_flags (entity), hours_overrides (none), legal_documents (static), media_assets (static), modalities (static), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), feature_flags (entity), legal_documents (static), tenants (settings) | DELETE /admin/memberships/:x, GET /admin/users, GET /modules/bookings/settings, PATCH /modules/bookings/settings, POST /admin/users, POST /api/comms_log, POST /invitations, POST /query | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown events → Wave 3; sink audit_log → unassigned; mock_only modules/admin/paymentInstructions.ts → unassigned; read_only legal_documents → unassigned |
| `/admin/finance` | R: expense_templates (entity), expenses (entity), invoices (entity (read-only)), memberships (none), payments (entity), payroll_lines (none), payroll_runs (none), plans (entity), profiles (entity), special_charges (none), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: tenants (settings) | — | unknown memberships → C (scope extension) or Wave 2; unknown special_charges → unassigned; unknown payroll_runs → Wave 4; unknown payroll_lines → Wave 4 |
| `/admin/finance/expenses` | R: expense_templates (entity), expenses (entity)<br>W: expense_templates (entity), expenses (entity) | — | none |
| `/admin/settings/booking-policies` | R: —<br>W: — | GET /modules/bookings/settings, PATCH /modules/bookings/settings | none |
| `/admin/class-schedule` | R: —<br>W: — | POST /batch, POST /query | none |
| `/` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/coming-soon` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/app` | R: activity_events (sink), bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), memberships (none), modalities (static), page_layouts (none), payments (entity), plans (entity), practice_goals (none), teachers (entity), users (entity)<br>W: activity_events (sink), page_layouts (none), practice_goals (none) | — | mock_only data/trialEligibility.ts → unassigned; unknown memberships → lane C; unknown practice_goals → Wave 2; sink activity_events → Wave 2 |
| `/app/schedule` | R: bookings (entity), class_sessions (entity), class_templates (entity), media_assets (static), modalities (static), page_layouts (none), rooms (entity), teachers (entity)<br>W: page_layouts (none) | — | none |
| `/app/schedule/week` | R: bookings (entity), class_sessions (entity), class_templates (entity), media_assets (static), modalities (static), page_layouts (none), rooms (entity), teachers (entity)<br>W: page_layouts (none) | — | none |
| `/app/class/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), media_assets (static), memberships (none), modalities (static), page_layouts (none), payments (entity), plans (entity), rooms (entity), teachers (entity), user_roles (session), users (entity)<br>W: page_layouts (none) | — | mock_only data/trialEligibility.ts → unassigned; unknown memberships → C (scope extension) or Wave 2; mock_only modules/classSchedule/studioCancellation.ts → unassigned |
| `/app/checkout/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), memberships (none), modalities (static), payments (entity), plans (entity), rooms (entity), teachers (entity), users (entity)<br>W: bookings (entity) | — | mock_only data/trialEligibility.ts → unassigned; unknown memberships → C (scope extension) or Wave 2 |
| `/app/plans` | R: bookings (entity), class_ledger (entity), hours_overrides (none), memberships (none), payments (entity), plans (entity), tenants (settings), users (entity)<br>W: audit_log (sink), class_ledger (entity), payments (entity), tenants (settings) | peek() | mock_only data/trialEligibility.ts → unassigned; mock_only modules/customer/payments.ts → unassigned (verify); unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown memberships → C (scope extension) or Wave 2; mock_only modules/quotes/hooks.ts → unassigned |
| `/app/passes` | R: bookings (entity), class_ledger (entity), memberships (none), payments (entity), plans (entity), users (entity)<br>W: — | peek() | mock_only data/trialEligibility.ts → unassigned; unknown memberships → C (scope extension) or Wave 2; mock_only modules/quotes/hooks.ts → unassigned |
| `/app/classes` | R: bookings (entity), class_ledger (entity), memberships (none), payments (entity), plans (entity), users (entity)<br>W: audit_log (sink), class_ledger (entity), payments (entity) | peek() | mock_only data/trialEligibility.ts → unassigned; mock_only modules/customer/payments.ts → unassigned (verify); unknown memberships → C (scope extension) or Wave 2; mock_only modules/quotes/hooks.ts → unassigned |
| `/app/booking/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: bookings (entity), page_layouts (none), tenants (settings) | — | mock_only modules/classSchedule/studioCancellation.ts → unassigned |
| `/app/booking/:id/change` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), page_layouts (none), payments (entity), rooms (entity), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: bookings (entity), page_layouts (none), tenants (settings) | — | mock_only modules/classSchedule/studioCancellation.ts → unassigned |
| `/app/history` | R: bookings (entity), class_sessions (entity), class_templates (entity), invoices (entity (read-only)), modalities (static), payments (entity), plans (entity), rooms (entity), teachers (entity)<br>W: — | — | none |
| `/app/rules` | R: content_articles (static), media_assets (static)<br>W: — | — | none |
| `/app/faq` | R: faq_entries (static), hours_overrides (none), tenants (settings)<br>W: tenants (settings) | — | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S) |
| `/app/faq/2` | R: faq_entries (static), hours_overrides (none), tenants (settings)<br>W: tenants (settings) | — | unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S) |
| `/app/teachers` | R: modalities (static), teachers (entity)<br>W: — | — | none |
| `/app/teachers/:id` | R: class_sessions (entity), class_templates (entity), media_assets (static), modalities (static), rooms (entity), teachers (entity)<br>W: — | — | none |
| `/app/profile` | R: audit_log (sink), bookings (entity), class_ledger (entity), email_change_previews (none), memberships (none), notification_prefs (entity), page_layouts (none), payments (entity), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), email_change_previews (none), notification_prefs (entity), page_layouts (none), profiles (entity), tenants (settings), users (entity) | — | mock_only data/trialEligibility.ts → unassigned; mock_only modules/customer/notificationPrefs.ts → unassigned; unknown memberships → C (scope extension) or Wave 2; unknown email_change_previews → unassigned; sink audit_log → unassigned; mock_only modules/profile-review/contracts.ts → unassigned; mock_only modules/customer/profileSave.ts → unassigned |
| `/app/notifications` | R: notification_prefs (entity), notifications (entity), users (entity)<br>W: notification_prefs (entity), notifications (entity) | — | mock_only modules/customer/notificationPrefs.ts → unassigned |
| `/app/more` | R: bookings (entity), class_ledger (entity), hours_overrides (none), memberships (none), payments (entity), plans (entity), profiles (entity), tenants (settings), users (entity)<br>W: tenants (settings) | — | mock_only data/trialEligibility.ts → unassigned; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown memberships → C (scope extension) or Wave 2 |
| `/app/account` | R: deletion_requests (none), invoices (entity (read-only)), legal_acceptances (entity), notification_prefs (entity), page_layouts (none), profiles (entity), tenants (settings), users (entity)<br>W: audit_log (sink), deletion_requests (none), notification_prefs (entity), page_layouts (none), profiles (entity), tenants (settings) | — | mock_only modules/customer/marketingConsent.ts → unassigned; unknown deletion_requests → Wave 2; mock_only modules/customer/accountData.ts → unassigned (Wave 2 account deletion) |
| `/app/legal/:kind` | R: legal_acceptances (entity), legal_documents (static), tenants (settings)<br>W: legal_acceptances (entity), tenants (settings) | — | none |
| `/auth` | R: —<br>W: — | — | none |
| `/auth/sign-in` | R: —<br>W: — | — | none |
| `/auth/sign-up` | R: —<br>W: — | — | none |
| `/auth/callback` | R: —<br>W: — | — | none |
| `/app/access` | R: —<br>W: — | — | none |
| `/no-access` | R: —<br>W: — | — | none |
| `/app/receipts` | R: —<br>W: — | POST /query | none |
| `/app/receipts/:paymentId` | R: —<br>W: — | GET /api/payment/:x, GET /api/person/:x, GET /api/product/:x, GET /members, POST /query | none |
| `/staff/receipts/:paymentId` | R: —<br>W: — | GET /api/payment/:x, GET /api/person/:x, GET /api/product/:x, GET /members, POST /query | none |
| `/admin/products` | R: —<br>W: — | POST /batch, POST /query | none |
| `/staff` | R: audit_log (sink), bookings (entity), class_sessions (entity), class_templates (entity), memberships (none), message_log (sink), modalities (static), payments (entity), plans (entity), profiles (entity), teachers (entity), user_roles (session), users (entity), waitlist (none)<br>W: — | — | unknown memberships → C (scope extension) or Wave 2; sink message_log → unassigned; unknown waitlist → Wave 2 |
| `/staff/inbox` | R: memberships (none), message_log (sink), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), message_log (sink), tenants (settings) | — | unknown memberships → C (scope extension) or Wave 2; sink message_log → unassigned |
| `/staff/inbox/:id` | R: memberships (none), message_log (sink), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), message_log (sink), tenants (settings) | — | unknown memberships → C (scope extension) or Wave 2; sink message_log → unassigned |
| `/staff/checkin` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), memberships (none), modalities (static), page_layouts (none), payments (entity), plans (entity), profiles (entity), teachers (entity), tenants (settings), user_roles (session), users (entity), waitlist (none)<br>W: bookings (entity), page_layouts (none), payments (entity), tenants (settings) | POST /batch | unknown memberships → C (scope extension) or Wave 2; unknown waitlist → Wave 2 |
| `/staff/register` | R: class_sessions (entity), class_templates (entity), memberships (none), modalities (static), plans (entity), profiles (entity), teachers (entity), user_roles (session), users (entity)<br>W: bookings (entity), payments (entity) | POST /batch | unknown memberships → C (scope extension) or Wave 2 |
| `/staff/expense` | R: expense_templates (entity), expenses (entity)<br>W: expense_templates (entity), expenses (entity) | — | none |
| `/staff/transfers` | R: —<br>W: — | GET /me, GET /members, POST /batch, POST /query | none |
| `/app/pay/:what/:id` | R: tenants (settings)<br>W: — | GET /api/booking/:x, GET /api/occurrence/:x, POST /batch, POST /files, POST /files/:x/confirm, POST /query | none |
| `/admin/payments/report` | R: —<br>W: — | GET /members, POST /query | none |
| `/staff/vouchers` | R: payments (entity), plans (entity)<br>W: — | POST /api/:x, POST /query | none |
| `/admin/vouchers` | R: payments (entity), plans (entity)<br>W: — | POST /api/:x, POST /query | none |
| `/app/vouchers` | R: —<br>W: — | POST /api/:x, POST /query | none |
| `/app/vouchers/:code` | R: —<br>W: — | POST /api/:x, POST /query | none |
| `/app/gift-voucher` | R: plans (entity)<br>W: — | — | none |
| `/site` | R: class_sessions (entity), class_templates (entity), hours_overrides (none), media_assets (static), modalities (static), page_layouts (none), plans (entity), reviews (none), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); signed_out plans (built-in catalogue) → lane F; signed_out class_templates (empty) → lane F; signed_out class_sessions (empty) → lane F; signed_out teachers (built-in catalogue) → lane F; unknown reviews → Wave 3 |
| `/site/about` | R: hours_overrides (none), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S) |
| `/site/classes` | R: hours_overrides (none), media_assets (static), modalities (static), page_layouts (none), plans (entity), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); signed_out plans (built-in catalogue) → lane F; signed_out teachers (built-in catalogue) → lane F |
| `/site/classes/:slug` | R: hours_overrides (none), media_assets (static), modalities (static), page_layouts (none), plans (entity), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); signed_out plans (built-in catalogue) → lane F; signed_out teachers (built-in catalogue) → lane F |
| `/site/modalities` | R: hours_overrides (none), media_assets (static), modalities (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S) |
| `/site/schedule` | R: bookings (entity), class_sessions (entity), class_templates (entity), hours_overrides (none), media_assets (static), modalities (static), page_layouts (none), rooms (entity), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out class_sessions (empty) → lane F; signed_out class_templates (empty) → lane F; signed_out rooms (built-in catalogue) → lane F; signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); signed_out teachers (built-in catalogue) → lane F; signed_out bookings (empty) → lane F |
| `/site/teachers` | R: hours_overrides (none), media_assets (static), modalities (static), page_layouts (none), teachers (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); signed_out teachers (built-in catalogue) → lane F |
| `/site/plans` | R: hours_overrides (none), media_assets (static), page_layouts (none), plans (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); signed_out plans (built-in catalogue) → lane F |
| `/site/faq` | R: faq_entries (static), hours_overrides (none), media_assets (static), page_layouts (none), plans (entity), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); signed_out plans (built-in catalogue) → lane F |
| `/site/contact` | R: hours_overrides (none), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S) |
| `/site/delete-account` | R: hours_overrides (none), media_assets (static), page_layouts (none), tenants (settings)<br>W: audit_log (sink), deletion_requests (none), page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S); unknown deletion_requests → Wave 2 |
| `/site/legal/terms` | R: hours_overrides (none), legal_documents (static), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S) |
| `/site/legal/privacy` | R: hours_overrides (none), legal_documents (static), media_assets (static), page_layouts (none), tenants (settings)<br>W: page_layouts (none), tenants (settings) | — | signed_out tenants (empty) → lane F; unknown hours_overrides → unassigned (a recipe-defined entity, Wave 2 size S) |

## Inventory: routes Waves 1–4 add back (not in `LAUNCH_ROUTES`)

Each must be green before it is listed. Lane D's `/hub` is not here yet: `hub` is still in vite.config.ts
`REVIEW_ONLY_MODULES`; once lane D removes it and lists `/hub`, the check traces the production Hub like any route.
The `/dev` pages (developer role, Wave 2) are in the same position (`dev` is review-only today).

| Route | Tables (read / written) → adapter | Methods, requests | Findings |
|---|---|---|---|
| `/admin/finance/subscriptions` | R: —<br>W: — | — | none |
| `/admin/content` | R: audit_log (sink), class_pay_rules (none), events (none), media_assets (static), modalities (static), rooms (entity), teacher_profile_proposals (none), teachers (entity), user_roles (session), users (entity)<br>W: audit_log (sink), teacher_profile_proposals (none), teachers (entity) | appendClassPayRule(), contentBatch(), generateRecurrence() | unknown teacher_profile_proposals; sink audit_log; mock_only modules/profile-review/contracts.ts; unknown events; unknown class_pay_rules; missing appendClassPayRule; dynamic table; mock_only modules/admin/contentRecovery.ts; dynamic entity2; missing contentBatch; missing generateRecurrence |
| `/admin/content/articles` | R: content_articles (static)<br>W: audit_log (sink), content_articles (static) | — | read_only content_articles |
| `/admin/content/faq` | R: faq_entries (static), users (entity)<br>W: audit_log (sink) | — | dynamic table; mock_only modules/admin/contentRecovery.ts |
| `/admin/content/events` | R: event_rsvps (none), events (none), rooms (entity), teachers (entity)<br>W: audit_log (sink), events (none) | — | unknown events; unknown event_rsvps |
| `/admin/content/media` | R: events (none), media_assets (static), modalities (static), teachers (entity)<br>W: audit_log (sink), media_assets (static) | — | unknown events; read_only media_assets |
| `/admin/tables` | R: audit_log (sink), expenses (entity), table_views (none), users (entity)<br>W: expenses (entity), table_views (none) | peek(), reset() | sink audit_log; mock_only modules/admin/tables/expenseDelete.ts; dynamic table; dynamic def?.name; unknown table_views; dynamic def.name; missing peek; missing reset |
| `/admin/tables/:table` | R: audit_log (sink), expenses (entity), table_views (none), users (entity)<br>W: expenses (entity), table_views (none) | peek(), reset() | sink audit_log; mock_only modules/admin/tables/expenseDelete.ts; dynamic table; dynamic def?.name; unknown table_views; dynamic def.name; missing peek; missing reset |
| `/admin/whatsapp` | R: automations (entity), memberships (none), message_log (sink), plans (entity), profiles (entity), tenants (settings), user_roles (session), users (entity), wa_templates (none)<br>W: audit_log (sink), automations (entity), message_log (sink), tenants (settings), wa_templates (none) | — | unknown memberships; unknown wa_templates; sink message_log |
| `/admin/crm/deletions` | R: deletion_requests (none), memberships (none), plans (entity), profiles (entity), user_roles (session), users (entity)<br>W: audit_log (sink), deletion_requests (none) | — | unknown memberships; unknown deletion_requests |
| `/admin/integrations` | R: integrations (none), page_layouts (none)<br>W: audit_log (sink), integrations (none), page_layouts (none) | — | unknown integrations |
| `/admin/integrations/google-business` | R: hours_overrides (none), integrations (none), page_layouts (none), tenants (settings)<br>W: integrations (none), page_layouts (none), tenants (settings) | — | unknown hours_overrides; unknown integrations |
| `/admin/finance/payouts` | R: integrations (none), payroll_lines (none), payroll_runs (none), teachers (entity), tenants (settings), users (entity)<br>W: audit_log (sink), integrations (none), payroll_lines (none), payroll_runs (none), tenants (settings) | — | dynamic t; unknown payroll_lines; unknown payroll_runs; mock_only modules/admin/payrollDraft.ts; unknown integrations |
| `/admin/finance/payouts/:id` | R: class_sessions (entity), payroll_lines (none), payroll_runs (none), space_bookings (none), special_charges (none), teachers (entity), tenants (settings), users (entity)<br>W: audit_log (sink), payroll_lines (none), payroll_runs (none), tenants (settings) | — | dynamic t; unknown payroll_lines; unknown payroll_runs; mock_only modules/admin/payrollDraft.ts; mock_only modules/admin/payrollApproval.ts; mock_only modules/admin/payrollSettlement.ts; unknown special_charges; unknown space_bookings |
| `/admin/class-pay` | R: class_pay_rules (none), class_templates (entity)<br>W: — | appendClassPayRule() | unknown class_pay_rules; missing appendClassPayRule |
| `/app/payment-methods` | R: payment_methods (none), tenants (settings)<br>W: payment_methods (none) | — | unknown payment_methods |
| `/app/rate/:id` | R: bookings (entity), class_sessions (entity), class_templates (entity), modalities (static), reviews (none), rooms (entity), teachers (entity)<br>W: bookings (entity), reviews (none), teachers (entity) | — | unknown reviews |
| `/app/invite` | R: class_sessions (entity), class_templates (entity), invites (none), modalities (static), rooms (entity), teachers (entity)<br>W: invites (none) | — | unknown invites |
| `/app/gift` | R: bookings (entity), class_ledger (entity), payments (entity), plans (entity), users (entity)<br>W: audit_log (sink), gift_cards (none), payments (entity) | peek() | mock_only data/trialEligibility.ts; mock_only modules/customer/payments.ts; mock_only modules/quotes/hooks.ts; unknown gift_cards; mock_only modules/customer/giftPurchase.ts |
| `/app/waitlist/:id` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), memberships (none), modalities (static), page_layouts (none), payments (entity), plans (entity), profiles (entity), rooms (entity), teachers (entity), users (entity), voucher_bookings (none), waitlist (none)<br>W: audit_log (sink), bookings (entity), class_ledger (entity), class_sessions (entity), page_layouts (none), waitlist (none) | — | dynamic table; mock_only data/trialEligibility.ts; unknown waitlist; unknown voucher_bookings; unknown memberships |
| `/app/events` | R: event_rsvps (none), events (none), memberships (none), teachers (entity), users (entity)<br>W: — | — | unknown memberships; unknown events; unknown event_rsvps; mock_only modules/customer/eventRsvp.ts |
| `/app/events/:id` | R: audit_log (sink), bookings (entity), class_ledger (entity), event_rsvps (none), events (none), media_assets (static), memberships (none), payments (entity), teachers (entity), users (entity)<br>W: audit_log (sink), event_rsvps (none), payments (entity) | — | mock_only data/trialEligibility.ts; mock_only modules/customer/payments.ts; unknown event_rsvps; unknown memberships; unknown events; sink audit_log; mock_only modules/customer/eventRsvp.ts; mock_only modules/customer/pages/EventPage.tsx |
| `/app/practice` | R: bookings (entity), class_sessions (entity), memberships (none), modalities (static), page_layouts (none), practice_goals (none), teachers (entity)<br>W: activity_events (sink), page_layouts (none), practice_goals (none) | — | unknown practice_goals; unknown memberships; sink activity_events |
| `/app/state/empty` | R: —<br>W: — | — | none |
| `/app/state/declined` | R: class_sessions (entity), class_templates (entity), modalities (static), rooms (entity), teachers (entity)<br>W: — | — | none |
| `/app/state/cancelled` | R: bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), modalities (static), payments (entity), rooms (entity), teachers (entity), user_roles (session), users (entity)<br>W: — | — | mock_only modules/classSchedule/studioCancellation.ts |
| `/auth/recover` | R: —<br>W: — | — | none |
| `/auth/locked` | R: hours_overrides (none), tenants (settings)<br>W: tenants (settings) | — | signed_out tenants (empty); unknown hours_overrides |
| `/staff/maintenance` | R: audit_log (sink), maintenance_records (none), page_layouts (none), users (entity)<br>W: audit_log (sink), maintenance_records (none), page_layouts (none) | — | dynamic table; sink audit_log; unknown maintenance_records; mock_only modules/maintenance/maintenance.ts |
| `/admin/marketing` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/manual` | R: manual_overrides (none), manual_progress (none), manual_requests (none), manual_training (none), user_roles (session), users (entity)<br>W: audit_log (sink), manual_overrides (none), manual_progress (none), manual_requests (none), manual_training (none) | — | unknown manual_progress; unknown manual_training; unknown manual_requests; unknown manual_overrides |
| `/manual/decisions` | R: manual_progress (none), manual_requests (none), profiles (entity)<br>W: audit_log (sink), manual_requests (none) | — | unknown manual_progress; unknown manual_requests |
| `/manual/:chapter` | R: bookings (entity), class_sessions (entity), hours_overrides (none), manual_overrides (none), manual_progress (none), manual_requests (none), manual_training (none), memberships (none), profiles (entity), studio_policies (static), teachers (entity), tenants (settings), user_roles (session), users (entity)<br>W: audit_log (sink), manual_overrides (none), manual_progress (none), manual_requests (none), manual_training (none), studio_policies (static), tenants (settings) | — | unknown hours_overrides; unknown memberships; unknown manual_progress; unknown manual_training; unknown manual_overrides; unknown manual_requests; read_only studio_policies |
| `/docs/source` | R: manual_progress (none)<br>W: — | — | unknown manual_progress |
| `/teach/promote` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_events (none), promotion_shares (none), voucher_bookings (none)<br>W: page_layouts (none) | promotion() | unknown promotion_campaigns; unknown promotion_shares; unknown promotion_claims; unknown promotion_events; unknown voucher_bookings; stub promotion |
| `/promotions/:code` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_shares (none)<br>W: page_layouts (none) | promotion() | unknown promotion_shares; unknown promotion_campaigns; unknown promotion_claims; stub promotion |
| `/promotions` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_shares (none)<br>W: page_layouts (none) | promotion() | unknown promotion_shares; unknown promotion_campaigns; unknown promotion_claims; stub promotion |
| `/admin/promotions` | R: page_layouts (none), promotion_campaigns (none), promotion_claims (none), promotion_shares (none), voucher_bookings (none)<br>W: page_layouts (none) | promotion() | unknown promotion_campaigns; unknown promotion_shares; unknown promotion_claims; unknown voucher_bookings; stub promotion |
| `/hub/promotions` | R: page_layouts (none)<br>W: page_layouts (none) | — | none |
| `/staff/rooms` | R: class_sessions (entity), memberships (none), modalities (static), page_layouts (none), plans (entity), profiles (entity), rooms (entity), space_bookings (none), special_charges (none), teachers (entity), user_roles (session), users (entity)<br>W: audit_log (sink), page_layouts (none), space_bookings (none) | — | unknown memberships; unknown space_bookings; unknown special_charges |
| `/teach` | R: audit_log (sink), bookings (entity), class_ledger (entity), class_sessions (entity), class_templates (entity), memberships (none), message_log (sink), modalities (static), practice_goals (none), profiles (entity), reviews (none), rooms (entity), space_bookings (none), special_charges (none), teachers (entity), tenants (settings), users (entity)<br>W: audit_log (sink), message_log (sink), tenants (settings) | — | sink audit_log; sink message_log; mock_only modules/teacher/substituteRequest.ts; unknown memberships; unknown practice_goals; unknown reviews; unknown space_bookings; unknown special_charges |
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
