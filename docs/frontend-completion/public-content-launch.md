# Public website launch slice — 2026-10-23

Source: remote main `c2c0f37fe5cb4e3ebb4abfba9d1f87759c661748` (PR77 consent preserved). Branch: `codex/public-content-launch-20261023`. Public demo fixtures only. This is implementation evidence for named slices, never full-row acceptance.

## Implemented and verified

| Row | Verified slice | Remaining acceptance / decisions |
| --- | --- | --- |
| SW-04 | Contact card and footer show the resolved front-desk destination, including a front-desk topic override that differs from profile. Contact front-desk CTA/form, specials, Plans specials/private and FAQ support links use configured topic numbers; missing topic falls back to front desk. Blank/whitespace contact form remains disabled; Unicode and reserved characters round-trip in the direct link. No external link followed. | Production Settings validation and actual number ownership require integration/owner verification; malformed configured numbers were not repaired in shared Settings. No real WhatsApp chat or delivery verified. |
| SW-08 | `/` and `/coming-soon` retain pre-opening before 2026-10-30 studio midnight; redirect to `/site` at/after launch. Invalid clock stays pre-opening. Open tab rechecks every second and on focus/visibility change. Redirect replaces history and drops expired login/edition queries. Tokyo/Honolulu device zones do not affect studio cutoff. | Local browser clock drives frontend routing; production deployment and owner launch readback pending. Year is 2026 from the current MVP launch context; date constant is explicit in `launch.ts`. |
| SW-01 | Home agenda renders the studio date and class time even when the device calendar has advanced to tomorrow. Home, philosophy, classes, methods, schedule, teachers, plans, FAQ and contact rendered in ES/EN without page errors or missing string markers; 390/1280 document overflow checks pass. Home empty agenda verified in light/dark; FAQ no-match support route verified. | Full Content-master reconciliation, approved media and loading/provider-error states remain separate. Static home plan prices versus published product-master updates need SW-02 reconciliation. No full SW-01 completion claim. |
| SW-03 | Existing chosen-session website handoff preserves `/app/checkout/public_demo_class` in sign-in `next`; a full session preserves `/app/waitlist/public_demo_class`. | Account owner must verify sign-up/sign-in execution and return with PR77 consent preserved. No auth files changed. |

SW-02, SW-05 (PC-08), SW-06 (Q-14), AD-05 (Q-15) and future SW-07/AD-12/AD-13/MK-01/OT-01 remain outside this implementation slice. Existing future features and source phases are retained. No decision fields were filled.

## Checks and evidence

- `npm run build`: passed, zero TypeScript errors; spacing/manual checks passed. Frozen runtime fingerprint (all sorted `src` files, path + NUL + bytes, SHA256): `97ddb8c4c80010099a384aeec5507a7656e040f98b32edd7f6425189b4cf7804`. Build manifest names base HEAD because source changes were not yet committed; this is a local dirty-tree production test, not an exact-commit/live release claim.
- `node scripts/test-public-launch.mjs`: studio midnight ±1ms, before/after, later year, invalid date and timezone passed.
- `npm run test:contacts`: existing routing, fallback, holidays and off-duty domain checks passed.
- `node scripts/test-public-content-ui.mjs`: production preview at localhost:5180, ES/EN, 390/1280, launch transition/history, configured contact links, Unicode form URL, FAQ empty state and topic fallback passed. [Results](../screenshots/public-content-launch/results.json).
- `node scripts/test-public-agenda-ui.mjs`: production preview, studio-day display, chosen-session auth handoff, full-class waitlist and home empty light/dark passed. [Results](../screenshots/public-content-launch/agenda-results.json).
- `BROWSER_BIN=/usr/bin/chromium node scripts/test-public-entry.mjs`: real static files at host root and `/hoy` project subpath, prelaunch entry, clean hub variants/refresh/map, site/back-to-hub, archive/Latest passed. Historical prelaunch clock is explicit.
- 52 captures in [screenshot folder](../screenshots/public-content-launch/). Representative visually inspected [ES desktop home](../screenshots/public-content-launch/es-home-1280.jpg), [EN mobile contact](../screenshots/public-content-launch/en-contact-configured-390.jpg), [EN dark mobile empty home](../screenshots/public-content-launch/en-home-empty-dark-390.jpg). External HTTP aborted in focused browser suites; map/provider rendering not claimed.

Initial install failed because default npm cache was outside writable roots; install succeeded with `/tmp/hoy-public-npm-cache`. Initial local browser attempt failed localhost proxy routing; explicit local no-proxy browser flag resolved it. One agenda assertion initially compared CSS-uppercase `innerText` to mixed-case Intl output; corrected to assert semantic `textContent`. No application assertion was removed. The first UI results receipt was regenerated by the final passing test after adding FAQ no-match and history replacement assertions.

## Integration contracts

No central provider, schema, auth, account/profile, notification or image-loading implementation files changed. No backend patch is needed for these slices.

SW-03 interface to account owner: website emits encoded local `next` containing exact session ID, checkout versus waitlist and optional selected `mat`. Existing auth must validate that target and preserve it through sign-in/sign-up/consent. Production identity/session/authorization remain disconnected and owned separately.

Readiness/image test owner: existing `scripts/test-website-preview.mjs` assumes W-11 remains permanently visible. The separate, unapplied [clock fixture patch](evidence/public-prelaunch-test-contract.patch) pins its historical prelaunch cases to October 29. Apply through its owner before/with launch integration; never weaken the real post-launch redirect. Our public-entry regression pins its own historical prelaunch clock. No shared test file was overwritten.

Parent/integration owner coordinates final main reconciliation, exact-head CI, draft PR and release; no independent merge/deploy. Source row manifest/workbook statuses deliberately unchanged; parent can reconcile this evidence at the row/slice level. Public GitHub read request (`gh pr list`) returned `Forbidden`; no retry or alternate API used. Publication status is recorded in the final handoff.
