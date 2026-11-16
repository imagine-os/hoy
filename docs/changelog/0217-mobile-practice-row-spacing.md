---
date: 2026-11-16
version: 1.4.1 (unreleased)
intent: Fix mobile class row spacing while preserving published content and desktop columns.
---

# Mobile practice row spacing

- Version: 1.4.1 (pending release)
- Date: 2026-11-16
- Intent: correct the reported Ligereza/Híbrido overlap and inspect related mobile sections.
- Decision: use the sanctuary percentage as a column gap so phone layouts retain their existing vertical spacing. The existing ≤380px header uses smaller outer/inter-control spacing while retaining the logo minimum and 44px controls; overflow diagnostics record exact element bounds. All class copy, images, class dimensions and published content are preserved.
- Alternative rejected: shortening content or adding arbitrary margins to individual classes; the shared grid spacing is the underlying issue.
- Files: src/modules/website/sanctuary.css; scripts/test-mobile-practice-layout-ui.mjs; .github/workflows/mobile-practice-layout-qa.yml.
- Validation: script syntax passes. The first hosted pass confirmed corrected vertical bounds but found horizontal overflow at 320px. The compact-header follow-up and exact offending-element diagnostics require a fresh hosted pass. The fixture measures all seven catalog rows vertically, checks horizontal overflow on their detail pages and homepage arches, across 320/360/390/430/1280 widths, both languages and themes. Before captures reproduce the former CSS rule on the same fictional review content; after captures use the correction. No customer or booking writes.
