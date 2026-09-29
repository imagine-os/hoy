# Machine surfaces — MCP / WebMCP, CLI, API

What something other than a person can drive in HoyOS today, and what it cannot.
**Checked 2026-09-29** (v0.13.0; previous check 2026-09-29, v0.12.0). Re-check and date this file every pass; a line that is not
re-checked is not current.

**0030 delta (v0.12.0).** `window.__hoyos.routes` no longer lists `/app/intention` (A-05 retired); the path still
resolves in the browser through the customer module's new `redirects` export (`/app/intention` → `/app`), which is
router-only and not part of the manifest. No action ids changed (A-05 had none). The icon pass is visual only: labels,
`aria-label`s and action ids are unchanged, so agents and the voice vocabulary see the same controls.

---

## 1. WebMCP — `window.__hoyos`

The running app publishes one object, from `src/app/manifest.ts` (called once in `App.tsx`). It is
the surface an in-page agent, a browser extension or the future voice controller reads and drives.
There is **no MCP server** yet: this is the in-page surface only.

| Member | Type | What it is |
| --- | --- | --- |
| `__hoyos.routes` | `RouteManifestEntry[]` | Every route: `path`, `code`, `surface`, `status` (`built` or `stub`), `roles`, and the whole `spec`. What `scripts/screenshots.mjs` and `scripts/gen-page-doc.mjs` read instead of parsing TypeScript. |
| `__hoyos.users` | `{ id, role }[]` | The demo users, so tooling can sign in as the right person per surface. |
| `__hoyos.actions` | `DeclaredAction[]` (getter) | Every action **declared** by any routed page: `id`, `label{es,en}`, `intent{es,en}`, `params?`, `permission?`, plus `code`, `route` and `mounted`. A getter, so `mounted` answers for the page that is open right now. |
| `__hoyos.run(id, params?)` | `Promise<{ ok, message }>` | Runs a **mounted** action. Never throws: an unknown or unmounted id comes back `ok: false` with the reason. |
| `__hoyos.hubMap` | `{ url, data, load() }` | Since 0027. The published hub map (§4): `url` is where this deployment serves `hub-map.json`, `data` the parsed map once loaded (`null` before; reading it starts the load), `load()` resolves with it. Source `src/hub/hubMapClient.ts`. |

```js
await window.__hoyos.run('hub.setLang', { lang: 'en' });   // { ok: true, message: 'language en' }
await window.__hoyos.run('hub.openTool', { tool: 'tokens' });
window.__hoyos.actions.filter((a) => a.mounted);
```

### Actions declared today

| id | Page | Intent (ES) | Params | Permission |
| --- | --- | --- | --- | --- |
| `hub.enterAs` | HUB-01 | Entra a {surface} como su usuario demo | `surface: enum:app,site,teacher,desk,inbox,pos,admin,crm,finance,marketing,manual,sources,docs,kb,dev` — `marketing` is coming soon and answers `ok: false` | — |
| `hub.openCanvas` | HUB-01 | Muéstrame todas las páginas en el lienzo | — | `dev.tools` |
| `hub.openSimulator` | HUB-01 | Abre el simulador de dispositivos | — | `dev.tools` |
| `hub.openTool` | HUB-01 | Abre {tool} | `tool: enum:canvas,simulator,specs,layout,tables,components,tokens,decisions,screenshots` | — |
| `hub.toggleDevMode` | HUB-01 | Enciende o apaga el modo dev | — | `dev.tools` |
| `hub.setLang` | HUB-01 | Pon la interfaz en {lang} | `lang: enum:es,en` | — |
| `hub.map` | HUB-01 | Dame el mapa del hub | — | — |
| `hub.toggleTheme` | HUB-01 | Cambia entre claro y oscuro | — | — |
| `hub.toggleWireframe` | HUB-01 | Muestra el sistema en wireframe | — | `dev.tools` |
| `app.reserve` | C-02 | Reserva la clase {session} | `session: string (class_sessions.id)` — must be scheduled and in the future | `bookings.write` · customer, teacher |
| `app.pickMat` | C-04 | Quiero el tapete {mat} | `mat: number 1–16` — free mat, mat classes only | `bookings.write` · customer, teacher |
| `app.confirmReservation` | C-04 | Confirma mi reserva | — | `bookings.write` · customer, teacher |
| `app.choosePlan` | C-06 | Quiero el plan {plan} | `plan: enum:monthly,annual` | `payments.read` · customer, teacher |
| `app.goHome` | C-01 (also C-02, C-04, C-06, C-08) | Llévame al inicio de la app | — | — · customer, teacher |
| `app.openSchedule` | C-01 (also C-02, C-04, C-06, C-08) | Muéstrame el horario de clases | — | `classes.read` · customer, teacher |
| `auth.signIn` | A-02 | Entra como {user} | `user: enum:usr_super,usr_admin,usr_coord,usr_desk,usr_fin,usr_teach,usr_maint,usr_mkt,usr_dev,usr_cust` | — · public (anyone on `/auth/sign-in`) |

