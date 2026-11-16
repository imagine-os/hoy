---
date: 2026-11-16
version: 1.4.0 (unreleased)
intent: Let teachers open their own scheduled classes and see the enrolled people.
---

Production class links now open a read-only roster with attendee names and arrival indicators. Identity and class ownership are checked before and after reads; actor, provider, view-as and route changes conceal obsolete results. No contact data, notes, reviews, payment information or write controls are added. Administrative teacher editing remains unchanged.

The production route loads its own read-only component directly. Existing review commands retain their prior implementation through a shared read-only access helper. The new route passes the full production connectivity gate without exemptions. This does not enable teacher profile editing or payroll: those remain separate requirements.

Alternative rejected: exposing the review class-detail page in production, because it reaches unsupported review commands and tables. Reuse the existing cards, labels, buttons and empty states instead of adding a second design language.

Validation: names-only, tenant and ownership unit regressions; TypeScript; full route connectivity; actual component browser protocol with fictional providers scheduled in CI. Candidate not deployed. Files: teacher/index.ts, HomePage.tsx, LiveClassPage.tsx, classAccess.ts, classOwnership.ts, liveRoster.ts, specs.ts; config/launchRoutes.ts; route-connectivity.md; teacher roster tests.
