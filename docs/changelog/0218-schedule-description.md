---
date: 2026-11-16
version: 1.5.0
intent: Add one optional shared description to a class, including classes already published, without per-date overrides.
---

Decision: one bounded plain-text field in the existing production class editor. It writes only the schedule; existing dated classes read through their existing template link and the existing SessionEditorial renderer. The same entered text displays in either interface language; labels and help are bilingual. Blank inherits the existing class-type description. Legacy command callers that omit the field leave stored descriptions untouched. The editor draft is fenced to the current actor, role and provider; read-only/view-as contexts cannot submit it.

Alternative rejected: per-date overrides, rewriting occurrences or regenerating classes/bookings, separate multilingual inputs and changing class marketing-page copy. No scheduling or booking rules are changed. Existing historical linked dates inherit the shared description too, as the editor help states.

Files: classSchedule/live/LiveSchedulePage.tsx, scheduleOps.ts, strings.ts; data/companyos/classDescription.ts and mapping.ts; Input.meta.ts; package.json/package-lock.json; focused model and actual-component browser fixtures/workflow. Tenant field/public-read configuration is a separate backend rollout prerequisite; unknown fields are not assumed to persist.

Validation: fictional command/mapping/inheritance/fallback bounds tests, production build/typecheck and actual-component browser tests for create/edit/reload, retained published state/time/capacity/bookings, literal text rendering, actor/provider/role/view-as/status changes and failure/retry. ES/EN, 390/1280, light/dark. Hosted execution and backend configuration verification remain release gates. No real classes or customer records are changed for testing.

Auth-check follow-up: reproduced the stale H3 source assertion after the current-query guard was added. Updated that assertion to require `canWrite && q.current`, and added an actual-component delayed-query fixture: class creation/edit controls stay unavailable while a post-save reload is pending, then return after current rows arrive. Production guards are unchanged.
