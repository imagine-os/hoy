# Desk class-booking contacts — bounded CU-01 repair

CU-01 Feature Log25/source26: “Booking requires an account with name, WhatsApp and email; there is no guest booking.” Base02d6d3b8; isolated Register repair, not a whole-criterion certification.

When a standard class is selected, new customer details require name, WhatsApp and email. Existing customers with missing details or the generated no-email address are blocked, without rewriting their records. Scoped user/profile rows are re-read inside the transaction before sale writes; invalid, missing, ambiguous or foreign rows fail closed. The rendered button and final callback enforce the same condition. Product-only sales and non-class Especial scope are unchanged.

The pure validator uses the existing simple email shape and phone digit convention (10–15 digits); it makes no identity, deliverability or ownership claim. Placeholder exclusion is specific to the existing `sin-email.hoyos.test` generator. Unicode names and supplied fictional test addresses remain literal.

Focused regressions cover domain20; EN/ES390/1280 new missing/malformed/placeholder contact via Enter/final callback, exact DB rollback on quota error, valid retry exactly one payment/booking, historical rows unchanged; existing placeholder customer no rewrite; captured stale callback after logout no writes. Existing successful desk sale now supplies a fictional email, retaining all grant/debit/booking/receipt assertions. Full build and final independent review remain handoff gates until recorded.

Other direct customer/waitlist/reschedule, reception and settlement admission paths require a shared contact contract owned by integration. No DataProvider/MockProvider/schema/command region was changed here. Null-customer Especial room/event reservations need a scope decision rather than an invented class-booking exception. Existing bookings, attendance and history must remain readable and cancellable; no destructive migration is proposed.
