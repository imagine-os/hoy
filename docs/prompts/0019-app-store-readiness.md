# 0019 — Mobile stat-tile fit and app-store readiness (2026-09-17)

- **Source**: Justin in the content Slack thread (direct request), same day as 0017 / 0018
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0019-app-store-readiness.md`

## Prompt (verbatim)

> For items like this as an example: in the mobile experience the text is wrapping. maybe make sure that the word or number fits to the width of the card rather than wrapping: Estimated payroll
> COP 440,000
> classes taught × rate
>
> also, make sure that we're app store compliant for when we get to that. for instance, i assume people need a way to delete their account, or have other options, and clarity that yes we have to save payment history, but they can delete their account. Or whatever standard settings are going to be required for later.

## Response

**1 · The number fits the card.** The tile Justin saw is the `StatTile` molecule (the KPI row on
S-03, C-01, S-01, M-01, M-09 and eight more screens). Two things were wrong, and both are fixed at the
source rather than screen by screen: the value could wrap (`overflow-wrap: anywhere`), and inside the
desktop **phone frame** a three-tile row stayed three ~100 px columns because the grid collapse was a
viewport media query, not a rule about the frame. Now the value **never wraps** — it is measured after
layout and shrinks (down to 50 %) until it fits, with a `ResizeObserver` re-fitting when the column
changes — and the phone frame is a named CSS container, so a KPI row inside it collapses exactly like a
real 390 px phone. Label and hint clamp to two lines with an ellipsis. A Playwright sweep of every KPI
tile (13 routes, ES + EN, 390 px viewport and the 1280 px phone frame) went from **8 wrapped tiles to
0**; the same sweep found and fixed two other wrapping figures (the order-summary amount on C-17 and
the plan price on C-06 in the frame).

**2 · Account deletion, in three places, plus the settings the stores expect.**
- **C-26 `/app/account` — Cuenta y datos** (member, one tap under Profile): who the data controller is
  (from M-08 and `tenant.ts`), the consents the member controls (marketing by WhatsApp / email, the
  privacy-policy version accepted with a link to accept the current one), **download my data** (one JSON
  with the member's own rows), the six legal documents, and **delete my account** as a two-step confirm
  that says in plain ES / EN what is kept — invoices and payment history, anonymised, for the legal
  retention period — and what ends. It writes a `deletion_requests` row and an audit entry; while the
  request is open the row shows *Pendiente* with a cancel.
- **W-09 `/site/delete-account`** — the public page Google Play requires: email or WhatsApp, optional
  reason, the same retention explanation, no sign-in. Linked from the site footer and from §7 of the
  privacy policy.
- **M-11 `/admin/crm/deletions`** — the admin queue: requested → processing → done (or cancelled), a
  seven-step anonymisation checklist that gates "Marcar hecha", an internal note and the link to the
  member's CRM record. Admin / super admin only; every move is an `audit_log` row.
- **Nothing is deleted client-side.** The app records and tracks the request; the anonymisation of
  `profiles` and `users`, the removal of the auth user and the purge of notifications run server-side
  once Supabase exists. The specs, the manual and the compliance checklist all say so.

**3 · The checklist itself.** `docs/app-store-compliance.md` (ES summary + EN) walks Apple's
guidelines (5.1.1(v) account deletion, privacy nutrition labels, sign-in options, 3.1.3(e) — classes
are a physical service, so Wompi is fine) and Google Play's (data safety form, account-deletion URL,
permissions), each row marked **done / pending / needs dev**, and it renders in the in-app docs viewer.
**Manual chapter 23** (habeas data) now describes the real flow — member self-service, public page,
admin queue, retention — in ES and EN with figures of the three screens.

**Data**: one table, `deletion_requests` (46 → 47), with its RLS contract. **Codes**: C-26, W-09, M-11
new; C-19, C-25, A-06 (privacy copy), S-03 and the KPI screens changed. Version **0.7.0**, shared with
0018 on purpose (built in parallel the same day).

Deviations noted: the original C-19 "delete" wrote `users.status = disabled` client-side and promised a
30-day recovery window nobody had decided; both are gone — the promise is now the legal fifteen business
days the privacy policy already states. The StatTile fix is a component change, so every KPI screen is
touched visually; only the routes whose content changed were re-photographed.