| `manual.setLens` | K-03 | Muéstrame el manual de {role} | `role: enum:all,super_admin,admin,coordinator,front_desk,finance,teacher,maintenance,marketing,developer` | `docs.read` |
| `manual.markRead` | K-03 | Marca el capítulo {chapter} como leído | `chapter: slug or number` (default the open chapter) | `docs.read` · team roles |
| `manual.signTraining` | K-03 | Firma {stage} de {user} | `user: users.id`, `stage: enum:day1,week1,month1`, `role?` (default the person's role) | `manual.train` · coordinator, admin, super_admin |
| `manual.editSection` | K-03 | Reescribe la sección {section} del capítulo {chapter} | `chapter`, `section: ## heading`, `body: markdown`, `note?`, `lang?: es,en` — only sections marked `{{editable:…}}` | `manual.edit` · owner level: admin, super_admin; coordinator level: + coordinator |
| `manual.restoreSection` | K-03 | Vuelve al texto original de {section} | `chapter`, `section`, `lang?` | `manual.edit` |
| `manual.requestChange` | K-03 | Pide que el capítulo {chapter} diga {request} | `chapter`, `request`, `section?` | `docs.read` · team roles |
| `manual.suggestEdit` | K-03 | Sugiere este texto para {section} | `chapter`, `section`, `body`, `note?`, `lang?` — any section; an owner accepts it from "Sugerencias" | `docs.read` · team roles |
| `manual.openSource` | K-03 (also K-04, K-05) | Abre el documento {id} | `id: enum:modelo-de-valor,contenido-completo,manual-de-marca` | `docs.read` |
| `manual.listRequests` | K-04 | ¿Qué cambios pidió el equipo al manual? | `status?: enum:open,done,dismissed,all` (default open) — answers a JSON array | `manual.edit` · coordinator, admin, super_admin |
| `manual.answerRequest` | K-04 | Responde la solicitud {id}: {answer} | `id: manual_requests.id`, `answer`, `status?: enum:done,dismissed,open` | `manual.edit` · coordinator, admin, super_admin |

Added 2026-09-29 (0031): the ten `manual.*` actions (declared in `src/modules/ops-manual/actionDefs.ts`, handlers in
`manualActions.ts`) make **prompt-based editing** of the operations manual possible for an agent in the page: read the
requests (`manual.listRequests`), propose a section (`manual.suggestEdit`, which an owner accepts in place), edit a
section marked editable as an owner (`manual.editSection`), answer the request (`manual.answerRequest`). Every write
also appends an `audit_log` row. The visible "Reescribir con IA" button is a Placeholder that points here.

Added 2026-09-28 (0025). The `app.*` / `auth.*` set is declared in `src/modules/customer/actions.ts`
(`CUSTOMER_ACTIONS`, merged into the page specs in `src/modules/customer/specs.ts`) and mounted by each page
with `useActions()`; the role after `·` is the route's `roles`, which decides whether the page, and so the
handler, is mounted. Two deliberate limits: **`app.confirmReservation` only books what costs nothing now**
(credit or membership) and answers `ok: false` when a pass would be charged, and **`app.choosePlan` only opens
the plan's confirmation** — paying stays a person's click. `app.goHome` / `app.openSchedule` are shell-level
navigation, but the registry has no shell scope (`listActions()` reads route specs only), so they are declared
on the five flow pages and listed under the first (C-01).

```js
await window.__hoyos.run('auth.signIn', { user: 'usr_cust' });          // follows ?next=
await window.__hoyos.run('app.reserve', { session: 'ses_2026-10-05_1' }); // → /app/checkout/…
await window.__hoyos.run('app.pickMat', { mat: '7' });                   // mat classes only
await window.__hoyos.run('app.confirmReservation');                       // { ok: true, message: 'booked boo_…' }
```

**What does not exist yet.** No MCP server process and no transport (stdio or HTTP) — an agent has to
be in the page. `permission` is **advisory metadata for agents**: `run()` does not check it, and each
gated handler enforces its own role check today — `hub.toggleDevMode` throws `requires super_admin or developer`
(since 0031) and `hub.toggleWireframe` `requires super_admin`, and each `manual.*` handler checks its role, so `run()` answers `{ ok: false }` —
with server-side enforcement coming with the proxy that will front these.
Since 0025 the customer reserve / register flow has actions too (above); check-in, selling, sending, the
waitlist, changing a booking and sign-up are the next set, and each one has to be declared in its page's spec
before it can be run. A shell scope (actions a shell, not a page, declares) would remove the five-spec
duplication of the navigation actions.

### Frame contract

A page can be embedded in a same-origin iframe and told which session to run under, through the hash
query: `#/app?as=customer&lang=en&theme=dark&dev=0&live=0` (since 0027 `frameUrl()` writes the keys in exactly
this order, which is the hub map's embed pattern `{baseUrl}#{route}?as={role}&lang={lang}&theme={theme}&dev=0&live=0`). `src/app/frameSession.ts` shadows
`hoyos.session`, `hoyos.lang` and `hoyos.theme` for that document only and swallows writes, so a
preview never touches the viewer's session. `live=0` also switches live previews off, as does
`navigator.webdriver`. `DeviceFrame` and `PagePreview` (HUB-01, D-05, D-06) are the consumers.

---

## 2. CLI — `npm run …`

Everything is Node, in `scripts/`, and safe to run from a clean checkout.

| Script | What it does | Writes |
| --- | --- | --- |
| `npm run dev` | Vite dev server at `http://localhost:5173/#/` | — |
| `npm run build` | `npm run tokens` → `npm run hub-map` → `tsc --noEmit` → `vite build` → `node scripts/copy-shots.mjs`. **Must be green before every push.** | `src/design/tokens.css`, `public/hub-map.json`, `dist/` (incl. `dist/hub-map/shots/`) |
| `npm run hub-map` | `scripts/gen-hub-map.mjs`: composes the hub map from `src/hub/hubMap.data.ts` + the live route registry (Vite SSR loader, no browser) + `docs/screenshots/`, validates it against the contract and exits 1 on any problem. Deterministic (`generatedAt` = the latest changelog date) | `public/hub-map.json` (committed) |
| `npm run hub-map:check` | Since 0029. `scripts/check-sample-routes.mjs`: serves `dist/` (`vite preview`), opens every `pages[].sampleRoute` of `public/hub-map.json` in a same-origin iframe with `?as=<owning role>&dev=0&live=0` and fails when a `sample` segment is not resolved, the page has 20 words or fewer, shows a not-found state or a `⟨missing-key⟩` marker. Not part of the build; run after `npm run build` | — (prints one line per sample) |
| `node scripts/copy-shots.mjs` | Copies every capture the map references into `dist/hub-map/shots/<CODE>/` and prints the total (budget 80 MB; the plan lives in `scripts/lib/hubShots.mjs`) | `dist/hub-map/shots/` |
| `npm run preview` | Serves `dist/` at `:4173` (what the screenshot pass drives) | — |
| `npm run typecheck` | `tsc --noEmit` alone | — |
| `npm run tokens` | Regenerates the stylesheet from `src/design/tokens.ts` (D-01) | `src/design/tokens.css` |
| `npm run specs` | Regenerates the canvas specs from `reference/canvas/` | `src/specs/canvasSpecs.ts` |
| `npm run sql` | Regenerates the Supabase schema from `src/data/schema.ts` | `supabase/schema.sql` |
| `npm run flow-map` | Rebuilds the code → route map from the published manifest | `docs/flow-map.md` |
| `npm run screenshots` | Full capture pass: every route, ES + EN, 390 + 1280, light + dark for key pages, signed in as each surface's demo user. `--smoke` (console-error check, no files) · `--only=a,b` · `--pages=C-02,C-04` · `--widths=360,390,768,1280,1920,3840` · `--dark=a,b` · `--label=before` · `--quality=N` (0026 pass: `--pages=C-02,C-02b,C-04,W-04,S-03 --widths=360,390,768,1280,1920,3840`) | `docs/screenshots/<code>/<lang>-<width>[-dark].jpg`, `docs/screenshots/routes.json` |
| `npm run screenshots -- --full` | Tall website pages for the hub map: the W-xx codes at 390 px, fullPage capped at 6000 px, light, JPEG q70, reduced motion so scroll reveals are drawn | `docs/screenshots/W-xx/<lang>-390-full.jpg` |
| `npm run thumbnails` | `screenshots.mjs --thumbs` — the hub/canvas thumbnails: one route per page code, both languages, both themes, 640 × 400 desktop and 195 × 422 phone, JPEG q64 | `docs/screenshots/<CODE>/thumb-*.jpg` |
| `npm run test:dates` | The local-date-key regression test | — |
| `node scripts/test-mat-bookings.mjs` | The 16-mat booking rules against `MockProvider` (bounds, collisions, release, persistence); run with the build before every `src/` commit since 0025 | — |
| `node scripts/gen-page-doc.mjs <CODE>` | Page-doc skeleton from the spec and the captures | `docs/pages/<CODE>.md` |

**What does not exist yet.** No test runner (the date test is a standalone script), no linter or
formatter (`eslint` + `prettier` is a kanban card), no deploy command — GitHub Actions builds and
publishes `dist/` on push to `main` (`.github/workflows/pages.yml`).

---

## 3. HTTP API

**None.** There is no server. Every page reads and writes through `useData()` / the `DataProvider`
interface (`src/data/DataContext.tsx`), and today that is `MockProvider` — a seeded database in the
browser's `localStorage`. `SupabaseProvider` implements the same interface and is the seam the real
backend arrives through; nothing in a page changes when it does.

The endpoints each screen *intends* to call are written down, per page, as `PageSpec.api` — visible
in the inspector (`Ctrl + .` in dev mode) and at `/#/dev/specs`. Treat that list as the design of the
API, not as something that answers.

Planned, in order: **Supabase** (Postgres + Auth + Realtime + Storage) behind `SupabaseProvider` ·
**Wompi** (payments and payroll, Colombia) behind `wompiTokenise()` · **WhatsApp Cloud API** webhook →
`message_log` (`direction: inbound`, `external_id` = `wamid`) · **email inbound** (IMAP or SES) →
`message_log`. Each one gets its own changelog entry and its own row in this table when it lands.

---

## 4. Published files — the hub map

Since 0027 (v0.11.0) the site publishes one machine-readable description of itself, for other hosts
(the aluzina studio OS, the between-gigs company OS) to draw the hub through their own lens. Contract and
consumer checklist: [`hub-map.md`](./hub-map.md).

| File | URL | What |
| --- | --- | --- |
| `public/hub-map.json` | `https://imagine-os.github.io/hoy/hub-map.json` | Schema `hoy.hub-map/1`: product, embed pattern, 11 roles, 15 experiences (the hub cards; `marketing` carries `comingSoon: true`, 0031), every page code (87, each with a `group`; the 9 template pages with a `sampleRoute`), 9 tools, 3 lens hints |
| `public/source/<id>.pdf` (+ `<id>-cover.jpg`) | `https://imagine-os.github.io/hoy/source/<id>.pdf` | Since 0031: the owner's source documents (`modelo-de-valor`, `contenido-completo`, `manual-de-marca`); index `docs/source/index.json`; shown on K-05 `/#/docs/source` |
| `dist/hub-map/shots/<CODE>/…` | `https://imagine-os.github.io/hoy/hub-map/shots/<CODE>/<file>.jpg` | The thumbs (`thumb-<lang>-<phone\|desktop>[-dark].jpg`) and captures (`<lang>-390.jpg`, `<lang>-1280.jpg`, W-xx `<lang>-390-full.jpg`) the map's `shots` point at, relative to `product.baseUrl` |

**Embed pattern**: `{baseUrl}#{route}?as={role}&lang={lang}&theme={theme}&dev=0&live=0` — what
`frameUrl()` builds; a host substitutes and iframes it. Same-origin only under `imagine-os.github.io`.

---
**Resumen (ES).** Qué puede manejar una máquina hoy: en la página, `window.__hoyos` publica las rutas,
los usuarios demo, las acciones declaradas y `run(id, params)` para ejecutarlas (superficie WebMCP; no
hay servidor MCP todavía), y `__hoyos.hubMap` con el mapa del hub. Archivo publicado: `hub-map.json`
(esquema `hoy.hub-map/1`), con sus capturas en `hub-map/shots/`, para que aluzina y between-gigs dibujen el hub a su manera;
cada página con ruta plantilla trae `sampleRoute`, una ruta que abre un registro real (`npm run hub-map:check` la verifica).
En la terminal, los `npm run` de arriba. API HTTP: ninguna — todo pasa por
`DataProvider`, hoy `MockProvider` en el navegador; los endpoints previstos están en `PageSpec.api`.
