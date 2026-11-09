---
date: 2026-11-09
version: 0.25.0
prompt: docs/prompts/0204-footer-gradient.md
intent: Give the current website footer the requested navy-blue-plum gradient and cream text.
decision: Use existing brand ink, deep blue and plum in a semantic gradient token. Apply cream text/logo and yellow link/logo hover and keyboard-focus outlines only to Latest and Photos.
rejected: Replacing the footer component or copying older website files would risk current contact settings, hours, links and newer artwork.
files: src/design/tokens.ts, src/design/tokens.css, src/modules/website/photography.css, docs/prompts/0204-footer-gradient.md, docs/changelog/0204-footer-gradient.md
---

# 0204 · Public website footer gradient

Existing footer content, contact and hours settings, links, layout and historical editions remain intact. No pricing, CMS, artwork, backend or dashboard logic changes.

Verification: production/review builds; ES/EN mobile/desktop, light/dark footer comparisons; content/link/layout invariants; keyboard focus and hover; Classic/Archive boundaries; existing Home photography and media regressions. Generated screenshots remain private verification evidence.

Resumen: El pie de página actual usa un degradado azul marino y ciruela con texto crema. Se conservan el contenido, los enlaces, los horarios y las versiones anteriores.
