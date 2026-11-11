# Hoy 12 Nov, lane FIX: the rejection reason reaches the customer, no check-in after a class ends

Prompt intent: decisions F1b and F2 of the Hoy 12 Nov programme.
Decision: the reason typed when staff reject a transfer is saved as the booking's status reason and shown to the customer on the booking, in payment history and in the rejection email (only while the newest payment is the rejected one). No late grace in production (the desk offers only classes not yet started) and no "Llegó" button once a class has ended (`check_in_closed` reads in Spanish and English); the check-in screen keeps the class staff opened, so no-shows can still be marked after it ends. `daily_limit_reached` is a generic per-day limit message and `person_overlap` reads neutrally for customers and staff. Needs Company OS >= 1.11.0 (status_reason, check_in_closed, person_overlap).
Alternative rejected: a late grace after the start (F1, reversed by the owner).
Files: src/modules/staff/**, src/modules/transfers/**, src/modules/customer/**, src/data/companyos/**, scripts/test-hoy-12nov-fix.mjs, scripts/test-hoy-12nov-r1.mjs
Version: pending (merged with the Hoy 12 Nov release; Company OS >= 1.11.0 per `company-os.json`).
