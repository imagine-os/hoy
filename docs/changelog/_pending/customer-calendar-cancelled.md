# Customer calendar: hide canceled classes

Intent: Jas asks that canceled classes no longer appear in the users' app calendar.
Decision: filter canceled sessions from the customer day/week browse projection only. Existing refresh polling is preserved. Bookings, history, admin views, public-site configuration, cancellation/refund commands and server records are unchanged.
Alternative rejected: deleting canceled records, changing the shared calendar, or bypassing booked-session edit safeguards.
Files: customer SchedulePage, calendarVisibility helper, focused regression test.
Version: pending release after validation and two independent reviews.
