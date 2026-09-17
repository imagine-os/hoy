# HoyOS roadmap

**Resumen (ES).** HoyOS v0.2 es una base real y desplegable: sitio web, app de clientes, app de
profesores, escritorio de staff/admin, manual de operaciones, documentación y herramientas de
desarrollo en una sola base de código, con datos de prueba en el navegador. Este documento dice
dónde estamos, qué sigue y en qué orden (con dependencias explícitas y lo que se puede hacer en
paralelo), qué significa "terminado" en cada fase, cómo trabajar en el repo y qué debe decidir el
owner del estudio. Está escrito para que otra cuenta de Claude (o una persona) lo retome sin contexto.

## A. Where we are (v0.7.0, 2026-09-17)

- **v0.7.0 — App-store readiness and the stat-tile fit** (`docs/changelog/0019-app-store-readiness.md`,
  prompt `docs/prompts/0019-app-store-readiness.md`; version shared with 0018, built in parallel):
  `StatTile` never wraps its value (measured fit down to 50 %, two-line label / hint) and the desktop
  phone frame is a CSS container so KPI rows collapse inside it like on a phone — the cause of the
  "COP 440,000" on three lines. `deletion_requests` (47 tables) with **C-26 `/app/account` Cuenta y
  datos** (data controller, consents, download my data, legal links, two-step delete request that says
  invoices are kept anonymised), **W-09 `/site/delete-account`** (the public URL Google Play requires)
  and **M-11 `/admin/crm/deletions`** (queue, seven-step anonymisation checklist, audit per move).
  `docs/app-store-compliance.md` lists every Apple / Play row as done / pending / needs dev; manual 23
  carries the real flow. Nothing is deleted client-side: the anonymisation is the server-side job the
  checklist specifies (§F 24).

- **v0.7.0 — Decisions as settings + Integraciones + the long-term lane** (`docs/changelog/0018-decisions-as-settings.md`,
  prompt `docs/prompts/0018-decisions-as-settings.md`): every §E decision that is a *value* is now a field the owner
  fills in. **M-08a** holds the contact identity (address, city, WhatsApp, email, Instagram, map coordinates and link)
  with a "confirmed" switch — `useContact()` is the one reader and the site footer, W-06, `MapSlot`, the legal tokens,
  the email footer, the customer contact rows and the manual all label the values as pending until it is on.
  **M-08c** holds the payroll switches: **cadence `monthly | biweekly`, programmed both ways** (`payrollCalc.periodsFor()`;
  M-09a generates one or two runs per month, S-03 navigates by period, the Finance range defaults to 30 or 15 days),
  the **teacher rate card** by modality with per-teacher overrides (`payrollCalc.rateFor()`; the seed's 80–110k moved to
  the seeded settings row), default payout method, who signs, withholding. **M-08f** (new code) holds the content
  decisions: public class naming, Respiración as its own class (a `respiracion` modality row exists now; the switch
  shows or hides it), the map provider, and a publish toggle per legal version. **M-10 `/admin/integrations`** (new code)
  is one card per integration — Wompi, WhatsApp Business, email, DIAN, maps, Supabase — with non-secret fields ready to
  fill, a `simulated → configured → connected` chip, the "keys live server-side" notice and the dev checklist, stored in a
  new `integrations` table (**48 tables** with 0019's `deletion_requests`). §G below is the "when nothing else is queued" lane. Verified by a 27-check
  Playwright flow (biweekly runs sum to the monthly total; a rate edit moves S-03; a WhatsApp edit moves the footer).

- **v0.6.2 — Especiales** (`docs/changelog/0017-especiales.md`, prompt `docs/prompts/0017-especiales.md`):
  the manual path for edge cases. `special_charges` + `space_bookings` (46 tables), the **Especial** item
  inside S-04's `espacio` family (hand concept and price, optional teacher payout, optional room window,
  "Solo contacto" payer), **S-05 `/staff/rooms`** (rooms × hours day grid, booking form with a conflict
  check, held / confirmed / done / cancelled), `payroll_lines.kind = manual` derived by
  `payrollCalc.draftLinesFor()` so M-09a's idempotent draft, M-09b and S-03 all print "Especial: <concept>",
  and website copy on P-01 / W-06 / C-06 sending private events and special requests to WhatsApp. One new
  organism, `RoomDayGrid` (56 components). Answers Jas's item 34 structurally.

