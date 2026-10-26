version: 0.25.0
date: 2026-10-26
prompt: docs/prompts/0199-home-practice-plans.md
intent: Apply clear Home, practice and Plans photo annotations to current public pages
decision: Use source-matched local derivatives with CMS-first fallbacks for Latest and Photos; retain pending assignments
rejected: Page-image crops, a different acro composition, price edits, a whole-edition switch and publication of undecided bottom imagery
files: src/data/studioPhotography.ts, src/data/{mediaLibrary.ts,seed/media.ts,mediaCatalog.generated.json}, src/modules/website/{photography.ts,photography.css,hooks.ts,pages/HomePage.tsx,pages/PlansPage.tsx}, ClassArch and PackageCard components/meta, public/images/studio-2026, scripts/gen-media-catalog.mjs, photography/media regression tests, Photography QA workflow, W-01/P-01 documentation

# Home and Plans · W-01 / P-01

The default public routes and Photos edition now use the same clear image selections. Seven practice cards retain complete source compositions. The mountain section blends into its adjacent colors, and the practice section uses the selected blue abstract backdrop. The general 12-class pack, trial and single-class cards receive their verified photographs. Existing prices, booking behavior, teacher IDs and edition selection are unchanged.

Ready photo assets override packaged fallbacks through stable CMS slots; pending uploads and video assets do not suppress a usable fallback. Component-library examples and the generated media inventory include the new variants. The affiliate pack retains its existing fallback: no exact original was available, and the supplied document contains only a flattened page image. Bottom imagery and Carolina remain held for a separate confirmed decision.

Browser regression coverage checks 32 Home/Plans captures across Latest/Photos, ES/EN, 390/768/1218/1280, light/dark, image decoding, complete practice proportions, the actual blue background pixels, prices, held content and CMS overrides after reload. Exact-head CI and independent review remain release gates.

**Resumen (ES).** Las páginas actuales y la edición Fotos comparten las selecciones verificadas de inicio, siete prácticas y tres planes. Se conservan los precios y las fotos explícitas del CMS. La foto del plan de afiliados, las opciones inferiores y Carolina siguen pendientes.
