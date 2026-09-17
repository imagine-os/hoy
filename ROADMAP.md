# HoyOS roadmap

**Resumen (ES).** HoyOS v0.2 es una base real y desplegable: sitio web, app de clientes, app de
profesores, escritorio de staff/admin, manual de operaciones, documentación y herramientas de
desarrollo en una sola base de código, con datos de prueba en el navegador. Este documento dice
dónde estamos, qué sigue y en qué orden (con dependencias explícitas y lo que se puede hacer en
paralelo), qué significa "terminado" en cada fase, cómo trabajar en el repo y qué debe decidir el
owner del estudio. Está escrito para que otra cuenta de Claude (o una persona) lo retome sin contexto.

## A. Where we are (v0.3.0, 2026-09-17)

- **All three parallel tracks have landed on `main`** — docs/content (`ef1dff8`), staff/admin (`8e04c8b`),
  customer (`cb51b69`) — and the final integration pass (`docs/changelog/0005-final-integration.md`) applied
  the shared-change requests they left for the coordinator.
- **Live URL**: https://imagine-os.github.io/hoy/ — pending one manual step: repo Settings → Pages →
  Source "GitHub Actions". The workflow `.github/workflows/pages.yml` already deploys `dist/` on push to `main`
  (`has_pages` was still `false` on 2026-09-17; sessions cannot fetch `github.io`, so the owner confirms the URL).
- **Stack**: Vite 5 + React 18 + TS strict, HashRouter, plain CSS tokens (`src/design/tokens.ts`),
  `MockProvider` (localStorage, change events, cross-tab `storage` sync) behind the `DataProvider` interface,
  module registry via `import.meta.glob`, route manifest on `window.__hoyos.routes` for tooling.
  `npm run build` passes with zero TS errors; `npm run screenshots -- --smoke` reports no console errors.
- **Real vs stub** (`/#/dev/specs`, from `docs/screenshots/routes.json`): **76 routes, 65 codes, 0 stubs.**
  Every routed code renders a real page on the data layer: hub HUB-01, website W-01…W-06 + P-01 + A-06,
  auth A-01 A-02 A-03 C-21 E-04, customer C-01…C-25 (incl. C-02b, C-07b ledger, C-08b, C-14/C-15) + A-05 +
  E-01…E-03 demo states, teacher S-03 (+ class, payroll, profile), staff S-01 S-02 S-04, admin M-01…M-09,
  dev D-01…D-04, knowledge K-01…K-04, E-05 no-access. **Not routed** (canvas codes without a screen): none.
  Integrations (Wompi, WhatsApp, email, DIAN, Supabase Auth/Realtime) are simulated behind their seams.
- **Canvas**: `reference/canvas/` is v1.5 (audited; `CANVAS-AUDIT.md`). Specs regenerate with
  `node scripts/extract-canvas.mjs && npm run specs`. C-02b, C-14 and C-15 are separate codes; C-07b
  is the credits ledger under a compatibility alias.
- **Docs**: prompt log, changelog and kanban are current through `0005`. `docs/screenshots/<code>/` holds
  every route in ES/EN × 390/1280 (dark for key pages) as JPEG q72, and `docs/pages/<code>.md` exists for
  every routed code (generated skeletons; enrich the "Real vs mock" notes by hand as pages change).
- **Open shared requests carried into P1** (see the kanban "Data" lane): six tables (notifications + prefs,
  reviews, invites, events + rsvps, payment_methods, content_articles / faq_entries); a `usePolicy()` hook so
  customer pages re-render the instant M-08 changes a policy; bank account + NIT in M-08 for transfer
  instructions (C-05).

## B. Phases (dependency-ordered)

### P1 — Finish every screen against its spec
- Scope: every routed page already renders (0 stubs at v0.3.0); P1 is now depth — the six missing tables
  (notifications + notification_prefs, reviews, invites, events + rsvps, payment_methods,
  content_articles / faq_entries) with seed + `npm run sql`, then the pages that fall back to
  `localStorage`/`content.ts` read them; `usePolicy()` for instant policy re-render; bank account + NIT in
  M-08; hand-written "Real vs mock" notes in each `docs/pages/<code>.md`; a component meta for anything new.
- Depends on: nothing (v0.3 integration).
- Parallelizable with: itself, by module — customer (`src/modules/customer`), teacher, staff, admin
  are independent folders; shared components are improved in place, never forked. Also parallel with P5.
