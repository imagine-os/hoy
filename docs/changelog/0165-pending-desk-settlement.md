version: 0.25.0
date: 2026-10-23
codes: C-04 S-09
prompt: docs/prompts/0165-pending-desk-settlement.md
intent: Complete a retained simulated desk booking request atomically at collection.
decision: Re-read the accepted immutable intent, active scoped customer and final class/mat availability; save collection, grant, exact booking, debit, receipt and linked audits in one mock transaction. Verify immutable fulfillment on replay and expose a read-only scoped saved-record proof. Preserve absent-intent legacy product-only and gift purposes. Keep freshly saved receipts visible across queue detail closure.
rejected: Status-only booking confirmation, implicit mat substitution, new holds/deadlines, repricing, generic intent replacement, partial fulfillment and real service claims.
files: deskSettlement, MockProvider payment intent protection, queue projection/rendering, DeskPaymentSettlement usages/copy, synthetic domain and rendered regressions.

Local frontend simulation only. Historical bookings and receipts remain unchanged. No real payments, email, authentication, policy changes or server migration. The still-mounted customer pending drawer is documented separately for the integration owner's confirmation-readback follow-up.
