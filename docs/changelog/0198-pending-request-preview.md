version: 0.25.0
date: 2026-10-25
codes: C-04
prompt: docs/prompts/0198-pending-request-preview.md
intent: Preview an exact saved fictional cash/transfer request without implying a reservation, hold or email delivery.

# 0198 · Pending request preview

- Decision: display an explicitly UNSENT bilingual preview inside the existing C-04 success drawer, using its exact saved request IDs and two fresh read-only proof snapshots. Retry and local subscriptions recheck facts; context changes suppress obsolete copy.
- Boundaries: no booking or spot hold exists; no classes activate or are deducted. No delivery, bank confirmation, expiry deadline, cancellation/release policy or real backend behavior is inferred. Phone-only placeholder email addresses are unavailable.
- Alternative rejected: reusing the catalog's proposed pending-payment message would assert an unconfirmed timeout and bank behavior. Inferring the latest payment could select another request. Neither is used.
- Files: new pending-request verifier/hook/strings/component and D-02 examples; five-line C-04 wiring; scoped tests/workflow; CMS descriptor/fixtures/checker and contributor guidance; responsive synthetic captures. Shared dependency-prepared QA startup is retained for deterministic DEV tests. No business command, schema, tracker snapshot or operational ledger is changed.
- Validation: full build/type, 170 domain scenarios, eight compiled browser groups and retained cash/transfer/consent regressions passed locally. Context browser results and exact-head CI are recorded separately; draft publication does not imply release or whole NT-02 acceptance.
