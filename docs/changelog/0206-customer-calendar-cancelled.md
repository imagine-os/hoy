---
date: 2026-11-13
version: 1.2.3
intent: Hide canceled classes from customer calendar browsing at the owner's request.
decision: Filter only the customer calendar projection; retain cancellation records, booking history, admin views and existing polling.
rejected: Deleting records, changing public-site settings, or bypassing booked-session safeguards.
files: src/modules/customer/calendarVisibility.ts, src/modules/customer/pages/SchedulePage.tsx, scripts/test-customer-calendar-cancelled.mjs, scripts/test-jas-1nov-customer-ui.mjs, docs/pages/C-02b.md, package.json, package-lock.json
---

# 0206 · Customer cancellation visibility

Runtime change: PR #144, independently reviewed twice. Exact-head Auth checks run 43470410235 passed; downloaded logs verify 20 EN/ES desktop/mobile checks for initial day/week display, polling removal, no writes and reload. Local typecheck, production build and domain test also passed. CI used fictional fixtures, not live bookings. Actual deployment verification is separate.

This patch release changes no backend requirement, customer booking, credit, class capacity, template or Content entry. The Nov 18 booked-class capacity request remains a separate investigation.

Rollback: redeploy previously verified v1.2.2 through the normal production workflow if necessary.
