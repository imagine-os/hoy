---
date: 2026-11-16
version: 1.4.1 (unreleased)
intent: Warn reception about existing clients with the same email without imposing universal uniqueness.
---

Before a new reception client sale, query authorized tenant person/member records using escaped case-insensitive lookup followed by exact trimmed email comparison. Staff may revalidate and select the existing client or explicitly continue with a separate record for shared-family emails. Incomplete/unavailable lookups require acknowledgement; stale contexts abort. This is not automatic merging or a database uniqueness constraint. Signup and imports remain outside this narrow change.

Keep the existing sale callback, server batch and idempotency semantics. An ambiguous write retains the exact request, intent and key for recovery; other contexts cannot start a second sale. All sale-intent controls freeze while submitting or recovering an uncertain write. Recovery state is component-local; no cross-reload durability claim.

Alternative rejected: cached-list unique claims, public identity enumeration, global email constraints and automatically merging shared emails. Existing Notice variants are documented with advisory/retry states; all copy is bilingual.

Validation: fictional normalization/tenant/paging/context/intent/retry tests, delayed-write edit lock and one-charge lost-ack recovery; TypeScript and actual-page browser harness. Independent lane review and two integrated reviews plus exact-head hosted QA are release gates. No real customer records are used for tests and no backend release is required.
