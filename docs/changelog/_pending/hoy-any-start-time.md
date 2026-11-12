# Classes may start at any minute; Hoy 1.0.0

Prompt intent: Hoy's real timetable (Jas, 12 Nov 2026) starts its classes at :10, plus one at 9:30, but the Class schedule screen refused any start that wasn't on the hour, so the timetable could not be entered on production.
Decision: the screen accepts any valid HH:MM start (owner, 12 Nov). Classes still last 50 minutes. The intro reads "Cada clase dura 50 minutos" / "Each class lasts 50 minutes", and the on-the-hour refusal and its copy are gone. Company OS never had the rule. This is the first release after the public launch on 12 Nov, so the version moves to 1.0.0.
Files: src/modules/classSchedule/live/{scheduleOps,strings}.ts, src/modules/classSchedule/live/LiveSchedulePage.tsx (the start field steps by the minute), scripts/test-h7-reception-admin.mjs, scripts/test-any-start-time.mjs, package.json, package-lock.json, .github/workflows/auth-checks.yml
Version: 1.0.0
