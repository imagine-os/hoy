version: 0.25.0
date: 2026-10-23
codes: C-03 C-04 C-20 W-04
prompt: docs/prompts/0156-booking-completion-integration.md
intent: Integrate booking recovery, daily admission and current class drawer controls consistently.
decision: Keep known duplicate feedback separate from a verified package booking and retain that distinction across read retries. Add shared CI coverage and W-04 Notice usage.
rejected: Repeating an uncertain booking, claiming a legal invoice or real backend enforcement.
files: CheckoutPage; customer strings; Notice metadata; booking regression harness; session-admission workflow; kanban.

Synthetic frontend only. Combined build, regressions and independent review are required before release. No original saved candidate or historical record is rewritten.
