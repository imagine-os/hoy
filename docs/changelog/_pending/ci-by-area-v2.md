# CI by area v2: TypeScript runs only the areas that import it
Date: 2026-11-18. Tier T3 (release guards). Decision (owner, 2026-11-18): narrow by the import graph.

Intent: a change to one module's page or copy must not run every browser check (about 25 minutes).

- `scripts/ci/*.mjs` are v2 (copied verbatim from Company OS `tools/ci`). `scripts/ci/areas.json` is version 2: `src/**/*.{ts,tsx}` is no longer shared but `graph.sources`, classified by its importers (the reverse import closure over the base and head trees).
- Seams: each module index's lazy page imports, so a file that only module pages import reaches only those modules. The registry's eager glob of every module index is not a seam: `App` merges every module's strings into one dictionary that any page reads by key, so a module's index, strings and route list still run everything (review round 1).
- Entries: each area lists the modules whose routes its browser checks visit (checked by `scripts/test-ci-areas.mjs` from the routes in each module's `index.ts`), plus its own surface. Because the auth checks sign in to almost every surface, most module changes still run three or four areas.
- Roots: anything the app shell (`src/app/**`, `src/main.tsx`) or sign-in (`src/auth/**`) imports still runs every check, as does a file that reaches no entry or a page no entry lists.
- `graph.dynamic` declares `scripts/test-route-connectivity.mjs` (it bundles module files with esbuild) as loading nothing the walk must follow. That holds because it runs in every area, and the test checks it.
- `scripts/test-ci-areas.mjs` now also expects `graphProblems` to be empty (no import the walk cannot see) and pins where module pages, strings and the shell land.
- Build generators that read `src/` (`scripts/gen-{actions,sql,tokens}.mjs`) are shared. Harnesses no area script uses, ambient `.d.ts` files and the node-level tests outside the old job are fast.
- Cut release writes `checks: areas-v2`. The first release after this finds only v1-marked tags and runs every area.

Replay (Company OS `tools/ci/replay.mjs`, last 15 merges to main): as merged, 0 of 15 narrow, because each also changed a workflow, the lockfile or a CI script. Of the last 15 merges that touched `src/`, the `src/` part narrows in 2, and area script runs drop from 240 to 233. Real gains need per-module strings and checks that stay on one surface; see the Company OS PR.
