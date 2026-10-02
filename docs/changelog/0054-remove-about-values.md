version: 0.22.3
date: 2026-10-02
prompt: docs/prompts/0054-remove-about-values.md
intent: Remove the Así hablamos heading and five personality chips from Sobre HOY.
decision: Delete the Values section and spec layout entry in both website editions; remove unused Chip/TONES imports and the heading string.
alternative rejected: Replacing the chips with another section.
pages: W-02
validation: npm run build and git diff --check; browser screenshots unavailable in this session.
