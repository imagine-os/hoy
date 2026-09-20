# Engineering decisions

Append-only. One `### D-NNNN — title` block per decision, newest at the bottom, never renumbered and
never rewritten: a decision that stops being true gets a **new** block that supersedes it, with the
old one left in place and marked. Product and studio decisions the owner still has to make live
elsewhere — `/#/manual/decisions` (K-04) and `ROADMAP.md` §E; this file is about how the software is
built. Changelog entries (`docs/changelog/NNNN-*.md`) carry the full reasoning for a change; this is
the short, citable index.

Fields: **Date**, **Status** (accepted · superseded by D-NNNN), **Context**, **Decision**,
**Alternative rejected**.

---

### D-0001 — Previews are real captures with a capped live-iframe upgrade

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** HUB-01 had to show what each surface looks like. The reference hub (cal-tenant-law)
  renders every card as a live iframe; with the twenty-odd surfaces HoyOS has, that boots twenty
  copies of the app on the first screen a tester ever opens, and a screenshot then captures whatever
  happened to finish loading.
- **Decision.** Two layers, static first. Every preview shows a committed JPEG capture
  (`docs/screenshots/<code>/thumb-*`, produced by `npm run thumbnails`) over a hue-tinted idle tile,
  loaded eagerly. On top of that, `PagePreview` upgrades to the running page in a `DeviceFrame` when
  the card is on screen (`IntersectionObserver`, 160 px margin) and a `LivePreviewBudget` of **six
  frames in document order** has a slot. Live frames are off entirely when the hub is itself framed,
  when the URL carries `live=0`, and under `navigator.webdriver` — so a capture is deterministic.
- **Alternative rejected.** Live iframes only (unusable on a phone, non-deterministic captures) and
  static thumbnails only (honest but dead — a testing hub should let you see the thing run).

### D-0002 — The actions registry is the WebMCP surface

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** Pages have to declare what they can be asked to do — for an agent today (MCP / WebMCP)
  and for the voice controller later — without every page inventing its own protocol, and without an
  agent having to open a page to learn that the page exists.
- **Decision.** `ActionDef { id, label{es,en}, intent{es,en}, params?, permission? }` in
  `src/actions/types.ts`. A page **declares** its actions in its `PageSpec.actions` and **mounts**
  handlers for the same ids with `useActions(spec, handlers)`. `listActions()` walks every routed
  spec, so the whole vocabulary is readable from any page, each entry carrying its page code, route
  and a live `mounted` flag; `run(id, params)` returns `{ ok, message }` and never throws.
  `window.__hoyos.actions` (a getter) and `window.__hoyos.run` are the public surface, documented in
  `docs/reference/surfaces.md`. The `id` is `<page>.<verb>` and is treated as stable; `intent` is the
  phrase a person would say, which is what the voice vocabulary will be built from.
  `permission` is advisory metadata for agents; each gated handler enforces its own role check today
  (`hub.toggleDevMode` and `hub.toggleWireframe` throw `requires super_admin`, so `run()` returns
  `{ ok: false }`), and server-side enforcement comes with the proxy.
- **Alternative rejected.** Registering handlers only (no declaration), which makes the vocabulary
  depend on what is currently open; and a DOM-annotation scheme (`data-action` attributes), which
  cannot carry bilingual intents, parameter types or permissions.

### D-0003 — Spanish stays the primary language

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** The rebuilt hub was the moment to revisit it: the engineering docs are English-first,
  and the reference hub is English.
- **Decision.** Spanish stays the source. `<html lang="es">` by default, every string is `{ es, en }`
  with `es` required and `en` falling back to it, and copy is written in Spanish first and then
  translated. The studio team in Medellín reads Spanish; English is for the owner, the docs and
  future tenants. The language toggle is on the hub's brand band, not buried.
- **Alternative rejected.** Flipping to English-first now that the system has more English
  documentation than Spanish UI — it would make the people who actually use the software second-class
  readers of their own tool.

### D-0004 — Large-screen scale is a hub-scoped `--ui` band; global scaling is deferred

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** The quality bar is phone to 4K TV, legible at ten feet and usable as a desk monitor.
  At 3840 px a 1120 px content column with 16 px body text is a thin, unreadable strip.
- **Decision.** One variable scoped to the hub: `.hub { --ui: 1 }`, `1.125` at ≥ 1920, `1.375` at
  ≥ 2560, `1.75` at ≥ 3840, multiplied into the hub's type sizes, medallions, padding, gaps and grid
  max-width. CSS does the scaling; `useUiScale()` reads the value in JS only where CSS cannot help —
  the cap on the phone preview's device scale. The pattern is proven on one surface before it is
  applied to all of them.
- **Alternative rejected.** Scaling the root font size globally at those breakpoints — it changes all
  101 routes at once in a pass nobody can review, and every hard-coded `px` in the system (frames,
  icon sizes, the phone shell) would drift out of proportion with it.

### D-0005 — Thumbnails ship as committed JPEGs, generated by the screenshot pass

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** The previews need an image per page code, per language, per theme, available offline
  and on GitHub Pages, and reviewable in a diff.
- **Decision.** `npm run thumbnails` (`scripts/screenshots.mjs --thumbs`) writes
  `docs/screenshots/<CODE>/thumb-<lang>-desktop[-dark].jpg` at **640 × 400** (1280 × 800 viewport,
  `deviceScaleFactor` 0.5, not full-page) and, for phone surfaces, `thumb-<lang>-phone[-dark].jpg` at
  **195 × 422** — **JPEG quality 64**, committed with the change. `src/app/thumbnails.ts` resolves the
  best match (exact language + theme → light → Spanish → any capture of that code) and the map of
  URLs lives in `src/app/thumbnailMap.ts`, imported dynamically so ~490 asset URLs stay out of the
  entry chunk.
- **Alternative rejected.** Generating thumbnails at build time from the full-size captures (another
  image toolchain in the build for something the screenshot pass already has a browser open for), and
  rendering the card art as CSS/SVG mock-ups (pretty, and a lie the moment a screen changes).

---
**Resumen (ES).** Este archivo es la lista corta y citable de las decisiones de ingeniería, una por
bloque, solo se añade: una decisión que deja de ser cierta se reemplaza con un bloque nuevo, nunca
borrando el viejo. Las decisiones que todavía tiene que tomar el estudio están en `/#/manual/decisions`.
