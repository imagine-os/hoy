version: 0.25.0
date: 2026-10-23
codes: C-03, C-07b, C-10, C-16, C-20
prompt: docs/prompts/0168-customer-read-isolation.md
intent: Stop foreign-tenant customer records and class references from changing rendered private screens.
decision: Reuse the private scoped read helper for class details, account display, invitations, entitlements, queue reads and own reviews. Filter alternate ownership keys and class references defensively. Preserve all existing write commands and historical records.
rejected: Altering admission or refund policy, changing auth/provider configuration, rewriting unused hooks or claiming server authorization is implemented.
files: Customer hooks READ selectors; context harness; scoped browser tests; documentation.

Read-only synthetic reproductions showed a foreign profile/invitation/class, foreign package balance, foreign queue position and a foreign review suppressing the rating form. Scoped readers preserve current valid records and isolate pending results by current context. Teacher review aggregates, public content references and real backend enforcement remain separate acceptance work.
