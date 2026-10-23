# 0154 — Current availability in class booking controls

date: 2026-10-23
version: 0.25.0
prompt: docs/prompts/0154-rs05-admission-cta.md

C-03 class detail and the W-04 open schedule drawer now disable new admission for withdrawn, started, ended or completed sessions, with existing bilingual status labels. Mounted controls refresh at start/end boundaries and re-read current scoped availability before navigation. Valid full classes retain waitlist routing; public sign-in retains the selected session and mat. Existing booked/attended records retain their booking-detail link.

Frontend simulation only. Shared admission commands, payment/auth providers, historical records and publication policy are unchanged. Scoped EN/ES390/1280 page regressions cover withdrawal/republish, current-read checks, clock boundaries, valid targets and existing history.

Paused-read follow-up: include the current pathname and query in navigation context. An action started before a schedule-filter route change must not navigate afterward; current actions remain available. Scoped context tests cover delayed success/failure across actor, role, provider, route and unmount changes.
