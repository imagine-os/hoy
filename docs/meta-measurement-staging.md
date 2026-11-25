# HOY advertising measurement: local-only wiring candidate

**Status:** Not connected to Meta, not deployed. Pixel destination proposed for review: `963759066544104`. Do not enable the sink in production from this branch. The normal app has no running collector, image/no-script beacon, reporting endpoint, tracking credential, or production configuration.

## What the fixture exercises

- Committed React Router path changes using the same location hook inside both SiteRouter (clean public URLs mapped to internal paths) and HashRouter (booking app), ignoring search/fragment-only changes, duplicate renders and clean-path handoff. Explicit route allowlist; staff, private booking, authentication callbacks, payment-confirmation, codes and profiles do not send PageView. No URL sent at all.
- Generic ViewContent on resolved studio class pages. The payload uses a fixed Studio class label/id, not a class name, teacher, actual class id, schedule identifiers or booking/attendance details.
- CompleteRegistration only for a completed Company OS customer sign-up (HTTP 201), not a form interaction, login, already-registered error or weaker HTTP 200. Never include names, contact info or account IDs.
- Checkout intent on a displayed eligible transfer payment or selected paid desk single-class option, from the live displayed COP amount and one generic category. Not a sale. No gift, private, audience-limited product, existing receipt retry, voucher, free balance use, or attendance as checkout. No Purchase is accepted by the allowlist.
- Draft consent presentation is only shown with an explicit injected test sink. Reject/withdraw is available and stops the sink synchronously. Full product and legal copy, cookie/preference retention terms, regional policy, age eligibility, and revocation behavior with a real transport are not approved or tested. The test sink records only in memory and sends nothing externally.

## Source-grounded Purchase blocker

HOY web v1.7.0 selects ServerCheckoutPage in production. Its single-class checkout only offers bank transfer or reception. The superficially similar Wompi function is an in-browser simulator used by the review-mode checkout; its fake approvals must never drive ads. Existing direct-pay and group-pass behavior must not change for this integration.

If the business elects to measure approved manual sales, Company OS v1.23.0's approved payment transition is the candidate source. Use captured actual amount and a separate random stable event id tied internally to that payment; never count or expose a payment slip, checkout start, approval status screen, guest invitation, voucher code/redeem, booking, hold or attendance as a new sale. If Wompi is later integrated, verify its server event signature, environment, expected order/amount/currency and approved final state; do not trust browser callbacks or query parameters. Keep one stable event identity shared by browser and server for deduplication, idempotency across retries, and class/product minimization. No Purchase, CAPI or credential is implemented here.

## Release gates

1. Tenant owner aligns with the ads team on approved transfer/desk products versus Wompi, permitted data, Meta pixel ownership/settings and measurement consent/privacy notice. Do not infer advertising consent from authenticated session or required legal acceptance.
2. Security review and independent audit verify a proposed transport in a segregated test project. Before remote script loads: opt-in only; disable automatic events/matching; prove neither full page URL, fragment, referrer, click IDs, voucher/payment IDs nor DOM/user fields leak, especially on payment, login, private and administrative screens. A plain first-party `fbq('track')` wrapper is insufficient: it does not control automatic collection. Consider an isolated context with a fixed generic URL, fail-closed network policy and no access to origin DOM/storage; verify attribution and withdraw behavior in actual browsers. If privacy or Meta's policy cannot be satisfied for a route/event, omit that route/event; do not promise blanket coverage.
3. Rebase onto exact production candidate, run standard HOY workflow and code/security review. Smoke signed-out and signed-in public→booking journey, opt-in and immediate withdraw; inspect complete outgoing requests including query, payload, headers and errors. Keep production off during test. Use a separate synthetic fixture or sandbox and Meta Test Events before a separate user-managed live purchase.
4. Separate later reporting option: date-bucketed approved sales/counts, official product categories, signup counts, and aggregated booking/attendance, small-bucket suppression, scoped per-client credential with expiry/rotation/revocation and no direct production DB token; no names/emails/attendee or payment identifiers, vouchers, credentials or raw records. Access and recipient not granted by staging.

Evidence: [HOY production checkout](https://github.com/imagine-os/hoy/blob/v1.7.0/src/modules/customer/pages/ServerCheckoutPage.tsx) · [HOY transfer](https://github.com/imagine-os/hoy/blob/v1.7.0/src/modules/transfers/launch/TransferPayPage.tsx) · [Company OS payment hooks](https://github.com/Playset-LLC/Company-OS/blob/v1.23.0/packages/core/src/modules/payments/index.ts) · [Wompi signed events](https://docs.wompi.co/en/docs/colombia/eventos/).

Playbook inbox: none (local proof; no release filed).

## Browser-isolation prototype (not deployed)

The prototype is a synthetic QA fixture only. The frame lives under `scripts/fixtures`, not in `public`; the normal build has no transport caller and does not serve the frame. The dedicated local Vite config serves it with an opaque sandbox and no referrer. The Playwright harness intercepts the vendor script and event endpoint, aborting other external requests. It uses only invented routes, prices and registration behavior. This proves local browser isolation if green, not delivery to Meta, production authorization, vendor policy compliance or real attribution.

Local tests: `node scripts/test-meta-measurement-policy.mjs` and `node scripts/test-meta-bridge.mjs`. Browser test: start `npm run dev -- --config meta-qa.vite.config.ts --host localhost --port 5179 --strictPort`, then `CHROMIUM_PATH=/path/to/chrome node scripts/test-meta-browser-local.mjs`. Only after independent review, verify the real SDK against a separate test destination and investigate whether the opaque sandbox affects event acceptance or ad attribution. Never loosen privacy isolation just to get a green event.

## Standalone synthetic QA artifact (not the HOY deploy)

Build locally with `./node_modules/.bin/vite build --config meta-qa.static.vite.config.ts`. It emits only a synthetic journey, its JavaScript, and an inert frame in `dist-meta-qa/`. The default frame cannot load a vendor script or send an event. Neither the normal Vite build nor the Railway test workflow includes this artifact.

Only after review and verification of ownership, use both `HOY_QA_TEST_PIXEL_ID` and `HOY_QA_TEST_ORIGIN` at build time for a dedicated access-controlled HTTPS origin. The bridge permits its exact build origin. The HOY production ID, HOY public/test domain and its subdomains, incomplete configuration and non-HTTPS origins fail the build. These checks do not establish ownership of any other supplied ID or host. Serve only the dedicated static output, with `Referrer-Policy: no-referrer` and `Content-Security-Policy: frame-ancestors 'self'; sandbox allow-scripts` as response headers for the frame, and verify the headers before access. The browser fixture never uses Company OS, real appointments, or user accounts.

Before a real test run, inspect the browser Network metadata with a clean profile; first test with all vendor traffic intercepted. The real synthetic run, if separately authorized, uses four events after opt-in and no Purchase; watch the separate test destination, check private-route silence and withdrawal, and inspect actual request metadata before expanding scope. Receipt and ad attribution are different checks. Remove the test artifact and revoke temporary access after QA.

Automated dry run: `node scripts/test-meta-static-build.mjs` (build, contents, invalid configs, origin lock and CSP digest). The existing Chrome workflow also tests the static build under a reserved HTTPS origin with all requests intercepted. Neither check sends anything to Meta.
