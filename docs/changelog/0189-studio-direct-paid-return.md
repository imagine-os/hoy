version: 0.25.0
date: 2026-10-24
codes: M-14, C-08
prompt: docs/prompts/0189-studio-direct-paid-return.md
intent: Return a verified direct-paid class when the studio cancels its occurrence.

# 0189 — Restore a direct-paid class

Decision: studio cancellation recognizes an approved single/trial booking's exact payment and immutable receipt. A one-person, one-class quote with a finite recorded expiry produces one usable returned class under those original terms. The return uses a deterministic identifier and preserves the original payment, receipt and booking lineage. Existing ledger-backed returns and old cancellation receipts retain their format and behavior.

Alternative rejected: requiring a debit that native direct-paid checkout never created, minting a fictional original debit, choosing today's validity or price, treating a class return as a bank refund, or silently cancelling only part of a party. Ambiguous, missing, foreign or unsupported terms fail closed. Active voucher bookings retain their existing explicit cancellation guard.

The inherited command now verifies persisted studio privileges before review, mutation and replay; a claimed role alone is insufficient. Legitimate super-admin view-as remains supported. New synthetic actual-provider tests cover native direct-payment topology, mixed regular attendees, returned-class reuse, atomic rollback, replay, context changes and corrupt proof. Customer readback uses the saved payment terms; bilingual studio copy no longer calls every origin a package. Full application/browser/review/release gates belong to integration. This bounded repair does not complete all AD-02 recipient, voucher-party or real-email requirements.
