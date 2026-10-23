# Saved desk request confirmation

The customer drawer keeps its original payment ID after the pending-only finder stops returning an approved payment. It reads `readDeskBookingConfirmation` on payment, booking, ledger, audit, receipt and customer changes. The reader verifies exact immutable fulfillment; the consumer additionally fences provider, actor, effective role, route, generation and mount context.

A verified saved record uses neutral record wording and links to its current booking details. It may already be checked in, marked no-show or cancelled; confirmation does not reactivate it. Pending, unavailable and failed reads remain distinct. Retry reads existing records only. The transfer option renders saved payment instructions through the same limited projection used elsewhere.

Synthetic regression entry points:

- `node scripts/test-pending-desk-confirmation-ui.mjs`: actual customer request, staff collection and still-mounted readback in EN/ES at 390/1280; exact booking/debit/mat and unchanged post-collection storage.
- `node scripts/test-desk-confirmation-context.mjs`: failed and altered receipt proof, unavailable and historical requests, provider/actor/role/route/unmount changes, read-only retry.
- `node scripts/test-payment-instructions-ui.mjs`: actual Settings save and website/app/Checkout/unsent-email display without a payment or message write.

Development-only harnesses are not imported by application routes. Full build, retained domain contracts, production flows and exact-source review are required before release. No real banking, delivery, server authorization or cross-device concurrency is established by these tests.
