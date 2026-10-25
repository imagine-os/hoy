# Public Home pricing contract

SW-02 binds W-01's public offer cards to the current studio-date snapshot of `plans`. [The contract](../../src/modules/website/publicHomePricing.contract.ts) lists the three existing mapped items, tenant field and local publication fields. It describes public offers, with no saved table preferences or backend connection.

`id` and `tenant_id` belong to the existing plan schema. `frontend_catalog` and `frontend_publication` are optional browser-only JSON extensions on `CatalogPlan`; their backend mapping remains pending. A saved draft and an explicitly published local snapshot are distinct. Once local publication is observed, missing, withdrawn, unpriced or unreadable offers must not silently restore legacy prices.

When changing public pricing fields, update the contract, W-01 `data`, helper/hook, fictional fixtures and relevant tests together. Retain the tenant scope, studio-date refresh, subscription cleanup and latest-read/context handling. Keep fixture amounts synthetic and record unsupported offers explicitly; do not infer real price or fulfillment policy.

Run `node scripts/test-public-home-pricing-contract.mjs` for source/schema/spec/fixture-reference drift, then the relevant [domain](../../scripts/test-public-home-pricing.mjs), [lifecycle UI](../../scripts/test-public-home-pricing-ui.mjs) and [native publication](../../scripts/test-public-home-pricing-native.mjs) checks. The contract check inspects their source bindings; it does not execute or certify those runtime checks.

The pricing portion of saved local commit `a4303bd9ef703c5751cc7257a06bd7d258bbfec7` informed this bounded repair. That commit also contains unrelated public content work; this contract is not an adoption of that whole change. Generated FAQ pricing remains a separate held scope. No real payment, email, publication service, durable cross-device history or whole-frontend CMS readiness is claimed here.
