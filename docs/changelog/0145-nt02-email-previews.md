version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0145-nt02-email-previews.md
intent: Implement NT-02's exact ten fictional launch email previews in isolation.
decision: Read-only bilingual sample catalog and reusable bounded/searchable navigation in M-04, with independent sample locale, explicit missing/error/retry states and D-02 inventory. Keep source acceptance partial and provide shared-kanban handoff to integration owner.
rejected: Reusing password-reset as sign-in, merging confirmation with receipt, adopting legacy invoice/DIAN copy, choosing unresolved hold/expiry policies, recording simulated sent status or adding delivery/provider infrastructure.
files: src/modules/email-previews/*; src/components/organism/LaunchEmailPreviews/*; src/modules/admin/EmailsPage.tsx (import and mount only); scripts/test-launch-email-previews*.mjs; docs/frontend-completion/nt02-email-previews.md; docs/screenshots/M-04/nt02/*; this changelog and prompt.

[Mapping, verification and remaining gaps](../frontend-completion/nt02-email-previews.md). No release or whole-row completion claim. Shared readiness/kanban mutation reserved for integration owner; the exact suggested entry is in the scoped receipt.
