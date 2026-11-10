# Hoy 12 Nov, lane H-IMG: one image per timetable class

Prompt intent: decision D2: Administration uploads one image per timetable class; without one a class shows its method's Home photo, then the letter tile.
Decision: Class schedule › Clases gets the shared image field on the schedule row (Administration and Super Admin, as the teacher photo), saved with the same replace-then-delete rules. An occurrence uses its schedule's image through the existing `schedule_row` include; a class added by hand has none. `ClassThumbnail` order: class image (`/media/<id>`, retried once), CMS photo, method Home photo, tile.
Alternative rejected: a per-occurrence image (D2 is per class), and dropping the existing CMS photo step.
Files: src/components/molecule/ClassThumbnail/*, src/components/organism/SessionCalendar/SessionCalendar.tsx, src/modules/customer/pages/ClassDetailPage.tsx, src/modules/classSchedule/live/*, src/data/companyos/{mapping,publicImages}.ts, src/data/schema.ts, scripts/test-class-images.mjs, .github/workflows/auth-checks.yml
