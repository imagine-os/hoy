version: 0.25.0
date: 2026-10-25
codes: C-14, C-15, W-10, D-02
intent: Render generated customer FAQ prices through the confirmed published projection instead of showing raw directives.

# 0199 · Customer FAQ generated prices

Decision: reuse FaqAnswer and the shared catalog reader/projector from the dependent public FAQ slice. Website and app use one generated PriceTable/retry presentation adapter. Customer FAQ rows retain the existing tenant/published query, page ordering and actor/provider read guards. Generated prices have truthful loading, error, unavailable and retry states. A Plans link remains available even when an answer contains only generated tables; authored answers and financial history remain unchanged.

Alternative rejected: a customer-specific pricing reader or duplicated quote rules could diverge from the public FAQ. Rewriting authored numeric answers would invent content or policy.

Affected: customer FAQ page/specs/contract, shared presentation adapter and public caller, existing D-02 inventory, synthetic fixtures/browser regressions and CI. This slice depends on PR107; it does not integrate other held feature branches.

Limits: supported frontend simulation only. PC06 prices and PC01/02 timing policies remain unresolved. No real backend, authentication, payment, email, durable cross-device storage or automatic content publication changes; authored policy answers are untouched.
