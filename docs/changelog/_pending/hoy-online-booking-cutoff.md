# HOY online booking cutoff

New online class reservations are unavailable for occurrences on or after December 7, 2026 (studio date, America/Bogota). The Spanish and English website labels say “Sin cupos disponibles” and “No spots available.” December 6 remains on normal rules.

The website, customer calendar, detail/checkout and new group selection display the pause without changing occupancy, capacity, class records or existing bookings. Existing booking links, cancellations, payment on existing holds and staff operations are not disabled. Company OS, not the browser, enforces admission.

## Operator handoff

Company OS must be deployed first with the validated, default-off `public_booking_closed_from` bookings module setting. In protected test, set only that value to `2026-12-07` on the test HOY tenant. Verify the Dec 6/Dec 7 boundary, a blocked new customer reservation, staff and an existing reservation, then deploy the paired web build for the full test. Verify both again on the exact approved release. Activate on HOY production only, using the audited settings workflow, in coordination with the web release. Do not run a full tenant recipe or change existing records.

To reopen: clear the Company OS value and restore matching website presentation through the named release workflow. Neither activation nor reopening changes capacities, schedules, or booked customers.
