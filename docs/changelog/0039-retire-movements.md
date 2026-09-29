version: 0.15.0
date: 2026-09-29
prompt: docs/prompts/0039-retire-movements.md
intent: Justin (owner): the words Enraíza / Fluye / Arde / Libera showed up in the club rules and the booking flow — get rid of the four movements everywhere (not public, not internal, not as data keys), filter the schedule by modality, and remove the buttons from the website home page.
decision: The four movements are retired entirely (D-0013). Classes are always named by modality and carry a neutral colour tone: D-01 `movements` becomes `classTones` (seven hue-named tones moss, river, clay, sun, sage, slate, plum; `--mv-*` becomes `--tone-*`), `modalities.movement` and `media_assets.movement` become `tone` (one per modality, chosen in M-02), `brand.classes[].movement` becomes `tone`, the deprecated `intentions` table is dropped and the M-08f `publicNaming` setting is removed. Schedule filters and legends are the visible modalities (`?modality=<slug>` on W-04). The "Sobre HOY" article is rewritten from the owner's source text.
rejected: (1) Keeping the movements as internal-only labels — 0032 tried that and they still leaked into customer copy (the club-rules article, the schedule chips). (2) Renaming the tones after elements or feelings — that would re-create the concept under new names, so the tones are named after hues only.
files: src/** (design tokens, schema, seed, brand.ts, customer schedule, website pages, staff rooms, admin M-02 / M-08f, specs); supabase/schema.sql; public/hub-map.json; public/images/sanctuary/stone-*.webp (deleted); docs/**; ROADMAP.md
codes: C-02, C-02b, C-03, C-08b, C-13, S-05, M-02, M-02d, M-08f, D-01, D-02, W-01, W-02, W-03, W-04, W-07, W-08, K-04

Model routing: Fable 5.1 (direction and the vocabulary), Opus 5 (code pass, in parallel), Sonnet 5.5 (this documentation pass: manual, page docs, decision, kanban).

Checks: `node scripts/manual-lint.mjs` 0 violations before and after; the code worker's `npm run build` and screenshots are recorded in the PR.

## Where the words were found, and what happened to each

Justin asked "let me know if those elements are anywhere else". They were. Every place, grouped by surface:

**Customer app (what Justin saw)**
- **C-13 club rules**: the seed article `art_about` ("Sobre HOY / About HOY") said "un club de bienestar: cuatro movimientos —Enraíza, Fluye, Arde, Libera—". Rewritten from the owner's source text ("HOY es un santuario urbano: hot yoga, barre, pilates, meditación y respiración bajo un mismo techo, y un espacio para practicar sin prisa. Cada clase es para todos los niveles…"), ES and EN.
- **C-02 / C-02b schedule**: the filter chips, the filter drawer and the legend showed the four names. They are now the visible modalities, and the legend is headed "Clases / Classes". Class rows and calendar dots use the modality's class tone.
- **C-03 class detail, C-08b cancel sheet**: the empty media frame tint and the "same movement" replacement wording now use the class tone and "same modality". The M-08f option that could name a class by its movement is gone, so a class is always named by its modality.

**Website**
- **W-01 home**: the hero line "cuatro formas de moverte" became "varias formas de moverte"; the class-gallery eyebrow ("01 / Arde") is just "01". The stone buttons themselves were already removed in 0034.
- **W-02**: the four values are plain chips (no movement colours).
- **W-03 modalities**: grouped by the five brand classes instead of by movement.
- **W-04 schedule**: the legend body and the `?movement=` filter are now the modalities and `?modality=<slug>`.
- **W-07 classes**: the chip shows the modality names. **W-08 class**: the "Movimiento" fact is gone; the schedule CTA passes `?modality=<slug>`.
- **Pricing copy**: "los 4 movimientos" removed from the plan text.
- **Stone images**: `stone-enraiza`, `stone-fluye`, `stone-arde` and `stone-libera` (`.webp`) deleted; `docs/website-assets.md` says "removed in 0039".

**Staff and admin**
- **S-05 rooms**: the legend and the room blocks used the movement colours; they use the class tones and the modality names.
- **CRM**: one template note named a movement; reworded.
- **M-02 / M-02d**: `modalities.movement` and `media_assets.movement` are now `tone`; M-02 lets the studio choose the tone of each modality.
- **M-08f content settings**: the `publicNaming` (`disciplines | movements`) control is removed, together with the "movement" line on the Respiración page.

**Developer surfaces**
- **D-01 tokens**: `movements` becomes `classTones` with seven tones; the labels and the token page no longer show the four names. **D-02 components**: the metas of the chips, `ClassRow`, calendar and empty media frame describe class tones.
- **CSS hooks and TypeScript**: `--mv-*` becomes `--tone-*`, `Movement` becomes `Tone`.
- **Schema and data**: the `movement` enums are replaced by the tone enum; the deprecated `intentions` table (unused since A-05 was retired in 0030) is deleted from `src/data/schema.ts`, `supabase/schema.sql` and `docs/data-model.md`. `src/tenant/brand.ts` (`brand.classes[].movement`) and the media seed use `tone`. The specs in `src/specs/canvasSpecs.ts` are generated from the frozen canvas, so their wording follows the code worker's regeneration.

**Documentation**
- **Ops manual (ES + EN)**: chapter 02 loses section 7 "Los cuatro movimientos" (section 8 becomes 7; a sentence says each class has its own colour in the schedule); chapter 05 step 2 spreads intensities across the day; chapter 07 step 4 sets light and music by class and intensity; chapter 17's row is "Disciplinas"; chapter 19 says "el color de cada clase"; chapter 27 loses the "Movimiento" glossary row; chapters 02 and 26 no longer mention the public-naming setting. `lint:manual` stays at 0 violations.
- **Page docs**: C-02, C-02b, C-03, C-08b, C-13, K-04, M-02, M-08f, W-01, W-02, W-03, W-04, W-07, W-08 updated; A-05 (a retired page) is left as history.
- **Other docs**: `design-system.md` ("Class tones"), `flow-map.md` (the hand-written dependency line; the generated route tables follow `npm run flow-map`), `website-assets.md`, `website-validation.md`, `website-vision.md`, ROADMAP §E 22 (superseded, with the 0032 resolution left in place) and backlog items 5 and 7, `decisions.md` (D-0013), kanban and `docs/README.md`.

**Kept on purpose, as history**: earlier prompts and changelog entries (0006, 0018, 0030, 0032, 0034 …), the frozen `reference/` canvas and brand material (`src/specs/canvasSpecs.ts` is generated from it), QA records under `docs/qa/`, and the retired A-05 page doc. The plain Spanish word "movimiento" (motion, or a ledger movement) is not the concept and stays.
