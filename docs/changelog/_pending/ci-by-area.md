# CI by area and a shorter release path
Date: 2026-11-18. Tier T3 (release guards). Decision Q1 (owner, 2026-11-18): the release tag is the version.

Intent: a typo or a font change must not wait for the 25-minute Auth checks, and a release must not need a version-bump pull request or run the same checks three times.

- Auth checks (`.github/workflows/auth-checks.yml`, one job, same file and job names): a plan step (`scripts/ci/affected-areas.mjs`, copied verbatim from Company OS `tools/ci`) picks none, fast, areas or all from `scripts/ci/areas.json`; fast runs install, both builds and the static checks; the node-level checks (about 35 s) always run with the fast steps; `scripts/ci/run-areas.mjs` then runs the browser checks of the touched areas (auth, customer, website, admin). All TypeScript under `src/` is shared (the router imports every module eagerly; the import guard `scripts/ci/area-imports.mjs` keeps it so), as are server/, package.json and the workflows: they run everything. CSS, docs and comms templates run the fast steps only. Main is no longer re-checked on push: Cut release checks the exact commit it tags.
- Cut release: no package.json version guard (a lower or equal version is still refused); the checks run the deploy gate plus the areas changed since the last release tagged with `checks: areas-v1`, and the tag carries that line. The first release after this runs every area.
- Version: `RELEASE_TAG` (the tag) is stamped by the release builds into `dist/release.json` (/health) and the Hub; without it the build reports package.json's version.
- Deploy test and Deploy prod reuse a passed Cut release run on the exact commit (`scripts/release-check-reuse.mjs`, from Between Gigs); the build, bundle checks, secret scans and smoke checks always run.
- Every action in the four workflows is pinned to a commit SHA and no checkout keeps credentials.

Tests: `scripts/test-ci-areas.mjs` (no check lost from the old job), `scripts/test-release-check-reuse.mjs`, `scripts/test-release-wiring.mjs` (extended).
