version: 0.18.0
date: 2026-09-29
prompt: docs/prompts/0043-tables-views.md
intent: Justin: the tables system looks developer-only (the font alone); the category sidebar should be nicer and toggleable; add view types with Airtable / Notion as the baseline plus a graph view; is an ontology built in or necessary, or does it add complexity; how is all of this prepared for a database connection, Supabase, and Yjs / Liveblocks-type abilities.
decision: (1) **The schema is the ontology (D-0019).** `src/data/schema.ts` gains the metadata the page was missing, not a new layer: `kind` and `icon` per table, `titleColumn` on all 57 tables (16 were added in this pass), `ColumnDef.label?` (ES/EN, empty for now) and `sensitive` (`api_keys.key_hash`), `TABLE_GROUPS` with icon and tone, a humanize dictionary and ~300-term ES/EN vocabulary in `src/data/labels.ts` (`humanizeName`, `columnLabel`, `tableLabel`, `enumLabel`, `biText`, `rowTitle`); reverse relations and the graph layout are derived from the foreign keys in `src/data/relations.ts` (`getRelations` 83 edges, `neighborsOf`, `reverseName`, `schemaGraph`, `layoutGraph`, `dateColumnOf`). (2) **Views are rows; realtime is Supabase first, Yjs only for documents (D-0020).** New table `table_views` (system group; `table_name`, `name` {es,en}, `kind` grid|list|gallery|kanban|calendar|timeline|graph, `config` with filters, sorts, groupBy, hiddenColumns, kanbanColumn and cardFields, `is_default`, `shared`, `created_by`; types `TableViewRow`, `TableViewConfig`, `ViewFilter`, `ViewSort`, `TABLE_VIEW_KINDS`) read and written through `DataProvider`, six seeded views (`src/data/seed/views.ts`), `SEED_VERSION` 7. (3) **M-03 redesigned** (`src/modules/admin/TablesPage.tsx`, `src/modules/admin/tables/*`, `tables.css`): human labels in the design-system fonts (Inter headings, DM Sans body) with the technical names as a dev toggle; a sidebar that is expanded on desktop, a rail when collapsed and a sheet on phones, with pinned tables, recent tables, search and collapsible groups; a header with icon, label, description and counts; a view switcher (grid, list, gallery, kanban, graph; calendar and timeline as not-wired placeholders); a toolbar with filters, multi-sort, group by and hidden columns; saved views as `table_views` rows; FK cells show the referenced row's title; a row drawer with related rows by reverse relation; `api_keys.key_hash` hidden for read-only roles. (4) **Graph view**: the schema graph (57 nodes, 83 edges, clustered by group) and a record neighbourhood, SVG, keyboard and pointer zoom / pan. (5) An `M03` spec in `src/modules/admin/specs.ts` with real `data`, `layout`, `states`, `checkedAt`; eleven `tables.*` actions in `src/modules/admin/actions.ts`; the hub map tool purpose updated. (6) Plan `docs/plans/tables-system.md` — passes A (this PR) → B (polish) → C (connection) as a dependency graph with a model per task.
rejected: (1) A standalone ontology layer (classes, typed predicates, inference) — a second place to define the same things and a second language for humans; Airtable and Notion expose none; foreign keys and `titleColumn` give the graph everything (D-0019). (2) Liveblocks as a new vendor for presence / storage — Supabase Realtime presence is preferred per ROADMAP P7; revisit only if presence UX later needs it (D-0020). (3) Building calendar and timeline views in this pass — they need date-column semantics per table and are Pass B (B2); they ship now as visible not-wired placeholders so the view switcher is complete. (4) A CRDT for row data — bookings and payments are rows with rules, not documents; optimistic `version` + Notice is the right tool.
files: docs/data-model.md; docs/screenshots/M-03/*; docs/screenshots/_tables/*; docs/screenshots/routes.json; public/hub-map.json; scripts/spacing-baseline.json; src/components/atom/Icon/Icon.tsx; src/components/molecule/SegmentedControl/SegmentedControl.css; src/components/molecule/SegmentedControl/SegmentedControl.meta.ts; src/components/molecule/SegmentedControl/SegmentedControl.tsx; src/components/organism/DataTable/DataTable.css; src/components/organism/DataTable/DataTable.meta.ts; src/components/organism/DataTable/DataTable.tsx; src/components/organism/KanbanBoard/KanbanBoard.css; src/components/organism/KanbanBoard/KanbanBoard.meta.ts; src/components/organism/KanbanBoard/KanbanBoard.tsx; src/components/organism/RelationGraph/RelationGraph.css; src/components/organism/RelationGraph/RelationGraph.meta.ts; src/components/organism/RelationGraph/RelationGraph.tsx; src/data/MockProvider.ts; src/data/labels.ts; src/data/relations.ts; src/data/schema.ts; src/data/seed/index.ts; src/data/seed/views.ts; src/hub/hubMap.data.ts; src/i18n/core.ts; src/modules/admin/TablesPage.tsx; src/modules/admin/actions.ts; src/modules/admin/index.ts; src/modules/admin/specs.ts; src/modules/admin/strings.ts; src/modules/admin/tables.css; src/modules/admin/tables/GraphView.tsx; src/modules/admin/tables/Panels.tsx; src/modules/admin/tables/RowDrawer.tsx; src/modules/admin/tables/SchemaView.tsx; src/modules/admin/tables/TablesSidebar.tsx; src/modules/admin/tables/Views.tsx; src/modules/admin/tables/cells.tsx; src/modules/admin/tables/model.ts; src/modules/admin/tables/prefs.ts; supabase/schema.sql; docs/pages/M-03.md; docs/reference/surfaces.md; docs/plans/tables-system.md; docs/decisions.md; docs/kanban.md; docs/README.md; ROADMAP.md; docs/prompts/0043-tables-views.md; docs/changelog/0043-tables-views.md; package.json; package-lock.json
codes: M-03

Model routing: Fable 5.1 (plan, decisions, judgement) · Opus 5.5 (schema metadata, views, sidebar, graph, actions) · Sonnet 5.5 (page doc, surfaces, integration).

Checks: build green (~31 s) · tsc 0 errors · lint:spacing baseline lowered 63 → 61 · manual-lint 0 · hub-map valid · smoke (`npm run screenshots -- --smoke`) no console errors · screenshots M-03 390 / 768 / 1280 / 1920 / 3840 in ES and EN, light and dark.

## Why

The tables page is where every other page's data becomes visible, and it read as a developer console: every word a
person saw was a raw identifier in the mono font, foreign keys were ids, and there was one view of everything. Justin
wants it to look like a product — Airtable / Notion as the baseline for views and abilities, a graph view because
relations are the interesting part — and asked two architecture questions on the way: whether an ontology belongs in
this, and how ready the whole thing is for Supabase and realtime co-editing. The plan answers both before the build
starts (`docs/plans/tables-system.md`).

## What changed

- **Human labels first.** Table and column names render from `label` (ES/EN) in the design-system fonts; the raw
  `snake_case` names appear as a secondary line only when the dev toggle is on. Group labels were already bilingual;
  every column now has a humanized fallback (`src/data/labels.ts`, ~300-term ES/EN dictionary) until Pass B fills the real
  `ColumnDef.label` values (the field exists and is empty for now). The `technical` toggle (default on in dev mode, and only
  visible in dev mode) lives in `localStorage['hoyos.tables.prefs']`. Exports (JSON, CSV) keep the raw column names and
  raw values.
- **Sidebar.** Three states — expanded (desktop default), rail (icons + counts, toggle in the header, remembered per
  viewer) and sheet (phones, opened from the header). Pinned tables at the top, the five most recent tables next, a search box, collapsible groups (accordion) with counts, a
  provider footer, and reset demo data behind a design-system dialog. Keyboard: arrow keys move, Enter opens, Escape closes
  the sheet; 44 px targets throughout. State in `hoyos.tables.prefs`.
- **Header.** Table icon, label, description, row and column counts, the provider name, the view switcher and the
  primary actions (new row, export as JSON or CSV, the schema toggle). Reset demo data moved to the sidebar footer, behind a
  design-system dialog instead of `window.confirm`.
- **View switcher.** Grid · List · Gallery · Kanban · Graph. Calendar and Timeline are present as `<Placeholder>`
  entries (disabled with a hint on tables without a date column; "not wired yet" until B2). Kanban (new `KanbanBoard`
  organism, dnd-kit pointer or keyboard plus a "Move to…" select on every card) groups by any enum or boolean column;
  gallery uses `titleColumn` and the first media / text columns. `SegmentedControl` gained `icon`, `disabled`, `hint`,
  `placeholder` and `compact`.
- **Toolbar.** Filter builder (operators by column type), multi-sort, group by, columns (show, hide, reorder), search, JSON / CSV
  export, new row and the schema toggle, with filter chips. The state is saved as a `table_views` row from the saved-views
  menu. `DataTable` gained `hiddenColumns`, `groupBy`, `multiSort`, `sorts` / `onSortsChange`, `onCellRender` and
  `column.sortValue`; its pager buttons are now 44 px. URL params make a view linkable: `?id=`, `?view=`, `?v=`, `?focus=`,
  `?where=column:value`.
- **Cells.** FK cells show the referenced row's `titleColumn` value with the id in the tooltip and navigate to that row
  (the old `?id=` that nothing read is now honoured by the drawer). Money, dates, booleans and enums keep their
  formatting; JSON stays mono. `sensitive` columns (`api_keys.key_hash`) are hidden for roles with `tables.read` only.
- **Drawer.** The row editor keeps its per-type controls and adds a "Related" section: one list per reverse relation
  (a `users` row shows its bookings, memberships, payments…), each with a count and a link, plus FK pickers by title (search
  above 50 rows), ES / EN inputs for bilingual `json` columns, a *System fields* group, "Show in the graph" and an in-product
  delete confirm.
- **Graph view.** Schema mode draws the 57 tables as nodes clustered and coloured by group with the 83 foreign keys as
  edges; record mode draws one row and its neighbourhood one hop out. New `RelationGraph` organism: SVG, zoom buttons and
  `+` `−` `0` keys, pan by drag or arrow keys, focusable nodes, click or Enter opens, legend by group.
- **Spec and actions.** `M03` in `src/modules/admin/specs.ts` replaces the canvas spec (closes ROADMAP §F 26 for
  M-03): real `data` (`table_views` + the schema registry), `layout`, `states`, `checkedAt`. Eleven actions
  with ES/EN intents: `tables.open`, `tables.openRow`, `tables.setView`, `tables.search`, `tables.filter`, `tables.newRow`,
  `tables.export`, `tables.toggleSidebar`, `tables.saveView`, `tables.pin` (`tables.read` / `tables.write`) and
  `tables.toggleTechnicalNames` (`dev.tools`). About 150 `admin.tables.*` strings in ES and EN, and the core keys
  `core.common.previous/next`, `core.graph.*`, `core.kanban.*`.
- **Data.** `TableDef.kind` / `icon`, `ColumnDef.label` / `sensitive`, `titleColumn` completed on every table,
  `table_views` (system group) with six seeded views, `SEED_VERSION` 7 (was 6), `npm run sql` regenerated
  `supabase/schema.sql` and `docs/data-model.md`. The schema now has **57 tables** (56 before). The hub map tool purpose
  reads "El gestor de datos con vistas: cuadrícula, lista, galería, tablero y grafo." and `public/hub-map.json` was
  regenerated.

## Ontology answer

No separate ontology: the schema already is one (typed tables, groups, foreign keys, titles); this pass adds the
metadata it lacked (kind, icon, per-column labels, derived reverse relations) and the graph view reads foreign keys.
People see labels, icons and relations, never classes or predicates — see [D-0019](../decisions.md) and the
"Ontology: recommendation" section of [the plan](../plans/tables-system.md).

## Connection answer

The provider seam, per-row ids / `tenant_id` / timestamps, `subscribe()` and the generated SQL with RLS helpers are in
place; missing are auth, RLS on the 26 tables that lack `rls`, a `version` field, the real adapter, offline and presence. The order is Pass
C in the plan (C1 version + optimistic concurrency and C2 RLS can start today; C4 the adapter needs a Supabase project
from Justin). Yjs only for long-text co-editing, Liveblocks not adopted — see [D-0020](../decisions.md) and the
"Database connection, Supabase, Yjs / Liveblocks" section of [the plan](../plans/tables-system.md).

## Before / after

Before (captured at the start of the pass on `/admin/tables/class_sessions`): `docs/screenshots/M-03/es-390-before.jpg`,
`en-390-before.jpg`, `es-1280-before.jpg`, `en-1280-before.jpg`, `es-3840-before.jpg`, `en-3840-before.jpg` and the
`-dark-before` set. After: `docs/screenshots/M-03/{es,en}-{390,768,1280,1920,3840}.jpg` and the `-dark` set (plus desktop thumbs). Contact sheets: `docs/screenshots/_tables/0043-before-after-390.png`,
`docs/screenshots/_tables/0043-before-after-1280.png`, `docs/screenshots/_tables/0043-graph-1280.jpg`,
`docs/screenshots/_tables/0043-kanban-1280.jpg`. (the `-before` files are deleted once this entry is merged and the
screen moves on, per `docs/rules/documentation.md` §4)

## Follow-ups

Pass B (polish): B1 bilingual `label` for every column and enum value (Sonnet) · B2 calendar + timeline views (Opus) ·
B3 form view (Opus) · B4 inline cell editing + keyboard column resize / reorder (Opus) · B5 record-graph polish: expand
neighbours, path between two rows (Opus) · B6 view sharing UI + per-role default views (Opus) · B7 QA matrix 360 → 3840,
all inputs (Sonnet).

Pass C (connection): C1 `version` in `BASE_COLUMNS` + optimistic concurrency with a Notice (Opus) · C2 `TableDef.rls`
for the 26 tables missing it (Sonnet, Fable review) · C3 auth model doc: Supabase Auth ↔ `users` / `user_roles`,
`tenant_id` claim, role switcher → real sign-in (Fable) · C4 `SupabaseProvider` (Opus; needs C1–C3 and a Supabase
project from Justin) · C5 provider switch by env + Connection panel in dev tools (Opus) · C6 presence on M-03 and the
editors (Opus) · C7 offline write queue with the version check (Opus) · C8 documents co-editing with Yjs only if the
team edits text together — decide then (Fable) · C9 `locations` table once `multipleLocations` is on (Opus). All
carded in `docs/kanban.md`; dependencies in `docs/plans/tables-system.md`.

Loose ends of this pass (carded as "0043 follow-up" in `docs/kanban.md`): full-page captures cut the sticky tables sidebar
at viewport height (capture script, Sonnet) · at 1280 with both sidebars the view switcher shows labels only on the active
option and the toolbar wraps (Opus) · the table-level graph overlaps labels around `users` (44 incoming foreign keys) and
needs label-collision avoidance (Opus) · enum badges use one Spanish gender form until per-column and per-enum labels land in
B1 (Sonnet) · the seeded `class_sessions` view "Próximas clases" is filtered to `scheduled`, so captures show a filtered grid;
decide whether default views should filter (Fable) · saved views cannot be renamed or deleted in the UI yet (Opus) · exports
use raw names, an optional human-label export is open (Opus).
