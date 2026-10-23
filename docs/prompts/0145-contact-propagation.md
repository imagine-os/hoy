# Contact propagation verification

Source: direct frontend verification delegation · 2026-10-23.

## Prompt

Next authorized MVP scope is verification-first SW05/AD05 contact propagation. Add a focused local test scripts/test-contact-propagation-ui.mjs. Verify fictional Settings email changes across ContactPage, SiteShell, MorePage, EmailsPage and LiveBlock, including reload, fallback and confirmation labels. Read literal saved requirements; use current main and compare the saved website candidate where relevant. Repair runtime only after reproducing a concrete failure, within contact display/settings-local scope; report shared provider/schema needs before edits. Preserve existing saved branches and use a separate branch. No blocked API PR attempts, merge/deploy, real email sending or configuration, or Sheet changes.

## Response

Added a local production-browser verification script for the contact-email slice. The test drives the real fictional Settings profile Save control, checks already-mounted consumers before reload, then verifies reload and native customer-session readback. It preserves templates, message logs and communication settings. Current main and the saved website artifact are compared. Both frozen artifacts pass the contact-email cases. No reproducible product failure was found, so no runtime code was changed. See [receipt](../frontend-completion/contact-propagation.md).
