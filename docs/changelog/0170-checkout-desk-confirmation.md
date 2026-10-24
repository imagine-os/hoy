version: 0.25.0
date: 2026-10-23
codes: C-04 C-05 S-09
prompt: docs/prompts/0170-checkout-desk-confirmation.md
intent: Reconcile a saved simulated desk request in the still-mounted customer checkout.
decision: Retain the payment ID and verify its scoped immutable fulfillment on relevant data events. Show pending only after a confirmed pending read; use saved-record wording for completed or later-cancelled records. Failures and unavailable requests offer read-only retry and payment-history navigation. Show saved payment instructions in transfer checkout through the shared projection.
rejected: Status-only success, a second booking or payment during confirmation, stale actor/provider/route updates, active-booking claims for historical records and real collection or delivery claims.
files: CheckoutPage, PaymentInstructions usage metadata, synthetic mounted-confirmation/context and instruction-propagation regressions, bounded CI wiring.

Frontend simulation only. This adds no hold, deadline, refund, cancellation rule, authentication service or actual payment/email integration. Consent documents, accepted snapshots and historical financial records remain preserved.
