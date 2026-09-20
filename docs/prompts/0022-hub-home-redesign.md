# 0022 — Hub home redesign

**Source** Slack #hoy-welness-club, 2026-09-20 20:49 UTC · **Requester role** owner

## Prompt

Reference this hub home page. it has thumbnail images and things like that for the customer/tenant which in this case is a law firm. imagine-os.github.io/cal-tenant-law

We need a better hub home page for hoy please.

## Response

**HUB-01 `/#/` was rebuilt around the one thing the reference does that we did not: it shows the product instead of describing it.** Every card now carries a real capture of the screen it opens, and on a real browser the first six of them quietly become the running page inside a scaled device frame.

**What was built**

- **HUB-01, from scratch.** A deep-blue brand band (wordmark, `v0.9.0` badge, language, theme, and for a super admin the wireframe and dev-mode switches, all on cream with a cream focus ring) holding the hero — `HOY Wellness Center · Medellín`, "HoyOS · hub de pruebas", the one-sentence lead, the brand tagline *Todo empieza HOY.* and the `BreathingRings` art under a radial mask. A floating session bar rides the band edge with the `RoleSwitcher` and a "Reportar un problema" control that is honestly marked as not wired. Then four bands, each a 3fr/9fr header + grid: **Fuera del estudio** (customer app featured full width with a phone preview, website, teacher app), **El equipo** (front desk, inbox, caja, admin, CRM, finanzas — six cards, each "Entrar como <demo person>"), **Construcción y pruebas** on a tinted lane (manual, docs, kanban, dev tools) and the **Hub de pruebas** row of nine tool cards (canvas, simulator, specs, layout editor, tables, components, tokens, decisions, screenshots). A `<dl>` stat strip counts the system live — routes, page codes, tables, components, actions, manual chapters — over the footer line.
- **Previews, in three layers** (`organism/PagePreview`): a hue-tinted idle tile, the real capture from `docs/screenshots/<code>/thumb-*` (eager, `object-fit: cover`, hidden on error), and a live `organism/DeviceFrame` — the real route in a same-origin iframe at a device viewport, scaled by a `ResizeObserver` — gated by an `IntersectionObserver`, a budget of six frames in document order, and never inside a frame, with `live=0`, or under automation.
- **Per-frame sessions** (`src/app/frameSession.ts`): a preview runs as another role, language and theme by shadowing three `localStorage` keys, so a tester's own session is never touched.
- **An actions registry** (`src/actions/`): `PageSpec.actions` declares what a page can be asked to do, `useActions()` mounts the handlers, and `window.__hoyos.actions` / `window.__hoyos.run(id, params)` is the WebMCP surface — and the vocabulary the voice controller will speak. HUB-01 declares and wires eight.
- **Five shared components with metas** — `atom/Icon` (29 inline stroke glyphs), `atom/Placeholder`, `molecule/Toast`, `organism/DeviceFrame`, `organism/PagePreview` — and two new dev routes: **D-05 `/dev/canvas`**, the whole product as capture tiles grouped by surface with a four-step zoom, and **D-06 `/dev/simulator`**, any route on phone / tablet / desktop / 4K TV as any role, with the whole view in the URL.
- **Scale**: a hub-scoped `--ui` step (1 · 1.125 at 1920 · 1.375 at 2560 · 1.75 at 3840) multiplies type, medallions, padding and the grid width, so the page reads from ten feet on a 4K TV.

**What was deferred** (kanban): a global `--ui` scale for every surface, not only the hub · `scripts/screenshots.mjs --state=` so a live preview can be captured mid-interaction · remote / gamepad d-pad focus on the hub · the voice controller over `window.__hoyos.run` · in-product annotations behind the "Reportar un problema" placeholder.

**Models.** Lead **Fable 5.1** — architecture, the decisions below, review. **Opus 5** — the hub, the five components, the frame session, the actions registry, D-05 and D-06. **Sonnet 5** — the thumbnail generator (`npm run thumbnails`), the first screenshot pass and the QA matrix script. The final QA, review follow-ups and commit pass (the full capture pass, the hub matrix at seven widths, the review fixes and the six commits) was run by **Opus 5**, not Sonnet.

**Changelog** `docs/changelog/0022-hub-home-redesign.md` · **Decisions** `docs/decisions.md` D-0001…D-0005 · **Surfaces** `docs/reference/surfaces.md`.

---
**Resumen (ES).** El hub dejó de describir el sistema y pasó a mostrarlo: cada tarjeta lleva la captura real de la pantalla que abre y, en un navegador de verdad, las seis primeras se convierten en la página en vivo. Se añadieron el lienzo de páginas (D-05), el simulador de dispositivos (D-06), el registro de acciones (WebMCP) y cinco componentes nuevos.
