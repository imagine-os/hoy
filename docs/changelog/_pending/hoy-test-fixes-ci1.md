# Hoy test-fixes: the docs pack reaches the CI's copied production build (lane ci1)

Prompt intent: on PR 125, Auth checks / fake-clerk failed in "The Hub and view-as on the production build": the super admin's /manual, /docs, /docs/source and /dev/knowledgebase showed "No se pudo cargar la documentación", and the docs gate answered 404 `not_found` to every file.

Decision:
- Cause: the job copies the production build with `cp -R dist "$RUNNER_TEMP/prod"` and serves that copy. The gate reads the private pack beside the folder it serves (`<dist>-private`), so it looked for `$RUNNER_TEMP/prod-private`, which was never copied. The later review build also removes `dist-private` from the checkout. Lane Y6 tested against a build it served in place, so the pack was there.
- The production build step now also copies `dist-private` to `$RUNNER_TEMP/prod-private`.
- `createDocsGate` logs `{event:'docs', outcome:'pack_missing', dir}` once at start when there is no pack, so a 404 for everyone shows up in the logs as a missing folder.
- `test-view-as-ui` stops at start with a clear message when `<QA_PROD_DIST>-private/docs.json` is missing; `test-release-wiring` checks that the job copies the pack; `test-docs-gate` checks the start log.
- Deploys were not affected: `deploy-test`, `deploy-prod` and `release` build in place and `server/make-bundle.mjs` copies `dist-private` to `site-private/`, which the server finds as `<DIST_DIR>-private`.

Alternative rejected:
- Serving `dist` in place in CI (dropping the copy): the review build later rewrites `dist`, and the later steps need the production build.
- Letting the gate also look in `dist-private` of the checkout: the server must not depend on where it was built.

Files: `.github/workflows/auth-checks.yml`, `server/docsGate.mjs`, `scripts/test-{view-as-ui,release-wiring,docs-gate}.mjs`.
Pages: K-01, K-02, K-03, K-04, K-05 (production only; CI wiring and logs, no page change).
Version: pending (merged with the `hoy-test-fixes` release).
