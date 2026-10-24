# RS-09 · Feature Log 47 · source row 48

A current compiled workflow reproduced a future-day single-class move hidden despite a valid saved payment and finite receipt expiry. The earlier package/cutoff audit remains bounded; it did not certify all single/trial cases.

The shared reschedule entitlement resolver now reads the exact approved same-customer/tenant payment and its validated immutable receipt quote. Only a known single/trial quote with finite recorded expiry enables the corresponding future-day choices. This reuses the amount and terms already saved by checkout, including its existing expiry anchor; it defines no new validity rule. Package bookings retain their original debit. Unresolved legacy terms and null expiry keep the existing fallback, and inconsistent direct/debit links are rejected. The 12-hour cutoff, active published target, capacity, contact and one-class-per-day guards remain.

`test-direct-reschedule-terms.mjs` exercises actual capture and cross-day atomic movement, expiry boundaries, every staged-write/quota/context rollback, repeat request and malformed/foreign/ambiguous terms without rewriting financial history. The native UI companion exercises paid single/trial checkout and future-day move/reload in EN/ES at 390 and 1280. The earlier package boundary, cancellation, receipt, admission and reschedule suites remain gates.

No current catalog lookup, payment, grant, debit, email delivery, invoice, database migration or permission change is introduced. Local source/test/build/review evidence and eventual exact-head CI/deployment are distinct. Explicit companion support is unchanged; this does not close unrelated policy or backend questions.
