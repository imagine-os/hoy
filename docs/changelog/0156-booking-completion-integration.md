version: 0.25.0
date: 2026-10-23
codes: C-03 C-04 C-20 W-04 S-08
prompt: docs/prompts/0156-booking-completion-integration.md
intent: Integrate booking recovery, daily admission and current class drawer controls consistently.
decision: Keep known duplicate feedback separate from a verified package booking and retain that distinction across read retries. Add shared CI coverage and W-04 Notice usage.
rejected: Repeating an uncertain booking, claiming a legal invoice or real backend enforcement.
files: CheckoutPage; customer strings; Notice metadata; booking regression harness; session-admission workflow; kanban.

Synthetic frontend only. Combined build, regressions and independent review are required before release. No original saved candidate or historical record is rewritten.

The attendance regression now uses a dedicated fictional attendee rather than a seeded customer with an unrelated same-day booking. All attendance rollback, role, context, idempotency, mat and financial invariants remain asserted. Initial fixture rejection was preserved outside the repository.

The reused-debit cancellation corruption fixture now places its second class on a different Bogotá day, with an explicit date assertion. It still verifies that duplicate debit lineage prevents a return; it no longer trips the unrelated daily admission rule during setup. The expanded read-only QA job retains all assertions and allows 40 minutes for the additional browser matrices.

The retained Register browser scenarios now await the selected single-class quote before checking enabled or withdrawn-disabled actions. Independent baseline/candidate repetitions reproduced the former immediate-snapshot race; no product source, enabled/disabled assertion, or saved receipt/booking assertion changed.

Reception voucher availability now excludes the holder’s existing identified regular/voucher admissions on the same Bogotá day, matching the final command guard. Regression coverage retains capacity and duplicate checks and adds status, tenant, cancellation and studio-midnight cases.
