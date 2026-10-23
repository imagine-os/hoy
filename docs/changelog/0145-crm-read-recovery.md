version: 0.25.0 (unreleased draft)
date: 2026-10-23
prompt: docs/prompts/0145-crm-read-recovery.md
intent: AD-07 CRM read recovery and narrow responsive behavior; PL-11 Spanish CRM labels
decision: CRM-local read boundary with retry/timeout and complete read snapshots; page-local containment and bilingual enum labels
rejected: changing shared provider/schema or treating failed balance reads as empty successful data
files: src/modules/admin/{CrmPage,MemberPage,CrmReadBoundary}.tsx, src/modules/admin/{crm.css,strings.ts}, scripts/test-crm-recovery-ui.mjs, docs/frontend-completion/crm-read-recovery.md, docs/screenshots/M-06, docs/pages/M-06.md, docs/kanban.md

M-06: [verification and remaining gaps](../frontend-completion/crm-read-recovery.md). Existing EmptyState states reused; no new visual primitive. Before: [ES phone detail](https://github.com/imagine-os/hoy/blob/455843fda97c7a0c9979b3331d11690d9653f5e7/docs/screenshots/M-06/es-390-package-detail.jpg). After: [ES phone identity](../screenshots/M-06/crm-recovery/es-390-identity.jpg), [ES desktop payments](../screenshots/M-06/crm-recovery/es-1280-pagos.jpg). Draft only; no whole-row or production acceptance.

Integration follow-up: reproduced missing known `guest`/`comp` values in the CRM payment-source allowlist. Added exactly `Invitado / Guest` and `Cortesía / Complimentary`, matching existing source labels. Unknown values remain unconfirmed. No policy, receipt/invoice behavior, booking status or provider edits. Added a failing-before/passing-after EN/ES390/1280 table/timeline regression; existing recovery/responsive suites preserved. [ES phone capture](../screenshots/M-06/crm-recovery/es-390-booking-labels.jpg).
