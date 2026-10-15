# 0069 · Correct hero capture theme evidence
version: 0.24.5
date: 2026-10-15
prompt: docs/prompts/0069-hero-light-capture-qa.md
intent: Correct misleading narrow/tablet/wide QA capture filenames from the shared-hero test.
decision: Reset English/light storage, reload, and assert the document theme/language before capturing 344/768/3840 widths. Assert theme/language in the full bilingual matrix and record all 19 cases.
rejected: Treating inherited dark captures as light evidence, silently renaming files without verified recapture, or changing customer-facing website code.
files: shared-hero QA script, W-01 extra-width captures/report and documentation; kanban, prompt log and package version.

## Verification

The original 768 capture visibly used a dark header after the preceding matrix's final dark case. Hosted full-build and actual Chromium assertions must pass, and refreshed images must be inspected and SHA-checked before merge. Website runtime and content are unchanged.

**Resumen (ES).** Se corrige la evidencia de pruebas: las capturas de 344/768/3840 se toman y verifican en inglés y modo claro. No cambia el sitio del cliente.
