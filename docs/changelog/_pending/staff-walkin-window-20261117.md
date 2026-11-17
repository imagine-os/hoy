# Staff walk-in registration through start + 15 minutes

Request: staff must register customers without reservations for 15 minutes after a class starts.

Decision: separate staff-only walk-in registration from customer booking and existing-reservation attendance. Production Check-in and Sell + Check-in offer scheduled sessions through start + 15 minutes inclusive, never after the class end. Server rules remain authoritative for access, capacity, balances and timing. Do not set the existing global late_grace_minutes: it also changes customer and reserved-arrival behavior. Review MockProvider booking behavior remains unchanged.

Files: staff deskSale helper, CheckinPage, DeskSalePage, bilingual desk copy, boundary and retained admin regression tests. Backend companion adds the authorized staff-only policy; deploy backend first. No booking/customer records altered. Frontend 1.6.1 requires Company OS >=1.19.0 and its scoped HOY staff window setting. Release pending integrated reviews and verified deployment.
