version: 0.25.0
date: 2026-10-24
codes: C-17
prompt: docs/prompts/0188-retained-monetary-gift.md
intent: Keep one monetary gift attempt stable when a simulated payment acknowledgement is interrupted.
decision: Retain the scoped frozen intent before checkout; recover its exact saved transaction, payment and draft gift without repricing or writing history. Require verified acknowledgement before a distinct purchase.
rejected: A fresh reload nonce, amount/date matching, silently replacing an uncertain attempt, or treating a monetary draft as a delivered class voucher.
files: Gift page, gift-only retained helper and strings, C-17 spec, synthetic regressions, gift-only QA workflow and documentation.

Published quotes retain their existing checks. Corrupt or partial evidence blocks another purchase; context changes suppress stale writes and feedback. No payment service, delivery, class-voucher activation, invoice or permission integration is introduced.

Isolation: the dedicated retained-monetary-gift QA workflow checks the exact PR head with read-only contents permission, all 30 domain groups, full build, all 36 development groups and four compiled journeys. Its logs and artifacts are separate from class-purchase QA.
