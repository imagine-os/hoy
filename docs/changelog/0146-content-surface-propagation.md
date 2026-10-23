version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0146-content-surface-propagation.md
intent: Verification-first AD-01/COO-10 publication propagation across website schedule, customer schedule/detail and reception, preserving booking/history rows.
decision: Add one focused fictional actual-page cycle test; reproduce withdrawal admission and public room-label defects on main/checked PR82 before local page repairs. Keep the checked PR82 branch/head unchanged and isolate new work on verify/ad01-surface-propagation.
rejected: Counting CRUD/recovery tests as downstream acceptance, treating template defaults as permission to rewrite dated/history rows, or editing shared provider/schema/admission policy without ownership handoff.
files: scripts/test-content-surface-propagation.mjs; src/modules/customer/pages/ClassDetailPage.tsx; src/modules/staff/CheckinPage.tsx; src/modules/website/pages/SchedulePage.tsx; scoped receipt and evidence.

AD-01 remains partial. Shared admission-command enforcement/CI/readiness need integration-owner follow-up. No Sheet, contact page, authentication, payment, merge or deployment change. [Receipt](../frontend-completion/content-surface-propagation.md).
