# Public finale imagery (P-01)

Date: 2026-11-13. Prepared after v1.2.1; release pending.

Intent: apply Aleja's ring-portrait reference to the public homepage without changing Jas's Content entries.
Decision: replace only the two static finale fallback images with one reconstructed diptych, apply the requested 20% brand-blue wash, preserve both complete rings at every width. On mobile the CTA follows the image rather than hiding either face. Existing CTA, links, translations, layout visibility and historical editions are unchanged.

The image is AI-reconstructed with the built-in image tool from Aleja's Nov 1/Nov 7 WhatsApp reference screenshots, not an original studio photograph. Exact original ring portraits were not located in the supplied photo sources. Justin explicitly authorized this fallback. The inspected reference shows the left woman in pale blue on gray and right woman in navy on peach. No text or UI is baked into the asset. Accessible description states reconstruction.

Alternative rejected: deploying the unrelated earlier generated asset or claiming a screenshot crop as original photography. Original screenshot correspondence is not committed.

Files: HomePage.tsx, photography.css, strings.ts, finale-rings-reconstructed.png, generated media catalogue, regression and browser QA scripts, prompt/kanban records.

No CMS, customer, backend, pricing, admin settings, authentication or data changes. Private/affiliate plan-card originals are a separate source-verification dependency.

Verification: regular/production builds and source regressions pass; two independent reviews completed. Actual runner QA identified and fixed desktop card clearance at 901px. Expanded width testing also revealed existing tablet header language/theme controls overflowing past the viewport; the existing hamburger navigation now starts at 1150px for the current sanctuary edition, with a menu-open assertion. Final-head browser screenshots remain the release gate. Rollback: revert this isolated commit; original assets remain intact.
