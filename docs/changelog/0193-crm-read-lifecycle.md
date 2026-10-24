version: 0.25.0
date: 2026-10-24
codes: M-06
prompt: docs/prompts/0193-crm-read-lifecycle.md
intent: Keep CRM list reads truthful while loading, failing and retrying.

# 0193 — CRM read lifecycle

The shared useTable hook fences provider/query changes, superseded responses and unmounted subscriptions, catches failed reads, and exposes retry. Initial synchronous peek behavior is retained for demo session identity. CRM waits for its people and balance dependencies before showing rows or segment counts; bilingual loading/error/retry states prevent unconfirmed balances from appearing as zero. Long names remain readable within the existing table scroll viewport.

Alternative rejected: clearing financial records, changing package arithmetic, presenting failed reads as empty success, or replacing real hooks with test-only substitutes. No schema, authentication, backend, payment, email or policy changes.

The CRM list has one CMS descriptor with actual entity dependencies, fixed column configuration, fictional shape fixtures and reviewed source/test drift bindings. It introduces no storage connection or saved-view controls. Runtime regression tests mount actual hooks and CRM with a controlled read-only provider. Full feature acceptance, cross-device backend consistency and owner acceptance remain separate.

Files: DataContext, staff people reads, admin CRM/specs/strings/styles; lifecycle test harness and workflow; CMS contracts/checker/fixtures, contributor guidance and build preflight.