- **v0.6.1 is the expenses ledger** (`docs/changelog/0016-expenses-ledger.md`, Jas's review point 9):
  two tables (`expense_templates`, `expenses`), one arithmetic (`src/data/expenseCalc.ts`), **M-09c**
  `/admin/finance/expenses` with an idempotent "Generar gastos fijos del periodo" and "marcar pagado",
  and a **Balance del periodo** card on M-09 — Ingresos − Nómina − Gastos — so Finance finally answers
  "what did the studio spend". Chapter 14 of the manual explains it. 90 routes, 78 codes, 44 tables.
- **v0.6.0 is three parallel tracks plus this integration**: the website and brand content
  (`docs/changelog/0011-website-brand-content.md`), the depth pass on the thin screens
  (`0012-thin-screens-depth.md`) and the operations manual rebuild (`0013-ops-manual-visual-live.md`).
  All three answer one prompt (`docs/prompts/0011-website-brand-content.md`); they were built on
  separate branches and merged here, so all three entries carry version 0.6.0 on purpose.
  `package.json` was stale at `0.1.0` through v0.5.0 and is now `0.6.0` — the file and the docs agree
  again.
- **The public website is the brand**, not a scaffold. `src/tenant/brand.ts` holds the manifesto, the
  "Sobre HOY" and philosophy paragraphs, the five class essays and the taglines as typed bilingual
  tenant data; `src/tenant/pricing.ts` gained `FAMILY_ROLE`, `FAMILY_RATIONALE` and `DISCIPLINE`, so
  P-01 explains the value model instead of listing prices. Two new codes — **W-07** `/site/classes`
  and **W-08** `/site/classes/:slug` — and every site page now renders through `useLayout(spec)`.
  `city` is **Medellín** (the brand PDF is headed "Medellín · 2026"); `timezone` stays
  `America/Bogota`, Colombia's only IANA zone.
- **The thin screens have depth.** M-02 is a family — **M-02a** articles, **M-02b** FAQ, **M-02c**
  events, **M-02d** the media library. M-09 gained **M-09a** payroll runs (an idempotent draft
  generator) and **M-09b** the per-teacher statement with approve, Wompi/transfer/cash, per-teacher
  settle and a run that closes itself once the last teacher is paid; `src/data/payrollCalc.ts` is the
  one arithmetic that M-09a, the seed and S-03 all call. **S-03 `/teach/payroll`** reads the run
  instead of guessing. **A-06** is a versioned bilingual legal library whose every number is a
  `{{policy.*}}` / `{{tenant.*}}` token resolved from M-08, served by one `LegalDocument` organism on
  the site and at `/app/legal/:kind`.
- **Media slots are one contract.** `media_assets.slot_key` (M-02d) is the checklist of artwork the
  studio owes; `MediaPlaceholder` in the app and `MediaSlot` / `MapSlot` on the site all read it, so
  pasting a URL and flipping a row to `ready` publishes the asset everywhere with no deploy. Twelve
  slots today, all `pending`.
- **The operations manual is a book.** 28 ES + 28 EN chapters in seven parts, 64 figures per language
  pulled from `docs/screenshots/`, a cover with reading paths by role, a table of contents per
  chapter, and `{{pricing:…}}` / `{{tenant:…}}` / `{{policy:…}}` / `{{table:…}}` live blocks that read
  the app's own sources — the manual cannot go stale about a price or a policy. **27 pending owner
  decisions** are auto-extracted into K-04 and §E below.
- **Data**: **47 tables** (38 + `media_assets`, `payroll_runs`, `payroll_lines`, `legal_acceptances`,
  with `legal_documents` rewritten for versions and bilingual bodies, + `expense_templates` and
  `expenses` in 0.6.1, + `special_charges` and `space_bookings` in 0.6.2, + `deletion_requests` and
  `integrations` in 0.7.0), each with its `TableDef.rls`
  access contract emitted by `npm run sql` into `supabase/schema.sql` and `docs/data-model.md`.
  Forward and circular foreign keys are emitted as a deferred `alter table` block so the SQL applies in order.
- **Canvas look applied** (0.4.0): D-01 is the canvas hoy-brand token set; the phone frame, cream lane
  and card skin follow it. No card-like element lets its text escape at 390 or 1280 px. Dark-theme
  heading contrast on the movement and class cards was fixed in this cycle and verified in the
  W-01 dark capture.
- **Policy is one source**: `src/modules/customer/policy.ts` feeds its snapshot from `usePolicy()`
  (`src/modules/admin/settings.ts`), so an M-08 save reaches the customer app, the A-02 lockout and
  now the legal documents through the same live reader.
- **Live URL**: https://imagine-os.github.io/hoy/ — still pending one manual step: repo Settings →
  Pages → Source "GitHub Actions". `.github/workflows/pages.yml` deploys `dist/` on push to `main`.
- **Stack**: Vite 5 + React 18 + TS strict, HashRouter, plain CSS tokens (`src/design/tokens.ts`),
  `MockProvider` (localStorage, change events, cross-tab `storage` sync) behind the `DataProvider`
  interface, module registry via `import.meta.glob`, route manifest on `window.__hoyos.routes`.
  `npm run build` passes with zero TS errors.
- **Real vs stub** (`/#/dev/specs`, from `docs/screenshots/routes.json`): **96 routes, 84 codes,
  0 stubs** (M-08f, M-10, C-26, W-09 and M-11 new in 0.7.0). Integrations (Wompi, WhatsApp, email, DIAN, Supabase Auth/Realtime) are simulated behind
  their seams — see §F for exactly what is still mocked.
- **Docs**: prompt log, changelog and kanban are current through `0018`. `docs/screenshots/<code>/`
  holds every route in ES/EN × 390/1280 (dark for key pages) as JPEG q72 — **373 captures** — and
  `docs/pages/<code>.md` exists for every routed code.
  **55 components** carry a `.meta.ts` in D-02.

## B. Phases (dependency-ordered)

### P1 — Finish every screen against its spec
- **Done at v0.5.0**: every routed page renders (0 stubs), the nine missing tables landed with seed +
  `npm run sql` (29 → 38), every page that fell back to `localStorage`/`content.ts` reads them,
  `usePolicy()` gives instant policy re-render, and M-08c holds the payout account + NIT that C-05's
  transfer instructions need.
- **Still open in P1** (the leftovers 0007 and 0008 named, all P1):
  1. M-02 editors for `content_articles` and `faq_entries`, plus an event publisher for `events` —
     M-03's generic table manager edits them today.
  2. Server-side invite reward: `invites.status` only reaches `sent` from the client; `joined` /
     `rewarded` + `reward_credit_id` need the Supabase function that grants the credit (never the browser).
  3. Staff-side notification sending (front desk / M-04 / M-05 writing a `notifications` row) and the
     90-day retention job.
  4. Event waitlist (`event_rsvps.status` has no `waitlist` value yet) and attendance marking from S-02.
  5. Real Wompi tokenisation behind `wompiTokenise()` — the row shape in `payment_methods` is final,
     the token is a visible placeholder.
  6. Hand-written "Real vs mock" and section notes in each `docs/pages/<code>.md` (generated skeletons today).
- Depends on: nothing. Items 2, 3 and 5 are cheapest right after P2/P3 land their server side.
- Parallelizable with: itself, by module — customer, teacher, staff, admin are independent folders;
  shared components are improved in place, never forked. Also parallel with P5.
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
- Input: `reference/alt-build-empty10/supabase/migrations/0001_init.sql` — a generated migration
  salvaged from the parallel `imagine-os/empty10` build (53 tables, RLS on all of them, 188 per-table
  policies, `updated_at` triggers, an index per FK). Use it as the reference for RLS policy shape,
  naming and per-role coverage when writing ours, and `reference/alt-build-empty10/tools/gen-supabase.mjs`
  as the reference for generating policies from `src/data/schema.ts` instead of hand-writing them.
  It is frozen reference material, not a schema to adopt — `supabase/schema.sql` stays the target.
  See `reference/alt-build-empty10/README.md` and `docs/changelog/0009-salvage-empty10.md`.

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
From the operations manual (`/#/manual/decisions`, **27 flags** across its 28 chapters) and the canvas
audit (recommendations), deduplicated. Each needs an answer, an owner and a date; then edit the
chapter or spec and close the card.

**Pricing and payments**
1. Validity of the 10-class pack: 1 month (brief) or 3 months (P-01)?
2. Do published prices include IVA (19 %), or does the S-04 rail add it? (also decides the website copy) **→ setting in M-08c `pricesIncludeIva` (fill in)**
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
11. Teacher pay per class, payment date, contract type, and whether attendance affects the rate. **→ rate card in M-08c (fill in); contract type and attendance rule still a decision**
12. Who trains each role and whether the training sign-off is kept on paper or as a note in M-06.

**Communication and legal**
13. Official WhatsApp service hours and the legal opt-in text.
14. Final data-protection policy text (counsel) and the data controller.
15. Emergency numbers, evacuation routes and reference clinic.

**Product**
16. Do maintenance checklists live in HoyOS (no screen today — would be a new S-xx code) or in a separate form?

**Added by the 0.6.0 manual (chapters 01, 02, 11, 12, 16, 18, 19, 22)**
21. **The studio's real address and contact details.** The city is settled — the app says Medellín
    everywhere, per the brand PDF — but `tenant.contact` is still `+57 300 000 0000`,
    `hola@example.com` and "Dirección del estudio (pendiente)", and `tenant.location` is an
    approximate El Poblado point labelled "por confirmar". Everything is rendered as pending, so this
    is one edit to `src/tenant/tenant.ts` once the owner answers. (manual `01`) **→ setting in M-08a (fill in and tick “confirmed”; tenant.ts stays the default)**
22. **How the classes are named in public**: the brand copy has five disciplines (hot yoga, barre,
    pilates, meditación, respiración), the system organises the day by four movements (Enraíza,
    Fluye, Arde, Libera). Which one does the customer see on the schedule, and which is the internal
    label? Related: **Respiración has no `modalities` row** (it is taught inside other classes today),
    so W-08 renders a sentence instead of facts — add a row or fold it into meditación. (manual `02`) **→ two settings in M-08f: public naming `disciplines | movements`, and “Respiración es una clase propia” (the row exists since 0.7.0; the switch shows or hides it)**
23. **Pausas rules**: does "Pausas Ilimitadas" stack with Membership or replace it, and does a Pausa
    spend the one-class-per-person-per-day limit? (manual `11`)
24. **The guest allowance**: how many guests a Membership member may bring per month, and whether a
    guest takes one of the 15 mats or sits above capacity. (manual `11`)
25. **B2B rental windows**: which hours count as off-peak, and may a rental displace a published
    class (with how much notice)? (manual `12`)
26. **B2B rental terms**: deposit percentage, cancellation policy (how much is refunded and until
    when) and whether a damage deposit is taken. (manual `12`)
27. **Payroll cadence and method**: monthly with a cut-off on the 15th, or biweekly as M-09's 15-day
    range suggests? Plus the payment method (Wompi payout, transfer or cash), whether the studio
    withholds tax and who signs the payment record. The **teacher rate card** is the other half of
    item 11: the seed uses 80,000–110,000 COP per class and needs the real numbers. (manual `16`) **→ settings in M-08c: cadence switch (both programmed), payout method, who signs, withholding flag, rate card (fill in)**
28. **Social publishing**: who posts (role and person), on what calendar, and who approves a post
    that mentions prices or promotions. (manual `18`)
29. **Wordmark and media rights**: who approves third-party use of the wordmark (shoots, pop-ups,
    partner brands), whether studio-made material must credit HOY, and who owns the rights to photos
    and video shot in the studio during a paid rental. (manual `19`)
30. **Which legal versions to publish.** `legal_documents` now holds **seven versions across six
    kinds** (terms, privacy, waiver ×2, cancellation, refunds, house rules); **three are published
    and four are still draft**. Every
    document carries the counsel-review notice until the owner and counsel sign off the final text
    and name the legal issuer — which is items 3 and 14 seen from the legal library's side.
    (manual `22`, `23`) **→ publish toggle per version in M-08f (flip once counsel signs off)**

**Canvas audit recommendations (design/spec hygiene, no owner input needed but confirm)**
17. Register the nine components screens use but D-02 lacks (segmented switch, FAQ accordion row,
    five-star rating, now/next/later strip, member search, teacher arrival chips, gift design picker,
    intention tile, breathing rings, progress dots) — or delete the unused `at_*` entries.
18. Compute S-04 IVA/total from the pricing model instead of typed figures.
19. Drop scanner data/API (`face_templates`, `POST /checkins/scan`) from the S-02 spec.
20. Add `data`/`roles` to the C-08b spec; update D-02 copy counts (49 sections, 4-tab dock); date the
    v0.1 decision entries in the canvas changelog; prune the 32 orphan dictionary keys; amend the
    phase-3 plan text that still lists check-in and front desk.

**From Jas's design review, 2026-09-17 (0014) — Justin to forward**
31. **Sergio**: are teachers paid **fortnightly or monthly**? That interval is the unit of time for payroll runs
    and the accounting reports, and it decides whether the admin finance pages get a "15 days" period filter.
    (Same question as item 27, raised independently — answer it once. M-09 already carries the 15-day range.) **→ M-08c cadence switch: pick one, both are built**
32. **Sergio**: does the **Coordinator** role see the **monthly total-revenue KPI** in the admin panel, or is
    that limited to admin/finance?
33. **Lore**: do we need to store the **customer's sex/gender**? Nothing collects it today, so it would be a new
    `profiles` field and a new question at the desk.
34. **Lore**: is there a **group-session product for birthdays or events** — book the room and a teacher with an
    add-on detail? **Structurally answered in 0.6.2 (0017)**: a birthday or event group session is an **Especial** —
    the room is booked in S-05, the teacher and the price are set by hand in S-04, and the teacher's payout reaches
    payroll as a manual line. What remains for Lore is whether it becomes a *standard* product with a published
    price (a `pricing.ts` item) or stays a conversation, and what the add-on detail is.

**From the app-store checklist, 2026-09-17 (0019, `docs/app-store-compliance.md`)**
35. **Sign-in set for the store build**: email + WhatsApp OTP only, or also Google — if Google (or any
    social login) is offered, Apple guideline 4.8 makes **Sign in with Apple** mandatory. Decides what A-02
    shows and what Supabase Auth enables.
36. **Minimum age in the store listings**: the terms say 18+, or 14–18 with a guardian's written
    authorisation at the desk. State 18+ in both stores (recommended, keeps the app out of the Families
    policy) or build the guardian flow into sign-up.

## F. What remains after this pass (for Justin)

Everything below is known and written down; nothing here is a surprise found late. Read it as
"what HoyOS is not yet", grouped by the kind of work it needs.

**(a) Product work that is still mocked** — the UI, tables and seams exist; the vendor does not.

1. **Supabase auth and realtime.** Sign-in is a demo picker over the `users` table and the data layer
   is `MockProvider` (localStorage + cross-tab sync). `SupabaseProvider` replaces it behind the same
   interface; `supabase/schema.sql` (44 tables, with per-table access intent) is the input, and
   `reference/alt-build-empty10/supabase/migrations/0001_init.sql` is the RLS reference. **This is the
   gate**: payments, payroll, WhatsApp and multi-tenant all need a real authenticated user first (P2).
2. **Wompi payments.** C-04, S-04, C-17 and C-23 all pay through one seam (`wompiCheckout()`,
   `wompiTokenise()`), write real `payments`/`invoices` rows and show the declined path — but no money
   moves and no webhook confirms. Needs merchant credentials, a sandbox, and server-side webhooks (P3).
3. **Wompi payroll / payouts.** **Narrowed in 0.6.0**: the runs, lines, approvals and payment marks
   are real rows (M-09a, M-09b, S-03) with an audit entry each, and `wompiPayout()` is the dispersion
   seam with its rejected path. What is missing is the money: merchant payout credentials, a sandbox
   and the webhook that confirms a dispersion (P3).
4. **WhatsApp Business API.** M-05 automations, M-06 CRM threads and the C-21 OTP are simulated in
   `message_log`. Needs a Meta-approved sender and templates — **the approval has a lead time, so
   start that application before P2 finishes** (P4).
5. **Email sending.** M-04 designs and previews bilingual templates; nothing sends. Needs a provider
   (and the MJML step) — receipts and reports depend on it (P4).
6. **DIAN e-invoicing.** `invoices` rows carry the reference shape, no CUFE is emitted. Needs a
   provider decision and the legal issuer named (§E items 3 and 4) before it can be built (P3).

**(b) UI depth that is still thin** — real pages, but their page doc or spec says "placeholder".

7. ~~**M-02 content CMS**~~ **DONE (0.6.0).** M-02 is a family: M-02a articles (bilingual markdown,
   slug, category, `publish_at`), M-02b FAQ (sections, ordering, page 1/2), M-02c the event publisher,
   M-02d the media library. What remains is **file upload** (Supabase Storage — M-02d stores a URL
   today) and a **server-side scheduled-publish job** (the status is computed at render time).
8. ~~**M-09 finance**~~ **DONE (0.6.0)** for payouts: M-09a runs with an idempotent draft generator,
   M-09b the per-teacher statement (approve, Wompi/transfer/cash, per-teacher settle, CSV, print), and
   a run that closes itself when the last teacher is settled. The invoice table still has **no real
   DIAN reference** — that is item 6.
9. ~~**`/teach/payroll` (S-03)**~~ **DONE (0.6.0).** It reads `payroll_lines` once a run covers the
   period and labels a live estimate before that, through the same `payrollCalc.ts` M-09a uses.
10. ~~**A-06 legal pages**~~ **DONE (0.6.0)** as structure: a versioned bilingual library with a
    version switcher, `{{policy.*}}` / `{{tenant.*}}` tokens resolved from M-08, `legal_acceptances`,
    and one `LegalDocument` organism on the site and at `/app/legal/:kind`. What remains is the
    **final text from counsel** and **deciding which versions to publish** — three of seven versions
    are published, four are draft (§E items 14 and 30).
11. **C-05 payment methods** — `WompiCard (placeholder)`; the saved-method row is right, the token is not.
12. **S-04 register & take payment** — the Wompi link is a placeholder, so a card payment stays pending.
13. **C-13 club rules** — `VideoPlaceholder (studio tour)` until the studio supplies footage.
14. **Photography and a map** — **narrowed in 0.6.0.** The code exists: `MediaSlot` and `MapSlot`
    (molecules with metas) and `MediaPlaceholder` all read `media_assets.slot_key`, and M-02d is the
    owner-facing checklist of the **12 slots** with a ratio and a brief each. Two things are still
    missing and neither is code: **the assets themselves** (all 12 rows are `pending`; pasting a URL
    and flipping a row to `ready` publishes it everywhere with no deploy) and **a map-provider
    decision** — `MapSlot` defaults to `provider="none"` so screenshots stay offline-safe, with
    key-less OSM and Google embeds ready behind the prop, and a drawn neighbourhood map can ship
    through the media library in the meantime. **0.7.0: the provider is a setting in M-08f and the coordinates/link are
    edited in M-08a; the only thing left is the choice itself.**

**(c) Decisions only the owner can make** — **34** of them, deduplicated in §E of this file and live
in the app at `/#/manual/decisions` (27 flags auto-extracted from the 28-chapter operations manual,
K-04). The canvas audit's design/spec hygiene recommendations are `CANVAS-AUDIT.md` and items 17–20
of §E.

15. The ones that block build work: pack validity, the DIAN provider and legal issuer, the Wompi
    settlement account and the pause notice/freeze cap. **No longer blocking since 0.7.0** — they are
    fields the owner fills in: IVA in prices (M-08c), the **teacher rate card** and **payroll cadence**
    (M-08c, §E 27), **which legal versions to publish** (M-08f, §E 30), the **map provider** (M-08f) and the
    studio's **real address and contact details** (M-08a, §E 21). The integrations' non-secret ids are
    filled in on **M-10** ahead of the dev.
16. The rest are policy, people, payroll and legal text — they change copy and M-08 values, not structure.

**(d) Repo hygiene**

17. **`imagine-os/empty10`** is untouched and waiting on Justin: reset it to a placeholder, or delete it.
    Its four worth-keeping files (the 53-table RLS migration, its generator, `ARCHITECTURE.md`,
    `PLAN.md`) are already frozen in `reference/alt-build-empty10/`, so nothing is lost either way —
    see `docs/changelog/0009-salvage-empty10.md`.
18. Smaller: code-split the bundle by surface (one ~1.7 MB chunk today), drop the C-07b and
    "C-14 / C-15" compatibility aliases from `scripts/gen-specs.mjs`, and prune the 32 orphan canvas
    dictionary keys. ~~Replace the ops manual's `[screenshot: …]` placeholders~~ **DONE (0.6.0)**:
    the manual carries **64 real figures per language** and zero placeholders.

**(e) New in 0.6.0, still open**

19. **`remark-gfm` is missing**, so `react-markdown` does not render pipe tables. Both 0.6.0 workers
    worked around it — the manual transforms pipe tables into a fenced block renderer inside
    `MarkdownViewer`, and the legal documents were written as lists rather than tables. Add the
    dependency (with the changelog entry the rules require) and delete the transform.
20. ~~**Respiración has no `modalities` row**~~ **DONE (0.7.0)**: the row exists (`respiracion`, 45 min, libera) and
    M-08f decides whether the public sees it; W-08 shows facts when on and the sentence when off (§E 22).
21. ~~**The expenses ledger**~~ **DONE (0.6.1).** `expense_templates` + `expenses`, M-09c
    `/admin/finance/expenses` (idempotent period generator, marcar pagado) and the Balance card on
    M-09 (`docs/changelog/0016-expenses-ledger.md`). Still open there: a CSV export for the accountant
    and attaching the receipt image to a row (Supabase Storage).
22. **Photography, video and a drawn map** for the 12 `media_assets` slots (item 14) — the one thing
    the owner has said he will supply himself.
23. **Especiales, still open after 0.6.2.** The seed's second room ("Sala de meditación", 8 mats) is a demo
    row — the real room list and capacities belong in the `rooms` table once the owner confirms them. A
    held booking does not yet expire on its own (chapter 12's deposit rule is a person's decision today,
    §E 26), an Especial paid by Wompi link stays `pending` like any S-04 sale, and refunds of an Especial
    go through M-09's refund like any payment (the booking is cancelled by hand in S-05).
24. **App-store readiness, still open after 0.7.0.** The structure exists (C-26, W-09, M-11,
    `deletion_requests`, the checklist doc); what is missing is execution and paperwork: the **server-side
    deletion job** M-11's seven steps specify (anonymise `profiles` + `users`, delete the Supabase auth
    user, purge notifications, keep `payments` / `invoices` under the anonymous id, flip the request to
    `done`, send the confirmation), the **edge function** behind the public W-09 insert, **privacy nutrition
    labels** and the **Play Data safety form** filled from `docs/data-model.md`, a **report / moderation**
    path for reviews if they go public, counsel's sign-off on the privacy text (§E 3, 14, 30), the sign-in
    set and the minimum age (§E 35–36), and the **native shell** itself (Capacitor or a TWA) with push
    delivery. All gated on P2 (Supabase).

