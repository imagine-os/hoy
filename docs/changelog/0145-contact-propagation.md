version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0145-contact-propagation.md
intent: Verify one Settings contact-email source across website, app, email preview and manual.
decision: Add focused local browser verification before runtime edits; compare frozen main and saved website artifacts with fictional profile values and existing confirmation/fallback behavior.
rejected: Rewriting working readers without a reproduced defect, treating preview propagation as real email delivery, or filling unresolved brand/payment policy decisions.
files: scripts/test-contact-propagation-ui.mjs; docs/screenshots/contact-propagation; docs/frontend-completion/contact-propagation.md; docs/frontend-completion/evidence/contact-propagation.json; docs/prompts/0145-contact-propagation.md; docs/kanban.md

Named tested surfaces: M-08a Settings profile save; W-06 Contact; public SiteShell footer; C-25 More; M-04 email preview envelope; K-03 LiveBlock contact directive. No new UI element/variant is introduced; no D-02 entry change is needed. This contact-only scope does not alter AD-01 publication or send any message.

[Exact source, checks and remaining gates](../frontend-completion/contact-propagation.md). Original row criteria, phases and acceptance remain unchanged.
