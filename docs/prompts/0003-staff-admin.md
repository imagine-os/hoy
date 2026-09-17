# 0003 — Staff, teacher and admin experiences

- **Source**: coordinator brief (parallel worker 2 of 3), direct
- **Date**: 2026-09-17
- **Requester**: studio project lead via coordinator
- **Changelog**: `docs/changelog/0003-staff-admin.md`

## Prompt (summary of the brief)

Build the staff, teacher and admin experiences of HoyOS on top of the v0 scaffold, replacing every
stub with a real page that reads and writes through the data layer:

1. **Front desk** — S-02 door / check-in (today's strip, roster per session, search by name or
   WhatsApp, one-tap check-in, walk-in add, late / no-show marks, capacity meter, keyboard friendly),
   S-04 register & take payment (who · what from `pricing.ts` · how: Wompi link placeholder,
   datáfono, cash, transfer; IVA and totals from config; creates user, payment, invoice, membership
   or credits; printable receipt). Improve S-01 with live numbers.
2. **Teacher app** — S-03 home (today's classes, roster state, substitution request),
   `/teach/class/:id` (roster, attendance, class notes), `/teach/payroll` (classes × rate, monthly,
   placeholder until Wompi payroll), `/teach/profile`.
3. **Admin** — M-02 content CMS, M-04 email studio, M-05 WhatsApp automations, M-06 CRM member 360,
   M-07 activity log, M-08 settings & policies, plus a new M-09 Finance view.
4. Realtime feel: subscribe to `bookings` and `class_sessions` so rosters and dashboards update live.

Rules: prices only from `pricing.ts`; capacity / hours from tenant or M-08; every string ES + EN;
reuse components first, new ones get a `.meta.ts`; every write appends to `audit_log`; wire
`useLayout(spec)` on S-02 and M-01; docs in the same commit; `npm run build` with zero errors and
`npm run screenshots -- --smoke` exit 0.

## Response

Built in a git worktree (`feat/staff-admin`) and rebased onto `main`.

**Routes now real (were stubs):** `/staff/checkin` (S-02), `/staff/register` (S-04),
`/teach/class/:id`, `/teach/payroll`, `/teach/profile` (S-03 family), `/admin/content` (M-02),
`/admin/emails` (M-04), `/admin/whatsapp` (M-05), `/admin/crm` + `/admin/crm/:id` (M-06),
`/admin/activity` (M-07), `/admin/settings` (M-08), and the new `/admin/finance` (M-09).
`/staff` (S-01), `/teach` (S-03) and `/admin` (M-01) were upgraded from first slices to full pages.

**New components (all with metas, D-02):** `EmptyState`, `RosterRow`, `BarList`, `PhoneBubble`
(molecules); `Timeline`, `EmailPreview`, `Receipt` (organisms).

**Shared helpers inside owned modules:** `useAudit(source)` (every write → `audit_log` with actor,
role, source, before/after), `usePeople()` (users × profiles × roles × memberships × plans),
`useSettings()` (M-08 values stored in `tenants.settings`, defaults from `tenant.ts`; `splitTax`,
`inQuietHours`).

**Deferred / placeholders:** Wompi payment link and payouts, DIAN CUFE emission, Meta approval
(simulated status), MJML designer (bodies stored as plain-text JSON `{es,en}`), cross-tab realtime
in the mock (needs a `storage` listener in `MockProvider`, a shared file). No new tables.

Screenshots: `[screenshot: S-01]` `[screenshot: S-02]` `[screenshot: S-03]` `[screenshot: S-04]`
`[screenshot: M-01]` `[screenshot: M-02]` `[screenshot: M-04]` `[screenshot: M-05]` `[screenshot: M-06]`
`[screenshot: M-07]` `[screenshot: M-08]` `[screenshot: M-09]` — captured by the next
`npm run screenshots` pass.
