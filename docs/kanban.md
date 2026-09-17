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
