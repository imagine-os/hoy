version: 0.25.0
date: 2026-10-24
codes: C-04, C-09
prompt: docs/prompts/0183-single-booking-payment-link.md
intent: Show the exact payment status for newly paid single/trial bookings, including a supported same-day reschedule.

# 0183 — Retain single-booking payment lineage

Decision: retain the approved checkout payment ID on new single/trial bookings in the existing atomic transaction. The booking-details projection reads this explicit scoped reference or the existing package-debit link. Missing, foreign, duplicate or conflicting references remain unknown; no date/amount matching or historical backfill occurs. A replacement booking keeps the same reference without another charge or package credit.

The mock adapter validates a new reference against exactly one approved same-tenant/customer payment and protects its binding from mutation. Historical bookings, cancelled-booking facts, receipt snapshots, credits, companions and the existing reschedule window remain unchanged. The optional field preserves saved demo data and seed version. The SQL file is a draft mirror only; no database or permission change is executed.

Alternative rejected: guessing by customer, timestamp or amount; making a single-class charge into a package grant; rewriting old bookings; implying that cancellation refunds a payment.

Files: booking schema/draft contract, checkout and booking writer, reschedule replacement, status projection, mock validation, focused domain/native browser regressions, existing schedule CI and completion notes. Full build, independent final review and exact-head CI/release remain separate gates. This repairs a reproduced RS-08 frontend defect, not real payment integration.
