# HoyOS

**HoyOS** is the operations system for HOY Wellness Center, a wellness club in Medellín, Colombia,
built to become a multi-tenant platform for other studios later. One codebase serves the public
website, the customer app, the teacher app, the staff and admin desktop, the club's operations
manual, the in-app documentation and the developer tooling.

- Version: **0.11.2** (2026-09-29) — **Hub map sample routes** (0029): the nine template pages in `hub-map.json` carry a `sampleRoute` that opens a real record (a `sample` segment resolves to today's class, booking or payout in the app), so hosts embed detail pages live; `npm run hub-map:check` verifies all nine. Before it: **0.11.1** — **Hub map page groups** (0028): every page in `hub-map.json` carries a `group` (the customer app splits into Book / Pay / Account / Sign in) so each host draws the same sub-mats; on top of **Hub map** (0027): the site publishes `hub-map.json` (schema `hoy.hub-map/1`, [`docs/reference/hub-map.md`](./docs/reference/hub-map.md)) — every role, experience, page and tool by device, with its captures under `hub-map/shots/` — so the aluzina studio OS, the between-gigs company OS and hoy's own hub each draw the hoy hub through their own lens; HUB-01 renders from the same data module (`src/hub/hubMap.data.ts`), `npm run hub-map` regenerates it on every build, the website also ships as tall 390 px pages. Before it: **0.10.1** (2026-09-28) — **Phone calendar views, teacher width, responsive mat grid** (0026): under 900 px the schedule's Week is a snap-scrolling day strip and the Month a compact 7-column grid of 44 px cells, both with movement dots above the selected day's class list (no horizontal scroll region); the teacher app is capped at a 60rem `--w-teach` column from 900 px; the mat picker derives its columns from the room's width and the tenant row length (8, 4 or 2 per line, one grid per physical row with a row label when it wraps). Before it: **0.10.0 Responsive app shell** (0025): the customer and teacher apps no longer live in a phone mockup on desktop. One responsive `AppShell` replaces `PhoneShell`: below 900 px a content column with the bottom dock (the phone experience, unchanged), from 900 px a full-viewport page with the primary nav in the top bar and content in a centred container — so site → sign-in → checkout / plans reads as one experience at every width (decision D-0006). The `--ui` large-screen band now applies to every surface through `:root` and rem spacing (D-0007); one breakpoint list (`BREAKPOINTS`: 360 · 390 · 768 · 900 · 1280 · 1920 · 2560 · 3840); every interactive control is at least 44 px (`--h-ctl`). Two-column desktop layouts for C-01, C-04 and C-08, both plan cycles side by side on C-06 (and `?plan=` from the site preselects), bottom sheets become centred dialogs from 900 px, the auth shell shares the app's top bar, and the website's Google Fonts load through a `<link>` so a fonts outage can no longer blank the site. Seven new WebMCP actions (`app.*`, `auth.signIn`, see [`docs/reference/surfaces.md`](./docs/reference/surfaces.md)). The phone bezel now exists only in the hub's `DeviceFrame` simulator. Before it: **0.9.2–0.9.4 website V2.1–V2.3** (0024, back-filled): living photographs and video, the elemental cursor, membership cards and the 16-mat booking. Before it: **0.9.0 Hub home redesign** (0022): the hub at `/#/` now *shows* the system instead of describing it. Every surface card carries the real screen behind it — a committed capture (`docs/screenshots/<code>/thumb-*`, `npm run thumbnails`) and, in a real browser, the running page inside a scaled `DeviceFrame`, six at a time, in view only. A deep-blue brand band with the hero and a floating session bar; four bands (customer app featured with a phone preview, website, teacher app · the six staff seats · manual, docs, kanban, dev tools · nine testing tools); a live stat strip. New **D-05 `/#/dev/canvas`** (every page as a capture tile, grouped by surface, with zoom) and **D-06 `/#/dev/simulator`** (any route on phone / tablet / desktop / 4K TV as any role, the whole view in the URL). New **actions registry** (`src/actions/`): a page declares what it can be asked to do in its spec, and `window.__hoyos.actions` / `run(id, params)` is the WebMCP surface — see [`docs/reference/surfaces.md`](./docs/reference/surfaces.md). New **`docs/decisions.md`** (append-only engineering decisions). Five components (Icon, Placeholder, Toast, DeviceFrame, PagePreview), a hub-scoped `--ui` scale band for screens up to 4K, and per-frame sessions so a preview never touches the tester's own. Before it: **Conversación CRM y bandeja de mensajes** (0021): `message_log` is the unified communications record (direction, source, subject, body, read receipts, provider id) behind one seam (`src/data/comms.ts`); **M-06** opens on a WhatsApp-style Conversación tab — WhatsApp both ways, emails incl. newsletters and automated sends, internal notes, system events — with filters and a WhatsApp · Email · Nota composer; new **S-06 `/staff/inbox`** two-pane front-desk inbox (unread first, search, filters, "Ver ficha CRM"); the top-bar bell counts unread inbound messages and opens a popover of the latest threads; S-01 shows unread messages and recent conversations; five new components; 69 seeded messages in 17 conversations. Before it: **0.7.1 Polish and code-quality pass** (0020): route-level code splitting (main chunk 2 549 → 796 kB, docs markdown indexed at build time), the UTC date-key bug fixed at the source (`dateKey()` + `npm run test:dates`), dead code and duplicated helpers swept, every shared string through `useT()`, tokens instead of raw CSS values, tenant facts in `src/tenant/`, `$` in both languages, eyebrow contrast ≥ 4.5:1, role-gated links, `document.title` per route, screenshots taken as each surface's demo user with real ids. Before it: **0.7.0 App-store readiness** (0019): `StatTile` values never wrap (measured fit + the phone frame as a CSS container), `deletion_requests` with **C-26** Cuenta y datos (consents, download my data, two-step delete request that keeps invoices anonymised), **W-09** the public deletion URL Google Play requires, **M-11** the admin queue with the anonymisation checklist, `docs/app-store-compliance.md` and manual 23; version shared with 0018 (Integraciones), built the same day. Before it: v0.6.2 **Especiales** (0017): `special_charges` + `space_bookings`, the hand-priced Especial item in S-04, S-05 `/staff/rooms`, manual payroll lines; v0.6.1 the expenses ledger (M-09c and the Balance card on M-09); v0.6.0's public website rebuilt around the brand content (W-01…W-08, P-01), the thin screens deepened (M-02a…M-02d, M-09a/M-09b, S-03, A-06, media slots) and the operations manual rebuilt as 28 bilingual chapters with live data blocks; 48 tables (21 with an access contract); **101 routes, 87 page codes, 0 stubs** (`/#/dev/specs`), 395 captures, 66 components in D-02. Changelog: [`docs/changelog/`](./docs/changelog/) · what is still mocked and what is left: [`ROADMAP.md` §F](./ROADMAP.md).
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
team. One card per surface, each showing the real screen it opens — the committed capture, and the
running page itself in a normal browser — and entering it as that seat's **demo user** (fictional
people, one per role).

