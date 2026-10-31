# Hoy all roles, lane F: the signed-out website on live Company OS data

Date: 2026-10-31. Codes: P-01 (plans), the schedule, teachers and home pages of the website.

Prompt intent: the public website showed prices, teachers and rooms from the catalogue built into the app, and hid
the timetable behind "sign in to see it", because Company OS had no read for a visitor (owner decision, final review
round 2). The owner asked for the live schedule, prices and teachers signed out (programme hoy-all-roles, Wave 1).

Decision: the Hoy server holds a read-only service identity (Company OS ADR 0029; role `public_site` in Hoy's recipe,
`COMPANY_OS_READ_TOKEN`, created by the operator per environment) and sends a visitor's reads of the timetable,
coaches, rooms and products with it; Company OS's policies and field lists decide the rows and fields (never the
private class, J4; never who booked or a person's contact details). Everything else stays refused signed out; a
visitor's own bearer is always checked as a Clerk session, so it never becomes the identity; each visitor is limited
(`429 rate_limited`, new copy). `CompanyOSProvider` drops the built-in signed-out catalogue: the five public tables are
read live, every other table is empty signed out without a request. The schedule and the home agenda drop the
sign-in prompt (`website/signedOutSchedule.ts` removed). Teachers' bio and photo still come from the website content,
matched by name. The studio settings stay out of the public reads (they share one record with the payroll rate
card): signed out the site keeps the built-in defaults, as before. The review build (MockProvider) is unchanged.

Alternative rejected: forwarding any signed-out read and letting Company OS refuse (the server would be an open relay
for the identity, and one visitor could spend its whole rate limit); keeping the built-in catalogue as a fallback
when the read fails (it would show stale prices as current).

Files: `server/app.mjs`, `server/config.mjs`, `server/check-bundle.mjs`, `server/README.md`,
`src/data/companyos/CompanyOSProvider.ts`, `src/data/companyos/refusals.ts`, `src/modules/website/pages/SchedulePage.tsx`,
`src/modules/website/pages/HomePage.tsx`, `src/modules/website/strings.ts`, `src/modules/website/signedOutSchedule.ts`
(removed); tests `scripts/test-hoy-server.mjs`, `scripts/test-companyos-provider.mjs`,
`scripts/test-website-signed-out-live.mjs` (new), `scripts/test-launch-website-ui.mjs`,
`scripts/test-launch-website-content.mjs`, `scripts/test-h5-payments.mjs`.

Needs Company OS with lane F's `public_site` grants (hoy-all-roles), then the operator's identity and
`COMPANY_OS_READ_TOKEN` on the `web` service (Company OS runbook `prod-env.md` step 13b).
