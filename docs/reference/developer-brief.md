# Developer brief — HoyOS for a developer joining (2026-09-29, v0.19.1)

**Who this is for.** A developer joining the project who needs the machine surfaces (WebMCP, `actions.json`, the CLI,
the absent HTTP API), the integrations and the AI distribution plan, plus the repo rules that shape every change.
Written for Justin's request in [prompt 0045](../prompts/0045-developer-brief.md). Every fact below comes from a file
in this repo and links to it; where two files disagree, the newer one (the code, then the 0044 docs) wins and the
disagreement is named. Model routing for this pass: Opus 5.5 (reading the sources, writing this brief and the report
page, the captures), scoped by the coordinating session.

Links: **GitHub** = `https://github.com/imagine-os/hoy/blob/main/<path>` · **Live** =
`https://imagine-os.github.io/hoy/#/<route>`. The `?as=<role>` key in the live links below is honoured only when the
page runs inside a frame ([`src/app/frameSession.ts`](https://github.com/imagine-os/hoy/blob/main/src/app/frameSession.ts));
opened directly, a page runs under your own browser session, which starts as Sofía Arango (super admin,
`DEFAULT` in [`SessionProvider.tsx`](https://github.com/imagine-os/hoy/blob/main/src/auth/SessionProvider.tsx)), so
every route opens. Switch role in the hub's "Estás probando como" selector.

---

## 1. What HoyOS is and where it runs

- **One app.** Vite 5 + React 18 + TypeScript (strict), `react-router-dom` v6 with **HashRouter**, plain CSS with the
  design tokens as custom properties, `@dnd-kit` for the layout editor and kanban, `react-markdown` for the in-app
  docs ([CLAUDE.md](https://github.com/imagine-os/hoy/blob/main/CLAUDE.md) "Stack").
- **A hub of surfaces.** `public` (website), `customer`, `teacher`, `staff`, `admin`, `dev`, plus `docs`; the hub at
  `/#/` (HUB-01) is the entry point for testers
  ([architecture.md](https://github.com/imagine-os/hoy/blob/main/docs/architecture.md)). Today: **106 routes, 92 page
  codes, 0 stubs** (`window.__hoyos.routes` on the v0.19.0 build).
- **Where it runs.** GitHub Pages at **https://imagine-os.github.io/hoy/**. `vite.config.ts` uses `base: './'` and every
  route is `/#/path`, so no 404 fallback is needed.
- **Deploy.** [`.github/workflows/pages.yml`](https://github.com/imagine-os/hoy/blob/main/.github/workflows/pages.yml):
  on push to `main` (or manual dispatch), Node 22, `npm ci`, `npm run build`, upload `dist/`, deploy. No PR checks run.
- **Run it.**
  ```
  npm i
  npm run dev          # http://localhost:5173/#/
  npm run build        # tokens → spacing lint → hub-map → actions → capture-dates → manual lint → tsc --noEmit → vite build → copy-shots
  npm run screenshots  # Playwright, Chromium at /opt/pw-browsers (never run playwright install here)
  ```
- **Live:** [hub](https://imagine-os.github.io/hoy/#/) · [website](https://imagine-os.github.io/hoy/#/site?as=public) ·
  [customer app](https://imagine-os.github.io/hoy/#/app?as=customer) · [docs](https://imagine-os.github.io/hoy/#/docs).

## 2. Repo map and extension points

Folder map ([CLAUDE.md](https://github.com/imagine-os/hoy/blob/main/CLAUDE.md) "Folder map"): `src/app` (App, router,
`registry.ts`, `manifest.ts`), `src/auth`, `src/components/<tier>/<Name>/`, `src/data` (schema, providers, seed),
`src/design` (tokens, library), `src/dev`, `src/i18n`, `src/layout`, `src/modules/<module>/` (admin, customer, dev,
docs, hub, ops-manual, staff, teacher, website), `src/specs`, `src/tenant`, `docs/`, `reference/` (frozen),
`public/`, `supabase/`, `scripts/`.

The extension points — **do not bypass them**:

| Extension point | Rule | Source |
| --- | --- | --- |
| Routes | A module is `src/modules/<name>/index.ts` exporting `{ routes: RouteDef[], strings }`; `src/app/registry.ts` collects it with `import.meta.glob` behind lazy getters (`getRoutes()`), so adding a page never edits a central route file. Page components load lazily through `pages.ts` barrels. | [architecture.md](https://github.com/imagine-os/hoy/blob/main/docs/architecture.md) "Module registry" |
| Specs | Every `RouteDef` carries a `PageSpec` (purpose, layout order, data, roles, logic, integrations, states, `api`, `actions`, `checkedAt`). No route without a spec; new pages get a code in their family (C customer, S staff, M admin, D dev, P public, E edge, K knowledge). The inspector (`Ctrl+.` in dev mode) and `/#/dev/specs` read it. | [CLAUDE.md](https://github.com/imagine-os/hoy/blob/main/CLAUDE.md) "Extension points" |
| Components | `src/components/<tier>/<Name>/<Name>.tsx` + `<Name>.meta.ts`; no component without a meta, no meta without a usage; reuse and improve the shared one rather than forking. D-02 lists **82 components** (11 atoms, 42 molecules, 26 organisms, 3 templates). | [D-02 live](https://imagine-os.github.io/hoy/#/dev/components?as=developer) |
| Strings | Every user-facing string is `{ es, en }` in the module's `strings`, read with `useT()`; Spanish required, English falls back to Spanish; a missing key renders `⟨key⟩`. Keys `module.section.key`. | [i18n.md](https://github.com/imagine-os/hoy/blob/main/docs/i18n.md) |
| Data | Pages read and write through `useData()` / `useTable()` — the `DataProvider` interface (`list / get / insert / update / remove / subscribe`) — never the seed. | [data-model.md](https://github.com/imagine-os/hoy/blob/main/docs/data-model.md) |
| Layout order | Sectioned pages render through `useLayout(spec)`, so the layout editor (`/#/dev/layout/:code`, D-04) can reorder them (stored in `page_layouts`). | [architecture.md](https://github.com/imagine-os/hoy/blob/main/docs/architecture.md) "Layout editor" |
| Shells | `AppShell` (customer, teacher): content column + bottom dock below 900 px, full-viewport top-bar page from 900 px, no phone bezel (D-0006). `DesktopShell` (staff, admin, dev, docs): sidebar. `withShell()` honours `RouteDef.layout`. Breakpoints come from `BREAKPOINTS` in `tokens.ts`; the `--ui` band scales every surface (D-0007). | [CLAUDE.md](https://github.com/imagine-os/hoy/blob/main/CLAUDE.md) "Shells" |
| Actions | A page declares `PageSpec.actions` (`{ id, label, intent, params?, permission? }`, id `<page>.<verb>`) and mounts handlers with `useActions(spec, handlers)`. | [architecture.md](https://github.com/imagine-os/hoy/blob/main/docs/architecture.md) "Actions registry" |
| Tokens | Tokens, materials, shadows and radii live in D-01 (`src/design/tokens.ts` → generated `tokens.css`); spacing only from the D-01 scale (`.claude/skills/ui-spacing/SKILL.md`). | [design-system.md](https://github.com/imagine-os/hoy/blob/main/docs/design-system.md) |

Also from CLAUDE.md: studio facts live only in `src/tenant/`; a new dependency needs a changelog entry with the
rejected alternative; `npm run build` must pass with zero TypeScript errors before any commit that touches `src/`;
Conventional Commits naming the page codes; never secrets or real personal data (demo users and seed are fictional).

## 3. Roles and permissions

- **11 roles** ([`src/auth/roles.ts`](https://github.com/imagine-os/hoy/blob/main/src/auth/roles.ts),
  [roles.md](https://github.com/imagine-os/hoy/blob/main/docs/roles.md)): `super_admin, admin, coordinator, front_desk,
  finance, teacher, maintenance, marketing, developer, customer, public`.
- **30 permissions** ([`src/auth/permissions.ts`](https://github.com/imagine-os/hoy/blob/main/src/auth/permissions.ts)):
  `bookings.read`, `bookings.write`, `bookings.write_any`, `classes.read`, `classes.write`, `checkin.write`,
  `payments.read`, `payments.write`, `payments.refund`, `members.read`, `members.write`, `content.write`, `comms.write`,
  `manual.edit`, `manual.train`, `tables.read`, `tables.write`, `settings.write`, `features.write`, `hours.write`,
  `api_keys.read`, `api_keys.write`, `payroll.read`, `payroll.write`, `expenses.read`, `expenses.write`,
  `maintenance.write`, `dev.tools`, `docs.read`, `audit.read`. `ROLE_PERMISSIONS` maps them per role (super admin
  holds all; admin all but `dev.tools` and `api_keys.write`); `useSession().can('x')` checks them; `RequireRole` guards
  routes and sends others to `/#/no-access`.
- **Dev mode** (spec chip, inspector `Ctrl+.`, layout editor links): `DEV_MODE_ROLES = ['super_admin', 'developer']`.
  Only the super admin can **view as** any role, with dev tooling on or off.
- **Demo users** ([`src/auth/demoUsers.ts`](https://github.com/imagine-os/hoy/blob/main/src/auth/demoUsers.ts)), one
  fictional person per role: Sofía Arango (super admin, `usr_super`), Mateo Restrepo (admin), Valentina Ríos
  (coordinator), Camilo Duque (front desk), Laura Betancur (finance), Andrés Quintero (teacher), Rosa Cárdenas
  (maintenance), Camila Herrera (marketing), Julián Mesa (developer, `usr_dev`), Juliana Ospina (customer, `usr_cust`),
  Visitante (public). The choice persists in `localStorage['hoyos.session']`.
- **Live:** [hub with the role switcher](https://imagine-os.github.io/hoy/#/?as=super_admin) ·
  [sign-in picker A-02](https://imagine-os.github.io/hoy/#/auth/sign-in?as=public).

## 4. Data model and the backend seam

- **57 tables** in nine groups (Core, People, Schedule, Practice & analytics, Commerce, Comms, Manual & training,
  System, Design), declared in [`src/data/schema.ts`](https://github.com/imagine-os/hoy/blob/main/src/data/schema.ts)
  with 83 foreign-key relations ([changelog 0044](https://github.com/imagine-os/hoy/blob/main/docs/changelog/0044-tables-views.md)).
  The count was 54 after 0040; 0041 added `hours_overrides` and `api_keys`, 0044 added `table_views`.
- **`tenant_id` on every table and every seed row**, with `id, tenant_id, created_at, updated_at` as the base
  columns; RLS scopes every query to the JWT's tenant
  ([data-model.md](https://github.com/imagine-os/hoy/blob/main/docs/data-model.md) "Principles").
- **Today: `MockProvider`** — the seeded database in `localStorage['hoyos.db.v1']`, emitting change events as
  simulated realtime; `SEED_VERSION` (7 since 0044) forces a reseed when columns change. **`SupabaseProvider`** is a
  stub with the same interface: the seam the real backend arrives through, swapped in `src/data/DataContext.tsx`.
- **`supabase/schema.sql` and `docs/data-model.md` are generated** from `schema.ts` by `npm run sql` (Node 22 type
  stripping). A new table goes in `schema.ts` + seed + `npm run sql` in the same turn.
- **RLS contracts** travel with the schema as `TableDef.rls` (a list of plain rules per table), generated into the
  data-model doc and as comments in `schema.sql`. **31 of the 57 tables** carry one; the other 26 are kanban card
  0044 C2. Role-by-table matrices: [roles.md](https://github.com/imagine-os/hoy/blob/main/docs/roles.md).
- **The schema is the ontology** (D-0020): `kind`, `icon`, `titleColumn`, column `label` and `sensitive` on the
  existing definitions; reverse relations derived in `src/data/relations.ts`. **Views are rows** in `table_views`;
  realtime is Supabase first, Yjs only for long-text documents (D-0021). Order of the connection work: Pass C in
  [`docs/plans/tables-system.md`](https://github.com/imagine-os/hoy/blob/main/docs/plans/tables-system.md).
- **Live:** [M-03 table manager](https://imagine-os.github.io/hoy/#/admin/tables?as=super_admin) (grid / list /
  gallery / kanban / graph; e.g. [bookings as a graph](https://imagine-os.github.io/hoy/#/admin/tables/bookings?view=graph&as=super_admin)) ·
  [specs index](https://imagine-os.github.io/hoy/#/dev/specs?as=developer) (every spec's `api` list is the design of
  the HTTP API).

## 5. Multi-tenant rule

- [`src/tenant/tenant.ts`](https://github.com/imagine-os/hoy/blob/main/src/tenant/tenant.ts) (id `ten_hoy`, slug
  `hoy`, name, address, capacity, default hours, contact) and
  [`src/tenant/pricing.ts`](https://github.com/imagine-os/hoy/blob/main/src/tenant/pricing.ts) are the **only** places
  the studio's facts are written. Copy that says "HOY" reads the tenant name from config. Saved settings
  (`tenants.settings`, e.g. M-08a's weekly hours) override the defaults at runtime.
- **Adding a second studio** is ROADMAP phase P6: a `tenants` row with per-tenant identity, hours, rooms, capacity,
  policies, pricing and brand tokens, a tenant switcher for super admins, RLS by `tenant_id`, then tenant billing and
  a white-label build. Done when "a second demo tenant runs on the same build with different name, hours, prices and
  brand tokens, and cannot see the first tenant's rows"
  ([ROADMAP §B P6, §C](https://github.com/imagine-os/hoy/blob/main/ROADMAP.md)). It depends on P2 (Supabase auth and
  RLS) and P3 (billing rails); config extraction from `src/tenant/*` can start any time.
- **Per-tenant secrets are named, never stored**: e.g. `GOOGLE_BUSINESS_REFRESH_TOKEN_<TENANT>` in server env (§8).
- **Other products read hoy through lenses.** `public/hub-map.json` carries three lens hints
  ([hub-map.md](https://github.com/imagine-os/hoy/blob/main/docs/reference/hub-map.md)): `aluzina` (group by role, no
  tools — hoy is an aluzina client, one mat per client role), `between-gigs` (group by experience, with tools — hoy as
  one gig in Justin's company OS) and `standalone` (group by surface, with tools). The planned MCP gateway follows the
  same pattern per product (§9).

## 6. Machine surfaces

Source: [`docs/reference/surfaces.md`](https://github.com/imagine-os/hoy/blob/main/docs/reference/surfaces.md)
(checked 2026-09-29, v0.19.0).

**WebMCP — `window.__hoyos`** (from [`src/app/manifest.ts`](https://github.com/imagine-os/hoy/blob/main/src/app/manifest.ts)):

| Member | What it is |
| --- | --- |
| `routes` | Every route: `path`, `code`, `surface`, `status`, `roles` and the whole `spec` (106 entries). |
| `users` | The demo users `{ id, role }` (11). |
| `actions` | Every declared action with `id`, `label` / `intent` `{es,en}`, `params?`, `permission?`, `code`, `route` and a live `mounted` (a getter). |
| `run(id, params?)` | Runs a **mounted** action; resolves `{ ok, message }`, never throws. |
| `hubMap` | `{ url, data, load() }` — the published hub map. |
| `actionsUrl` | Where this deployment serves `actions.json`. |

```js
await window.__hoyos.run('hub.setLang', { lang: 'en' });   // { ok: true, message: 'language en' }
window.__hoyos.actions.filter((a) => a.mounted);
```

- **The vocabulary: 51 actions** on the v0.19.0 build. 0043 audited and published **40** (on 16 page codes); 0044
  added eleven `tables.*` actions on M-03. Families: `hub.*` (9, HUB-01), `app.*` (8, customer flow), `auth.signIn`,
  `analytics.*` (2, M-12), `settings.hours.*` (4, M-08a / M-08g), `integrations.google.*` (3, M-10a),
  `dev.apiKeys.*` (3, D-07), `tables.*` (11, M-03), `manual.*` (10, K-03 / K-04). Full table with intents, params and
  permissions: [surfaces.md §1](https://github.com/imagine-os/hoy/blob/main/docs/reference/surfaces.md).
- **`permission` is advisory today.** `run()` does not check it; gated handlers re-check their own role and answer
  `{ ok: false }` (e.g. `hub.toggleDevMode`, the `manual.*`, `settings.hours.*` and `dev.apiKeys.*` handlers).
  Server-side enforcement arrives with the MCP server (D-0019).
- **Deliberate limits:** `app.confirmReservation` only books what costs nothing now (credit or membership) and answers
  `ok: false` when a pass would be charged; `app.choosePlan` only opens the plan's confirmation (paying stays a
  person's click); the key actions never return a raw key; the Google connect / push actions answer "not wired yet".
- **Frame contract:** `{baseUrl}#{route}?as={role}&lang={lang}&theme={theme}&dev=0&live=0` — a same-origin iframe runs
  as that role without touching the viewer's session (`frameSession.ts`).

**Published files** (§4 of surfaces.md):

| File | URL | What |
| --- | --- | --- |
| `public/actions.json` | https://imagine-os.github.io/hoy/actions.json | Schema `hoy.actions/1` (contract [`src/actions/manifest.types.ts`](https://github.com/imagine-os/hoy/blob/main/src/actions/manifest.types.ts)): product, `run` (`window.__hoyos.run(id, params)`, "in-page only; no MCP server yet"), the permissions the actions reference with the roles holding each (13 today), and every action sorted by id with `label` / `intent` ES + EN, `params`, `permission`, `roles`, `pages`. Written by `npm run actions` on every build. |
| `public/hub-map.json` | https://imagine-os.github.io/hoy/hub-map.json | Schema `hoy.hub-map/1`: product, embed pattern, 11 roles, 15 experiences, 92 pages (each with a `group`; 9 template pages with a `sampleRoute`), 9 tools, 3 lens hints. |
| `hub-map/shots/<CODE>/…` | `https://imagine-os.github.io/hoy/hub-map/shots/<CODE>/<file>.jpg` | The thumbs and captures the hub map points at. |
| `source/<id>.pdf` | `https://imagine-os.github.io/hoy/source/<id>.pdf` | The owner's source documents (K-05). |

**CLI — `npm run …`** (all Node, in `scripts/`; full table in
[surfaces.md §2](https://github.com/imagine-os/hoy/blob/main/docs/reference/surfaces.md)):

| Group | Scripts |
| --- | --- |
| Build and generate | `dev`, `build`, `preview`, `typecheck`, `tokens` (D-01 → `tokens.css`), `specs` (canvas → `canvasSpecs.ts`), `sql` (→ `supabase/schema.sql`, `data-model.md`), `hub-map`, `actions`, `capture-dates`, `flow-map`, `node scripts/gen-page-doc.mjs <CODE>` |
| Test | `test:dates`, `test:holidays`, `test:hours`, `test:analytics`, `node scripts/test-mat-bookings.mjs`, `hub-map:check` (after a build) |
| Lint | `lint:spacing` (fails above `scripts/spacing-baseline.json`), `lint:manual` |
| Capture and QA | `screenshots` (`--smoke`, `--pages=`, `--widths=`, `--dark=`, `--label=before`, `--full`), `thumbnails`, `audit:spacing`, `node scripts/manual-qa.mjs` |

No test runner, linter or formatter beyond these (eslint + prettier is a kanban card), and no deploy command.

**HTTP API: none.** There is no server. The endpoints each screen intends to call are written per page as
`PageSpec.api` ([/#/dev/specs](https://imagine-os.github.io/hoy/#/dev/specs?as=developer)) — the design of the API,
not something that answers. Designed in 0041, not answering: **developer keys** (inbound; first endpoints
`GET /v1/classes`, `GET /v1/hours`, `GET|POST /v1/bookings`) and the **Google Business Profile push** (outbound).
Both are in §8.

## 7. MCP vs WebMCP

From [ai-distribution.md §1](https://github.com/imagine-os/hoy/blob/main/docs/reference/ai-distribution.md):

- **MCP (Model Context Protocol) is a wire protocol.** A server exposes tools, resources and prompts to AI clients
  (Claude, ChatGPT, Cursor, the Grok API, Gemini Enterprise, Copilot…) over stdio or Streamable HTTP. Current spec
  **2026-07-28**: stateless core, POST-only Streamable HTTP, OAuth 2.1 with Protected Resource Metadata required, CIMD
  preferred, DCR deprecated, the old HTTP+SSE transport deprecated. It needs a server process; HoyOS has none.
- **WebMCP is a browser API** (W3C Web Machine Learning CG draft, 29 Sep 2026; Chrome origin trial M149–M156, ship
  target Chrome 157). A page registers tools in client-side script with `document.modelContext.registerTool()` (older
  spelling `navigator.modelContext`) or declarative `<form>` tools, so an agent driving the browser can call them. Same
  vocabulary as MCP (tools, JSON Schema), not wire-compatible, no server.
- **How HoyOS uses each.** The actions registry (`window.__hoyos.actions` / `run()`, published as `actions.json`)
  **is** the WebMCP surface: one adapter will register the mounted actions as `document.modelContext` tools. The same
  vocabulary becomes the MCP server's tool list. Developer keys and, later, OAuth are the MCP auth story; WebMCP runs
  under the signed-in session in the page and needs no keys.

**In one sentence:** they are different (a protocol over the network vs an API inside the page), they share the
vocabulary, and HoyOS feeds both from one registry.

## 8. Integrations

The catalogue is M-10 ([`src/modules/admin/integrationDefs.ts`](https://github.com/imagine-os/hoy/blob/main/src/modules/admin/integrationDefs.ts)):
seven integrations — **Wompi, WhatsApp Business (Meta), transactional email, DIAN e-invoicing, Maps, Supabase, Google
Business Profile**. Each card holds only non-secret fields the owner can fill ahead of the developer, a status the
owner moves by hand (`simulated` → `configured` → `connected`, audited as `integration.update`), what the seam does
today, the developer's checklist, the screens that read it and the **names** of its secrets. Secrets never enter the
file, the `integrations` table or the browser: they live in server environment variables. Every unfinished control is
a `Placeholder` (tooltip + "not wired yet" toast, visible in dev mode).
Live: [M-10 Integraciones](https://imagine-os.github.io/hoy/#/admin/integrations?as=admin).

### 8.1 Google Business Profile (D-0017, M-10a)

- **What exists.** M-10a ([page doc](https://github.com/imagine-os/hoy/blob/main/docs/pages/M-10a.md)) shows the
  connection status, what Google will show, **the exact body HoyOS will send**, the setup steps split by who does them,
  and a fallback: copy the hours as text and paste them into Google by hand. `toGoogleBusinessHours()` in
  [`src/tenant/hours.ts`](https://github.com/imagine-os/hoy/blob/main/src/tenant/hours.ts) builds the body (unit-tested
  by `npm run test:hours`); special hours are one period per date, multi-day overrides are expanded, past ones dropped.
- **The request** (as M-10a previews it; values from the demo seed on 2026-09-29, shortened):
  ```
  PATCH https://mybusinessbusinessinformation.googleapis.com/v1/locations/{id}?updateMask=regularHours,specialHours
  {
    "regularHours": { "periods": [
      { "openDay": "MONDAY", "openTime": { "hours": 6, "minutes": 0 }, "closeDay": "MONDAY", "closeTime": { "hours": 20, "minutes": 0 } },
      … Tuesday–Friday 06:00–20:00 …
      { "openDay": "SATURDAY", "openTime": { "hours": 8, "minutes": 0 }, "closeDay": "SATURDAY", "closeTime": { "hours": 13, "minutes": 0 } }
    ] },
    "specialHours": { "specialHourPeriods": [
      { "startDate": { "year": 2026, "month": 10, "day": 12 }, "endDate": { "year": 2026, "month": 10, "day": 12 }, "closed": true },
      { "startDate": { "year": 2026, "month": 10, "day": 17 }, "endDate": { "year": 2026, "month": 10, "day": 17 },
        "openTime": { "hours": 8, "minutes": 0 }, "closeTime": { "hours": 11, "minutes": 0 } },
      … 2 Nov and 16 Nov closed …
    ] }
  }
  ```
- **Setup split** (`GOOGLE_BUSINESS_GROUPS`). **Platform, once** (HoyOS team / dev): create the HoyOS Google Cloud
  project; enable My Business Business Information API and My Business Account Management API; submit the Business
  Profile API access form (quota 0 until Google approves); OAuth consent screen with scope
  `https://www.googleapis.com/auth/business.manage` and the server redirect URI; client id and secret in server env.
  **This studio, per location** (owner): be owner or manager of the profile; Connect with Google; pick the location;
  review the preview; turn on automatic push.
- **Not wired (Placeholders):** "Connect with Google" and "Push now"; `integrations.google.connect` / `.push` answer
  "not wired yet". `integrations.google.copyHours` works.
- **What the server must do.** On save in M-08a / M-08g and nightly, call `locations.patch` with the body above using
  the location's refresh token from `GOOGLE_BUSINESS_REFRESH_TOKEN_<TENANT>`, stamp `hours_overrides.google_synced_at`,
  read the location back nightly to flag drift, and never write Google's values into HoyOS (one way). Secrets:
  `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_BUSINESS_REFRESH_TOKEN_HOY`. The `integrations` row
  keeps only `locationName`, `accountEmail`, `placeId`. Planned home: a Cloudflare Worker or Supabase Edge Function.
- **Live:** [M-10a](https://imagine-os.github.io/hoy/#/admin/integrations/google-business?as=admin).

### 8.2 Developer API keys (D-0018, D-07)

- **What exists.** D-07 ([page doc](https://github.com/imagine-os/hoy/blob/main/docs/pages/D-07.md),
  [`src/modules/dev/apiKeys.ts`](https://github.com/imagine-os/hoy/blob/main/src/modules/dev/apiKeys.ts)) issues keys
  **`hoy_<live|test>_<24 base62>`** from `crypto.getRandomValues` (rejection-sampled, ≈ 143 bits). `api_keys` stores
  the **13-character prefix** and the **SHA-256 hex** (Web Crypto), never the key; the raw key is shown once and lives
  only in component state until the drawer closes. Keys carry an environment, scopes and an optional expiry.
- **Rotation** inserts a replacement (`replaces_id`) and gives the old key **24 hours**; **revocation** stamps
  `revoked_at`; rows are never deleted; every step is audited (`api_key.create` / `.rotate` / `.revoke`) with the
  prefix only. Status: revoked · expired · expiring (within 7 days) · active.
- **Who.** `api_keys.write` (super admin, developer) creates, rotates, revokes; admin reads (`api_keys.read`).
- **Scopes** (`API_KEY_SCOPES`): `classes.read`, `bookings.read`, `bookings.write`, `customers.read`, `hours.read`,
  `hours.write`, `webhooks.receive`.
- **Mismatch to fix.** [ai-distribution.md §3](https://github.com/imagine-os/hoy/blob/main/docs/reference/ai-distribution.md)
  says key scopes are the `Permission` ids, 1:1. Three of the seven are not permissions: `customers.read` (the
  permission is `members.read`), `hours.read` (hours are public; no read permission exists) and `webhooks.receive`
  (none). Fold the reconciliation into plan step 2, "Action schema for machines" (§9); carded in the kanban.
- **Not wired (Placeholder):** "Try a request" (a curl example with `Authorization: Bearer hoy_live_…`).
- **What the server must do.** Hash the bearer token, match `api_keys.key_hash`, check `environment`, `scopes`,
  `expires_at` and `revoked_at`, stamp `last_used_at`. First endpoints: `GET /v1/classes`, `GET /v1/hours`,
  `GET|POST /v1/bookings`. Needs the `api_keys` table on Supabase.
- **Live:** [D-07](https://imagine-os.github.io/hoy/#/dev/api-keys?as=developer).

### 8.3 Hours and holidays (D-0016, M-08a / M-08g)

- The weekly hours are an M-08a settings section (`tenants.settings.openingHours`); dated exceptions are rows in
  `hours_overrides` (inclusive start / end, closed or other times, label ES/EN, kind `holiday | special | event`,
  source `manual | colombia`, `google_synced_at`). An override wins for its dates; the narrowest range wins on overlap.
- One reader for every surface: `useOpeningHours()`; pure readers in `src/tenant/hours.ts` (`effectiveHoursFor`,
  `todayStatus` in America/Bogota, `toGoogleBusinessHours`, `toSchemaOrgHours` for the website's JSON-LD).
- **Colombian holidays are computed**, not typed: [`src/tenant/holidays.co.ts`](https://github.com/imagine-os/hoy/blob/main/src/tenant/holidays.co.ts)
  (Ley 51/1983 Emiliani, Meeus Easter), tested by `npm run test:holidays` against the official 2026 calendar
  (18 dates). M-08g imports this year's and next year's as closed rows the studio can edit (`settings.hours.holidays.import`).
- **Live:** [M-08g hours and holidays](https://imagine-os.github.io/hoy/#/admin/settings/hours?as=admin) ·
  [M-08a settings](https://imagine-os.github.io/hoy/#/admin/settings?as=admin).

### 8.4 Supabase (ROADMAP P2)

- **Seam:** `SupabaseProvider` behind the `DataProvider` interface (PostgREST list / get / insert / update / remove,
  `postgres_changes` → `subscribe`); Supabase Auth replaces the demo sign-in (A-01, A-02, A-03, C-21 WhatsApp OTP,
  E-04); RLS per role and per `tenant_id`; demo users behind `VITE_DEMO_AUTH` for testing
  ([ROADMAP §B P2](https://github.com/imagine-os/hoy/blob/main/ROADMAP.md)).
- **M-10 fields:** project URL, anon key (public by design), region. Secret: `SUPABASE_SERVICE_ROLE_KEY`.
- **Order (Pass C of the tables plan):** C1 `version` column + optimistic concurrency → C2 `TableDef.rls` for the 26
  tables without it → C3 auth model doc → C4 `SupabaseProvider` (needs a Supabase project and keys from Justin) → C5
  provider switch + Connection panel → C6 presence → C7 offline queue. Reference for RLS shape:
  `reference/alt-build-empty10/` (frozen).

### 8.5 Wompi (ROADMAP P3)

- Payments (link, card, PSE, QR; no Nequi since 0051) and teacher payroll dispersion. Today `wompiCheckout()` / `wompiPayout()` resolve
  with a fake reference while `payments` and payroll runs are written as real rows; `payment_methods.token_ref` is a
  `tok_demo_…` placeholder from `wompiTokenise()`. Manual cash / transfer always remain.
- **Developer checklist:** create the merchant and get sandbox + production credentials; private key and events secret
  in server env (`WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`); replace the bodies of `wompiCheckout()` / `wompiPayout()`;
  a server-side webhook that confirms payments and dispersions; switch to production in M-08c. Depends on P2 auth.

### 8.6 WhatsApp Cloud API and email (ROADMAP P4)

- **WhatsApp:** every send lands in `message_log` as `sent` today and the C-21 OTP is shown on screen. `message_log` is
  the single record of every conversation, written only through `src/data/comms.ts`
  ([architecture.md](https://github.com/imagine-os/hoy/blob/main/docs/architecture.md) "Communications seam"); the Cloud
  API webhook inserts `direction = inbound` rows (`external_id` = `wamid`) and updates outbound status — no page
  changes. Checklist: verify the business in Meta (start early, approval has a lead time), submit the `wa_templates`
  ES/EN, permanent token + webhook in env (`META_WA_TOKEN`, `META_WEBHOOK_VERIFY_TOKEN`), replace the M-05 simulator and
  the C-21 OTP.
- **Email:** M-04 designs and previews, nothing is sent. Checklist: pick a provider and verify the domain (SPF, DKIM,
  DMARC), `EMAIL_API_KEY` in env, an MJML → HTML step for `email_templates` and a send function that writes
  `message_log`; inbound (IMAP or SES) → `message_log`.
- DIAN e-invoicing and Maps are the other two M-10 cards (issuer and provider are owner decisions, ROADMAP §E 3).

## 9. AI distribution plan

Source: [ai-distribution.md](https://github.com/imagine-os/hoy/blob/main/docs/reference/ai-distribution.md) and
[D-0019](https://github.com/imagine-os/hoy/blob/main/docs/decisions.md) (landscape checked 2026-09-29; re-check monthly).

**Architecture (D-0019)**
- **One server, many studios, many products:** a Cloudflare Worker (the same server the 0041 card plans for the
  Google push and key verification) serves `POST /mcp` — Streamable HTTP 2026-07-28 with a 2025-11-25 compatibility
  path, never `/sse`. The tenant comes from the credential; `POST /t/{studio-slug}/mcp` serves the no-auth public tools
  and per-studio directory URLs.
- **Tool list = the actions vocabulary:** generated from `actions.json` entries marked `surface: server | both` (a new
  optional `ActionDef.surface`, default `page`); `params` become JSON Schema.
- **Permissions enforced server-side**, and every write appends the same `audit_log` row the page does.
- **Two auth doors:** developer keys (D-0018) for staff, machines and IDEs; OAuth 2.1 (PRM, PKCE S256, CIMD first, DCR
  fallback, `resource`) on Supabase Auth for consumer clients (Claude, ChatGPT, Muse).
- **Phase 0 without Supabase:** a read-only demo server over the seed and `actions.json`; writes answer
  `ok: false, "not wired yet"`.
- **System-wide and in the page:** the Worker is a `{product}/{tenant}` gateway (hoy, aluzina, Between Gigs each
  publish an `actions.json`); `src/actions/webmcp.ts` registers the mounted actions as `document.modelContext` tools.

**Abilities by audience** (scopes = `Permission` ids; phase numbers are plan steps):

| Tool | Audience | Source | Permission (scope) | Phase |
| --- | --- | --- | --- | --- |
| `classes.list` | Members · public | C-02 schedule | `classes.read` (public) | 0 |
| `hours.get` | Members · public | weekly hours + overrides | none (public) | 0 |
| `bookings.list` | Members | own bookings | `bookings.read` | 8 |
| `bookings.create` | Members | `app.reserve` + `app.confirmReservation` (free-now only) | `bookings.write` | 8 |
| `bookings.cancel` | Members | own booking | `bookings.write` | 8 |
| `plan.balance` | Members | package classes left (0051; was credits / membership) | `payments.read` | 8 |
| `practice.stats` | Members | C-27 numbers | `bookings.read` | 8 |
| `practice.setGoal` | Members | `app.setGoal` | `bookings.write` | 8 |
| `checkin.mark` | Staff | front-desk check-in | `checkin.write` | 8 |
| `members.search` | Staff | CRM | `members.read` | 8 |
| `hours.override.add` / `.remove` | Staff | `settings.hours.override.*` | `hours.write` | 8 |
| `hours.holidays.import` | Staff | `settings.hours.holidays.import` | `hours.write` | 8 |
| `analytics.summary` | Staff | M-12 | `members.read` | 8 |
| `manual.listRequests` / `manual.answerRequest` | Staff | K-04 actions | `manual.edit` | 8 |

Never over MCP: paying (a person's click), raw API keys, anything gated by `dev.tools`.

**Order of operations** (dependency-bound, not dated):

| # | Step | Depends on | Model |
| --- | --- | --- | --- |
| 1 | `actions.json` + surfaces audit + plan (0043) — **done** | — | Fable 5.1 / Opus 5.5 |
| 2 | Action schema for machines: `ActionDef.surface`, JSON-Schema `params`, `npm run actions` fails on a bad schema | 1 | Opus 5.5 |
| 3 | Demo MCP server, phase 0 (Worker, read-only seed tools, `npm run mcp:dev` / `test:mcp`) | 2 | Opus 5.5 |
| 4 | WebMCP adapter in the page + origin-trial token | 1 (parallel with 3) | Opus 5.5 |
| 5 | Zero-cost listings (MCP Registry `server.json`, Claude plugin marketplace, `gemini-extension.json`, Cursor deeplink) | 3 | Sonnet 5.5 |
| 6 | Key verification on the Worker (shared with the 0041 card) | 3 + Supabase (P2) | Opus 5.5 |
| 7 | OAuth 2.1 door | Supabase Auth | Fable 5.1 design, Opus 5.5 build |
| 8 | Member and staff write tools with server-side permissions + `audit_log` | 6, 7 | Opus 5.5 |
| 9 | Directory submissions | 7 (consumer) / 3 (registry-style) | Sonnet 5.5 packaging, Justin for accounts |
| 10 | In-chat UI (MCP App + OpenAI UI adapter) | 8 | Opus 5.5 |
| 11 | System-wide gateway (`gen-actions.mjs` shared; aluzina and Between Gigs publish `actions.json`) | 3 | Fable 5.1 design, Opus 5.5 build |
| 12 | Repeat passes: re-check the landscape monthly, re-date `surfaces.md` | — | Sonnet 5.5 |

Parallel lanes: 3 and 4 side by side; 5 and 11 hang off 3; 6 and 7 wait on Supabase; 8, 9 (consumer) and 10 follow the
auth doors.

**Landscape (condensed; full table with auth, transport and UNVERIFIED marks in ai-distribution.md §2)**

| Platform | Program | Open today? | URL |
| --- | --- | --- | --- |
| OpenAI ChatGPT + Codex | Plugins (skills + remote MCP + UI); Plugin Directory | Yes: verified org, review, 5 + 3 test cases, video | https://developers.openai.com/apps-sdk/deploy/submission |
| Anthropic Claude | Anthropic directory: MCP connector or plugin bundle | Yes: any paid plan, listed Community; Verified by escalation; custom connectors by URL on every plan | https://claude.com/docs/directory/publish |
| Anthropic desktop extensions | MCPB (.mcpb) | Directory no longer accepts MCPB listings | https://github.com/modelcontextprotocol/mcpb |
| Claude Code plugins | Own `.claude-plugin/marketplace.json` in any git repo | Yes (own marketplace); directory needs a paid plan + public repo | https://code.claude.com/docs/en/plugins/publish |
| Agent Skills | Open SKILL.md format | Yes (open spec, ships inside plugins) | https://agentskills.io/ |
| Cursor | Cursor Marketplace; `mcp/install` deeplinks | Curated, open source only; deeplink needs no review | https://cursor.com/docs/mcp/install-links |
| xAI Grok (app) | Grok Connectors, custom MCP servers | Custom MCP yes (org-provisioned); no developer submission documented | https://docs.x.ai/grok/connectors |
| xAI Grok API | Remote MCP tools | Yes (API key) | https://docs.x.ai/docs/guides/tools/remote-mcp-tools |
| xAI Grok Build | Plugin marketplace (GitHub index) | Yes: submit a PR | https://x.ai/news/grok-plugin-marketplace |
| Meta Muse | Curated + Custom Connectors; partner platform | Partner program by application; Small Business US + Canada only | https://about.fb.com/news/2026/09/introducing-muse-small-business/ |
| Google Gemini CLI | Extensions gallery (GitHub topic) | Yes, self-serve | https://geminicli.com/docs/extensions/ |
| Google Gemini Enterprise | Custom MCP server data store | Added by the customer's admin; no public marketplace | https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server |
| Microsoft Copilot | Copilot Studio MCP tools; Agent Store | Via Partner Center certification | https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp |
| Perplexity | Custom remote connectors | Paid plans; no public directory found | https://www.perplexity.ai/help-center/en/articles/13915507-adding-custom-remote-connectors |
| Official MCP Registry | registry.modelcontextprotocol.io (preview) | Yes, self-serve (`mcp-publisher`) | https://github.com/modelcontextprotocol/registry |
| Third-party directories | Glama, Smithery, mcp.so, PulseMCP | Yes (crawl / ingest) | https://glama.ai/mcp |
| WebMCP | W3C CG draft; Chrome origin trial M149–M156 | Origin trial open to any registered origin | https://developer.chrome.com/docs/ai/webmcp |

GPT Actions / custom GPTs are a dead end (no new GPTs after 2026-09-25, retirement 2026-12-11; UNVERIFIED dates).

**Owner decisions** (ROADMAP §E 44–47, waiting on Justin): **44** where the MCP server lives (hostname; a `server/`
folder here or a sibling repo `imagine-os/mcp`) · **45** open-source it? (the Cursor Marketplace requires it) · **46**
which accounts to open (paid Claude plan, OpenAI org verification, the muse.ai/platform application, a DNS namespace
for the registry) · **47** may an agent book a charged pass on a member's behalf, or does paying stay a person's click?

## 10. How we document

From [docs/rules/documentation.md](https://github.com/imagine-os/hoy/blob/main/docs/rules/documentation.md) and
CLAUDE.md — **same turn as the work, never later**:

1. **Prompts** verbatim in `docs/prompts/NNNN-slug.md` (Slack `<@U…>` tokens stripped) with Source, date, requester
   role and a `## Response` heading (the viewer splits there).
2. **Changelog** `docs/changelog/NNNN-slug.md` in K-01 format: `version`, `date`, `prompt`, `intent`, `decision`,
   `rejected`, `files` (+ `codes`, model routing, checks). Rendered at `/#/dev/knowledgebase`.
3. **Kanban** `docs/kanban.md` moved in the same turn; on rebase conflicts keep both sides.
4. **Decisions** `D-NNNN` in `docs/decisions.md`: context, decision, alternative rejected; append-only (a decision that
   stops being true is replaced by a new block). Today D-0001…D-0021.
5. **Page docs** `docs/pages/<code>.md` (96 files) with purpose, route, roles, sections, data, real vs mock and the
   captures; skeleton from `node scripts/gen-page-doc.mjs <CODE>`.
6. **Screenshots** `docs/screenshots/<code>/<lang>-<width>[-dark].jpg`: every page in ES and EN at 390 and 1280, light
   and dark for key pages, before/after pairs for visual changes.
7. **Numbered files are append-only**; take the next free number when you commit and **renumber right before
   pushing**, because numbers collide the same day (0042 and 0044 both landed on `main` during other passes on
   2026-09-29, which is why this brief is 0045).
8. **Model routing named per task:** Fable for judgment, architecture and shared code; Opus for building modules and
   pages; Sonnet for mechanical passes (screenshots, Spanish fill, QA matrices). Every changelog and reply says which
   model did the work.
9. **Start here:** [docs/README.md](https://github.com/imagine-os/hoy/blob/main/docs/README.md) is the map; everything
   is rendered in-app at [/#/docs](https://imagine-os.github.io/hoy/#/docs?as=developer).

## 11. Quality bar

- **Build green before every push**: `npm run build` with zero TypeScript errors; `npm run screenshots -- --smoke`
  with no console errors ([ROADMAP §C](https://github.com/imagine-os/hoy/blob/main/ROADMAP.md)).
- **Inside the build:** spacing lint at or below the baseline (61 raw values since 0044), hub map valid (the generator
  exits 1 on any problem), `actions.json` valid (duplicate conflicts, missing ES / EN, unknown permissions), manual lint
  (0 violations). After a build: `npm run hub-map:check` for the sample routes.
- **Tests** (the 0043 run): `test:dates` 10/10, `test:holidays` 21/21, `test:hours` 29/29, `test:analytics` 57/57,
  `test-mat-bookings` PASS — run with the build before `src/` commits.
- **Responsive 360 → 3840** (`BREAKPOINTS`: 360 · 390 · 768 · 900 · 1280 · 1920 · 2560 · 3840); the app shell switches
  at 900 px; `PageSpec.checkedAt` records the widths a page was checked at; 10-foot legibility on a 4K TV and up-close
  use as a desk monitor.
- **Inputs:** keyboard, mouse, trackpad, touch and pen now (focus order, visible focus, **44 px** targets via
  `--h-ctl`, nothing hover-only or drag-only — the M-03 kanban has a keyboard path and a "Move to…" select); TV remote /
  gamepad and voice next, never designed against.
- **ES + EN** for every string; Spanish is the fallback.
- **Placeholders:** anything not working yet is a `Placeholder` with a tooltip and a "not wired yet" toast, always
  visible in dev mode.
- **Every page declares its actions**; a UI change updates them (the actions registry is the WebMCP surface and the
  voice vocabulary).

## 12. What is next for a developer

In dependency order, from the top of the kanban Backlog ([docs/kanban.md](https://github.com/imagine-os/hoy/blob/main/docs/kanban.md)):

1. **Action schema for machines** (0043; Opus 5.5) — `ActionDef.surface`, JSON-Schema `params`, the §9 server tools
   marked; reconcile the D-07 key scopes with the `Permission` ids here. No blocker.
2. **Demo MCP server, phase 0** (0043; Opus 5.5) — depends on 1 and on decision §E 44 (where it lives).
3. **WebMCP adapter in the page** (0043; Opus 5.5) — parallel with 2.
4. **Zero-cost listings** (0043; Sonnet 5.5) — depends on 2.
5. **Supabase, Pass C** (0044; Opus 5.5, Fable 5.1 for C3 / C8) — C1 `version` + optimistic concurrency, C2 RLS for 26
   tables, C3 auth model doc (all without blockers), then C4 `SupabaseProvider` once Justin provides a project and keys.
6. **Server for Google push + key verification** (0041 + 0043 cards; Opus 5.5) — depends on 2 and Supabase for
   `api_keys`; also needs the **Google API access request** (platform, once) approved; unwraps the M-10a Connect / Push
   and D-07 "Try a request" Placeholders.
7. **OAuth 2.1 door**, then **member and staff write tools**, **directory submissions**, **in-chat UI** and the
   **system-wide gateway** (plan steps 7–11).
8. Then **Wompi (P3)** and **WhatsApp Cloud API + email (P4)**, in parallel on the P2 auth base; start the Meta
   business verification early.

M-03 Pass B polish (column labels, calendar and timeline views, form view, inline editing) runs in parallel.

**Open decisions waiting on the owner:** ROADMAP §E 44–47 (§9 above); the Supabase project and keys, and whether hoy
shares Between Gigs' Supabase Auth project (kanban recommendation: hoy owns its own project, identity federation later
through the hub map); the accounts for Google API access; the full list is
[ROADMAP §E](https://github.com/imagine-os/hoy/blob/main/ROADMAP.md) and [/#/manual/decisions](https://imagine-os.github.io/hoy/#/manual/decisions?as=admin).

## 13. Screenshots

Existing captures in the repo (ES, 1280 px unless noted). The published copies are at
`https://imagine-os.github.io/hoy/hub-map/shots/<CODE>/<file>`.

| Code | What it shows | Live route | Capture |
| --- | --- | --- | --- |
| HUB-01 | The hub with the role switcher | [/#/](https://imagine-os.github.io/hoy/#/?as=super_admin) | [`docs/screenshots/HUB-01/es-1280.jpg`](../screenshots/HUB-01/es-1280.jpg) |
| D-07 | Developer API keys | [/#/dev/api-keys](https://imagine-os.github.io/hoy/#/dev/api-keys?as=developer) | [`docs/screenshots/D-07/es-1280.jpg`](../screenshots/D-07/es-1280.jpg) |
| M-10 | Integrations catalogue | [/#/admin/integrations](https://imagine-os.github.io/hoy/#/admin/integrations?as=admin) | [`docs/screenshots/M-10/es-1280.jpg`](../screenshots/M-10/es-1280.jpg) |
| M-10a | Google Business Profile: status, preview, exact body, setup | [/#/admin/integrations/google-business](https://imagine-os.github.io/hoy/#/admin/integrations/google-business?as=admin) | [`docs/screenshots/M-10a/es-1280.jpg`](../screenshots/M-10a/es-1280.jpg) |
| M-08g | Hours and holidays, overrides | [/#/admin/settings/hours](https://imagine-os.github.io/hoy/#/admin/settings/hours?as=admin) | [`docs/screenshots/M-08g/es-1280.jpg`](../screenshots/M-08g/es-1280.jpg) |
| M-08a | Settings: contact identity and weekly hours | [/#/admin/settings](https://imagine-os.github.io/hoy/#/admin/settings?as=admin) | [`docs/screenshots/M-08a/es-1280.jpg`](../screenshots/M-08a/es-1280.jpg) |
| M-03 | Table manager (grid view, sidebar) | [/#/admin/tables](https://imagine-os.github.io/hoy/#/admin/tables?as=super_admin) | [`docs/screenshots/M-03/es-1280.jpg`](../screenshots/M-03/es-1280.jpg) |
| D-03 | Specs index (built / stub per code) | [/#/dev/specs](https://imagine-os.github.io/hoy/#/dev/specs?as=developer) | [`docs/screenshots/D-03/es-1280.jpg`](../screenshots/D-03/es-1280.jpg) |
| D-05 | Page canvas (every page, zoom) | [/#/dev/canvas](https://imagine-os.github.io/hoy/#/dev/canvas?as=developer) | [`docs/screenshots/D-05/es-1280.jpg`](../screenshots/D-05/es-1280.jpg) |
| K-01 | Knowledgebase: plan, kanban, changelog | [/#/dev/knowledgebase](https://imagine-os.github.io/hoy/#/dev/knowledgebase?as=developer) | [`docs/screenshots/K-01/es-1280.jpg`](../screenshots/K-01/es-1280.jpg) |
| D-02 | Component library | [/#/dev/components](https://imagine-os.github.io/hoy/#/dev/components?as=developer) | [`docs/screenshots/D-02/es-390.jpg`](../screenshots/D-02/es-390.jpg) (the 1280 files are empty, 0 bytes — kanban card) |
| C-02 | Customer schedule (`app.reserve`) | [/#/app/schedule](https://imagine-os.github.io/hoy/#/app/schedule?as=customer) | [`docs/screenshots/C-02/es-1280.jpg`](../screenshots/C-02/es-1280.jpg) |
| W-01 | Public website home | [/#/site](https://imagine-os.github.io/hoy/#/site?as=public) | [`docs/screenshots/W-01/es-1280.jpg`](../screenshots/W-01/es-1280.jpg) |

Note: the HUB-01 capture in the repo still shows v0.14.0 (it has not been re-shot since); the report page uses a fresh
capture of the v0.19.0 build.

---
**Resumen (ES).** Guía para un desarrollador que llega a HoyOS. Es una sola app Vite + React + TypeScript en GitHub
Pages (HashRouter, despliegue al hacer push a `main`), un hub de superficies (sitio, app de clientes, profesores,
recepción, administración, herramientas dev, documentación) con 106 rutas y 92 códigos de página. Las reglas que no se
saltan: rutas como módulos, un spec por ruta, componentes con meta, textos `{es,en}`, datos por `useData()`, orden de
secciones por `useLayout`, y los datos del estudio solo en `src/tenant/`. Hay 11 roles, 30 permisos y un usuario demo
por rol; 57 tablas con `tenant_id`, hoy en `MockProvider` (localStorage) y mañana en Supabase por la misma interfaz.
Superficies para máquinas: `window.__hoyos` en la página (WebMCP; 51 acciones, el permiso es solo indicativo),
`actions.json` y `hub-map.json` publicados en cada build, los `npm run` y ninguna API HTTP todavía. MCP es un protocolo
de red que necesita servidor; WebMCP es una API del navegador; ambos comparten el vocabulario de acciones. Integraciones:
Google Business Profile (el cuerpo exacto ya se muestra en M-10a; falta el servidor y la aprobación de Google), llaves
de desarrollador (con hash, se muestran una vez; las tres scopes que no son permisos se corrigen en el paso 2 del plan),
horarios y festivos de Colombia calculados, y Supabase, Wompi, WhatsApp y correo por fases. El plan de IA: un solo
servidor MCP multiestudio en un Cloudflare Worker, primero de solo lectura, y los directorios como empaque. Quedan
cuatro decisiones para Justin (ROADMAP §E 44–47) más el proyecto de Supabase.
