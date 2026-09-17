# HoyOS kanban

_Updated every turn. Codes reference `src/specs/canvasSpecs.ts`._

## Backlog
- Customer follow-ups: tables for notifications, reviews, invites, events, payment_methods, content (C-24 C-10 C-16 C-23 C-05 C-13 C-14/C-15) · SessionProvider accepts created accounts (A-03) · cross-tab realtime in MockProvider · policy values → tenant settings (M-08) · hub + website → `/auth/sign-in` · `WIRED` += C-02 C-03 C-19 · PDF receipts (C-11)
- A-06 legal pages inside the app (site pages exist) · real Supabase Auth behind A-02/A-03/C-21
- S-02/S-04 follow-ups: offline queue for check-ins, face templates (never), real Wompi link
- M-04 MJML designer + real provider · M-05 Meta approval API · M-09 Wompi payouts + DIAN CUFE emission
- M-02 scheduled publishing + media library · M-06 duplicate merge · M-07 signed CSV
- Supabase provider (auth, realtime) · Wompi payments/payroll · WhatsApp CRM · email designer
- Live cursors / presence (nice to have)
- Operations manual content (`docs/ops-manual/`)
- Screenshot pass for every page in ES/EN, mobile/desktop

## Doing
- v0 scaffold hardening: more component states in D-02, seed data breadth
- Screenshot pass (`npm run screenshots`) for the v0 routes and the 35 customer/auth routes (0002)

## Done

### Staff & admin (0003, v0.2.0)
- S-01 role home with live numbers (next class, arrivals, open shifts, payments, recent activity)
- S-02 front desk check-in: today strip, roster, search, one-tap check-in, walk-in, late/no-show, waitlist promote, `useLayout` wired
- S-04 register & take payment: who · what (pricing.ts) · how, IVA from M-08, receipt, auto check-in
- S-03 teacher app: home, `/teach/class/:id` attendance + notes, `/teach/payroll` (placeholder until Wompi), `/teach/profile`
- M-01 dashboard: KPI row, occupancy chart, audited feature switches, audit trail, `useLayout` wired
- M-02 content CMS (templates, teachers, modalities, rooms) · M-04 email studio · M-05 WhatsApp automations
- M-06 CRM member 360 · M-07 activity log · M-08 settings & policies (`tenants.settings`) · M-09 finance (new code)
- Components: EmptyState, RosterRow, BarList, PhoneBubble, Timeline, EmailPreview, Receipt (with metas)
- Every staff write appends to `audit_log` via `useAudit`
- Repo bootstrap: rules (`CLAUDE.md`), reference material, docs skeleton, Pages workflow
- D-01 design tokens (light/dark, wireframe skin) · ThemeProvider
- i18n core (`useT`, ES/EN, fallback, LangToggle)
- Roles, demo users, SessionProvider, `RequireRole`, dev mode + view-as
- Inspector panel + spec chip + `Ctrl+.` · `/#/dev/specs` index
- Data layer: schema + tableRegistry + MockProvider (localStorage, change events) + Supabase stub + `supabase/schema.sql`
- M-03 Table manager
- Layout editor (`/#/dev/layout/:code`) + `useLayout`
- Docs viewer (`/#/docs`), knowledgebase (`/#/dev/knowledgebase`), ops-manual viewer (`/#/manual`)
- Public website scaffold (home, about, modalities, schedule, teachers, plans, contact, legal)
- Testing hub (`/#/`)
- Module stubs: customer (C-01 real), teacher, staff, admin, dev

### Customer (0002 · v0.2.0)
- Done — booking flow: C-02 schedule + C-02b week · C-03 class detail · C-04 checkout (entitlements, IVA computed, Wompi seam, E-02 inline) · C-05 payment methods · C-08 booked + C-08b change sheet · C-20 waitlist (30-min claim) · E-01 E-02 E-03 demo routes + inline states
- Done — account & plans: C-06 · C-07 · C-07b · C-22 (pause ≤ 30 d, cancel at period end) · C-11 · C-19 (photo, WhatsApp, emergency contact, LangToggle → users.locale) · C-24 · C-25 · C-13 · C-14/C-15 · C-16 · C-17 · C-18 (+ profile) · C-23 · C-10 · A-05
- Done — auth: A-01 splash · A-02 sign-in (demo picker, lockout → E-04) · A-03 create account · C-21 OTP recovery · E-04 locked
- Done — components: Skeleton · Notice · ListRow/ListGroup · SegmentedControl · DateStrip · CountdownRing · EmptyState · Accordion · RatingScale · OtpInput · OrderSummary · BreathingRings (all with metas)
- In progress — screenshots for every customer route (placeholders in docs/prompts/0002-customer-app.md)

## Docs & content

### Backlog
- Canvas audit #9/#30: prune the 32 orphan dictionary keys (n_waiver, wv_sign, at_seg, at_nav, ph_qr, door_scan…) from `reference/canvas/strings.json` consumers
- Canvas audit #22: S-04 IVA/total computed from `src/tenant/pricing.ts` instead of typed figures (S-04)
- Canvas audit #24/#25: register in D-02 the nine components screens use but the library lacks (segmented switch C-02, FAQ accordion row C-14/C-15, five-star rating C-10, now/next/later strip + member search + teacher arrival chips S-02, gift design picker C-17, intention tile A-05, breathing rings A-01, progress dots A-03); fix D-02 copy counts (49 sections, 4-tab dock)
- Canvas audit #26: drop scanner data/API (`face_templates`, `POST /checkins/scan`) from the S-02 spec
- Canvas audit #27: amend plan phase-3 text that still lists check-in and front desk (K-01)
- Canvas audit #28: date the v0.1 decision entries in the canvas changelog (K-01)
- Canvas audit #33: add `data` and `roles` to the C-08b spec
- Full screenshot pass (`npm run screenshots`) after the customer and staff/admin passes merge; commit PNGs; `docs/pages/<code>.md` for every routed code (`node scripts/gen-page-doc.mjs`)
- Resolve the 17 owner decisions listed at `/#/manual/decisions` (ROADMAP §E) and update the chapters
- Remove the C-07b and 'C-14 / C-15' compatibility aliases from `scripts/gen-specs.mjs` once `/app/credits` and `/app/faq` stubs are replaced (C-07b, C-14, C-15)
- Ops manual: replace `[screenshot: …]` placeholders (12 per language) with real captures (K-03)

### Doing
- (none)

### Done
- Operations manual: 11 ES + 11 EN chapters in `docs/ops-manual/`, bilingual viewer with chapter sidebar, callouts, placeholders, prev/next, print (K-03)
- Decisions pending page auto-extracted from the manual (K-04)
- Canvas v1.5 installed; `CANVAS-AUDIT.md`; `scripts/extract-canvas.mjs`; specs/strings regenerated; C-02b, C-14, C-15 separate; C-07b retired with alias (D-03)
- `docs/flow-map.md` with routes per code
- Docs viewer: grouped sidebar, kanban lanes × columns, changelog newest first, prompt | response, screenshot gallery, mobile picker (K-02); knowledgebase reuses the renderers (K-01)
- MarkdownViewer: callouts, screenshot placeholders, `components` prop (D-02)
- Screenshot rules rewritten; `screenshots.mjs` new naming, `--only`, `--label`; `docs/pages` template + generator
- ROADMAP.md (P1–P7, DoD, how-to, 20 open decisions) and README.md (seven perspectives)
