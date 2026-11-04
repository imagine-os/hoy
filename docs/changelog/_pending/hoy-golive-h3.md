# Hoy go-live, lane H3: class type in Class schedule, generic plan cards, /coming-soon once live, smaller items

Prompt intent: the go-live plan's smaller items before the public launch on 6 Nov 2026.

Decision:
- AD-01: Class schedule's editor gets the class type (`schedule.modality`, the recipe's select slug). A published row needs one; a draft may wait. The list's Publish button is off for a draft without one and says why. Switching a row off stays possible. A browser rule, as on M-02: Company OS doesn't refuse it.
- WEB-02b: `genericPlans` gives a `GenericPlanCard` to every other product on sale today: kinds trial, single, pack, gift, no audience limit, price above 0, at least one class. On the website (P-01) and in the app (C-06), production only.
- Traps. A `single` with no credits gets no card and the pay page won't take it on its own, because Company OS issues nothing for it. A second trial goes from a customer's cards once the trial is used; the server still decides (`trial_used`). A gift goes to the gift page with that product chosen, and that page now lists only today's row of each key, for everyone.
- `/coming-soon` once live, production: the Super Admin keeps it (the Hub's rule, `superAdminTab`), anyone else goes to `/site`. While the session loads it waits; a failed session goes to the site. Public before go-live. Review build unchanged.
- `class_cancelled` in `launchEmails.ts` and `hoy-templates.json` now matches the Company OS recipe.
- HALL-1: the Dashboard's tile reads "Con paquete activo" / "With an active pack"; its hint said the same thing and is gone. Analytics keeps "Miembros activos", which counts check-ins.
- `test-schedule-support-ui`: the failing "inactive class button" was a stale test, not a bug. Owner decision r2 L3 keeps classes of a switched-off row open; commit 586f74ff updated the sibling tests and missed this one.

Known limits:
- A fixed-list key keeps the list's name and order; only its price comes from the master.
- A new `single` with credits is a class credit bought ahead; it isn't what a booking's "pay this class" charges, which stays key `single`.

Alternative rejected: one card per family on the fixed list's layout, because a new product has no photo, rationale or English copy.

Files touched: src/modules/classSchedule/live/*, src/data/livePricing.ts, src/modules/customer/genericPlans.ts, src/modules/customer/pages/PlansPage.tsx, src/modules/website/pages/PlansPage.tsx, src/components/molecule/GenericPlanCard/*, src/modules/vouchers/production/*, src/modules/transfers/launch/*, src/modules/coming-soon/*, src/config/launch.ts, src/notifications/launchEmails.ts, deploy/comms/hoy-templates.json, src/modules/admin/*, src/i18n/core.ts, scripts/test-golive-h3*.mjs, scripts/test-schedule-support-ui.mjs, scripts/test-h7-reception-admin.mjs, .github/workflows/auth-checks.yml.

Version: pending release.
