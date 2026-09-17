# HoyOS

**HoyOS** is the operations system for HOY Wellness Center, a wellness club in Medellín, Colombia,
built to become a multi-tenant platform for other studios later. One codebase serves the public
website, the customer app, the teacher app, the staff and admin desktop, the club's operations
manual, the in-app documentation and the developer tooling.

- Version: **0.7.1** (2026-09-17) — **Polish and code-quality pass** (0020): route-level code splitting (main chunk 2 549 → 796 kB, docs markdown indexed at build time), the UTC date-key bug fixed at the source (`dateKey()` + `npm run test:dates`), dead code and duplicated helpers swept, every shared string through `useT()`, tokens instead of raw CSS values, tenant facts in `src/tenant/`, `$` in both languages, eyebrow contrast ≥ 4.5:1, role-gated links, `document.title` per route, screenshots taken as each surface's demo user with real ids. Before it: **0.7.0 App-store readiness** (0019): `StatTile` values never wrap (measured fit + the phone frame as a CSS container), `deletion_requests` with **C-26** Cuenta y datos (consents, download my data, two-step delete request that keeps invoices anonymised), **W-09** the public deletion URL Google Play requires, **M-11** the admin queue with the anonymisation checklist, `docs/app-store-compliance.md` and manual 23; version shared with 0018 (Integraciones), built the same day. Before it: v0.6.2 **Especiales** (0017): `special_charges` + `space_bookings`, the hand-priced Especial item in S-04, S-05 `/staff/rooms`, manual payroll lines; v0.6.1 the expenses ledger (M-09c and the Balance card on M-09); v0.6.0's public website rebuilt around the brand content (W-01…W-08, P-01), the thin screens deepened (M-02a…M-02d, M-09a/M-09b, S-03, A-06, media slots) and the operations manual rebuilt as 28 bilingual chapters with live data blocks; 48 tables (20 with an access contract); **96 routes, 84 page codes, 0 stubs** (`/#/dev/specs`), 391 captures, 56 components in D-02. Changelog: [`docs/changelog/`](./docs/changelog/) · what is still mocked and what is left: [`ROADMAP.md` §F](./ROADMAP.md).
- **Also in 0.7.0 — Decisions as settings + Integraciones** (0018, built in parallel with 0019): the owner's ROADMAP §E decisions that are values are now fields — M-08a contact identity with a “confirmed” switch, M-08c payroll cadence `monthly | biweekly` (both programmed) + teacher rate card, M-08f content decisions (public naming, Respiración as its own class, map provider, legal versions published), M-10 `/admin/integrations` (one card per integration, non-secret fields, status chip, dev checklist, `integrations` table) and ROADMAP §G, the “when nothing else is queued” lane.
- Live (GitHub Pages; enable once in repo Settings → Pages → "GitHub Actions"): **https://imagine-os.github.io/hoy/**
- Stack: Vite 5 + React 18 + TypeScript (strict), HashRouter, plain CSS design tokens, mock data layer
  shaped like the future Supabase schema. No backend yet; everything runs in the browser.
- Rules for anyone (human or agent) working here: [`CLAUDE.md`](./CLAUDE.md).
- Plan and open decisions: [`ROADMAP.md`](./ROADMAP.md) · Docs: [`docs/`](./docs/README.md) ·
  Architecture: [`docs/architecture.md`](./docs/architecture.md) · Flow map (every canvas code → route):
  [`docs/flow-map.md`](./docs/flow-map.md) · Canvas audit: [`reference/canvas/CANVAS-AUDIT.md`](./reference/canvas/CANVAS-AUDIT.md)

## The testing hub and the seven perspectives

The root route `/#/` is a **testing hub** for private testing between the studio team and the build
team. It offers one card per perspective; picking a staff role switches the **demo user** (fictional
people, one per role).

