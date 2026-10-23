# Retained desk booking settlement

Based on the preserved gift candidate `ebbd6676d766f3d8f51af82a9afd58f56a6f3c6f`, with customer intent commits `24ddc4b831a7b33d2ec688df601b0b8fcc443de3` and `26677b8f21558b0825bee7fb79fceba65390a119` cherry-picked without changing their source. The candidate is a separate recoverable branch; original branches remain unchanged.

Optional `PaymentRow.frontend_desk_intent` identifies the retained tenant/customer/session/mat/plan and accepted quote. Absence preserves legacy product-only behavior; malformed present metadata fails closed. The mock provider prevents replacement, removal and duplicate-ID insertion of intent-bearing payments. No new table or migration is required.

Staff collection verifies current actor/role, scoped active customer, the retained quote and unexpired entitlement, fresh scheduled future class, active modality/template, physical room ceiling, regular/voucher occupancy and exact requested mat. One mock transaction saves payment, grant, booking, debit, immutable receipt and both audits. Any read/write/quota/context failure rolls back. The requested mat never falls back to another committed mat. Trial/single/package and existing gift dispatch remain distinct.

Replay verifies the exact original payment, grant, debit, static booking and intent facts, plus exact immutable receipt hash and audit linkage. Legitimate later booking cancellation/attendance, package freeze and target withdrawal do not cause a second grant or booking. Unsupported/corrupt proof is rejected rather than repaired.

`readDeskBookingConfirmation(data,{paymentId,customerId},isCurrent)` returns `pending`, `saved` (payment and exact booking), or `unavailable`. It is read-only and mock-only, retains context after every asynchronous read, validates strict pending metadata and complete approved-state proof, and throws on scope/read/context/corrupt-state failures. A saved booking can have a legitimate historical status; callers must use truthful saved-record/navigation copy. It does not confer staff command permission or backend authorization.

A real rendered regression found the gift queue reset effect clearing the receipt immediately after successful legacy/booking settlement. The effect now clears receipts only for provider/actor/role changes; gift-form navigation state still resets separately. Saved payment amounts and records were unaffected.

## Verification

- `node scripts/test-pending-desk-settlement.mjs`: 56 groups covering trial/single/package, all eight staged write failures, quota, exact mat, physical capacity, withdrawn/full/started/inactive targets, daily conflicts, tenant/customer/role/context, concurrency, lost acknowledgment/reload, replay tampering, mutable historical status and read-only proof.
- `node scripts/test-pending-desk-settlement-ui.mjs`: actual C04 request → S09 cash/card collection → customer Home, booking and payment history, EN/ES390/1280. Double submissions produce one request and one booking; grant/debit linkage, exact mat, receipt and no invoice/delivery checked. `QA_FAILURE=withdrawn` verifies clear failure and byte-identical pending database after rollback.
- `node scripts/test-pending-desk-settlement-context.mjs`: interrupted provider/actor/role/unmount checks and successful receipt isolation. Synthetic target customer has no seeded same-day admission so the positive control is deterministic.
- Existing desk settlement, pending intent, gift purchase/provider, session/daily admission and receipt contracts are retained and rerun during final checking.

The actual still-mounted C04 drawer remains pending after another tab settles. This is a separately reproduced integration limitation; successful cross-route reads are verified. The integration owner will retain the request ID and use the proof reader for mounted confirmation. No cross-device, real backend/auth/payment/email completion is claimed. No reservation hold, deadline, cancellation or refund policy is inferred. Final combined build/review/release evidence is recorded in the handoff rather than assumed here.
