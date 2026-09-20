# Machine surfaces — MCP / WebMCP, CLI, API

What something other than a person can drive in HoyOS today, and what it cannot.
**Checked 2026-09-20** (v0.9.0). Re-check and date this file every pass; a line that is not
re-checked is not current.

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

```js
await window.__hoyos.run('hub.setLang', { lang: 'en' });   // { ok: true, message: 'language en' }
await window.__hoyos.run('hub.openTool', { tool: 'tokens' });
window.__hoyos.actions.filter((a) => a.mounted);
```

### Actions declared today

| id | Page | Intent (ES) | Params | Permission |
| --- | --- | --- | --- | --- |
| `hub.enterAs` | HUB-01 | Entra a {surface} como su usuario demo | `surface: enum:app,site,teacher,desk,inbox,pos,admin,crm,finance,manual,docs,kb,dev` | — |
| `hub.openCanvas` | HUB-01 | Muéstrame todas las páginas en el lienzo | — | `dev.tools` |
| `hub.openSimulator` | HUB-01 | Abre el simulador de dispositivos | — | `dev.tools` |
| `hub.openTool` | HUB-01 | Abre {tool} | `tool: enum:canvas,simulator,specs,layout,tables,components,tokens,decisions,screenshots` | — |
| `hub.toggleDevMode` | HUB-01 | Enciende o apaga el modo dev | — | `dev.tools` |
| `hub.setLang` | HUB-01 | Pon la interfaz en {lang} | `lang: enum:es,en` | — |
| `hub.toggleTheme` | HUB-01 | Cambia entre claro y oscuro | — | — |
| `hub.toggleWireframe` | HUB-01 | Muestra el sistema en wireframe | — | `dev.tools` |

**What does not exist yet.** No MCP server process and no transport (stdio or HTTP) — an agent has to
be in the page. `permission` is **advisory metadata for agents**: `run()` does not check it, and each
gated handler enforces its own role check today — `hub.toggleDevMode` and `hub.toggleWireframe` throw
`requires super_admin` when the session is not a super admin, so `run()` answers `{ ok: false }` —
with server-side enforcement coming with the proxy that will front these.
No actions outside HUB-01 yet: booking, check-in, selling and sending are the next set, and each one
has to be declared in its page's spec before it can be run.

### Frame contract

A page can be embedded in a same-origin iframe and told which session to run under, through the hash
query: `#/app?as=customer&lang=en&theme=dark&dev=0&live=0`. `src/app/frameSession.ts` shadows
`hoyos.session`, `hoyos.lang` and `hoyos.theme` for that document only and swallows writes, so a
preview never touches the viewer's session. `live=0` also switches live previews off, as does
`navigator.webdriver`. `DeviceFrame` and `PagePreview` (HUB-01, D-05, D-06) are the consumers.

---

## 2. CLI — `npm run …`

Everything is Node, in `scripts/`, and safe to run from a clean checkout.

| Script | What it does | Writes |
| --- | --- | --- |
| `npm run dev` | Vite dev server at `http://localhost:5173/#/` | — |
| `npm run build` | `npm run tokens` → `tsc --noEmit` → `vite build`. **Must be green before every push.** | `src/design/tokens.css`, `dist/` |
| `npm run preview` | Serves `dist/` at `:4173` (what the screenshot pass drives) | — |
| `npm run typecheck` | `tsc --noEmit` alone | — |
| `npm run tokens` | Regenerates the stylesheet from `src/design/tokens.ts` (D-01) | `src/design/tokens.css` |
| `npm run specs` | Regenerates the canvas specs from `reference/canvas/` | `src/specs/canvasSpecs.ts` |
| `npm run sql` | Regenerates the Supabase schema from `src/data/schema.ts` | `supabase/schema.sql` |
| `npm run flow-map` | Rebuilds the code → route map from the published manifest | `docs/flow-map.md` |
| `npm run screenshots` | Full capture pass: every route, ES + EN, 390 + 1280, light + dark for key pages, signed in as each surface's demo user. `--smoke` (console-error check, no files) · `--only=a,b` · `--label=before` · `--quality=N` | `docs/screenshots/<code>/<lang>-<width>[-dark].jpg`, `docs/screenshots/routes.json` |
| `npm run thumbnails` | `screenshots.mjs --thumbs` — the hub/canvas thumbnails: one route per page code, both languages, both themes, 640 × 400 desktop and 195 × 422 phone, JPEG q64 | `docs/screenshots/<CODE>/thumb-*.jpg` |
| `npm run test:dates` | The local-date-key regression test | — |
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
**Resumen (ES).** Qué puede manejar una máquina hoy: en la página, `window.__hoyos` publica las rutas,
los usuarios demo, las acciones declaradas y `run(id, params)` para ejecutarlas (superficie WebMCP; no
hay servidor MCP todavía). En la terminal, los `npm run` de arriba. API HTTP: ninguna — todo pasa por
`DataProvider`, hoy `MockProvider` en el navegador; los endpoints previstos están en `PageSpec.api`.
