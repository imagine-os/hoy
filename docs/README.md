# HoyOS documentation

Everything about the software lives here and is rendered in-app at `/#/docs` (sidebar tree =
this folder). The club's **operations manual** (how HOY runs, in person and in software) lives in
`ops-manual/` and is rendered at `/#/manual`.

## Start here (current as of 2026-09-29, v0.13.3)
- **Latest work**: [prompt 0032](prompts/0032-manual-content.md) · [changelog 0032](changelog/0032-manual-content.md) — the operations manual rewritten in plain language (28 chapters, ES + EN) against a written [style guide](ops-manual/STYLE.md): screen codes in `EN HOYOS` boxes, editable house rules, studio-rule cards, role passages, the three source documents embedded, six revenue lines, owner decisions reconciled (v0.13.3).
- **Previous**: [prompt 0035](prompts/0035-round-theme-toggle.md) · [changelog 0035](changelog/0035-round-theme-toggle.md) — the light/dark toggle is a circle again: 0025's 44 px floor had stretched the 28 px DesktopShell toggle and the 32 px bell into ovals; one shared `.ctl-round` class (width = height = `--h-ctl`) now draws every theme toggle and the bell as a 44 px circle.
- **Before that**: [prompt 0036](prompts/0036-real-contact.md) · [changelog 0036](changelog/0036-real-contact.md) — the studio's real WhatsApp (+57 312 776 5000) and address (Cl. 7B Sur # 29C-100, El Poblado — Santa María Tenis Club) in `tenant.ts`; M-08a confirms per field, so phone and address render as facts on the site, the app, the legal tokens, the email footer and the manual while email and Instagram stay labelled pending.
- **Also**: [prompt 0031](prompts/0031-manual-lms.md) · [changelog 0031](changelog/0031-manual-lms.md) — the operations manual as a staff LMS: a per-role lens (`?as=<role>`) with "Tu manual", reading progress and the Día 1 / Semana 1 / Mes 1 sign-off; sections and text policies the owner edits in place beside the markdown, with history ([D-0009](decisions.md), [D-0010](decisions.md)); "Pedir un cambio" and K-04 Decisiones y solicitudes; the three source PDFs on K-05 `/#/docs/source` ([D-0011](decisions.md), [`source/`](source/README.md)); stale-capture badges; icons per part and chapter; two new roles, marketing and developer, and a "coming soon" marketing kit in the hub. The chapter rewrite is 0032.
- **Earlier**: [prompt 0034](prompts/0034-site-no-feel-today.md) · [changelog 0034](changelog/0034-site-no-feel-today.md) — the website half of "erase the How do you want to feel today component": W-01's `Movements` section ("¿Cómo quieres sentirte hoy?" and the four stones) is gone from both editions and from the layout editor; movements stay as class labels and the W-04 filter.
  [prompt 0033](prompts/0033-site-wordmark-headings.md) · [changelog 0033](changelog/0033-site-wordmark-headings.md) — the hoy wordmark in the website's display headings: a traced SVG (`public/brand/hoy-wordmark.svg`), `Wordmark vector` / `inline` + `brandHeading(text)`, in the header, footer, W-02 title and the W-07 / W-08 closing panels; paragraphs, buttons and nav stay text ([contact sheet](screenshots/_brand/wordmark-in-headings-2026-09-29.jpg)).
  [prompt 0030](prompts/0030-icons.md) · [changelog 0030](changelog/0030-icons.md) — one icon set (lucide behind the `Icon` atom, 135 names, [D-0008](decisions.md)) across the dock, sidebar, front-desk actions and settings; the daily intention (A-05) is retired and `/app/intention` redirects to `/app`.
  [prompt 0029](prompts/0029-hub-map-sample-routes.md) · [changelog 0029](changelog/0029-hub-map-sample-routes.md) — sample routes in the hub map: the nine template pages carry `sampleRoute` (`/app/class/sample` resolves to today's class in the app), so hosts open detail pages live; `npm run hub-map:check` verifies them (v0.11.2); [prompt 0028](prompts/0028-hub-map-groups.md) · [changelog 0028](changelog/0028-hub-map-groups.md) — page groups in the hub map: every page carries `group` (customer app: Book / Pay / Account / Sign in) so every host splits it the same way, from `HUB_GROUP_RULES` (v0.11.1); [prompt 0027](prompts/0027-hub-map.md) · [changelog 0027](changelog/0027-hub-map.md) — the hub map: `public/hub-map.json` (schema `hoy.hub-map/1`, [reference](reference/hub-map.md)) so aluzina, between-gigs and hoy's own hub each draw the hoy hub through their own lens (v0.11.0); [prompt 0026](prompts/0026-calendar-teacher-mats.md) · [changelog 0026](changelog/0026-calendar-teacher-mats.md) — phone calendar views, the teacher column width, the room-width mat grid (v0.10.1); [changelog 0025](changelog/0025-responsive-app-shell.md) — the responsive app shell (no phone frame on desktop); [changelog 0024](changelog/0024-website-v2-backfill.md) — website V2.1–V2.3, back-filled.
- **Decisions that shape every screen**: [D-0006](decisions.md) — the customer and teacher apps are full-viewport at every width, the phone bezel lives only in the hub's `DeviceFrame` simulator; [D-0007](decisions.md) — the `--ui` large-screen band applies to every surface.
- **Responsive standard**: every page works from **360 px phones to 3840 px 4K TVs** (`BREAKPOINTS` in `src/design/tokens.ts`: 360 · 390 · 768 · 900 · 1280 · 1920 · 2560 · 3840); the app/customer shell switches at **900 px**; every interactive control is at least **44 px** (`--h-ctl`); nothing is hover-only. `PageSpec.checkedAt` records the widths a page was checked at. See `design-system.md` and `architecture.md` (Shells).
- **Live board**: [kanban](kanban.md) (0025 / 0026 follow-ups at the top of Backlog) · machine surfaces: [surfaces](reference/surfaces.md) · the published hub map: [hub-map](reference/hub-map.md).

## Map
| Path | What |
| --- | --- |
| `rules/documentation.md` | The documentation rules: prompt log, changelog, kanban, screenshots. |
| `prompts/NNNN-slug.md` | Every prompt verbatim + the response summary. |
| `changelog/NNNN-slug.md` | K-01 entries: version, date, intent, decision, alternative rejected, files. |
| `kanban.md` | Live board: backlog / doing / done, updated every turn. |
| `decisions.md` | Append-only engineering decisions (`D-NNNN`): context, decision, alternative rejected. Owner decisions live at `/#/manual/decisions`. |
| `reference/surfaces.md` | What a machine can drive: WebMCP (`window.__hoyos`), the `npm run` CLI, the (absent) HTTP API. Date-stamped every pass. |
| `architecture.md` | Folder map, extension points, providers, shells. |
| `roles.md` | Role matrix, demo users, dev mode and "view as". |
| `i18n.md` | String tables, `useT`, fallback rules. |
| `design-system.md` | Tokens (D-01), themes, skins, component library rule (D-02). |
| `data-model.md` | Tables, Supabase mapping, RLS notes, `supabase/schema.sql`. |
| `flow-map.md` | Every canvas code → route, generated by `npm run flow-map` from `screenshots/routes.json`; hand-written dependencies section. |
| `pages/<code>.md` | One doc per routed page code (spec, real vs mock, captures); skeletons from `scripts/gen-page-doc.mjs`. |
| `app-store-compliance.md` | Apple / Google Play rows (account deletion, privacy, payments) marked done / pending / needs dev. |
| `website-vision.md` | The public site's long-term ideas (feeds ROADMAP §G). |
| `screenshots/<code>/` | JPEG captures (q72) produced by `npm run screenshots`, ES/EN × 390/1280, dark for key pages. Plus `thumb-<lang>-desktop[-dark].jpg` (640×400) and `thumb-<lang>-phone[-dark].jpg` (195×422) from `npm run thumbnails` (q64) — the preview images HUB-01 and D-05 display. |
| `ops-manual/` | The club operations manual, 28 bilingual chapters in seven parts (K-03), rendered at `/#/manual`. |

## Conventions
- Markdown, English first with a Spanish summary at the end of each document where it matters
  for the studio team; the operations manual is Spanish first.
- Page codes (`C-01`, `S-02`, …) are the shared vocabulary between canvas, specs, screenshots and docs.
- Numbered files (`0001-…`) are append-only; never renumber.
