version: 0.3.0
date: 2026-09-17
prompt: docs/prompts/0005-final-integration.md
intent: Close the parallel build — apply the nine shared-change requests the customer and staff/admin tracks left for the coordinator, capture every route (ES/EN × 390/1280, dark for key pages), generate a page doc per code, and bring ROADMAP/README to v0.3.0 so another account can continue from GitHub alone.
decision: Shared files edited once, by one writer, with a Playwright check for every behavioural change. SessionProvider now sits inside DataProviderRoot and resolves any `users` row (profile + user_roles) so A-03 signs in as the account it created; `useTable`/`useRow` re-read the synchronous snapshot when their query changes so RequireRole never sees a stale visitor. MockProvider reloads on the `storage` event and emits `reset` (cross-tab realtime). The customer policy object keeps its API (`policy.cancelWindowHours` etc.) but is a live view of M-08 `tenants.settings` (`policyFromSettings`, `<PolicySync/>` mounted once in App); M-08 gained payment hold, charge notice and lockout fields; the default cancellation window is 2 h as the canvas cites (M-08 had 4 h). Hub customer card, website sign-in, schedule prompt and plans buy go through `/auth/sign-in` (with `?next=`). Screenshots are JPEG quality 72 named `<lang>-<width>[-dark].jpg`; the script reads the route manifest the built app publishes (`window.__hoyos.routes` → `docs/screenshots/routes.json`) so folder names are the real `spec.code`; `gen-page-doc.mjs --all` writes `docs/pages/<code>.md` from the same manifest. Seed: demo customer ≤ 1 booking/day, birthdays on ~30 % of profiles (half in the current month so the CRM segment is populated). Kanban gets a "Data" lane with the six requested tables and their reason.
rejected: (1) PNG screenshots — a q72 JPEG of these flat UI captures is about a third of the PNG size with no loss a reviewer can see, and every image is also bundled into the Pages build through `import.meta.glob`, so PNG would have tripled the deploy as well as the repo. (2) Keeping policy constants in `tenant.ts` — the owner edits policies in M-08, and `tenants.settings` already has the audit trail and the per-tenant row, so a second static source would drift; `policyFromSettings` maps settings → policy with the old constants as defaults. A `usePolicy()` hook for instant re-render was deferred (pages pick up an edit on the next navigation). (3) Parsing `defineSpec({ code })` from TypeScript in the screenshot script — brittle (the customer module re-exports an extended `canvasSpecs`); reading the manifest from the running bundle is exact and gives the page-doc generator the full spec for free. (4) Adding the six requested tables now — each is a data-model decision (notifications vs message_log, reviews visibility, payment tokens) that the owner has not taken; they are Backlog cards under "Data" with the reason. (5) Making `switchUser` async / querying the provider inside SessionProvider — `useTable` with the synchronous snapshot gives the same result without a loading state.
files: src/app/{App.tsx,manifest.ts} src/auth/SessionProvider.tsx src/data/{DataContext.tsx,MockProvider.ts,seed/index.ts} src/i18n/core.ts src/modules/dev/LayoutEditorPage.tsx src/modules/hub/{HubPage.tsx,strings.ts} src/modules/website/{SiteShell.tsx,strings.ts,pages/SchedulePage.tsx,pages/PlansPage.tsx} src/modules/customer/{policy.ts,specs.ts,strings.ts,index.ts,auth/SignInPage.tsx,auth/SignUpPage.tsx,pages/ProfilePage.tsx,pages/BookedPage.tsx,pages/RatePage.tsx} src/modules/admin/{settings.ts,SettingsPage.tsx,strings.ts} src/modules/staff/specs.ts src/modules/docs/index.ts scripts/{screenshots.mjs,gen-page-doc.mjs} docs/screenshots/** docs/pages/*.md docs/rules/documentation.md docs/pages/{README.md,_TEMPLATE.md} docs/kanban.md docs/prompts/0005-final-integration.md docs/changelog/0005-final-integration.md ROADMAP.md README.md
codes: D-04 HUB-01 W-01 W-04 P-01 A-02 A-03 C-11 C-19 S-02 M-08 K-01 K-02 (+ every routed code for screenshots and page docs)

## Commits
- `591589a` fix: wire cross-module requests (layout editor, auth sign-in, cross-tab realtime, policy settings, seed)
- `d914510` docs: screenshots for every route (es/en × 390/1280) and per-page docs
- (this commit) docs: session log 0005, roadmap and README for v0.3.0

## Verification
- `npm run build` zero TypeScript errors; `npm run screenshots -- --smoke` 76 routes, no console errors.
- Playwright (scratchpad `verify.mjs`, not committed): two pages in one context — a write in tab A appears
  in tab B's table manager; A-03 form → `/app/intention` with `hoyos.session.userId` = the new `use_…` row →
  `/app/profile` shows the typed name; hub "Sign in or create an account" → `/auth/sign-in`;
  `/auth/sign-in?next=/app/plans…` lands on `/app/plans` after picking the customer.
- Screenshot pass: 292 files, 28 MB in `docs/screenshots/` (JPEG q72); `docs/pages/`
  has one doc per routed code (65 files).

## CI fix (follow-up commit)
Every Pages run since `abf217a` failed at `npm run build`: the workflow used Node 20, and `npm run tokens`
/ `npm run sql` need `node --experimental-strip-types` (Node ≥ 22.6). `.github/workflows/pages.yml` now
builds on Node 22 (the version this repo is developed with). The `deploy` job still needs Justin to enable
Pages (Settings → Pages → "GitHub Actions"); `has_pages` was `false` on 2026-09-17.

## Real vs stub (from the manifest, `/#/dev/specs`)
76 routes · 65 codes · 0 stubs. Every canvas code that has a route renders a real page on the data layer;
integrations (Wompi, WhatsApp, email, DIAN, Supabase Auth/Realtime) remain simulated behind their seams.

## Shared-change requests left open (now P1 tasks in ROADMAP)
- Six tables: notifications (+prefs), reviews, invites, events + rsvps, payment_methods, content_articles / faq_entries.
- `usePolicy()` hook for instant re-render after an M-08 edit.
- Bank account + NIT in M-08 profile for transfer instructions (C-05).
