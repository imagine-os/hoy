# HoyOS kanban

_Updated every turn. Codes reference `src/specs/canvasSpecs.ts` and the module `specs.ts` files; `/#/dev/specs` shows the live built/stub badge per code (v0.5.0 closed by the 0010 integration pass: 80 routes, 69 codes, 0 stubs; admin shell + data depth + empty10 salvage + this pass). What is still missing after v0.5.0 is listed as a plain numbered list in `ROADMAP.md` §F._

## Backlog

### Product
- **P1 leftovers from 0007/0008** (numbered in ROADMAP §B/P1): M-02 editors for `content_articles` / `faq_entries` + an event publisher for `events` (M-03 edits them generically today) · server-side invite reward (`invites.status` only reaches `sent` from the client; `joined` / `rewarded` + `reward_credit_id` need the Supabase function that grants the credit) · staff-side `notifications` sending (front desk / M-04 / M-05 writing a row) and the 90-day retention job · event waitlist (`event_rsvps.status` has no `waitlist` value yet) and attendance marking from S-02 · real Wompi tokenisation behind `wompiTokenise()`
- **From Jas's review (0014)** — owner: finance workstream / pending Sergio: payroll settlement review page (detail of teacher payments, classes taught, and a "paid" mark per teacher) · recurring fixed fortnightly expenses + variable expenses so Hoy has a total finance balance · a "15 días" period filter on the admin finance pages *if* Sergio sets fortnightly pay periods
- A-06 legal pages inside the app (site pages exist) · real Supabase Auth behind A-02/A-03/C-21 (SessionProvider already accepts any `users` row)
- C-05 transfer instructions can read the payout account from M-08c (M-08c stores it since 0007)
- PDF receipts (C-11)
- S-02/S-04 follow-ups: offline queue for check-ins, real Wompi link · M-04 MJML designer + real provider · M-05 Meta approval API · M-09 Wompi payouts + DIAN CUFE emission
- M-02 scheduled publishing + media library · M-06 duplicate merge · M-07 signed CSV
- Supabase provider (auth, realtime) · Wompi payments/payroll · WhatsApp CRM · email designer
- Code-split the bundle by surface (single ~1.6 MB chunk today) · live cursors / presence (nice to have)

### Docs & content
- Visual pass follow-ups: per-screen density check of C-03, C-04, S-04, M-03 against their canvas artboards at real size; photography placeholders (`data-ph`) once real imagery exists; consider vendoring Inter/DM Sans woff2 for offline captures
- Canvas audit #9/#30: prune the 32 orphan dictionary keys (n_waiver, wv_sign, at_seg, at_nav, ph_qr, door_scan…) from `reference/canvas/strings.json` consumers
- Canvas audit #24/#25: register in D-02 the components screens use but the library lacks; fix D-02 copy counts (49 sections, 4-tab dock)
- Canvas audit #27: amend plan phase-3 text that still lists check-in and front desk (K-01) · #28: date the v0.1 decision entries · #33: add `data` and `roles` to the C-08b spec
- Resolve the 17 owner decisions listed at `/#/manual/decisions` (ROADMAP §E) and update the chapters
- Remove the C-07b and 'C-14 / C-15' compatibility aliases from `scripts/gen-specs.mjs` (routes now use C-07b as the credits ledger and C-14/C-15 separately)
- Ops manual: replace `[screenshot: …]` placeholders (12 per language) with the real captures now in `docs/screenshots/` (K-03)
- Enrich `docs/pages/<code>.md` (generated skeletons) with the hand-written "Real vs mock" and section notes per page
- `scripts/screenshots.mjs` has no state parameter, so the collapsed sidebar / rail and the mobile drawer are not captured (0007 verified them by hand) — add `--state=` or a per-route hook
- `docs/prompts/0009-salvage-empty10.md` is missing (0009 shipped with a changelog entry only)

### Decisions
- **Open questions from Jas's review (0014), with Justin to forward** — recorded as ROADMAP §E 21–24:
  - **Sergio**: are teachers paid fortnightly or monthly? (sets the unit of time for payroll runs and accounting reports, and whether a "15 días" filter is added)
  - **Sergio**: does the Coordinator see the monthly total-revenue KPI in the admin panel?
  - **Lore**: do we need to store the customer's sex/gender? (no field today)
  - **Lore**: is there a group-session product for birthdays/events (book room + teacher + an add-on)?

### Repo hygiene
- empty10 placeholder: awaiting Justin's decision (reset to placeholder or delete)

## Doing
- (none — v0.5.0 closed: 0007 admin shell, 0008 data depth, 0009 empty10 salvage, 0010 integration pass)

## Done

