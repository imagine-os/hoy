# Manual QA before Lorena reviews it

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (via the coordinator)

## Prompt

Coordinator: QA pass before Lorena reviews the manual — fresh captures, a check of every chapter against STYLE.md, and the small fixes the two manual PRs left behind.

_Context (Justin, same thread): "Hows the progress so far? in particular for the operations manual? … So i can tell Lorena if its ready for her to review" and earlier "the Screenshots may be out of date"._

## Response

Branch `chore/manual-qa` from `main` at `3b3a856`, version **0.13.4**. Full record in `docs/changelog/0038-manual-qa.md`; the QA record, with a short "Para Lorena" section in Spanish, is `docs/qa/manual-2026-09-29.md`.

1. **Captures**: the full `npm run screenshots` pass and `npm run thumbnails`, all dated today; the manual's stale-capture badges went from 23 codes to 1 (`A-05`, retired in 0030, no chapter shows it); 0 badges on the K-03 cover and chapters 01, 04, 09, 21, 24 in ES and EN.
2. **Lint**: `scripts/manual-lint.mjs` (`npm run lint:manual`, report mode in `npm run build`) checks every chapter in both languages against STYLE.md; 0 violations, empty baseline.
3. **Small fixes**: no literal `{{…}}` in the schema tables of the manual (chapter 22); `guest_allowance_note` says the rule is provisional and pending the owner; CLAUDE.md lists the 11 roles and dev mode for `super_admin` and `developer`; P-01 shows the "Experiencias Corporativas — en camino" card.
4. **QA script** `scripts/manual-qa.mjs`: stale badges, the eight role lenses (32 captures `K-03/<lang>-<width>-cover-<role>.jpg`), the smoke (edit, save, restore, mark read, sign a stage, request a change) and a keyboard walk; all pass.
