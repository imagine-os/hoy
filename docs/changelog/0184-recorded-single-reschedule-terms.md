version: 0.25.0
date: 2026-10-24
codes: C-09
prompt: docs/prompts/0184-recorded-single-reschedule-terms.md
intent: Complete future-day rescheduling for paid single/trial bookings with exact retained finite terms.

# 0184 — Reschedule from recorded single/trial terms

Decision: use the original approved payment's validated immutable receipt quote when a single/trial booking has an exact payment reference and a recorded finite expiry. Both the date picker and final atomic command use that entitlement. New prices and current policy defaults are not consulted. Package debit allocation and the existing 12-hour cutoff remain unchanged.

Alternative rejected: a same-day-only workaround for known paid bookings (also rejected in 0084), unlimited validity from a null expiry, guessing historical terms or charging again. Missing/unusable legacy expiry retains the existing conservative fallback. Contradictory direct/debit references fail closed before package delegation. No cancellation/refund, actual payment or backend authorization policy changes.

Files: reschedule entitlement helper and booking sheet, focused actual-provider/native regression scripts, dedicated parallel CI wiring and completion notes. Existing receipt/payment/ledger/history snapshots, supported companions, local data and seed version are preserved. Local checks and exact combined remote CI/release are separate gates.
