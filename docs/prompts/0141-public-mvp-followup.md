# Public MVP follow-up

Source: direct frontend implementation delegation · 2026-10-23.

## Prompt

Proceed with fixing the three reproduced, decision-independent frontend defects: SW02 Home must use the published package pricing source consistently; SW04 malformed configured WhatsApp numbers must not produce actionable invalid links and need a clear fallback; SW01 empty teacher data needs bilingual empty-state guidance. Preserve the existing saved batch and use a recoverable separate commit/branch. Implement and test actual UI behavior. Cover responsive EN/ES, valid/invalid/missing numbers and pricing updates. Keep manual access Q14 and payment configuration Q15 unresolved. Do not retry denied GitHub API operations, merge or deploy.

## Response

Implemented dedicated public-site pricing and contact adapters, a registered safe WhatsApp-link component, and existing EmptyState guidance for the teacher directory and Home. No provider, shared schema, auth, account/profile, notification, image-loading or security configuration changes. Saved launch batch remains on its original branch. [Verification receipt](../frontend-completion/public-mvp-followup.md).
