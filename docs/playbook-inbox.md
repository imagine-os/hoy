# Playbook inbox (this repository)

What the delivery playbook got wrong, missed or made slow, noticed while working here. One line per observation, the same day; link the line from the pull request's `Playbook inbox:` line. Lines move into Company OS `docs/playbook/INBOX.md` at each retrospective.

| Date | Where | What happened | Suggested change |
|---|---|---|---|
| 2026-11-18 | CI by area (Hoy) | The import guard (area-imports) makes all of `src/` shared here: the router eagerly globs every module's `index.ts`, each reaches its `pages.ts`, and `lazy(() => import(...))` counts as an import. A copy typo in a `strings.ts` therefore still runs every browser check (about 25 min); only CSS, docs and node-level check files get the fast path. | Let area-imports treat a dynamic `import()` from a page registry as a seam (opt-in), or move customer copy out of TypeScript, then re-split Hoy's areas by page. |
| 2026-11-23 | Lanes in parallel (E13), group pass | The shared one-run-at-a-time test lock put this frontend lane's node checks and build (seconds to a minute each) behind the backend lane's long integration suites several times, so most of the lane's wall time was waiting, not testing. | Give the lock a short-job lane (node checks and builds under a few minutes go first or run alongside), or one lock per repository, so a long backend suite does not stall a frontend lane. |
