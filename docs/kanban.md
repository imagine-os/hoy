# HoyOS kanban

_Updated every turn. Codes reference `src/specs/canvasSpecs.ts`._

## Backlog
- C-02 Class schedule (customer, real booking flow) · C-03 Class detail · C-04 Reserve & checkout
- C-05 Payment methods · C-06/C-07/C-07b plans, passes, credits · C-08/C-08b booked class, cancel/reschedule
- C-10 Rate class · C-11 History · C-13 Rules · C-14/15 FAQ · C-16 Invite · C-17 Gift card · C-18 Teachers · C-19 Profile
- C-20 Waitlist · C-21 OTP recovery · C-22 Manage membership · C-23 Events · C-24 Notifications · C-25 More
- E-01..E-04 edge states · A-01..A-06 auth flows (real Supabase auth later)
- S-02 Front desk check-in (real) · S-03 Teacher app (real) · S-04 Register & payment (real)
- M-01 Admin dashboard (real metrics) · M-02 Content · M-04 Email designer · M-05 WhatsApp automations
- M-06 CRM member 360 · M-07 Activity log · M-08 Studio settings
- Supabase provider (auth, realtime) · Wompi payments/payroll · WhatsApp CRM · email designer
- Live cursors / presence (nice to have)
- Operations manual content (`docs/ops-manual/`)
- Screenshot pass for every page in ES/EN, mobile/desktop

## Doing
- v0 scaffold hardening: more component states in D-02, seed data breadth
- Screenshot pass (`npm run screenshots`) for the v0 routes

## Done
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
