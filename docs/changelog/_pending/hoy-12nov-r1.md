# Hoy 12 Nov, review round 1 fixes

Prompt intent: the independent review of the integrated Hoy 12 Nov change found six things to fix before release.
Decision: Company OS 1.11.0 is the floor in `company-os.json` (`status_reason`, `check_in_closed`, `person_overlap`). Links the app builds from the page (sign-out and Google return, invitation and teacher-code share links) use the site's origin plus `/`, never the visitor's site path (`src/config/appBase.ts`). Bookings are not a public entity on the Hoy server. The staff decline hint says the customer sees the reason. The check-in screen keeps its class while no-shows are marked (superseded by round 2, which follows the clock again). Refusal and code-entry copy is neutral for customers and staff.
Alternative rejected: leaving the base to `window.location.pathname` (wrong on a deep public path).
Files: company-os.json, server/app.mjs, src/config/appBase.ts, src/auth/**, src/modules/{customer,identity,staff,transfers,vouchers}/**, src/data/companyos/refusals.ts, scripts/test-hoy-12nov-r1.mjs
Version: pending (merged with the Hoy 12 Nov release; Company OS >= 1.11.0).