### Tenant city (0015 · v0.5.1)
- **Tenant** `city` is **Medellín** (was Bogotá) — C-05's "Medellín · COP" subtitle, the auth-shell footer and the M-04 email footer all follow from `src/tenant/tenant.ts`; `timezone` stays `America/Bogota` (Colombia's IANA zone), README fixed, and the `EmailPreview` D-02 usage now reads the city from the tenant config instead of hardcoding it

### Jas design review (0014 · v0.5.1)
- **C-06** "Tu plan" card shows **Inicio del plan** / **Fin del plan** ("Plan start" / "Plan end") from the existing `memberships.starts_at` and `ends_at ?? renews_at`, through `formatDate()` with the year — no new columns
- **C-02 / C-01** a class with no spots left shows a **Sin cupos** / **Full** pill (danger `Badge`, in place of the capacity meter) and can no longer be booked: the row leads to the waitlist (C-20). `core.common.full` ES is now "Sin cupos"; `ClassRow.meta.ts` documents and renders the `full` state
- **Seed** always has one upcoming class today at capacity (deterministic, applied after the random pass so no other page's data shifts) with a waitlist row behind it
- **S-04** Resumen gained **Valor pagado** (defaults to the invoiced total, untouched = one-click sale) and, when it differs, the difference plus a required **Observación** that blocks "Completar venta" until filled; both persist as `payments.amount_paid` / `payments.note` (schema.ts + supabase/schema.sql + docs/data-model.md) and land in the audit entry
- **C-05** subtitle is "Medellín · COP" — the "IVA 19%" fragment is gone in both languages; receipt and POS maths untouched
- **W-01 / P-01** (dark-mode "Cuatro movimientos" titles, "Planes claros" → "Planes") — handed to the concurrent website workstream, which holds `src/modules/website/**`

### Final integration (0010 · v0.5.0)
- `src/modules/customer/policy.ts` reads `usePolicy()` (`src/modules/admin/settings.ts`): its own `attachPolicy()` peek/fetch/subscribe loop is deleted, `toPolicyValues()` is the one M-08 → `PolicyValues` mapper, and `usePolicyValues()` is exported for new components. `<PolicySync/>` stays (it bridges the hook to the 18 plain `policy.*` readers and the non-React helpers) but now assigns during render, above the router, so the first paint shows stored values
- 0007 and 0008 both keep version 0.5.0 — they shipped together; recorded in ROADMAP §A so the duplicate is not read as an error
- Full screenshot pass: 80 routes, 308 `.jpg` captures retaken, 109 changed — the nine pages 0008 rewired (C-05, C-10, C-13, C-14/C-15, C-16, C-19, C-23, C-24, S-03) and the pages the containment pass shifted; M-08a…M-08e byte-identical to 0007. No console errors, `docs/screenshots` 39 MB. Collapsed-sidebar state skipped — the script has no state parameter
- `gen-page-doc.mjs --all` wrote M-08a…M-08e page docs; `docs/pages/M-08.md` is now the family index and its retired single-page captures were removed
- ROADMAP: §A rewritten for 0.5.0, Data lane done, six numbered P1 leftovers, and new **§F "What remains after this pass (for Justin)"** — 18 numbered items in four groups (mocked integrations, thin screens, owner decisions, repo hygiene). 265 lines
- README at 0.5.0

### Data depth (0008 · v0.5.0)
- Nine new tables, additive, with bilingual labels, `TableGroup` (so M-03 lists them) and a new `TableDef.rls` access contract: `notifications`, `notification_prefs`, `reviews`, `invites`, `events`, `event_rsvps`, `payment_methods`, `content_articles`, `faq_entries` (29 → 38)
- `scripts/gen-sql.mjs` emits `TableDef.rls` as `-- access:` comments per table in `supabase/schema.sql` and as a "Who may read / write" list in `docs/data-model.md`; `docs/roles.md` carries the same matrix per role
- Seed: 6 rule/about articles, 17 FAQ entries (6 sections, 2 pages), 3 upcoming events with RSVPs, a review for every past class marked rated (+ `teachers.rating_avg` recomputed), 2–4 notifications per customer derived from their own bookings/payments, the demo customer's full 3 × 5 preference matrix, saved methods for electronic payers, 5 invites incl. one rewarded with a real `credits` row
- C-24 lists `notifications` (mark one / all read) and owns the channel × category preference matrix (no row = enabled); C-19's three toggles are the per-channel master switch
- C-10 inserts `reviews` (anonymous by default) and updates `teachers.rating_avg`; `/teach/class/:id` shows the session's average, count and top tags read-only
- C-16 writes `invites` with the member's referral code; C-23 lists published `events`, writes `event_rsvps` and pays through the existing Wompi seam (`payments` + `invoices`, `plan_id = null`)
- C-05 manages `payment_methods` (add via the new `wompiTokenise()` seam, remove, make default); `token_ref` is visibly a placeholder and the PAN never reaches HoyOS
- C-13 and C-14/C-15 read `content_articles` / `faq_entries`; `src/modules/customer/content.ts` deleted and the 23 dictionary keys of the derived inbox pruned
- New component `RatingSummary` (molecule, `.meta.ts`, states) — D-02 stays current in the same turn

### Admin shell (0007 · v0.5.0)
- `DesktopShell`: 240 px lane ⇄ 56 px icon rail with tooltips (footer chevron + `[`), collapsed state per surface in localStorage; nav groups fold with a caret (state per group, active route's group forced open); off-canvas drawer with scrim below 900 px, opened from the top bar
- Top bar for staff/admin/dev: sidebar toggle · wordmark · page name + code chip · global search (routes by name/code, members by name, `/` to focus, ↑↓, Enter) · ES/EN · theme · unread bell (`message_log`) · role switcher · dev-mode toggle · spec chip
- New molecules `GlobalSearch` and `NotificationBell` (with metas); `TopBar` gained `leading`, `code` and `center` slots; `RouteDef.nav` gained `group` as an i18n key and `to`
- Feature switches left M-01 for M-08b; M-08 is now M-08a General · M-08b Features · M-08c Payments (payout account, NIT, IVA/DIAN, Wompi env, "keys never stored here") · M-08d Communications · M-08e Branding, each a route with its own spec and an audited section save
- M-01 gained "Today at a glance" (today's classes, occupancy, who is already checked in) in the freed space
- `usePolicy()` exported from `src/modules/admin/settings.ts` — M-08 saves reach consumers immediately
- Design system reachable from the admin sidebar for a super admin (`core.nav.group.design` → tokens, components, specs, layout editor at C-01, knowledgebase); dev surface keeps its own shell and lists the admin group too
- Containment pass: no card-like element lets text escape at 390 or 1280 px (Playwright: 17 real overflows before, 0 after) — `min-width: 0` on flex/grid children, `overflow-wrap: anywhere` for codes/emails/IDs, media and `pre` capped
- D-01 gained `--w-rail: 56px`

### Visual fidelity (0006 · v0.4.0)
- D-01 rewritten from the canvas hoy-brand tokens: `--hoy-c*` palette, `--m-*` RGB triplets, semantic surfaces (frame paper / sand tiles / cream lane / sand ground), Depth shadow scale verbatim, Texture layer as CSS (`--tex-*`), materials (`--mat-*`), surface scale, movements from `movSets.hoy`, radii 4/8/11/16/18/24/32/34, breathe 7 s + spin 1.1 s
- Accent split: `--color-primary` (text, dark → `--cat`) vs `--color-accent-fill` (fills, constant deep blue)
- PhoneShell = canvas phone frame from 900 px (430 × 34 px radius, frame gradient + grain, dock inside the frame, sand ground); DesktopShell = cream lane sidebar with accent pill; top bars cream .9 + blue hairline
- Cards, chips, buttons, segmented, date strip, stat tiles, inputs, toggles, avatars, nav bar, badges, notices, lists, tables on the surface/shadow/texture tokens; no hairline borders in the styled skin (wireframe restores them)
- Inter/DM Sans metric fallbacks (`@font-face size-adjust`), headings in ink with -0.02em, 11 px .14em eyebrows
- `/#/dev/tokens` shows palette, triplets, surfaces, textures, materials and the shadow scale live; `docs/design-system.md` mapping table canvas var → token
- Before/after pairs + `docs/screenshots/_before/0006/comparison.jpg`; full screenshot pass regenerated; smoke green

### Final integration (0005 · v0.3.0)
- `WIRED` += S-02 M-01 C-02 C-02b C-03 C-19 (layout editor badge)
- Hub "Customer app" card, website sign-in button, schedule sign-in prompt and plans "buy" → `/auth/sign-in` (with `?next=`); staff/teacher cards still switch demo users
- SessionProvider accepts any `users` row id (profile + user_roles resolved from the data layer); A-03 signs in as the created account; `useTable`/`useRow` re-peek synchronously on query change
- MockProvider cross-tab realtime: `storage` listener reloads the db and emits `reset` (verified with two Playwright pages)
- Customer policy values read from M-08 `tenants.settings` (`policyFromSettings`, `<PolicySync/>`); M-08 gains payment hold, charge notice and lockout fields; default cancellation window aligned to the canvas (2 h)
- `core.nav.history` shared key · seed: demo customer ≤ 1 booking/day, birthdays on ~30 % of profiles (half this month)
- Screenshot tooling reads the app's own route manifest (`window.__hoyos.routes` → `docs/screenshots/routes.json`), saves JPEG q72; `gen-page-doc.mjs --all`
- Canvas audit #22 (S-04 IVA from pricing + M-08 tax) and #26 (scanner dropped from the S-02 spec) closed
- Full screenshot pass (es/en × 390/1280, dark for key pages) and `docs/pages/<code>.md` for every routed code

### Staff & admin (0003 · v0.2.0)
- S-01 role home with live numbers (next class, arrivals, open shifts, payments, recent activity)
- S-02 front desk check-in: today strip, roster, search, one-tap check-in, walk-in, late/no-show, waitlist promote, `useLayout` wired
- S-04 register & take payment: who · what (pricing.ts) · how, IVA from M-08, receipt, auto check-in
- S-03 teacher app: home, `/teach/class/:id` attendance + notes, `/teach/payroll` (placeholder until Wompi), `/teach/profile`
- M-01 dashboard: KPI row, occupancy chart, audited feature switches, audit trail, `useLayout` wired
- M-02 content CMS (templates, teachers, modalities, rooms) · M-04 email studio · M-05 WhatsApp automations
- M-06 CRM member 360 · M-07 activity log · M-08 settings & policies (`tenants.settings`) · M-09 finance (new code)
- Components: EmptyState, RosterRow, BarList, PhoneBubble, Timeline, EmailPreview, Receipt (with metas)
- Every staff write appends to `audit_log` via `useAudit`

### Customer (0002 · v0.2.0)
- Booking flow: C-02 schedule + C-02b week · C-03 class detail · C-04 checkout (entitlements, IVA computed, Wompi seam, E-02 inline) · C-05 payment methods · C-08 booked + C-08b change sheet · C-20 waitlist (30-min claim) · E-01 E-02 E-03 demo routes + inline states
- Account & plans: C-06 · C-07 · C-07b · C-22 (pause ≤ 30 d, cancel at period end) · C-11 · C-19 (photo, WhatsApp, emergency contact, LangToggle → users.locale) · C-24 · C-25 · C-13 · C-14/C-15 · C-16 · C-17 · C-18 (+ profile) · C-23 · C-10 · A-05
- Auth: A-01 splash · A-02 sign-in (demo picker, lockout → E-04) · A-03 create account · C-21 OTP recovery · E-04 locked
- Components: Skeleton · Notice · ListRow/ListGroup · SegmentedControl · DateStrip · CountdownRing · EmptyState · Accordion · RatingScale · OtpInput · OrderSummary · BreathingRings (all with metas)

### Docs & content (0004)
- Operations manual: 11 ES + 11 EN chapters in `docs/ops-manual/`, bilingual viewer with chapter sidebar, callouts, placeholders, prev/next, print (K-03)
- Decisions pending page auto-extracted from the manual (K-04)
- Canvas v1.5 installed; `CANVAS-AUDIT.md`; `scripts/extract-canvas.mjs`; specs/strings regenerated; C-02b, C-14, C-15 separate; C-07b retired with alias (D-03)
- `docs/flow-map.md` with routes per code
- Docs viewer: grouped sidebar, kanban lanes × columns, changelog newest first, prompt | response, screenshot gallery, mobile picker (K-02); knowledgebase reuses the renderers (K-01)
- MarkdownViewer: callouts, screenshot placeholders, `components` prop (D-02)
- Screenshot rules rewritten; `screenshots.mjs` naming, `--only`, `--label`; `docs/pages` template + generator
- ROADMAP.md (P1–P7, DoD, how-to, open decisions) and README.md (seven perspectives)

### Scaffold (0001 · v0.1.0)
- Repo bootstrap: rules (`CLAUDE.md`), reference material, docs skeleton, Pages workflow
- D-01 design tokens (light/dark, wireframe skin) · ThemeProvider
- i18n core (`useT`, ES/EN, fallback, LangToggle)
- Roles, demo users, SessionProvider, `RequireRole`, dev mode + view-as
- Inspector panel + spec chip + `Ctrl+.` · `/#/dev/specs` index
- Data layer: schema + tableRegistry + MockProvider (localStorage, change events) + Supabase stub + `supabase/schema.sql`
- M-03 Table manager · Layout editor (`/#/dev/layout/:code`) + `useLayout`
- Docs viewer (`/#/docs`), knowledgebase (`/#/dev/knowledgebase`), ops-manual viewer (`/#/manual`)
- Public website scaffold (home, about, modalities, schedule, teachers, plans, contact, legal) · Testing hub (`/#/`)
