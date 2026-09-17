# Documentation rules

These rules are mandatory and are executed **in the same turn as the work**, never later. The
in-app viewer is `/#/docs` (K-02); the knowledgebase tabs are `/#/dev/knowledgebase` (K-01).

## 1. Prompt log (`docs/prompts/`)
- Every prompt that changes the system is stored verbatim as `NNNN-slug.md`, with:
  - **Source** (Slack thread link or "direct"), date, requester role (never personal contact data).
  - **Prompt** — exact text, with Slack `<@U…>` mention tokens removed.
  - **Response** — what was actually built, what was deferred, and links to the changelog entry.
    The heading must be exactly `## Response`: the viewer splits the file there and shows prompt
    and response side by side.
- Follow-up messages in the same thread that change scope get their own numbered file.
- Numbering: take the next free `NNNN` when you commit; if it collides on rebase, renumber yours.

## 2. Changelog (`docs/changelog/`, K-01 format)
Each change: `NNNN-slug.md` with front-matter-like header lines, then optional markdown:
```
version: 0.x.y
date: YYYY-MM-DD
prompt: docs/prompts/NNNN-slug.md
intent: one line
decision: what was done and why
rejected: the alternative considered and why not
files: list of paths or globs
```
Body (below the header) names the page codes touched and links the before/after screenshots
(see §4). `/#/docs/changelog` and `/#/dev/knowledgebase` render entries newest first.

## 3. Kanban (`docs/kanban.md`)
One **lane per team or module** as a `## Heading` (e.g. `## Customer`, `## Docs & content`), with
`### Backlog`, `### Doing`, `### Done` columns underneath; `## Backlog|Doing|Done|Blocked` at the top
level form the shared *General* lane. One `- ` line per card with its page code(s). Move cards in the
same turn as the work. On rebase conflicts keep both sides.

## 4. Screenshots (`docs/screenshots/<code>/`)
- **Every routed page** is captured in **ES and EN**, at **390 px** (mobile) and **1280 px** (desktop).
- **Key pages** (hub `HUB-01`, website home `W-01`, customer home `C-01`, front desk `S-02`, admin
  `M-01`, table manager `M-03`, component library `D-02`, ops manual `K-03`) are also captured in
  **light and dark** (`KEY_PAGES` in `scripts/screenshots.mjs`).
- File name: `docs/screenshots/<code>/<lang>-<width>[-dark].jpg`, e.g. `C-01/es-390.jpg`,
  `M-03/en-1280-dark.jpg`. The folder name is the page code (`/` in a code becomes `_`).
- **Before/after pairs for visual changes**: before touching a screen run
  `npm run screenshots -- --only=/app/schedule --label=before`; after the change run the normal
  pass. The pair (`es-1280-before.jpg` next to `es-1280.jpg`) is linked from the changelog entry.
  Delete `-before` files once the entry that references them is merged and the screen moves on.
- **Referenced from two places**: the page doc `docs/pages/<code>.md` (§5) and the changelog entry
  that introduced or changed the screen. A doc that describes a screen without showing it is
  incomplete. Until a capture exists, write the placeholder `[screenshot: <code> — caption]` on its own
  line; the viewer renders it as a dashed box with the code.
- **Regenerate at the end of every work session** with `npm run screenshots` (Playwright, Chromium
  preinstalled at `/opt/pw-browsers`; never run `playwright install` here). It blocks external
  requests so it works behind the proxy. Commit the JPEGs (quality 72; PNG was rejected as ~3× larger for the same review value) with the change. `npm run screenshots -- --smoke`
  is the fast console-error check (1280/es, no files); `--only=/docs,/manual` limits either mode.
  Since 0.7.1 each route is captured **as the demo user of its surface** (Juliana for `/app`, Camilo for
  `/staff`, Mateo for `/admin`, Sofía with dev mode for `/dev` and `/docs`, the visitor for `/site`; a route
  whose roles exclude that user falls back to the first allowed role), param routes get **real ids** read from
  the seeded mock DB, and the manual cover is saved as `<lang>-<width>-cover.jpg` so the chapter route does
  not overwrite it.
- Browse everything at `/#/docs/screenshots`.

