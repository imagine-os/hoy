# HoyOS kanban

_Updated every turn. Codes reference `src/specs/canvasSpecs.ts` and the module `specs.ts` files; `/#/dev/specs` shows the live built/stub badge per code (v0.3.0: 65 codes routed, 0 stubs)._

## Backlog

### Data (new tables the customer pages are waiting for — each needs `schema.ts` + seed + `npm run sql` + `docs/data-model.md`)
- `notifications` + `notification_prefs` — C-24 derives its inbox from message_log + waitlist + bookings; a real table lets staff send and members mute.
- `reviews` — C-10 marks `bookings.rated` and keeps the rating in localStorage; a table makes ratings visible to teachers and M-06.
- `invites` — C-16 keeps sent invites per user in localStorage; a table lets the referral reward be granted.
- `events` + `rsvps` — C-23 reads demo events from `content.ts`; tables let M-02 publish events and count attendance.
- `payment_methods` — C-05 derives saved methods from approved payments; a table stores Wompi tokens when Wompi lands.
- `content_articles` / `faq_entries` — C-13 and C-14/C-15 read `content.ts`; tables let M-02 edit rules and FAQ without a deploy.

### Product
- A-06 legal pages inside the app (site pages exist) · real Supabase Auth behind A-02/A-03/C-21 (SessionProvider already accepts any `users` row)
- Pages that read `policy.*` re-render on the next navigation after an M-08 edit; a `usePolicy()` hook would make it instant
- Bank account + NIT for transfer instructions (C-05) in M-08 profile section · PDF receipts (C-11)
- S-02/S-04 follow-ups: offline queue for check-ins, real Wompi link · M-04 MJML designer + real provider · M-05 Meta approval API · M-09 Wompi payouts + DIAN CUFE emission
- M-02 scheduled publishing + media library · M-06 duplicate merge · M-07 signed CSV
- Supabase provider (auth, realtime) · Wompi payments/payroll · WhatsApp CRM · email designer
- Code-split the bundle by surface (single ~1.2 MB chunk today) · live cursors / presence (nice to have)

### Docs & content
- Canvas audit #9/#30: prune the 32 orphan dictionary keys (n_waiver, wv_sign, at_seg, at_nav, ph_qr, door_scan…) from `reference/canvas/strings.json` consumers
- Canvas audit #24/#25: register in D-02 the components screens use but the library lacks; fix D-02 copy counts (49 sections, 4-tab dock)
- Canvas audit #27: amend plan phase-3 text that still lists check-in and front desk (K-01) · #28: date the v0.1 decision entries · #33: add `data` and `roles` to the C-08b spec
- Resolve the 17 owner decisions listed at `/#/manual/decisions` (ROADMAP §E) and update the chapters
- Remove the C-07b and 'C-14 / C-15' compatibility aliases from `scripts/gen-specs.mjs` (routes now use C-07b as the credits ledger and C-14/C-15 separately)
- Ops manual: replace `[screenshot: …]` placeholders (12 per language) with the real captures now in `docs/screenshots/` (K-03)
- Enrich `docs/pages/<code>.md` (generated skeletons) with the hand-written "Real vs mock" and section notes per page

## Doing
- (none — v0.3.0 integration closed)

## Done

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
