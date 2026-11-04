# Hoy go-live, lane H3: class type in Class schedule, generic plan cards, /coming-soon once live, smaller items

Prompt intent: the go-live plan's smaller items before the public launch on 6 Nov 2026.

Decision:
- AD-01: Class schedule's editor gets the class type (`schedule.modality`, the recipe's select slug). A published row needs one; a draft may wait. The list's Publish button is off for a draft without one. Any row without one says so: a draft how to publish, a published row that its dates can't be booked. Switching a row off stays possible. A browser rule, as on M-02: Company OS doesn't refuse it.
- WEB-02b: `genericPlans` gives a `GenericPlanCard` to every other product on sale today: kinds trial, single, pack, gift, no audience limit, price above 0, at least one class. On the website (P-01) and in the app (C-06), production only.
- Traps. A `single` with no credits gets no card and the pay page won't take it on its own, because Company OS issues nothing for it. A second trial goes from a customer's cards once the trial is used; the server still decides (`trial_used`). A gift goes to the gift page with that product chosen. That page's only other change: each key once at today's row, with a price above 0; who sees a gift is unchanged.
- Class schedule's Teachers tab (owner, 4 Nov): a new `teachers.write` permission, held by Administration and the Super Admin. A Coordinator holds `classes.write` but the recipe gives it `coach` read only, so it was offered bio, specialties and photo and refused on Save; it now sees teachers with no New or Edit there, and keeps classes, dates and rooms. Marketing holds no `classes.write`, so nothing changes for it. Screen only: access is unchanged.
- `/coming-soon` once live, production: the Super Admin keeps it (the Hub's rule, `superAdminTab`), anyone else goes to `/site`. While the session loads it waits; a failed session goes to the site, which differs from the Hub's rule on purpose. Public before go-live. Review build unchanged.
- `/` and `/coming-soon` in production wait, on the app's loading state, for the launch settings (`launchSettled`), so the landing doesn't flash on launch day. A failed read settles on the defaults, and a read that doesn't answer settles after 5 seconds.
- `class_cancelled` in `launchEmails.ts` and `hoy-templates.json` now matches the Company OS recipe.
- HALL-1: the Dashboard's tile reads "Con paquete activo" / "With an active pack"; its hint said the same thing and is gone. The review build's Dashboard label changes too; that's accepted. Analytics keeps "Miembros activos", which counts check-ins.
- `test-schedule-support-ui`: the failing "inactive class button" was a stale test, not a bug. Owner decision r2 L3 keeps classes of a switched-off row open; commit 586f74ff updated the sibling tests and missed this one, plus `test-schedule-support-content` and `test-rs05-cta`. All three now follow the decision.
- PLA-06, secrets review (4 Nov 2026), by the go-live lane: no secret found. Method: `scripts/test-launch-secrets.mjs --history` (every tracked file, the production `dist/`, and history on every branch), plus a one-off wider pattern scan of the bundle and tracked files, excluding `reference/` and `docs/screenshots/` from that wider scan. Results are names and locations only. Bundle: the only secret-like text is the variable name `SUPABASE_SERVICE_ROLE_KEY` (`src/modules/admin/integrationDefs.ts`), a name with no value; no browser code reads a secret-named `VITE_*`. Repository: no tracked `.env`; every pattern hit is in `scripts/test-*` (subscriptions, hoy-server, docs-gate, move-private-settings, test-gate and test-gate-ui, website-signed-out-live). Limit: pattern matching only, so a secret in an unusual shape would not be caught.

Known limits:
- A fixed-list key keeps the list's name and order; only its price comes from the master.
- A new `single` with credits is a class credit bought ahead; it isn't what a booking's "pay this class" charges, which stays key `single`.

Alternative rejected: one card per family on the fixed list's layout, because a new product has no photo, rationale or English copy.

Files touched: src/modules/classSchedule/live/*, src/data/livePricing.ts, src/modules/customer/genericPlans.ts, src/modules/customer/pages/PlansPage.tsx, src/modules/website/pages/PlansPage.tsx, src/components/molecule/GenericPlanCard/*, src/modules/vouchers/production/*, src/modules/transfers/launch/*, src/modules/coming-soon/*, src/config/launch.ts, src/notifications/launchEmails.ts, deploy/comms/hoy-templates.json, src/modules/admin/*, src/i18n/core.ts, scripts/test-golive-h3*.mjs, scripts/test-schedule-support-ui.mjs, scripts/test-h7-reception-admin.mjs, .github/workflows/auth-checks.yml.

Version: pending release.
