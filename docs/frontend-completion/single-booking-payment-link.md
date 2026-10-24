# RS-08 · Feature Log 46 · source row 47

Reproduced: a new approved single-class card purchase created a booking with no ledger debit and no saved payment reference. Booking details could not safely determine payment status. The same branch served paid trials; their exact workflow needs its own regression rather than an inference from the single-class proof.

New single/trial checkout bookings retain the exact approved transaction payment in optional `bookings.payment_id`. Existing package bookings still resolve their own debit. The projection accepts one same-tenant/customer reference, rejects ambiguous/conflicting linkage, and never uses dates or amounts as evidence. Historical records are not backfilled. Same-day rescheduling preserves the charge link without changing financial records. Existing cancellation/reschedule policies and explicitly supported companions remain unchanged.

The final mock adapter rejects missing/foreign/unapproved references and prevents changing an established binding. This is local simulated consistency, not server authorization. The matching SQL is a draft contract only; no database, credential or RLS action is part of this work.

Checks: `node scripts/test-single-booking-payment.mjs` exercises actual mock capture, direct linkage, same-day move/reload, unchanged receipt/payment/ledger/invoice records, negative linkage and legacy/package projection. `scripts/test-single-booking-payment-ui.mjs` covers actual single/trial checkout and booking details in EN/ES at mobile and desktop sizes. Existing schedule, cancellation, reschedule and admission suites remain required. Build, reviewed exact source, hosted CI and deployment are separate gates; no whole-MVP or real settlement claim.
