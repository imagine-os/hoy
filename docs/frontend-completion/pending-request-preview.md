# NT-02 · Saved pending-request preview

Feature Log row 101; source row 102. This is a bounded frontend simulation, not whole NT-02 acceptance or email delivery.

C-04 already saves cash requests and fictional transfer receipts without creating a booking or holding capacity. Its existing success state retains the exact cash payment ID or transfer receipt ID. The new preview reads only those identities; it never selects a recent payment or treats a pending payment as a pending booking.

Two detached snapshots verify the active tenant-scoped customer and current stored role, real recipient address, class quote, pending manual payment and canonical `payment.mock.pending` audit. Cash requires the retained desk intent. Transfer requires its unique pending receipt and the existing protected upload-intent verifier. Linked bookings or ledger activation make the copy unavailable. Placeholder recipient addresses, inconsistent/duplicate sources, changed facts and unavailable providers fail closed. No source command or persistent financial field is changed.

The existing drawer shows literal bilingual React text with a labeled built-in mock contract, not a published template or a send record. Copy explicitly states that no booking or spot hold exists and that no classes activated or were deducted. Transfer copy does not confirm a bank transfer. The history link is inert. No countdown, deadline, automatic cancellation or booking-release claim is added.

Provider, actor, effective role, full route/query and source context fence asynchronous reads. Retry only re-reads the same request. Browser-local subscriptions invalidate displayed proof; backend mapping and real subscription authorization remain pending. No email, notification, message-log or outbox record is created.

## Integration and verification

Isolated from live tracker main `a485b5eb50e2efa0683fb41b89e9faa3188a0c27`. No held PR96/100 feature runtime is included. The generic CMS contract/checker and deterministic dependency-prepared DEV startup accompany this adoption. C-04 is a form/preview with no table-view preferences; its entity mappings, synthetic fixture shapes and actual adapter-test references are synchronized. Inventory checks do not execute or certify runtime tests.

Local verification passed full build/type and 170 actual MockProvider scenarios, including every guarded read boundary, malformed recipient/source proof, rollback and unchanged persisted data. Eight compiled browser groups cover cash/transfer, EN/ES, 390/1280, both themes, double submission prevention, immutable financial history, no booking/grant, inert link and reload. Separate DEV tests cover failed reads, read-only retry, independent actor/role changes, provider/disconnect/query/route/unmount, inconsistent source and persistence rollback. Final exact results and CI receipts belong to the checked draft; no deployment is claimed here.

Retained domain checks include pending desk intent/settlement, transfer receipts, protected upload intent and signup consent. The existing Delivery Room snapshot is unchanged. Booking-release preview remains blocked on an authoritative event and unresolved timing semantics; this slice does not supply either.

## Synthetic captures

All accounts, requests and receipt images are fictional. Eight reviewed samples cover both methods, locales, widths and themes:

- [EN mobile cash, light](../screenshots/C-04/nt02-pending-en-390-cash-light.jpg)
- [ES mobile cash, dark](../screenshots/C-04/nt02-pending-es-390-cash-dark.jpg)
- [EN desktop cash, dark](../screenshots/C-04/nt02-pending-en-1280-cash-dark.jpg)
- [ES desktop cash, light](../screenshots/C-04/nt02-pending-es-1280-cash-light.jpg)
- [EN mobile transfer, dark](../screenshots/C-04/nt02-pending-en-390-transfer-dark.jpg)
- [ES mobile transfer, light](../screenshots/C-04/nt02-pending-es-390-transfer-light.jpg)
- [EN desktop transfer, light](../screenshots/C-04/nt02-pending-en-1280-transfer-light.jpg)
- [ES desktop transfer, dark](../screenshots/C-04/nt02-pending-es-1280-transfer-dark.jpg)
