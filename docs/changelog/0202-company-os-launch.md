version: 0.26.0
date: 2026-10-29
prompt: docs/prompts/0202-company-os-launch.md
intent: Run the app on Company OS for Hoy's 1 Nov launch (the tracker's "MVP Finish Line" rows), with real customers, from one codebase with two builds
decision: A production build (VITE_HOY_BUILD=production) with Clerk sign-in, CompanyOSProvider and a launch route allowlist, served with the website by the Hoy server on Hoy's Railway; the review build and its MockProvider stay unchanged for the Pages site until it is retired
rejected: Browser-side business rules in production (Company OS owns them); a deny-list of routes (an allowlist fails closed); Clerk's prebuilt screens (their routing clashes with the HashRouter and they are not in Spanish); a Coming Soon swap by rebuild (a server variable flips it); sending email from the browser (Company OS comms automations send it)
files: server/*, .railway/railway.ts, .github/workflows/*, src/main.tsx, src/app/productionWiring.ts, src/auth/*, src/config/launch.ts, src/config/launchRoutes.ts, src/data/companyos/*, src/data/livePricing.ts, src/modules/{customer,transfers,vouchers,launch-receipts,products,booking-policies,staff,admin,classSchedule,website,coming-soon}/**, src/notifications/*, deploy/comms/hoy-templates.json, vite.config.ts, scripts/test-*.mjs and harnesses

# Hoy on Company OS (launch)

**Hosting and sign-in (H-1, H-2).** The Hoy server serves the built site, checks the Clerk session, proxies `/api/cos/t/<tenant>/*` to the private Company OS API, streams receipt images at `/files/<id>`, forwards Resend webhooks and publishes `/app-config.json`, including the go-live switch (`SITE_LIVE`, `SITE_LIVE_AT`, `PUBLIC_DOCUMENTS`). Sign-in is Clerk email code and Google on Hoy's own screens; roles come from Company OS `/me`. The production build carries no persona switcher, hub, dev tools, docs, screenshots or demo data (H-10; deploys refuse it otherwise).

**Data (H-3).** `CompanyOSProvider` maps the app's tables to Company OS entities, sends every money and booking write with an Idempotency-Key, polls the screens that need live data every 20 s, and shows Spanish and English copy for every refusal code.

**Customers (H-4, H-5, H-6).** Schedule, booking, held spots with the 8:00 rule and the receipt freeze, move until 12 hours before, cancel with the forfeit warning, pack and trial purchase by bank transfer with a receipt image, the "Nota de compra", and gift and courtesy vouchers on Company OS credits. Prices come from the product master by key and date; a price of 0 is quoted by the studio.

**Studio (H-5, H-7, H-8, H-9).** Front desk home, check-in and undo, walk-in sale with consent, desk payments, the pending-payments queue with the receipt image, the product master with dated prices, reception hours, team invitations, the customer list, studio cancel, the reception cash book (Company OS expenses 1.0.0), the website pages, and the launch emails as Company OS templates and automations.

**Final review round 1 (F1, F2, F3).** Vouchers moved onto the connector with a contract test; receipts visible to the desk; the held-class receipt goes through the transfer pay page; lost answers keep their key; production links only to launch routes; signed-out visitors see no review-build prices; the deletion request works without a backend form; the team panel handles the Super Admin membership; staff invitations land on sign-in; writes without a key are not retried.

**Final review round 2 (G1, G2).** No private-class price anywhere in production, the FAQ describes transfer or desk payment, `/app/passes` priced from Company OS, a sign-in prompt instead of an empty public timetable, the reception rooms page out of launch, resending a team invitation, ascending lists, a clear error when Clerk fails to load, and a customer can't cancel a held class while reception reviews its receipt (`payment_under_review`).

**Found on the test environment.** The return from Google (`#/auth/callback`) rendered before the app configuration had loaded, so outside Clerk's provider, and stayed blank; it now waits for the session as the sign-in page does (checked in `test-auth-production-ui.mjs`).

Non-launch features stay in the code, hidden from the production build by the route allowlist. Review notes and decisions: Company OS `docs/customers/hoy/decision-log.md`.
