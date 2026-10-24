version: 0.25.0
date: 2026-10-24
codes: A-02, A-03, C-28
prompt: docs/prompts/0180-courtesy-auth-return.md
intent: Preserve an issued courtesy invitation when a visitor signs in or creates a demo account.
decision: Allow only the exact internal /app/vouchers/single-safe-id destination. Keep the existing unsafe-character rejection and destination authorization.
rejected: Allowing general app paths, queries or external URLs; automatically claiming/booking a voucher; changing the existing companion policy.
files: Customer return validator, focused synthetic domain/browser regressions and documentation.

Previously the public invitation route correctly required sign-in but discarded its destination because the shared return validator omitted native invitation IDs. The existing sign-in/signup links now preserve that one destination. Opening or returning to a link does not claim a voucher, create a booking or alter credits. This is a navigation repair, not whole CU-01 acceptance or real authentication.

Integration: wire the strict validator and native auth-return journeys into private-customer-read QA, retaining every existing permission, timeout and command. Combined validator44, existing redirect25, full build and compiled auth8 passed locally; remote CI/release remain separate.
