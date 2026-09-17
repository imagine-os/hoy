# HoyOS

**HoyOS** is the operations system for HOY Wellness Center, a wellness club in Bogotá, Colombia,
built to become a multi-tenant platform for other studios later. One codebase serves the public
website, the customer app, the teacher app, the staff and admin desktop, the club's operations
manual, the in-app documentation and the developer tooling.

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

| Perspective | Where | Who it is for | State (v0.2) |
| --- | --- | --- | --- |
| Website | `/#/site` | Everyone, before login: home, about, modalities, schedule, teachers, plans, contact, legal | built |
| Customer app | `/#/app` | Members and drop-ins (mobile-first): home + intention today; schedule, booking, plans, profile… | home built, rest landing (see `/#/dev/specs`) |
| Teacher app | `/#/teach` | Teachers (mobile-first): my classes, attendance, payroll view | first slice |
| Staff by role | `/#/staff`, `/#/admin` | Front desk, coordinator, admin, finance, super admin, maintenance (desktop-first); role home, check-in, register & pay, dashboard, tables, CMS, CRM, settings | role home, dashboard and table manager built; rest landing |
| Operations manual | `/#/manual` | How the club runs in person and in software, by role — ES with EN mirror, 11 chapters, print-friendly; `/#/manual/decisions` lists what the owner still has to decide | built |
| Documentation | `/#/docs` | Rules, architecture, prompt log (prompt | response), changelog, kanban board, flow map, data model, screenshots | built |
| Developer | `/#/dev/*` | Design tokens (D-01), component library (D-02), spec index with built/stub badges, layout editor, knowledgebase (K-01) | built |

The header has ES/EN, light/dark and, for super admins, a **dev mode** toggle that reveals the spec chip
and the inspector panel (`Ctrl+.`) on every page: layout order, data tables, roles, logic, integrations.

## Run it

```
npm i
npm run dev            # http://localhost:5173/#/
npm run build          # tokens + tsc --noEmit + vite build → dist/  (must pass before any commit)
npm run screenshots    # docs/screenshots/<code>/<lang>-<width>[-dark].png (Playwright, Chromium preinstalled)
npm run screenshots -- --smoke            # console-error check only
npm run specs          # reference/canvas/specs.json → src/specs/canvasSpecs.ts
node scripts/extract-canvas.mjs           # canvas html → specs.json + strings.json
node scripts/gen-page-doc.mjs C-02        # docs/pages/C-02.md from the spec
npm run sql            # src/data/schema.ts → supabase/schema.sql + docs/data-model.md
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