## G. When nothing else is queued

Justin, 2026-09-17: "add these to the longer term plan. its something you can do when there's nothing else to do."
Nothing here blocks a phase in §B; pick from the top when the queue is empty. Items 1–3 are his top three; the
rest is `docs/website-vision.md` ("Next level — 15 ideas") as one line each, minus what has since shipped.

1. **SEO / Open Graph metadata + a prerender step.** Per-route `<title>` / `<meta name="description">` / OG tags
   (a `usePageMeta` hook next to `useLayout`) and a build step that writes a static HTML snapshot per public
   route — today a WhatsApp or Instagram link preview shows nothing and search engines see one empty shell.
2. **"Next class in N minutes" widget.** A live line in the site header or hero ("Hot Vinyasa empieza en 42 min ·
   3 cupos") from `class_sessions`, which the site already reads.
3. **Membership calculator.** A visits-per-month slider that compares the Monthly Plan, the 10-class pack and
   single passes from `src/tenant/pricing.ts` and names the break-even — the value model arguing for itself.
4. Produce the shot list (1 video, 14 photographs across 16 `media_assets` slots) — the owner supplies it.
5. Class-finder quiz: three questions mapped onto the four movements and five classes, ending on a filtered schedule.
6. Motion and scroll choreography behind `--dur-*` / `--ease-*` tokens and `prefers-reduced-motion`.
7. Accessibility pass: movement-tint contrast in both themes, focus order, skip link, keyboard run through the schedule drawer.
8. Journal / blog from `content_articles` (`/site/journal`, `/site/journal/:slug`) — feeds item 1.
9. Teacher spotlight series: one long-form page per month from `teachers.bio`, reusing W-08's layout.
10. Instagram feed slot: six tiles under the footer through a cached endpoint (never a client-side token).
11. WhatsApp deep links everywhere: per class, per plan, per booking intent, each with its context prefilled.
12. PWA install: manifest, icon set from the wordmark, a service worker that caches the shell.
13. Testimonial curation: a `featured` flag or admin picker for the three reviews on the home page.
14. Bilingual SEO and the `/en` question: real per-language URLs, decided once together with item 1.
15. `remark-gfm` (§F 19) and the bundle code-split by surface (§F 18) — hygiene that pays every later item.
