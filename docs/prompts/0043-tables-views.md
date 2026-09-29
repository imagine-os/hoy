# Tables system redesign: views, sidebar, graph, ontology, and the road to Supabase

Source: Slack thread (#hoy) · 2026-09-29 · Justin Massion

## Prompt

the tables system can look nicer. right now it looks like its only for developers just based on the font alone. BUt in particular the sidebar with categories can be better and toggleable and stuff. And we can add more view types to the system. Consider airtable, notion are baseline for views and abilities. but i also like graph views personally if it makes sense.

Also, im not sure if ontology is built into all this or necessary or not? Maybe its good, maybe it will make it more complex?

And now this gets into the question of thow this is all prepared for database connection, supabase, and yjs or liveblocks type abilitiies?

## Response

Shipped as **v0.18.0** on branch `feat/tables-views` (from `main` at `cbd9d00`). M-03 no longer reads as a developer console:

- **Human labels first.** Tables, columns and enum values render in words from a bilingual dictionary (`src/data/labels.ts`), in the design-system fonts; the `snake_case` names show only in dev mode behind a toggle. Foreign keys show the title of the row they point at and open it.
- **Sidebar.** Expanded on desktop, a rail when collapsed, a sheet on phones; search, pinned tables, the last five opened and collapsible groups with counts.
- **Views.** Grid, list, gallery, kanban board and graph, with filters, multi-sort, group by, hidden columns and JSON / CSV export; calendar and timeline are visible not-wired placeholders (Pass B2). Every view is linkable through `?id=`, `?view=`, `?v=`, `?focus=` and `?where=`.
- **Graph.** The 57 tables and 83 foreign keys as an SVG graph clustered by group, and a one-hop neighbourhood for any row; the row drawer lists related rows by reverse relation.
- **Saved views are rows** in the new `table_views` table (57 tables now), written through `DataProvider`; sidebar state stays in `localStorage`.
- **Ontology (D-0019):** no separate layer, the schema is the ontology; it gained `kind`, `icon`, `titleColumn` everywhere and column labels, and the graph is derived from the foreign keys.
- **Database connection (D-0020):** views are rows and realtime is Supabase first; Yjs only for documents, Liveblocks not adopted; the order to get there is Pass C in the plan.
- Eleven `tables.*` actions, the real `M03` spec, two new organisms (`KanbanBoard`, `RelationGraph`) and extended `DataTable` and `SegmentedControl`, and captures at 390 / 768 / 1280 / 1920 / 3840.
- Deferred: bilingual labels for every column (B1), calendar and timeline (B2), renaming and deleting saved views, label collision in the table graph around `users`; carded in `docs/kanban.md`.

Plan: `docs/plans/tables-system.md`. Changelog: `docs/changelog/0043-tables-views.md`. Decisions: D-0019, D-0020 in `docs/decisions.md`.

Model routing: Fable 5.1 (plan, decisions, judgement) · Opus 5.5 (schema metadata, views, sidebar, graph, actions) · Sonnet 5.5 (page doc, surfaces, integration).
