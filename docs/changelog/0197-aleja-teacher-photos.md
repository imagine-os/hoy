version: 0.25.0
date: 2026-10-26
prompt: docs/prompts/0197-aleja-teacher-photos.md
intent: Apply only clear teacher photograph selections from Aleja's verified drawing
decision: Apply the eight clear teacher-photo fallbacks and matching group to Latest and Photos, preserving per-edition Carolina behavior and explicit CMS overrides
rejected: Assigning the separate Andrea/Jennifer profiles or resolving Carolina's conflicting arrows without clarification; enlarging PDF crops
files: src/modules/website/photography.ts, src/modules/website/pages/HomePage.tsx, src/modules/website/strings.ts, public/images/studio-2026/teacher-*.webp, src/data/mediaCatalog.generated.json, scripts/test-teacher-photography.mjs, scripts/test-photography-ui.mjs, .github/workflows/photography-qa.yml, docs/reference/aleja-teacher-photos-2026-10-26.md

# Aleja teacher photograph corrections

W-01 and W-05, default Latest and opt-in Photos editions. Explicit CMS photographs retain priority. Stable IDs and teacher data are unchanged; the separate Andrea/Jennifer profiles and Carolina assignment remain pending. No tracker, backend or release changes.

Validation: full production build; teacher mapping/base URL and deterministic media catalogue checks; media model/file integrity and access-model checks. Existing bundle-size warning remains. Browser photography and CMS photo-picker integration checks are pending while the Wix task owns the shared BMM UI. Extended the exact-head photography workflow with the mapping/drift check, ES/EN tablet coverage, both dark themes, annotated placements and CMS override precedence after reload on Home and Teachers in Photos and Latest. Independent review and exact-head CI are required before merge.

[screenshot: W-01 — Latest and Photos teacher group and corrected thumbnail selections, new exact-head CI pending]

[screenshot: W-05 — Latest and Photos directory selections, new exact-head CI pending]

**Resumen (ES).** Se aplican únicamente las selecciones claras del dibujo: fotos azules de Raghu y Leandro, Clara, la foto indicada por la flecha de Andre Cardona y el grupo. Se conservan los identificadores, las fotos del CMS y las asignaciones pendientes. La revisión visual queda pendiente mientras Wix usa el navegador.

## Integration verification follow-up

Photography QA on head `8ee295bbeadede8b1e8491399ea69f4e10af3398` passed the Node 22 production build and 40-capture browser matrix, including annotated selections and CMS override reload checks. This is hosted CI evidence; local BMM browser QA remains unrun.

Media Library QA then exposed a stale expected studio count (18). The two new portraits make the packaged inventory 20. Its source-filter check now compares both the exact count and the complete displayed asset-name set against the packaged studio inventory, preserving exclusion of non-studio assets and detection of missing/duplicate results. The single-teacher search, live exclusion, heater search and empty-state checks remain strict.

The integration scope follow-up applies the eight clear mappings and matching group to bare `/site` and `/site/teachers`, which resolve to Latest, as well as Photos. It preserves CMS precedence, stable IDs, Carolina’s initials in Latest/existing Photos fallback, and the separate Andrea/Jennifer profiles. Classic, Archive, the edition default, philosophy/finale and other unrelated Photos features are unchanged. Added a targeted 32-capture ES/EN 390/768/1280 and dark matrix, exact default/Photos mappings, decoded/cropped images, no overflow, explicit-Latest equivalence and CMS override reload assertions. The catalogue now records Latest placements as live and Photos placements as draft; its inventory/filter tests distinguish verified live portraits from pending Carolina.
