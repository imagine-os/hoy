# Machine surfaces — MCP / WebMCP, CLI, API

What something other than a person can drive in HoyOS today, and what it cannot.
**Checked 2026-09-30** (v0.21.0; previous check 2026-09-29, v0.20.0). Re-check and date this file every pass; a line that is not
re-checked is not current.

**0047 delta (v0.21.0).** Two new action ids. `settings.contacts.update` on M-08a (`src/modules/admin/actions.ts`; params
`intent: enum:frontDesk,sales,specials,support,finance,payroll,legal,coordinator,owner`, `name?`, `whatsapp?` (empty falls
back to the front desk), `role?` (a staff role; empty clears), `hours?: enum:always,studioHours,businessDays`;
`settings.write`) merges one row of `tenants.settings.contacts` and writes the same `settings.update` audit row as the card.
`contact.whatsapp` on C-25 (`src/modules/customer/actions.ts`; params `intent?` default `frontDesk`, `text?`; no permission)
is read-only: it answers the resolved recipient, number and wa.me link — hours, M-08g exceptions and Colombia's holidays
applied by `resolveContact()` (`src/tenant/contacts.ts`, D-0022) — plus the "we reply on the next open day" note when the
contact is off duty; it opens nothing. New CLI: `npm run test:contacts`. `public/actions.json` lists 59 actions (was 57), 13
permissions, 18 declaring pages, version 0.21.0; `public/hub-map.json` version 0.21.0, no schema or text change. Not
machine-reachable: the routing table as a whole (read it through `DataProvider` on `tenants.settings.contacts`, or one intent
at a time through `contact.whatsapp`).

**0046 delta (v0.20.0).** Six new action ids on M-03, declared in `src/modules/admin/actions.ts`: `tables.setDateColumn`
(`column`, `endColumn?`), `tables.calendarMode` (`mode: enum:month,week,agenda`), `tables.timelineZoom`
(`zoom: enum:day,week,month,quarter`), `tables.goToDate` (`date`: `YYYY-MM-DD`, `today`, `next` or `previous`),
`tables.renameView` and `tables.deleteView` (both `tables.write`; `view` is a saved-view id or its name, default the active
one); M-03 now declares 17 `tables.*` actions. `tables.setView` widened to `grid,list,gallery,kanban,calendar,timeline,graph`
(calendar and timeline need a date or timestamp column; they no longer answer "not wired yet"). Three new URL params are
linkable surfaces with `?view=calendar|timeline`: `?date=YYYY-MM-DD` (the cursor), `?mode=month|week|agenda` and
`?zoom=day|week|month|quarter`, e.g. `/#/admin/tables/class_sessions?view=calendar&mode=month&date=2026-09-29`. Saved-view
rename and delete are now machine-reachable (they were listed as not reachable in 0044). The hub map tool `purpose` now
reads "El gestor de datos con vistas: cuadrícula, lista, galería, tablero, calendario, línea de tiempo y grafo."
(`public/hub-map.json`, version 0.20.0; no schema change). `public/actions.json` now lists 57 actions (was 51), version 0.20.0.
`MockProvider.SEED_VERSION` is 8, so every stored demo db reseeds once. Still not machine-reachable: the graph zoom / pan,
the kanban drag and the timeline bar click (the keyboard, `tables.openRow` and `tables.goToDate` are the reachable paths).