- Watch: data shapes. Any new table goes in `src/data/schema.ts` + seed + `npm run sql` in the same
  turn, because P2 freezes the schema.

### P2 — Supabase (auth, Postgres, realtime)
- Scope: apply `supabase/schema.sql` to a project; implement `src/data/SupabaseProvider.ts` (same
  `DataProvider` interface: list/get/insert/update/remove/subscribe via PostgREST + `postgres_changes`);
  Supabase Auth replaces the demo sign-in (A-01 splash, A-02 sign-in, A-03 sign-up, C-21 OTP by
  WhatsApp, E-04 lockout); RLS per role and per `tenant_id`; realtime subscriptions on `class_sessions`,
  `bookings`, `waitlist`, `checkins`. Keep the demo users behind a `VITE_DEMO_AUTH` flag for testing.
- Depends on: **P1 data shapes stabilising** (schema frozen; every page reads through the provider).
- Parallelizable with: P5. Can start the SupabaseProvider skeleton and RLS drafts while P1 finishes,
  but do not cut over `DataContext.tsx` until the customer and staff passes are merged.

### P3 — Wompi payments, then payroll
- Scope: Wompi checkout (C-04, S-04, C-17, C-23), webhooks → `payments`/`orders` (E-02 declined path),
  receipts by email/WhatsApp (M-04/M-05 templates), DIAN e-invoicing (`invoices`, provider TBD — see
  decisions), then teacher payroll (S-03 payroll view, finance role, Wompi payouts, manual cash/transfer
  always available). Manual cash/transfer stays first-class.
- Depends on: **P2 auth** (a payment needs an authenticated user, a tenant and RLS) and P2 realtime
  for capacity holds.
- Parallelizable with: P4 (different tables, different integrations, same auth base).

### P4 — WhatsApp Business API + email designer/sender
- Scope: `wa_templates`, `automations`, `message_log` (M-05), WhatsApp OTP (C-21), CRM threads in
  M-06; email designer with `email_templates` versions (M-04), sender, approvals, quiet hours; push
  notifications feed C-24. Templates are bilingual and versioned; sending honours opt-in and quiet hours.
- Depends on: P2 auth (identity + tenant); template approval from Meta (lead time: start the
  application early, in parallel with P2).
- Parallelizable with: P3.

### P5 — Documentation completeness
- Scope: screenshots for every page (ES/EN × 390/1280, dark for key pages) via `npm run screenshots`;
  `docs/pages/<code>.md` for every code; ops-manual decisions resolved and chapters updated (the list
  at `/#/manual/decisions` reaches zero); prompt log and changelog discipline every turn; canvas audit
  recommendations closed (kanban "Docs & content").
- Depends on: nothing. Screenshot pass re-runs after every visual phase.
- Parallelizable with: everything.

### P6 — Multi-tenant and white-label
- Scope: `tenants` table with per-tenant config (identity, hours, rooms, capacity, policies, pricing,
  brand tokens), tenant switcher for super admins, RLS by `tenant_id` everywhere (already in schema),
  billing of tenants (Wompi subscription), white-label build (brand assets + tokens per tenant,
  custom domain per tenant on Pages or a host with SSR later).
- Depends on: P2 (RLS, auth), P3 (billing rails). Config extraction from `src/tenant/*` can start any time.
- Parallelizable with: P7.

### P7 — Presence and marketing/content tools
- Scope: live cursors / presence on shared screens (front desk roster, table manager) with Supabase
  Realtime presence (preferred, no new vendor) or Liveblocks; marketing, social and content tools
  (campaigns, landing blocks in M-02, post scheduler, analytics).
- Depends on: P2 realtime (presence) and P4 (campaigns reuse templates and sender).
- Parallelizable with: P6.

## C. Definition of done (per phase)
- Every phase: `npm run build` zero errors; `npm run screenshots -- --smoke` exits 0; prompt log,
  changelog entry (K-01 format), kanban moved, page docs and screenshots updated, all in the same
  turn; Conventional Commits; no secrets, no real personal data.
- **P1**: no `PageStub` left for a routed code; `/#/dev/specs` shows every routed code as built with
  100 % completeness; every page has its `docs/pages/<code>.md` with four (or eight) screenshots;
  every new component has a meta with every used state.
