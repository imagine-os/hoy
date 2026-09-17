# 0004 — Docs, content and canvas track (parallel worker)

- **Source**: coordinator brief (same Slack thread as 0001), delegated to a parallel worker
- **Date**: 2026-09-17
- **Requester**: build coordinator on behalf of the studio project lead
- **Changelog**: `docs/changelog/0004-docs-content-canvas.md`

## Prompt (summarised — the brief was a task list, not user prose)

Integrate documentation and content into the HoyOS repo while two other workers build the customer
and staff/admin modules in parallel; do not touch their folders. Work in a git worktree.

1. **Operations manual** — copy the 11 ES and 11 EN chapters into `docs/ops-manual/{es,en}`; make
   `/#/manual` a real bilingual viewer: chapter sidebar from front-matter titles, follows the app
   language (ES default, EN mirror), `MarkdownViewer` rendering, `DECISIÓN PENDIENTE` blocks as
   highlighted callouts, `[screenshot: …]` placeholders as dashed boxes with the code, prev/next,
   print CSS, plus a "Decisions pending" summary page auto-extracted from the markdown. Extend K-03.
2. **Canvas** — replace the canvas with the corrected v1.5 copy, keep `support.js`, add
   `CANVAS-AUDIT.md` and `docs/flow-map.md` (every code linked to its route), regenerate `specs.json`
   and `strings.json` the way the originals were made, `npm run specs` (C-02b, C-14, C-15 separate,
   C-07b removed — keep a compatibility alias if a stub still references it).
3. **Docs viewer** — grouped sidebar (Rules, Architecture, Prompts, Changelog, Kanban, Flow map, Data
   model, Screenshots), kanban as columns, changelog newest first, prompt and response side by side,
   images resolving under `./` base. Extend K-02.
4. **Screenshot rules and pipeline** — every page ES+EN, 390 and 1280, light/dark for key pages,
   before/after pairs, referenced from page doc and changelog, regenerated every session, stored as
   `docs/screenshots/<code>/<lang>-<width>[-dark].png`; add a `docs/pages/<code>.md` generator or
   template. Do not run the full pass yet.
5. **ROADMAP.md** — where we are, dependency-ordered phases P1–P7 with "depends on" and
   "parallelizable with", definition of done, 10-line how-to, open decisions for the owner (manual
   flags + canvas audit recommendations, deduplicated), under ~250 lines, English with Spanish summary.
6. **README.md** — testing hub, seven perspectives, how to run, links.
7. **Docs for this session** — changelog 0004 (K-01 format, 0.2.0), this prompt file, a "Docs &
   content" kanban lane, and the canvas audit recommendations as To-do cards.

Verify: `npm run build` zero TS errors; `npm run screenshots -- --smoke` exits 0 for `/docs`,
`/manual`, `/dev/knowledgebase`. Conventional Commits; rebase on `origin/main` and push to `main`
(kanban conflicts: keep both sides). Never force-push.

## Response

**Landed (v0.2.0):**

- **Operations manual (K-03)** — `src/modules/ops-manual/` rewritten: `manualIndex.ts` globs
  `docs/ops-manual/{es,en}/*.md`, parses front matter (title, role, version, updated), extracts
  decisions and screenshot placeholders; `ManualPage` (sidebar with numbered chapters + role, meta
  row, MarkdownViewer, prev/next, print button, mobile chapter picker), `DecisionsPage` (**K-04**,
  `/manual/decisions`, 17 decisions grouped by chapter with section context and chapter links),
  `manual.css` with print rules that hide the shell chrome. EN chapter missing → ES fallback with a note.
- **MarkdownViewer (shared, D-02)** — callouts for `DECISIÓN PENDIENTE` / `DECISION NEEDED`, `NOTE`,
  `WARNING`; `[screenshot: CODE — caption]` → dashed placeholder box (kept through react-markdown's URL
  sanitiser with a `urlTransform`); optional `components` prop; meta updated with the new states.
- **Canvas v1.5** — `reference/canvas/Hoy Wellness System.dc.html` replaced; `CANVAS-AUDIT.md` added;
  `scripts/extract-canvas.mjs` evaluates the canvas `Component` class and writes `specs.json` (50 codes)
  and `strings.json` (882 pairs; the old regex pass had 871 with 10 spurious keys and 15 missing);
  `gen-specs.mjs` gained ES names for C-02b/C-14/C-15 and compatibility aliases for `C-07b` (→ C-07)
  and `'C-14 / C-15'` (→ C-14), excluded from `canvasCodes`; `canvasSpecs.ts` regenerated (52 keys).
  `docs/flow-map.md` has a Route column linking 42 codes to their hash routes; 9 marked not routed yet.
- **Docs viewer (K-02)** — grouped sidebar (Overview, Rules, Architecture, Data model, Flow map,
  Kanban, Changelog, Prompts, Pages, Screenshots, Manual), `views.tsx` with `KanbanBoard`
  (lanes × columns parser), `ChangelogList`/`ChangelogEntry` (newest first, header as definition
  grid), `PromptEntry` (split at `## Response`, two columns), `ScreenshotGallery`; index pages at
  `/docs/changelog`, `/docs/prompts`, `/docs/screenshots`; mobile picker. `KnowledgebasePage` reuses the
  same renderers.
- **Screenshot rules and pipeline** — `docs/rules/documentation.md` rewritten (§4 screenshots, §5 page
  docs, §8 canvas); `scripts/screenshots.mjs`: new naming `<lang>-<width>[-dark][-label].png`,
  `--only=` and `--label=before|after`, key pages now include S-02, M-01, K-03, spec-name map read from
  every `specs.ts`, importable `routes()`; `docs/pages/_TEMPLATE.md`, `docs/pages/README.md`,
  `scripts/gen-page-doc.mjs <code>`.
- **ROADMAP.md** (165 lines) and **README.md** rewritten; `docs/ops-manual/README.md` now documents the
  conventions; `reference/README.md` updated.
- **Docs** — this file, changelog 0004, kanban lane "Docs & content" with the 7 audit recommendation
  cards in Backlog.

**Verified**: `npm run build` zero TS errors; `npm run screenshots -- --smoke` exits 0 for all routes
including `/docs`, `/manual`, `/manual/decisions`, `/dev/knowledgebase`.

**Deferred / follow-ups**: full screenshot pass and `docs/pages/*.md` for every code (coordinator
triggers after the parallel passes merge); removing the C-07b and 'C-14 / C-15' aliases once the
customer stubs are replaced; resolving the 17 owner decisions; closing the audit recommendation cards.
