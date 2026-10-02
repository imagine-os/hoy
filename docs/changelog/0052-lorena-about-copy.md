version: 0.22.1
date: 2026-10-02
prompt: docs/prompts/0052-lorena-about-copy.md
intent: Apply Lorena Medina’s revised Sobre HOY copy and remove the homepage schedule subtitle.
decision: Replace only about.paragraphs with the supplied Spanish text and a matching English translation. Remove the schedule subtitle element and its unused bilingual dictionary entry; preserve the heading, schedule link and class list.
alternative rejected: Editing the philosophy or other brand sections beyond the requested text.
files: src/tenant/brand.ts; src/modules/website/pages/HomePage.tsx; src/modules/website/strings.ts; package.json; package-lock.json; docs/kanban.md; docs/prompts/0052-lorena-about-copy.md; docs/changelog/0052-lorena-about-copy.md
pages: W-01, W-02
validation: npm run build passed (TypeScript, spacing audit, manual lint and Vite). git diff --check passed. Screenshot regeneration unavailable: this session has no Chromium executable; no new browser installation per project instructions.
