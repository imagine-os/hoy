# Roles

| Role | Surface | Layout | Notes |
| --- | --- | --- | --- |
| `super_admin` | everything | desktop | Only role that can turn **dev mode** on and "view as" another role. |
| `admin` | admin, staff | desktop | Studio owner / general manager. |
| `coordinator` | staff, admin subset (content, schedule, CRM) | desktop | Runs the daily operation. |
| `front_desk` | staff (check-in, register) | desktop | Counter work. |
| `finance` | admin subset (payments, invoices, payroll) | desktop | Read-mostly on operations. |
| `teacher` | teacher app | mobile | Own classes, attendance, payroll view. |
| `maintenance` | staff subset (rooms, incidents) | mobile/desktop | Facility tasks. |
| `customer` | customer app | mobile | Members and drop-ins. |
| `public` | website | auto | Not signed in. |

Permissions are strings (`bookings.write`, `tables.read`, …) mapped per role in
`src/auth/permissions.ts`. `useSession().can('x')` checks them. `RequireRole` guards routes and
redirects to `/#/no-access` with a friendly message.

## Demo users
One fictional person per role in `src/auth/demoUsers.ts`. The hub and the `RoleSwitcher` component
switch between them; the choice persists in localStorage under `hoyos.session`.

## Dev mode and view-as
A super admin can toggle **dev mode** (spec chip, inspector `Ctrl+.`, layout editor links) and pick
**view as** any role to see that role's experience with or without dev tooling.

## Who may read and write the member-owned tables (0008)
The new tables from the data-depth pass belong to the member, not to the studio. The rule is the same
everywhere: **the customer owns their rows, staff read, admin writes the studio side.** `tenant_id`
still scopes every query first. The per-table notes are generated into
[`data-model.md`](./data-model.md) from `TableDef.rls` and into `supabase/schema.sql` as comments
above each table, so the policy intent travels with the schema.

| Table | customer | teacher | front_desk / coordinator | admin / finance |
| --- | --- | --- | --- | --- |
| `notifications` | read own; update `read_at` only | — | insert for a member (send) | insert, read all |
| `notification_prefs` | full control of own rows | — | read (respect a mute before sending) | read |
| `reviews` | insert + read own (one per booking) | read own sessions; no `user_id` when `visibility = anonymous` | read | read all (M-06); never edits a rating |
| `invites` | insert + read own | — | read by `code` (honour a pass at the desk) | write `status`, `reward_credit_id` |
| `events` | read where `status = published` | read | read | write (M-02 publishes) |
| `event_rsvps` | insert / cancel own | read own event | read all, mark attended | read all |
| `payment_methods` | full control of own rows | — | read `brand` / `last4` only | read; `token_ref` never leaves the vault |
| `content_articles` | read where `published` | read | write | write |
| `faq_entries` | read where `published` | read | write | write |

Two notes that outlive the mock:
- **No row means enabled** in `notification_prefs`, so muting is an explicit act and a new category
  never arrives silently switched off for everyone.
- **`payment_methods.token_ref` is a placeholder** (`tok_demo_…`) produced by `wompiTokenise()`.
  When Wompi lands it holds the real token reference and nothing else; the card number never reaches
  HoyOS, and the column is not selectable from the client.

## Who may read and write the tables added by the depth pass (0012)

Same rule, two new shapes: **legal proof is append-only** and **money out is finance-only**.
`tenant_id` still scopes every query first; the per-table notes are generated into
[`data-model.md`](./data-model.md) from `TableDef.rls`.

| Table | customer | teacher | front_desk / coordinator | admin / finance |
| --- | --- | --- | --- | --- |
| `legal_documents` | read where `status = published` | read | read | admin writes; a new version is a new row |
| `legal_acceptances` | insert + read own; never update nor delete | read own | read (did they sign the waiver?) | read all |
| `media_assets` | read where `status = ready` | read | write (M-02d) | write |
| `payroll_runs` | — | read runs containing a line of their own (S-03) | — | finance/admin full control |
| `payroll_lines` | — | read own lines | — | finance/admin write while the run is `draft` |

Three notes that outlive the mock:
- **A published legal version is never edited in place.** Editing would silently change what people
  already accepted, so a correction is a new row with a new `version` and `effective_from`, and
  `legal_acceptances` keeps pointing at the exact `document_id` the member signed.
- **A paid payroll run is immutable.** A correction is an `adjustment` line in the next run, which is
  why `payroll_lines.amount` is signed. A run can be settled teacher by teacher
  (`payroll_lines.paid_at` / `paid_method`), so one bounced transfer does not hold the others.
- **A payout is not a `payments` row.** `payments` is money in from members and feeds every revenue
  number in the product; money out lives on `payroll_runs` with an `audit_log` entry per action.
