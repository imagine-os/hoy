# Hoy 12 Nov, lane H-BOOK: no mat picker, several classes a day

Prompt intent: decisions D1, D9 and D10 of the Hoy 12 Nov programme. Nobody chooses a mat any more, and a person may book several classes a day.
Decision: the `MatPicker` organism is retired (component, meta, styles, `site.mat.*` picker copy). Booking, moving, checkout and the desk sale no longer send `mat_number` or `spot`; new schedule rows no longer set `spots_enabled`. The one-class-a-day checks, the Settings field `perPersonPerDay`, the pricing line, the terms clause (document versions unchanged) and the manual sentence are gone. `person_overlap` (two classes at the same time) reads in Spanish and English on the app, the desk and moving. A booking that already has a mat number still reads and displays without it.
Alternative rejected: keeping the mock provider's mat bookkeeping as the default; it now checks a mat number only when a caller still names one.
Files: `src/modules/customer/**`, `src/modules/website/**`, `src/modules/staff/**`, `src/modules/transfers/**`, `src/data/**`, `src/tenant/**`, `scripts/test-hoy-12nov-book.mjs`.
