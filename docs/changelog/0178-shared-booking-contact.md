version: 0.25.0
date: 2026-10-24
codes: C-04, C-08, C-20, C-28, S-03, S-04
prompt: docs/prompts/0178-shared-booking-contact.md
intent: Enforce supplied booking-owner contact at final fictional class admission.

# 0178 — Shared booking-owner contact

Decision: centralize the desk contact rule and re-read one active same-tenant customer and profile before new admission or financial writes. Guard direct Checkout, reception, waitlist join/claim, reschedule, transfer review and retained desk settlement. Mock admission writes reject incomplete contact and identity retargets. Courtesy/purchased-voucher booking validates the claimed owner while retaining explicitly requested companions. New bilingual guidance uses existing Notice/EmptyState variants; no new component or token.

Preserve existing bookings, attendance, cancellation, product-only purchases, stored receipts/consent and committed replay. No implicit contact repair, historical migration or new identity/delivery guarantee. Existing synthetic fixtures now supply complete fictional contacts before fault injection; deliberately corrupt historical rows are hydrated through the mock storage-event path. No assertion or expected error was relaxed.

Alternative rejected: accepting a generated email, blocking historical actions, or deleting the supported companion flow to resolve an ambiguous criterion. CU-01 Feature Log25/source26 remains subject to the documented distinction between account owner and companion; no whole-row completion is claimed. Real account verification, authorization and delivery remain separate.

Files: shared booking contact and admission modules, affected customer/staff/transfer/voucher handlers and guidance, synthetic domain/browser regressions, existing fixture repairs and CI wiring. BO-06's checked unsent buyer-template input is integrated separately. See frontend-completion/shared-booking-contact.md for validation and limits.
