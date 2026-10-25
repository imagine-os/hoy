# Customer FAQ generated prices

AD-01's C-14 `/app/faq` and C-15 `/app/faq/2` use [the customer contract](../../src/modules/customer/faqPricing.contract.ts). It inherits the FAQ/plan inputs and known price families from the checked public FAQ slice, while declaring customer pages and the generated-price view only. Customer FAQ has no search/JSON-LD view or saved table preferences.

Keep `useCustomerRows` for FAQ content, with the existing published query, sort order and page selection. Its query includes the current tenant and its read lifecycle tracks customer/provider changes. This frontend scope is not server authorization. Reuse the single published-pricing reader and shared generated renderer/projector; do not add a customer pricing hook or duplicate domain rules. Pending/failed pricing reads must not turn into legacy generated amounts or visible raw pricing tokens.

For every changed FAQ or pricing field, update the contract, both page specs, synthetic fixtures and consumer tests together. `plans.active` is an FAQ projection input; optional `frontend_catalog`/`frontend_publication` are browser-only JSON extensions with pending backend mapping. The FAQ rows and plan snapshots remain read-only in this flow.

Run `node scripts/test-customer-faq-pricing-contract.mjs` for schema, route/spec, actual scoped-read/render bindings and fixture/test-reference drift. Then run the relevant customer lifecycle and production checks and retained shared FAQ projection checks. Source checks do not execute or certify browser tests. The customer fixture wraps the shared `faqPricingFixture`, which instantiates the actual mock seed. The customer harness imports and calls the actual draft/publication commands; publication JSON need not be duplicated in the wrapper. The customer fixture and harness are `scripts/customer-faq-pricing-fixture.mjs` and `scripts/customer-faq-pricing-harness.tsx`; runtime checks are `scripts/test-customer-faq-pricing-ui.mjs` and `scripts/test-customer-faq-pricing-production.mjs`.

This dependent change builds on PR107's checked generated FAQ projection. It leaves authored answers—including the three seed-time numeric answers `faq_s1_2`, `faq_s1_5` and `faq_s1_6`—unchanged. PC06 prices, cancellation, freeze, refund, illness and recipient policies remain separate. No real backend, auth, payment, email, cross-device history or global CMS readiness is claimed.

## Verification

The isolated dependent slice passed the full build, shared FAQ projection rules and public/customer CMS drift checks. Customer browser matrices passed 24 development and 24 compiled-route groups across C-14/C-15, EN/ES and 390/1280, including dark states, directive-only Plans links, publication/date changes, read failure/retry, actor/provider/role/route cleanup and unchanged authored/history data. Retained W-10 regressions passed 12 development and 12 compiled groups. These are synthetic local frontend checks, not deployed/backend or whole AD-01 acceptance.
