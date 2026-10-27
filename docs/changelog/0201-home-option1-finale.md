version: 0.25.0
date: 2026-10-27
prompt: docs/prompts/0201-home-option1-finale.md
intent: Apply the owner's selected primary red-photo pair to the Home FirstStep section
decision: Preserve the original slat-wall photo proportions in a semicircular arch and reuse the packaged red equipment background
rejected: Unselected alternative portraits, PDF-page crops, replacement copy, changed booking controls and bundling other draft work
files: src/modules/website/pages/HomePage.tsx, src/modules/website/photography.css, src/modules/website/strings.ts, public/images/studio-2026/finale-red-slats-*.webp, scripts/gen-media-catalog.mjs, src/data/mediaCatalog.generated.json, scripts/test-home-photography.mjs, scripts/test-home-photography-ui.mjs, scripts/test-media-model.mjs, scripts/test-photography-ui.mjs, scripts/test-teacher-current-ui.mjs, docs/pages/W-01.md

# Home FirstStep · approved primary pair

The owner selected the primary red-photo pair. Latest and Photos now show the red-lit slat wall in the left arch, with the red equipment still life behind the existing closing card. Copy and the edition-preserving schedule link are unchanged. Source derivatives are 480×720, 960×1440 and 1600×2400; none crops or enlarges the original. The original remains untouched outside the repository. The existing page template and button are reused; no shared component, schema or CMS interface changes.

Regression coverage checks both edition mappings, original aspect ratio, gutter-free frame, semicircular top, separate photo/card bounds, text fit, booking destination, historical editions, the existing CMS upgrade/override path, EN/ES, responsive widths and themes. Existing photography CI runs the updated browser matrix. Independent exact-diff visual review and exact-head CI remain release gates.

The first exact-head photography CI run exposed two older assertions for the superseded finale. Their selectors and source expectations now follow the approved pair without reducing geometry or edition coverage. Production code and reviewed captures are unchanged by this test-only correction.