## 5. Page docs (`docs/pages/<code>.md`)
One markdown file per page code, created from `docs/pages/_TEMPLATE.md` (or
`node scripts/gen-page-doc.mjs <code>`, which fills the spec and the image links). It states the
purpose, the route, the roles, the sections in layout order, the data tables, what is real vs mock,
and embeds the four (or eight) screenshots. Update it in the same turn as a visual change.

## 6. Component library and tokens
- New component → `.meta.ts` in the same commit (see `CLAUDE.md`). Every state the screen uses is a
  usage in the meta.
- New token value → `src/design/tokens.ts` only; never a literal in a component.

## 7. Operations manual (`docs/ops-manual/`, K-03)
The manual is markdown on disk; adding or renaming a chapter needs no code change. Rules:
- `es/` is the source, `en/` is the mirror with the **same file name**. A missing EN chapter falls back
  to ES with a notice, so an untranslated chapter is visible, not hidden.
- File name is `NN-slug.md`; the `NN` prefix orders the manual and is the number shown in the UI.
  When a chapter is renumbered, add its old slug to `LEGACY_SLUGS` in `manualIndex.ts` so existing
  links and the screenshot tooling's `:chapter` param keep resolving.
- Front matter is mandatory and has six keys: `title`, `role`, `part` (`I`…`VII`), `version`,
  `updated`, `summary`. `part` groups the chapter on the cover grid and in the sidebar; `summary` is
  the one-line card lead and is searched.
- Reading time, figure count, decision count and placeholder count are **derived from the body** —
  never written into front matter.
- **A number the system owns is never typed into a chapter.** Prices, studio facts, policy values, the
  schema, roles, routes and counts are written as a `{{directive}}` line on its own, rendered by
  `LiveBlock`: `{{pricing[:family]}}`, `{{tenant:hours|contact|capacity}}`, `{{policy[:field]}}`,
  `{{tables}}`, `{{table:<name>}}`, `{{roles}}`, `{{routes:<surface>}}`, `{{stats}}`, `{{kpi:<name>}}`.
  Each block carries the bilingual "Datos en vivo del sistema · Live from the system" caption and an
  unknown directive explains itself instead of breaking the page. A fenced ```live block holding
  `kind:arg` is the same thing spelled out.
- A real capture is a markdown image with a **title**: `![caption](../../screenshots/<CODE>/<lang>-<width>.jpg "CODE · /route")`.
  It renders as a `Figure` — framed, captioned, code-chipped and clickable through to the screen. Pick
  `es-*` captures for ES chapters and `en-*` for EN, `390` for member/teacher flows and `1280` for
  staff/admin. Aim for 3–6 figures in an operational chapter.
- `[screenshot: CODE — caption]` stays the syntax for a screen with **no capture yet**; it renders as a
  dashed box and is counted per chapter, so the gap is visible instead of forgotten.
- Owner decisions are `> DECISIÓN PENDIENTE:` / `> DECISION NEEDED:` on one blockquote line. They are
  extracted into `/#/manual/decisions` (K-04) and `ROADMAP.md` §E, so **do not repeat the same decision
  in two chapters** — flag it once, in the chapter that owns it, and cross-reference from the other.

## 8. Language
Docs for the software: English with a Spanish summary. Ops manual (`docs/ops-manual/`): Spanish first
(`es/`), English mirror (`en/`) with the same file names; pending decisions as `> DECISIÓN PENDIENTE:`
/ `> DECISION NEEDED:` so `/#/manual/decisions` and `ROADMAP.md` can list them.

## 9. Canvas
`reference/canvas/` is frozen reference material. When it changes (rare), re-run
`node scripts/extract-canvas.mjs` and `npm run specs`, and record the delta in
`reference/canvas/CANVAS-AUDIT.md`.

---

**Resumen (ES).** Cada prompt se guarda verbatim con su respuesta; cada cambio tiene entrada de
changelog (versión, fecha, intención, decisión, alternativa, archivos) y mueve tarjetas en el kanban;
cada página se captura en ES/EN a 390 y 1280 px (claro y oscuro en las páginas clave) en
`docs/screenshots/<código>/<idioma>-<ancho>[-dark].jpg`, con pares antes/después para cambios
visuales, y se referencia desde `docs/pages/<código>.md` y el changelog. Todo en el mismo turno.
