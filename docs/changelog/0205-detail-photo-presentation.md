---
date: 2026-11-09
version: 0.25.0
prompt: docs/prompts/0205-detail-photo-presentation.md
intent: Apply the current website's opt-in full-photo package and pass presentation.
decision: Reuse existing photo props and CMS selections; keep item-specific copy, prices, benefits and callbacks. Products without a photo retain their existing non-photo card.
rejected: Copying product details from a visual reference, changing image mappings, or changing checkout and historical editions.
files: src/components/molecule/PackageCard/PackageCard.tsx, src/components/molecule/PackageCard/PackageCard.css, src/components/molecule/PackageCard/PackageCard.meta.ts, src/modules/website/pages/PlansPage.tsx, src/modules/website/photography.css, docs/prompts/0205-detail-photo-presentation.md, docs/changelog/0205-detail-photo-presentation.md
---

# 0205 · Website detail photo presentation

The default PackageCard photo remains an object; the website requests a full-photo background only for current editions with a photo. Trial and individual-class cards reuse their current artwork. Santa María remains a separate eligible product and has no invented photograph.

Verified responsive ES/EN light/dark layouts, readable text and buttons, keyboard focus, ready/pending/missing CMS slots, unchanged product text and purchase destinations, and Classic/Archive boundaries. Existing Home and editorial regressions also passed; see the PR for exact-head checks.

Resumen: Tarjetas con foto de fondo, sin cambiar precios, condiciones, imágenes seleccionadas ni compra. Las tarjetas sin foto conservan su presentación actual.
