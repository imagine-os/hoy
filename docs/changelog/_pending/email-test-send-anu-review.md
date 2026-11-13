---
date: 2026-11-13
version: pending Anu approval
prompt: docs/prompts/email-test-send-anu-review.md
intent: Let a super admin send the live email or unpublished draft to a chosen test address.
decision: Keep delivery in Company OS, off by default, using its existing queue and provider status.
rejected: Browser provider keys, customer-data fixtures, automatic publication and production deployment before backend approval.
---

The email editor is already live in HOY 1.2.0. This separate review branch adds a test panel for super admins, with their address prefilled, one chosen recipient, live/draft selection, sender/reply-to display, explicit sending, separate history and status refresh. Sample data only; tests never publish drafts or change customer records. Clear [TEST] markers, duplicate protection, quotas and stale-template checks are enforced by the paired backend PR.

Company OS 1.12.0 is the proposed minimum for the new API, subject to Anu confirming the release version. Missing backend or disabled opt-in shows an unavailable/disabled message. UI strings and responsive checks cover ES/EN. Component inventory includes EmailTestPanel and a safe unavailable usage.

Validation: request contract started red, then passed; production build and TypeScript checks; browser checks with fictional auth/API fixtures; local PostgreSQL plus fake-provider integration checks in the backend. Two independent integrated review rounds are required before handoff. No real test delivery has been attempted; a controlled real inbox check remains for after approval/deployment.

Resumen: panel de pruebas separado de la publicación, con datos ficticios, historial y estados reales del servidor. Pendiente de aprobación de Anu; no publicado en producción.

Verified: production build and frontend TypeScript; request validation/draft isolation;32 browser assertions in ES/EN at1280/390;82 backend integration checks (including all12 HOY templates) and137 renderer/settings unit checks. Integrated review rounds1 and2 found issues now fixed with regressions: expired-key queue deduplication, server-owned test history, literal prefix/entity scoping, complete samples, status labels, parser-aware HTML banner and direction schema. No production merge, deployment or setting change.