**0044 delta (v0.19.0).** Eleven new action ids on M-03 `/admin/tables/:table`, declared in `src/modules/admin/actions.ts`
(`ADMIN_ACTIONS['M-03']`): `tables.open`, `tables.openRow`, `tables.setView`, `tables.search`, `tables.filter`,
`tables.newRow`, `tables.export`, `tables.toggleSidebar`, `tables.saveView`, `tables.pin` and `tables.toggleTechnicalNames`
(the last is `dev.tools`; `tables.newRow` and `tables.saveView` are `tables.write`; the rest `tables.read`).
`tables.setView` takes `grid`, `list`, `gallery`, `kanban` or `graph`; `calendar` and `timeline` answer "not wired yet".
The page URL is now a linkable-view surface an agent can build without the page open: `?id=` (row drawer), `?view=`
(view kind), `?v=` (a saved view), `?focus=` (row-level graph) and `?where=column:value` (filtered table), e.g.
`/#/admin/tables/bookings?view=graph`. Saved views are rows in the new `table_views` table (57 tables in all), and `public/actions.json` lists the eleven ids after the next build (51 actions), so they are
readable and writable through `DataProvider` like any other row. `hoy.hub-map/1` changes only in text: the tables tool
`purpose` now reads "El gestor de datos con vistas: cuadrícula, lista, galería, tablero y grafo." (regenerated
`public/hub-map.json`, version 0.19.0; no schema change). `npm run sql` regenerated `supabase/schema.sql` and
`docs/data-model.md`; `MockProvider.SEED_VERSION` is 7, so every stored demo db reseeds once. Not machine-reachable yet:
the graph zoom / pan, the kanban drag (the keyboard and the "Move to…" select are the page's own controls) and saved-view
rename / delete.

**0043 delta (v0.18.0).** The actions vocabulary is published as a file: `public/actions.json` (schema `hoy.actions/1`,
contract `src/actions/manifest.types.ts`, URL `https://imagine-os.github.io/hoy/actions.json`), written by
`scripts/gen-actions.mjs` from the same `PageSpec.actions` that `__hoyos.actions` lists — 40 actions, the 11 permissions
they reference (with the roles that hold each), and the declaring pages. `npm run actions` runs in `npm run build` right
after `npm run hub-map` and exits 1 on a conflicting duplicate id, a missing `es` / `en`, an unknown permission or zero
actions. `window.__hoyos.actionsUrl` says where this deployment serves it. Audit against the code (106 routes, 92 codes,
40 action ids on 16 page codes): every id, intent, param and permission below matches; fixed the page column of
`app.goHome` / `app.openSchedule` (also C-27), the route roles after `·` of `settings.hours.update` and
`dev.apiKeys.create`, the table split in two before `manual.setLens`, the missing `npm run capture-dates` row in §2 and the hub-map page count in §4 (89 → 92).

**0041 delta (v0.17.0).** Thirteen new action ids: the admin module declares actions for the first time
(`src/modules/admin/actions.ts`, `ADMIN_ACTIONS` merged into the specs) — `settings.hours.update` (M-08a),
`settings.hours.override.add` / `.remove` / `settings.hours.holidays.import` (M-08g), `integrations.google.copyHours` /
`.connect` / `.push` (M-10a) — and D-07 declares `dev.apiKeys.create` / `.rotate` / `.revoke`
(`src/modules/dev/actions.ts`). Three new routes in `window.__hoyos.routes`: `/admin/settings/hours`,
`/admin/integrations/google-business`, `/dev/api-keys`. New permissions `hours.write`, `api_keys.read`, `api_keys.write`.
New CLI: `npm run test:holidays`, `npm run test:hours`. §3 now records the designed developer-key scheme and the planned
Google push — both design, nothing answers.

**0040 delta (v0.16.0).** Four actions join the vocabulary: `app.openPractice` and `app.setGoal` on the customer side
(declared on C-01 and the new C-27 `/app/practice`; `app.openPractice` is part of the shell navigation set, so it is also
declared on C-02, C-04, C-06 and C-08), and `analytics.setRange` / `analytics.openMember` on the new M-12
`/admin/analytics`. `window.__hoyos.routes` gains `/app/practice` (C-27) and `/admin/analytics` (M-12): 101 → 103 routes,
87 → 89 codes; `public/hub-map.json` picks both up on the next build (`/app/practice` in the customer app's *Account*
group via `HUB_GROUP_RULES`). Two tables join `{{tables}}` / M-03 in the new *Práctica y analítica* group:
`practice_goals` and `activity_events` (52 → 54). One CLI entry: `npm run test:analytics`. `MockProvider.SEED_VERSION`
is 4, so every stored demo db reseeds once.

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
| `__hoyos.actionsUrl` | `string` | Since 0043. Where this deployment serves `actions.json` (§4, schema `hoy.actions/1`): the same vocabulary as `actions`, as a file an agent can read without the page. |

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
| `app.goHome` | C-01 (also C-02, C-04, C-06, C-08, C-27) | Llévame al inicio de la app | — | — · customer, teacher |
| `app.openSchedule` | C-01 (also C-02, C-04, C-06, C-08, C-27) | Muéstrame el horario de clases | — | `classes.read` · customer, teacher |
| `app.openPractice` | C-01 (also C-27, C-02, C-04, C-06, C-08) | Muéstrame mi práctica | — | — · customer, teacher |
| `contact.whatsapp` | C-25 | Dame el WhatsApp para {intent} | `intent?: enum:frontDesk,sales,specials,support,finance,payroll,legal,coordinator,owner` (default frontDesk), `text?` — answers `<recipient> <number> <wa.me link>` and the off-duty note; opens nothing | — · customer, teacher |
| `app.setGoal` | C-01 (also C-27) | Quiero practicar {target} veces por semana | `target: number 0–7 (0 = sin meta)` — a whole number; ends the active `practice_goals` row, inserts the new one and writes a `goal.set` event; answers `goal N/week` | `bookings.write` · customer, teacher |
| `analytics.setRange` | M-12 | Muéstrame la analítica de los últimos {range} días | `range: enum:7,30,90` | `members.read` · super_admin, admin, coordinator, finance |
| `analytics.openMember` | M-12 | Abre la ficha de {userId} | `userId: string — users.id (usr_cust)` → `/admin/crm/:id` | `members.read` · super_admin, admin, coordinator, finance |
| `auth.signIn` | A-02 | Entra como {user} | `user: enum:usr_super,usr_admin,usr_coord,usr_desk,usr_fin,usr_teach,usr_maint,usr_mkt,usr_dev,usr_cust` | — · public (anyone on `/auth/sign-in`) |
| `settings.hours.update` | M-08a | Abre el {day} de {open} a {close} (o ciérralo) | `day: enum:0–6 (0 = Sunday)`, `open: HH:MM \| closed`, `close: HH:MM` | `settings.write` · super_admin, admin, coordinator, finance (the page; only super_admin and admin hold the permission) |
| `settings.contacts.update` | M-08a | Las preguntas de {intent} las recibe {name} en el WhatsApp {whatsapp} | `intent: enum:frontDesk,…,owner`, `name?`, `whatsapp?` (empty = front desk fallback), `role?` (staff role), `hours?: enum:always,studioHours,businessDays` — merges one row, stores the full table | `settings.write` · super_admin, admin, coordinator, finance (the page; only super_admin and admin hold the permission) |
| `settings.hours.override.add` | M-08g | El {start} cerramos por {label} / abrimos de {open} a {close} | `start: YYYY-MM-DD`, `end?`, `label`, `label_en?`, `closed: enum:true,false`, `open?`, `close?`, `kind?: enum:holiday,special,event` — same validation as the drawer | `hours.write` · admin, super_admin, coordinator |
| `settings.hours.override.remove` | M-08g | Quita la excepción del {date} | `id` or `date: YYYY-MM-DD` | `hours.write` |
| `settings.hours.holidays.import` | M-08g | Importa los festivos de Colombia de este año y el próximo | — (skips dates that already have an exception) | `hours.write` |
| `integrations.google.copyHours` | M-10a | Copia el horario para pegarlo en Google Business Profile | `format?: enum:text,json` — answers the copied text | — · admin, super_admin |
| `integrations.google.connect` | M-10a | Conecta el perfil de Google del estudio (no conectado aún) | — answers `ok: false` (no server) | `settings.write` |
| `integrations.google.push` | M-10a | Envía el horario a Google ahora (no conectado aún) | — answers `ok: false` (no server) | `settings.write` |
| `dev.apiKeys.create` | D-07 | Crea una llave {environment} llamada {name} con {scopes} | `name`, `environment: enum:live,test`, `scopes: csv`, `expires_days?` — answers the prefix; the raw key is shown once on screen, never returned | `api_keys.write` · super_admin, developer, admin (admin reads the page; only super_admin and developer hold the permission) |
| `dev.apiKeys.rotate` | D-07 | Rota la llave {id}; la vieja funciona 24 horas más | `id: api_keys.id or prefix` | `api_keys.write` |
| `dev.apiKeys.revoke` | D-07 | Revoca la llave {id} ya | `id: api_keys.id or prefix` | `api_keys.write` |
| `tables.open` | M-03 | Abre la tabla {table} | `table: enum of table names` | `tables.read` |
| `tables.openRow` | M-03 | Abre la fila {id} de {table} | `table`, `id` | `tables.read` |
| `tables.setView` | M-03 | Muéstralo como {kind} | `kind: enum:grid,list,gallery,kanban,calendar,timeline,graph` — calendar and timeline need a date or timestamp column | `tables.read` |
| `tables.setDateColumn` | M-03 | Pon las filas en el calendario por {column} hasta {endColumn} | `column` (a date or timestamp column of the open table), `endColumn?` (none = a point; default the pair of `column`) | `tables.read` |
| `tables.calendarMode` | M-03 | Muestra el calendario por {mode} | `mode: enum:month,week,agenda` | `tables.read` |
| `tables.timelineZoom` | M-03 | Acerca o aleja la línea de tiempo a {zoom} | `zoom: enum:day,week,month,quarter` | `tables.read` |
| `tables.goToDate` | M-03 | Ve al {date} en el calendario o la línea de tiempo | `date`: `YYYY-MM-DD`, `today`, `next` or `previous` | `tables.read` |
| `tables.search` | M-03 | Busca {q} en esta tabla | `q` (empty clears) | `tables.read` |
| `tables.filter` | M-03 | Filtra donde {column} {op} {value} | `column`, `op: enum:is,is_not,contains,empty,not_empty,before,after,gt,lt,in`, `value` (comma-separated for `in`; YYYY-MM-DD for dates) | `tables.read` |
| `tables.newRow` | M-03 | Crea una fila nueva en esta tabla | — | `tables.write` |
| `tables.export` | M-03 | Exporta esta vista en {format} | `format: enum:json,csv` (raw column names and values) | `tables.read` |
| `tables.toggleSidebar` | M-03 | Contrae (o expande) la barra de tablas | — | `tables.read` |
| `tables.saveView` | M-03 | Guarda esta vista como {name} | `name` — writes a `table_views` row | `tables.write` |
| `tables.renameView` | M-03 | Cambia el nombre de la vista {view} a {name} | `view` (id or name; default the active one), `name` | `tables.write` |
| `tables.deleteView` | M-03 | Elimina la vista {view} | `view` (id or name; default the active one) | `tables.write` |
| `tables.pin` | M-03 | Fija (o suelta) la tabla {table} | `table` (default: the open one) | `tables.read` |
| `tables.toggleTechnicalNames` | M-03 | Muestra (u oculta) los nombres técnicos | — | `dev.tools` |
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

Added 2026-09-29 (0041): hours, Google Business Profile and developer keys. The handlers re-check their permission
(`settings.write`, `hours.write`, `api_keys.write`) and throw, so `run()` answers `{ ok: false }` for a role without it;
every write appends the same `audit_log` row as the button (`settings.update`, `hours.override.save` /
`.delete`, `hours.import_holidays`, `api_key.create` / `.rotate` / `.revoke`). Deliberate limits: the Google connect /
push actions exist so the vocabulary is complete but answer "not wired yet", and the key actions never put a raw key
in an agent's transcript.

Added 2026-09-29 (0040): `app.openPractice` / `app.setGoal` (`src/modules/customer/actions.ts`, handlers in `actions.ts` and
`practice.tsx`) and `analytics.setRange` / `analytics.openMember` (declared in the `M12` spec, `src/modules/admin/specs.ts`,
handlers in `AnalyticsPage.tsx`). `app.setGoal` is the first customer action that **writes a preference** rather than a
booking; 0 clears the goal ("sin meta") and keeps the counts. Every practice number an agent could ask for is derived on
read (`src/data/analytics.ts`), so there is no "refresh stats" action and none is planned.

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
The plan for a hosted, multi-tenant MCP server and marketplace listings is in `docs/reference/ai-distribution.md` (0043).

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
| `npm run build` | `npm run tokens` → spacing lint (report) → `npm run hub-map` → `npm run actions` → `npm run capture-dates` → manual lint (report) → `tsc --noEmit` → `vite build` → `node scripts/copy-shots.mjs`. **Must be green before every push.** | `src/design/tokens.css`, `public/hub-map.json`, `public/actions.json`, `src/app/captureDates.ts`, `dist/` (incl. `dist/hub-map/shots/`) |
| `npm run hub-map` | `scripts/gen-hub-map.mjs`: composes the hub map from `src/hub/hubMap.data.ts` + the live route registry (Vite SSR loader, no browser) + `docs/screenshots/`, validates it against the contract and exits 1 on any problem. Deterministic (`generatedAt` = the latest changelog date) | `public/hub-map.json` (committed) |
| `npm run actions` | Since 0043. `scripts/gen-actions.mjs`: the actions vocabulary from every routed page's `spec.actions` (Vite SSR loader, no browser) + `src/auth/permissions.ts`; one entry per id with `label` / `intent` in ES and EN, `params`, `permission`, the union of the declaring routes' `roles` and the declaring `pages`. Exits 1 on a duplicate id whose label / intent / params / permission differ, a missing `es` / `en`, a permission not in `permissions.ts` or zero actions. Deterministic (`generatedAt` = the latest changelog date) | `public/actions.json` (committed) |
| `npm run capture-dates` | Since 0031. `scripts/gen-capture-dates.mjs`: per page code, the day `docs/screenshots/<CODE>/es-1280.jpg` was last committed and the newest changelog entry naming the code, so the manual's figures can flag a stale capture. Git history only; a shallow clone keeps the committed file | `src/app/captureDates.ts` |
| `npm run hub-map:check` | Since 0029. `scripts/check-sample-routes.mjs`: serves `dist/` (`vite preview`), opens every `pages[].sampleRoute` of `public/hub-map.json` in a same-origin iframe with `?as=<owning role>&dev=0&live=0` and fails when a `sample` segment is not resolved, the page has 20 words or fewer, shows a not-found state or a `⟨missing-key⟩` marker. Not part of the build; run after `npm run build` | — (prints one line per sample) |
| `node scripts/copy-shots.mjs` | Copies every capture the map references into `dist/hub-map/shots/<CODE>/` and prints the total (budget 80 MB; the plan lives in `scripts/lib/hubShots.mjs`) | `dist/hub-map/shots/` |
| `npm run preview` | Serves `dist/` at `:4173` (what the screenshot pass drives) | — |
| `npm run typecheck` | `tsc --noEmit` alone | — |
| `npm run tokens` | Regenerates the stylesheet from `src/design/tokens.ts` (D-01) | `src/design/tokens.css` |
| `npm run specs` | Regenerates the canvas specs from `reference/canvas/` | `src/specs/canvasSpecs.ts` |
| `npm run sql` | Regenerates the Supabase schema and the data-model doc from `src/data/schema.ts` (Node 22 type stripping) | `supabase/schema.sql`, `docs/data-model.md` |
| `npm run flow-map` | Rebuilds the code → route map from the published manifest | `docs/flow-map.md` |
| `npm run screenshots` | Full capture pass: every route, ES + EN, 390 + 1280, light + dark for key pages, signed in as each surface's demo user. `--smoke` (console-error check, no files) · `--only=a,b` · `--pages=C-02,C-04` · `--widths=360,390,768,1280,1920,3840` · `--dark=a,b` · `--label=before` · `--quality=N` (0026 pass: `--pages=C-02,C-02b,C-04,W-04,S-03 --widths=360,390,768,1280,1920,3840`) | `docs/screenshots/<code>/<lang>-<width>[-dark].jpg`, `docs/screenshots/routes.json` |
| `npm run screenshots -- --full` | Tall website pages for the hub map: the W-xx codes at 390 px, fullPage capped at 6000 px, light, JPEG q70, reduced motion so scroll reveals are drawn | `docs/screenshots/W-xx/<lang>-390-full.jpg` |
| `npm run thumbnails` | `screenshots.mjs --thumbs` — the hub/canvas thumbnails: one route per page code, both languages, both themes, 640 × 400 desktop and 195 × 422 phone, JPEG q64 | `docs/screenshots/<CODE>/thumb-*.jpg` |
| `npm run lint:manual` | Since 0038. `scripts/manual-lint.mjs`: checks `docs/ops-manual/{es,en}` against `STYLE.md` (page codes, routes, file and table names and jargon in prose; one screen box and one `{{editable}}` per `##`; closed `{{for}}`; known `{{studio:…}}` keys and `{{source:…}}` ids; existing figures; ES/EN parity; front matter; retired copy). Exit 1 on any violation not in the baseline. `--report` (used by `npm run build`) never fails · `--json` · `--update-baseline` | `docs/ops-manual/lint-baseline.json` (empty) |
| `node scripts/manual-qa.mjs` | Since 0038. Serves `dist/` on :4174 and drives Chromium: `--stale` (no stale-capture badge on the cover and chapters 01, 04, 09, 21, 24), `--lens` (writes `docs/screenshots/K-03/<lang>-<width>-cover-<role>.jpg` for eight roles), `--smoke` (open live, edit / save / restore, mark read, request a change, sign a stage), `--keys` (Tab order, focus rings, Enter, Esc). JSON report, exit 1 on a failed check. Run `npm run build` first | `docs/screenshots/K-03/*-cover-<role>.jpg` |
| `npm run lint:spacing` | Since 0037. `scripts/spacing-lint.mjs`: raw px/rem on spacing properties (margin, padding, gap, inset, top/right/bottom/left) and control sizes ≤ 64 px in `src/**/*.css` and inline `style` margin/padding/gap in `.tsx`; 1 px and `/* optical */` nudges ≤ 2 px allowed. Exit 1 when the count is above the baseline. `--report` (used by `npm run build`) prints only grown files · `--update-baseline` | `scripts/spacing-baseline.json` |
| `npm run audit:spacing` | Since 0037. `scripts/spacing-audit.mjs --route=/app [--as=usr_cust] [--widths=390,1280,3840] [--grid] [--all] [--out=dir]`: serves `dist/` on :4174, prints uneven or off-grid sibling gaps, unequal card padding and targets under 44 px (divided by `--ui`); `--grid` saves a 4 / 16 px grid overlay. Run `npm run build` first | `spacing-audit/<route>-<width>-grid.jpg` with `--grid` |
| `npm run test:dates` | The local-date-key regression test | — |
| `npm run test:holidays` | Since 0041. `scripts/test-holidays.mjs`: `src/tenant/holidays.co.ts` against the official 2026 Colombian calendar (18 dates, Easter 5 April), Meeus Easter for seven years, every Emiliani holiday on a Monday 2025–2028 | — |
| `npm run test:contacts` | Since 0047. `scripts/test-contacts.mjs` (esbuild bundle): `resolveContact` in `src/tenant/contacts.ts` — every intent without a number falls back to the front desk, payroll routing on business days / weekends / holidays, `always`, `studioHours`, the "we reply on the next open day" note, `isBusinessDay`, `nextBusinessDay` (26 checks) | — |
| `npm run test:hours` | Since 0041. `scripts/test-hours.mjs`: `effectiveHoursFor` (override wins, inclusive, narrowest), `toGoogleBusinessHours` (Business Information API shape, one special period per date, overnight close), `toSchemaOrgHours`, `todayStatus` in America/Bogota | — |
| `npm run test:analytics` | Since 0040. `scripts/test-analytics.mjs`: bundles `src/data/analytics.ts` with esbuild and proves the streak rules (Mon–Sun weeks in America/Bogota, met / at-risk / rest week / paused / broken / best), session-dated month counts, the goal suggestion, the studio arithmetic and the seeded demo member's facts. Exit 1 on any failed check; run with the build before every `src/data` commit | — |
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

**Designed in 0041, not answering.**
- **Developer keys (inbound, D-0018).** D-07 issues `hoy_<live|test>_<24 base62>` keys; `api_keys` stores the
  13-character prefix and the SHA-256 hex, never the key. A request will carry `Authorization: Bearer hoy_live_…`; the
  server hashes the token, matches `key_hash`, checks `environment`, `scopes` (`classes.read`, `bookings.read`,
  `bookings.write`, `customers.read`, `hours.read`, `hours.write`, `webhooks.receive`), `expires_at` and `revoked_at`,
  and stamps `last_used_at`. First endpoints the scopes are shaped for: `GET /v1/classes`, `GET /v1/hours` (weekly +
  overrides, the same data as `useOpeningHours()`), `GET|POST /v1/bookings`. None exists.
- **Google Business Profile push (outbound, D-0017).** On save in M-08a / M-08g and nightly, the server calls
  `PATCH https://mybusinessbusinessinformation.googleapis.com/v1/{locationName}?updateMask=regularHours,specialHours`
  with the body `toGoogleBusinessHours()` builds (M-10a shows it), using the location's refresh token from the server
  environment (`GOOGLE_BUSINESS_REFRESH_TOKEN_<TENANT>`), then sets `hours_overrides.google_synced_at`. Nightly it reads
  the location back and flags drift; nothing is written into HoyOS from Google. Planned home: a Cloudflare Worker or a
  Supabase Edge Function (kanban).

---

## 4. Published files — the hub map and the actions vocabulary

Since 0027 (v0.11.0) the site publishes one machine-readable description of itself, for other hosts
(the aluzina studio OS, the between-gigs company OS) to draw the hub through their own lens. Contract and
consumer checklist: [`hub-map.md`](./hub-map.md).

| File | URL | What |
| --- | --- | --- |
| `public/hub-map.json` | `https://imagine-os.github.io/hoy/hub-map.json` | Schema `hoy.hub-map/1`: product, embed pattern, 11 roles, 15 experiences (the hub cards; `marketing` carries `comingSoon: true`, 0031), every page code (92 after the 0041 build — M-08g, M-10a and D-07 join the 89; each with a `group`; the 9 template pages with a `sampleRoute`), 9 tools, 3 lens hints |
| `public/actions.json` | `https://imagine-os.github.io/hoy/actions.json` | Since 0043. Schema `hoy.actions/1` (contract `src/actions/manifest.types.ts`): product, `run` (how to execute — in the page, `window.__hoyos.run(id, params)`; no MCP server yet), the 11 permissions the actions reference with the roles that hold each, and the actions sorted by id (59 at v0.21.0) — `label` / `intent` `{es,en}`, `params?`, `permission?`, `roles` (union of the declaring routes) and `pages` (`code`, `route`). The vocabulary without opening the page; written by `npm run actions` |
| `public/source/<id>.pdf` (+ `<id>-cover.jpg`) | `https://imagine-os.github.io/hoy/source/<id>.pdf` | Since 0031: the owner's source documents (`modelo-de-valor`, `contenido-completo`, `manual-de-marca`); index `docs/source/index.json`; shown on K-05 `/#/docs/source` |
| `dist/hub-map/shots/<CODE>/…` | `https://imagine-os.github.io/hoy/hub-map/shots/<CODE>/<file>.jpg` | The thumbs (`thumb-<lang>-<phone\|desktop>[-dark].jpg`) and captures (`<lang>-390.jpg`, `<lang>-1280.jpg`, W-xx `<lang>-390-full.jpg`) the map's `shots` point at, relative to `product.baseUrl` |

**Embed pattern**: `{baseUrl}#{route}?as={role}&lang={lang}&theme={theme}&dev=0&live=0` — what
`frameUrl()` builds; a host substitutes and iframes it. Same-origin only under `imagine-os.github.io`.

---
**Resumen (ES).** Qué puede manejar una máquina hoy (revisado 2026-09-30, v0.21.0; 0047 añade `settings.contacts.update` en M-08a — quién recibe cada tema de WhatsApp — y la lectura `contact.whatsapp` en C-25 — el número y el enlace resueltos por tema, con horario y festivos —, 59 acciones; 0046 añade seis acciones `tables.*` — fecha, modo del calendario, zoom, ir a una fecha, renombrar y eliminar vistas —, amplía `tables.setView` a calendario y línea de tiempo y suma los parámetros `?date=`, `?mode=` y `?zoom=`; 0044 añade once acciones `tables.*` en M-03, los parámetros de URL `?id=`, `?view=`, `?v=`, `?focus=` y `?where=` como vistas enlazables, y la tabla `table_views`; 0041 añade las acciones de horario — `settings.hours.*` —, de Google Business Profile — `integrations.google.*`, conectar y enviar responden «aún no conectado» — y de llaves de desarrollador — `dev.apiKeys.*` —; 0043 publica el vocabulario como archivo): en la página, `window.__hoyos` publica las rutas,
los usuarios demo, las acciones declaradas y `run(id, params)` para ejecutarlas (superficie WebMCP; no
hay servidor MCP todavía), `__hoyos.hubMap` con el mapa del hub y `__hoyos.actionsUrl`. Archivos publicados: `hub-map.json`
(esquema `hoy.hub-map/1`), con sus capturas en `hub-map/shots/`, para que aluzina y between-gigs dibujen el hub a su manera
(cada página con ruta plantilla trae `sampleRoute`, que `npm run hub-map:check` verifica), y `actions.json` (esquema
`hoy.actions/1`, 40 acciones con su intención en ES y EN, parámetros, permiso, roles y páginas), que `npm run actions`
escribe en cada build: el vocabulario completo sin abrir la página. En la terminal, los `npm run` de arriba. API HTTP:
ninguna — todo pasa por `DataProvider`, hoy `MockProvider` en el navegador; los endpoints previstos están en `PageSpec.api`.
