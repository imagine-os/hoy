version: 0.25.0
date: 2026-10-24
codes: C-04, C-28, S-03
prompt: docs/prompts/0182-admission-regression-fixtures.md
intent: Restore valid synthetic setup for existing capacity, mat, promotion, cancellation-baseline and teacher ownership regressions after required booking contact validation.

# 0182 — Complete synthetic admission contacts

Decision: give only intended valid fictional booking owners complete scoped name, email, WhatsApp and active-user fixtures. The teacher state harness gains its missing fictional phone. Exact frozen historical cancellation implementations, assertions, role and tenant faults, capacity checks and recovery behavior are unchanged.

Alternative rejected: skipping contact validation, relaxing existing expectations or altering historical implementation fixtures. Baseline/current reproduction establishes fixture setup failures rather than a change to the tested cancellation or ownership behavior.

Files: six existing regression setup scripts and this documentation. No runtime, stored customer data, consent, payment, notification or companion behavior changes. Focused repaired suites pass locally; exact-head hosted CI and release remain separate gates.

The next CI run passed capacity and exposed the same incomplete synthetic-owner setup in the following mat-booking suite. Its valid fixtures now have complete scoped contact; all fifteen mat-suite assertion expressions remain identical, including collision, bounds, tenant, capacity and migration expectations. The following voucher suite also passes locally.
