# CI by area v2: TypeScript runs only the areas that import it
Date: 2026-11-18. Tier T3 (release guards). Decisions (owner, 2026-11-18): narrow by the import graph; a seam may cut an eager `import.meta.glob` when every file it cuts to is an area entry.

Intent: a change to one module's page or copy must not run every browser check (about 25 minutes).

- `scripts/ci/*.mjs` are v2 (copied verbatim from Company OS `tools/ci`). `scripts/ci/areas.json` is version 2: `src/**/*.{ts,tsx}` is no longer shared but `graph.sources`, classified by its importers (the reverse import closure over the base and head trees).
- Seams: the registry's eager glob of every `src/modules/*/index.ts`, and each module index's lazy page imports. So a file that only module pages import reaches only that module.
- Entries map modules to areas by the surfaces their routes declare: customer → customer; admin, staff and teacher → admin; public → website; sign-in, docs, manual and dev → auth. docs, manual, customer and identity also map to website.
- Roots: anything the app shell (`src/app/**`, `src/main.tsx`) or sign-in (`src/auth/**`) imports still runs every check, as does a file that reaches no entry.
- `scripts/test-ci-areas.mjs` now also expects `graphProblems` to be empty (no import the walk cannot see) and pins where module pages, strings and the shell land.
- Build generators that read `src/` (`scripts/gen-{actions,sql,tokens}.mjs`) are shared. Harnesses no area script uses, ambient `.d.ts` files and the node-level tests outside the old job are fast.
- Cut release writes `checks: areas-v2`. The first release after this finds only v1-marked tags and runs every area.

Replay (Company OS `tools/ci/replay.mjs`, last 15 merges to main): as merged, 0 of 15 narrow, because each also changed a workflow, the lockfile or a CI script. Of the last 15 merges that touched `src/`, the `src/` part narrows in 9, and area script runs drop from 240 to 178.