| Perspective | Entry route(s) | Who it is for | State (v0.11.2) |
| --- | --- | --- | --- |
| Testing hub | `/#/` | The studio team and the build team: one card per surface with a real capture (and the running page, live, in a normal browser), enter-as buttons for every seat, demo user switcher, dev mode, and a stat strip that counts the system | built (HUB-01) |
| Website | `/#/site` | Everyone, before login: home, about & philosophy, classes, class essay, modalities, schedule, teachers, plans (with the value model explained), contact with a map slot, legal, public account-deletion request | built (W-01…W-09, P-01, A-06) |
| Customer app | `/#/auth/sign-in` → `/#/app` | Members and drop-ins (mobile-first, full-viewport from 900 px — no phone frame): sign in / create account, home + intention, schedule, class, checkout, booking, waitlist, plans, passes, credits, history, profile, rules, FAQ, invite, gift, teachers, events, notifications, account & data (consents, export, delete request) | built (A-01…A-03, A-05, C-01…C-26, C-21, E-01…E-04) |
| Teacher app | `/#/teach` | Teachers (mobile-first, same responsive `AppShell`): my classes, attendance, notes, ratings, the payroll statement read from the finance run, profile | built (S-03) |
| Staff by role | `/#/staff`, `/#/admin` | Front desk, coordinator, admin, finance, super admin, maintenance (desktop-first): role home, message inbox (every customer conversation, WhatsApp-style, with the unread bell), check-in, register & pay, dashboard, tables, CMS, emails, WhatsApp, CRM (conversation, bookings, payments), activity, settings (general, features, payments, communications, branding, content), integrations, finance and teacher payouts, account-deletion queue | built (S-01, S-02, S-04, S-05, S-06, M-01…M-09, M-11, M-02a…M-02d, M-08a…M-08f, M-10, M-09a…M-09c) |
| Operations manual | `/#/manual` | How the club runs in person and in software, by role — ES with EN mirror, **28 chapters in seven parts**, 73 figures per language, live blocks that read the app's own prices, policies and tables, print-friendly; `/#/manual/decisions` lists the 27 things the owner still has to decide | built (K-03, K-04) |
| Documentation | `/#/docs` | Rules, architecture, prompt log (prompt | response), changelog, kanban board, flow map, data model, page docs, screenshots | built (K-02) |
| Developer | `/#/dev/specs`, `/#/dev/tokens`, `/#/dev/components`, `/#/dev/layout/:code`, `/#/dev/knowledgebase`, `/#/dev/canvas`, `/#/dev/simulator` | Spec index with built/stub badges, design tokens (D-01), component library (D-02), layout editor (D-04), knowledgebase (K-01), the page canvas (D-05) and the device simulator (D-06) | built |

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
