version: 0.25.0
date: 2026-10-23
codes: C-04 C-20 S-02 S-04
prompt: docs/prompts/0155-daily-admission.md
intent: Reject a second identified person's booking on the same studio day consistently across local launch admissions.
decision: Share the existing desk/reschedule daily status rules across atomic customer/claim, regular and identified voucher admissions. Use the studio timezone and retain duplicate/replay precedence, replacement-booking exclusion, historical attendance and cancellation paths.
rejected: Page-only checks, guessing account identity from guest names/emails, changing cancellation policy or claiming backend enforcement.
files: src/data/dailyAdmission.ts; MockProvider; deskBooking; vouchers; customer/hooks; WaitlistPage; rescheduleCommand; voucher error mapping; scripts/test-daily-admission*.mjs.

The frontend demo counts regular booked, checked-in and no-show bookings and non-cancelled voucher participants with explicit account IDs. Regular cancelled/late-cancelled records retain their previous desk/reschedule treatment. No policy change or migration is introduced. Unidentified voucher guests, cross-device consistency and authenticated server enforcement remain unresolved production requirements. Existing bilingual notices show the daily-limit rejection without a new component variant. Root owns final integration, shared tracker, CI and release.

Validation: full build passed; daily-guard domain regressions cover scoped identities, status rules, studio-date boundaries, replay, duplicate precedence, context interruption and concurrent last-credit admission. Production EN/ES390/1280 checks passed for checkout, offered claims and actual voucher forms (36 cases); eight actual waitlist lifecycle cases and the retained 35-group admission/context suite passed. Existing admission, desk transaction, settlement, reschedule, voucher, receipt and sensitive-audit suites passed. Protected checkout presentation mapping and final combined CI remain integration responsibilities.
