version: 0.25.0
date: 2026-10-26
prompt: docs/prompts/0197-aleja-teacher-photos.md
intent: Apply only clear teacher photograph selections from Aleja's verified drawing
decision: Correct Raghu and Leandro clothing selections, add Clara and explicitly annotated Andre Cardona fallbacks, and use the matching group photo in the Photos teacher section
rejected: Assigning the separate Andrea/Jennifer profiles or resolving Carolina's conflicting arrows without clarification; enlarging PDF crops
files: src/modules/website/photography.ts, src/modules/website/pages/HomePage.tsx, src/modules/website/strings.ts, public/images/studio-2026/teacher-*.webp, src/data/mediaCatalog.generated.json, scripts/test-teacher-photography.mjs, scripts/test-photography-ui.mjs, .github/workflows/photography-qa.yml, docs/reference/aleja-teacher-photos-2026-10-26.md

# Aleja teacher photograph corrections

W-01 and W-05, opt-in Photos edition. Explicit CMS photographs retain priority. Stable IDs and teacher data are unchanged; the separate Andrea/Jennifer profiles and Carolina assignment remain pending. No tracker, backend or release changes.

Validation: full production build; teacher mapping/base URL and deterministic media catalogue checks; media model/file integrity and access-model checks. Existing bundle-size warning remains. Browser photography and CMS photo-picker integration checks are pending while the Wix task owns the shared BMM UI. Extended the exact-head photography workflow with the mapping/drift check, ES/EN tablet coverage, both dark themes, annotated placements and CMS override precedence after reload on Home and Teachers in Photos and Latest. Independent review and exact-head CI are required before merge.

[screenshot: W-01 — Photos teacher group and corrected thumbnail selections, browser lane pending]

[screenshot: W-05 — Photos directory selections, browser lane pending]

**Resumen (ES).** Se aplican únicamente las selecciones claras del dibujo: fotos azules de Raghu y Leandro, Clara, la foto indicada por la flecha de Andre Cardona y el grupo. Se conservan los identificadores, las fotos del CMS y las asignaciones pendientes. La revisión visual queda pendiente mientras Wix usa el navegador.

## Integration verification follow-up

Photography QA on head `8ee295bbeadede8b1e8491399ea69f4e10af3398` passed the Node 22 production build and 40-capture browser matrix, including annotated selections and CMS override reload checks. This is hosted CI evidence; local BMM browser QA remains unrun.

Media Library QA then exposed a stale expected studio count (18). The two new portraits make the packaged inventory 20. Its source-filter check now compares both the exact count and the complete displayed asset-name set against the packaged studio inventory, preserving exclusion of non-studio assets and detection of missing/duplicate results. The single-teacher search, live exclusion, heater search and empty-state checks remain strict.

Scope finding: bare `/site` and `/site/teachers` resolve to Latest. This PR's teacher fallbacks and group replacement are conditional on `version=photos`; default Latest therefore does not receive these photograph corrections. Applying them to the default/current teacher surfaces requires a separate explicit integration scope decision. No edition default was switched in this repair.
