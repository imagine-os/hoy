# Opening hours to Google Business Profile, holidays and special hours, developer keys

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (via the coordinator)

## Prompt

in settings and policies from the admin, the opening hours once it is updated here, would be reflected in google business? can we setup an integration for this? If yes, how do we make it multi-tenant type feature so that a click or instructions tells the person doing the integration what to do to make it work.

This reminds me, maybe we need a secret key systme for our apps for developers.

PS: We need abilities around Holiday hours, and special overrides as needed.

_Attached: a screenshot of the admin Opening hours card — Sun closed, Mon–Fri 06:00–20:00, Sat 08:00–13:00, footer "The holiday calendar arrives with the 'Holiday calendar' feature"._

## Response

Branch `feat/hours-google-keys` from `main` at `d333ee4` (0037 spacing standard, v0.14.0), merged with `main` at
`e8f7677` (0039 four movements retired, v0.15.0) and `73b44ab` (0040 practice analytics, v0.16.0), version **0.17.0**. Full
record in `docs/changelog/0041-hours-google-keys.md`; decisions D-0016, D-0017, D-0018. Model routing: design and
decisions Fable 5.1, build Opus 5.5.

Short answer to the questions: **not yet, but now it can be.** Before this pass the hours saved in M-08a were read by
nothing (every screen quoted a constant in `tenant.ts`); now they are the source of truth for every surface, and the
Google Business Profile integration is designed, previewed and documented so the connection is a server away.

1. **Hours are read everywhere (D-0016).** `useOpeningHours()` merges the weekly hours saved in M-08a with dated
   exceptions (new table `hours_overrides`) and `tenant.ts` defaults. The site footer, W-06, C-25 (new hours row with
   today's status), the manual's `{{tenant:hours}}` and a new schema.org `LocalBusiness` JSON-LD on the website read it.
   Pure readers in `src/tenant/hours.ts` (`effectiveHoursFor`, `todayStatus`, `toGoogleBusinessHours`,
   `toSchemaOrgHours`), tested by `npm run test:hours`.
2. **Holidays and special overrides — M-08g** `/admin/settings/hours` (admins + coordinator): import the Colombian
   holidays (Ley Emiliani, `src/tenant/holidays.co.ts`, `npm run test:holidays` checks all 18 of 2026) in one click,
   add closed days, reduced hours or events in a drawer, and preview the next 30 days as customers will see them.
3. **Google Business Profile — M-10a** `/admin/integrations/google-business` (D-0017): HoyOS pushes, a server holds
   the tokens, one way with a nightly drift read-back. The page shows the exact API body that will be sent, the setup
   split by who does it — **Platform, once** (Google Cloud project, the two APIs, the access request, OAuth consent,
   server env) and **This studio, per location** (be an owner/manager, Connect with Google, pick the location, review,
   turn on) — which is the multi-tenant answer: the platform does Google once, each studio only clicks Connect. Until
   the server exists, "Copy hours for Google" and a link to business.google.com work today; Connect / Push are marked
   not wired yet.
4. **Developer keys — D-07** `/dev/api-keys` (D-0018): create keys (`hoy_live_…` / `hoy_test_…`) with scopes and an
   optional expiry, shown once, stored only as a SHA-256 hash + prefix, rotated with a 24-hour grace period, revoked;
   every step audited. Verification is the server's job and is documented as design in `docs/reference/surfaces.md` §3.
5. Actions (WebMCP) for M-08a, M-08g, M-10a and D-07; icons `copy`, `eye`, `eye-off`, `refresh-cw`, `store`; page docs
   M-08g, M-10a, D-07 (and 0041 sections in M-08a, M-10, W-06, C-25); captures ES/EN × 390/1280.

Still needed from outside the code: the HoyOS server (Cloudflare Worker or Supabase function) for the Google push and
key verification, Google's API access approval (quota is 0 until then), and the owner's decision on the exact hours
(ROADMAP §E 8) — the hours are now editable, the decision is still open.