- **P2**: `SupabaseProvider` passes the same manual test script as `MockProvider`; demo sign-in
  disabled in production build; RLS policies tested per role (a customer cannot read another's
  bookings; a teacher only their sessions); realtime updates visible on two browsers without refresh.
- **P3**: a real sandbox payment completes C-04 → receipt; declined path shows E-02; webhook
  idempotent; payroll run produces a statement per teacher; e-invoice issued in DIAN sandbox.
- **P4**: an approved WhatsApp template sends from M-05 with quiet hours respected and is logged in
  `message_log`; an email template renders ES/EN previews and sends; C-24 shows both.
- **P5**: `docs/screenshots/` has every code; `/#/manual/decisions` is empty or every item has an
  owner and a date; every prompt since 0001 has a file.
- **P6**: a second demo tenant runs on the same build with different name, hours, prices and brand
  tokens, and cannot see the first tenant's rows.
- **P7**: two sessions on `/staff/checkin` see each other's presence; one campaign sent end to end.

## D. How to work in this repo (10 lines)
1. Read `CLAUDE.md` first; it is the contract. Then `docs/architecture.md` and this file.
2. `npm i && npm run dev`; open `/#/` (hub) and `/#/dev/specs` to see what is built vs stub.
3. One module folder per surface (`src/modules/<name>/index.ts` exports `routes` + `strings`); never edit a central route file.
4. Every route carries a spec (`canvasSpecs['C-02']` or `defineSpec`); every new component has a `.meta.ts` with a usage.
5. Strings are `{ es, en }` read with `useT()`; data goes through `useData()` / `useTable()`, never the seed.
6. Studio facts (name, capacity, hours, prices) live only in `src/tenant/`.
7. Before every commit: `npm run build` (zero TS errors) and `npm run screenshots -- --smoke`.
8. Same turn as the work: `docs/prompts/NNNN-*.md`, `docs/changelog/NNNN-*.md`, `docs/kanban.md`, screenshots, page doc.
9. Conventional Commits; rebase on `origin/main` before pushing; keep both sides on kanban conflicts.
10. When the canvas or specs change: `node scripts/extract-canvas.mjs && npm run specs`; log it in `CANVAS-AUDIT.md`.

## E. Open decisions for the owner
From the operations manual (`/#/manual/decisions`, 17 flags) and the canvas audit (recommendations),
deduplicated. Each needs an answer, an owner and a date; then edit the chapter or spec and close the card.

**Pricing and payments**
1. Validity of the 10-class pack: 1 month (brief) or 3 months (P-01)?
2. Do published prices include IVA (19 %), or does the S-04 rail add it? (also decides the website copy)
3. Electronic invoicing provider (DIAN) and who is the legal issuer.
4. Wompi settlement cycle and destination bank account.
5. Notice days to pause a membership (C-22 proposes 15) and maximum freeze (30 days assumed).

**Policies (fields in M-08)**
6. Late-arrival grace minutes and no-show fee.
7. Minimum students to run a class (if any) and substitution rate for teachers.
8. Exact hours of the 4 daily classes and days of operation (6 or 7 days).
9. Target room temperature per class type and exact pre-heat time.

**People and payroll**
10. Names of the people in each role and front-desk coverage per shift.
11. Teacher pay per class, payment date, contract type, and whether attendance affects the rate.
12. Who trains each role and whether the training sign-off is kept on paper or as a note in M-06.

**Communication and legal**
13. Official WhatsApp service hours and the legal opt-in text.
14. Final data-protection policy text (counsel) and the data controller.
15. Emergency numbers, evacuation routes and reference clinic.

**Product**
16. Do maintenance checklists live in HoyOS (no screen today — would be a new S-xx code) or in a separate form?

**Canvas audit recommendations (design/spec hygiene, no owner input needed but confirm)**
17. Register the nine components screens use but D-02 lacks (segmented switch, FAQ accordion row,
    five-star rating, now/next/later strip, member search, teacher arrival chips, gift design picker,
    intention tile, breathing rings, progress dots) — or delete the unused `at_*` entries.
18. Compute S-04 IVA/total from the pricing model instead of typed figures.
19. Drop scanner data/API (`face_templates`, `POST /checkins/scan`) from the S-02 spec.
20. Add `data`/`roles` to the C-08b spec; update D-02 copy counts (49 sections, 4-tab dock); date the
    v0.1 decision entries in the canvas changelog; prune the 32 orphan dictionary keys; amend the
    phase-3 plan text that still lists check-in and front desk.