| Perspective | Entry route(s) | Who it is for | State (v0.7.1) |
| --- | --- | --- | --- |
| Testing hub | `/#/` | The studio team and the build team: one card per perspective, demo user switcher, dev mode | built |
| Website | `/#/site` | Everyone, before login: home, about & philosophy, classes, class essay, modalities, schedule, teachers, plans (with the value model explained), contact with a map slot, legal, public account-deletion request | built (W-01…W-09, P-01, A-06) |
| Customer app | `/#/auth/sign-in` → `/#/app` | Members and drop-ins (mobile-first): sign in / create account, home + intention, schedule, class, checkout, booking, waitlist, plans, passes, credits, history, profile, rules, FAQ, invite, gift, teachers, events, notifications, account & data (consents, export, delete request) | built (A-01…A-03, A-05, C-01…C-26, C-21, E-01…E-04) |
| Teacher app | `/#/teach` | Teachers (mobile-first): my classes, attendance, notes, ratings, the payroll statement read from the finance run, profile | built (S-03) |
| Staff by role | `/#/staff`, `/#/admin` | Front desk, coordinator, admin, finance, super admin, maintenance (desktop-first): role home, check-in, register & pay, dashboard, tables, CMS, emails, WhatsApp, CRM, activity, settings (general, features, payments, communications, branding, content), integrations, finance and teacher payouts, account-deletion queue | built (S-01, S-02, S-04, S-05, M-01…M-09, M-11, M-02a…M-02d, M-08a…M-08f, M-10, M-09a…M-09c) |
| Operations manual | `/#/manual` | How the club runs in person and in software, by role — ES with EN mirror, **28 chapters in seven parts**, 72 figures per language, live blocks that read the app's own prices, policies and tables, print-friendly; `/#/manual/decisions` lists the 27 things the owner still has to decide | built (K-03, K-04) |
| Documentation | `/#/docs` | Rules, architecture, prompt log (prompt | response), changelog, kanban board, flow map, data model, page docs, screenshots | built (K-02) |
| Developer | `/#/dev/specs`, `/#/dev/tokens`, `/#/dev/components`, `/#/dev/layout/:code`, `/#/dev/knowledgebase` | Spec index with built/stub badges, design tokens (D-01), component library (D-02), layout editor (D-04), knowledgebase (K-01) | built |

The header has ES/EN, light/dark and, for super admins, a **dev mode** toggle that reveals the spec chip
and the inspector panel (`Ctrl+.`) on every page: layout order, data tables, roles, logic, integrations.

## Run it

```
npm i
npm run dev            # http://localhost:5173/#/
npm run build          # tokens + tsc --noEmit + vite build → dist/  (must pass before any commit)
npm run screenshots    # docs/screenshots/<code>/<lang>-<width>[-dark].jpg (Playwright, Chromium preinstalled)
npm run screenshots -- --smoke            # console-error check only
npm run screenshots -- '--only=/manual$' --label=cover   # one exact route, under a label
npm run specs          # reference/canvas/specs.json → src/specs/canvasSpecs.ts
node scripts/extract-canvas.mjs           # canvas html → specs.json + strings.json
node scripts/gen-page-doc.mjs C-02        # docs/pages/C-02.md from the spec (--all for every routed code)
npm run sql            # src/data/schema.ts → supabase/schema.sql + docs/data-model.md
npm run flow-map       # docs/screenshots/routes.json → docs/flow-map.md (route tables; the dependencies section is hand-written)
npm run test:dates     # proves dateKey()/fromDateKey() are Bogotá-safe (20:00 local still names today)
npm run typecheck      # tsc --noEmit only
```

## Where things live
`src/modules/<name>/` one folder per perspective (routes + strings) · `src/components/<tier>/<Name>/`
with a `.meta.ts` each · `src/specs/canvasSpecs.ts` generated from the canvas · `src/data/` schema,
mock provider, Supabase stub · `src/tenant/` the only place studio facts and prices live · `docs/`
rendered in-app · `reference/` frozen source material (canvas v1.5, brand, pricing deck).

## Resumen (ES)

HoyOS es el sistema operativo de HOY Wellness Center: sitio web público, app de clientes, app de
profesores, escritorio de staff y administración, manual de operaciones, documentación y herramientas
de desarrollo en la misma base de código. La ruta raíz es un **hub de pruebas** para elegir la
perspectiva y el rol demo. Todo texto existe en español e inglés (el español es obligatorio). Las
reglas de trabajo están en `CLAUDE.md`; el plan y las decisiones pendientes del owner, en `ROADMAP.md`;
el manual del club, en `/#/manual`.
