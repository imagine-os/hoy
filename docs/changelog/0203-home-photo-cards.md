# 0203 · Selected photos on the two Home cards

date: 2026-11-08
version: 0.25.0
prompt: docs/prompts/0203-home-photo-cards.md
intent: Apply the selected full-photo trial and standard-package cards to the public website.
decision: Adapt only Home's ValueModel and scoped styles; reuse ready editorial CMS slots and existing live pricing, with verified responsive packaged fallbacks. Keep Home photo mappings separate from Plans mappings.
rejected: Copying an entire older Home page or changing Plans/detail-card presentation, pricing, teacher selections or the finale.
files: src/modules/website/pages/HomePage.tsx, src/modules/website/sanctuary.css, src/modules/website/strings.ts, src/data/studioPhotography.ts, src/data/mediaCatalog.generated.json, public/images/studio-2026/warrior-blue-*.webp, scripts/gen-media-catalog.mjs, scripts/test-media-model.mjs, scripts/test-home-photo-cards-*.mjs, .github/workflows/home-photo-cards-qa.yml, docs/pages/W-01.md

W-01: Latest and Photos have full-opacity photographs with light text and an isolated token-based contrast gradient. Existing CMS photo slots take precedence when ready; drafts keep the packaged fallback. Live pricing, navigation, private classes and other editions remain intact. No new CMS row, backend or dashboard change.

The narrow CI workflow does not re-enable the separately muted Photography QA trigger. Generated screenshots remain private verification evidence and are not included in this change. See the PR for exact-head validation and review receipts.

Resumen: Las dos primeras tarjetas de Inicio usan las fotos seleccionadas; los precios y las demás páginas se conservan.
