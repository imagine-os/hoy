# Retire the four movements everywhere

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (owner)

## Prompt

found naother entaiza fluye arde libera! in the customer app in booking , when booking a class in the club rules

Get rid of those terms.  And in the schedule the filters can be by the modality , not the words Enraiza fluye arde libera.  Those 4 elements are going away in general.

We can also remove those buttons from the website home page.

Let me know if those elements are anywhere else because we're removing them.

_Two screenshots were attached: the C-13 club rules list showing "About HOY — A human club. Life is today." and the opened About HOY sheet with the text "HOY is a wellness club: four movements —Enraíza, Fluye, Arde, Libera— and a space to practise without hurry. Every class is all-levels and the teacher adapts the practice. We look after rhythm, not performance."_

## Response

Branch `feat/retire-movements`, version **0.15.0**. Full record in `docs/changelog/0039-retire-movements.md`; the decision is D-0013 in `docs/decisions.md`.

<!-- integrator: PR link -->

1. **Answer to "are they anywhere else?"**: yes — the C-13 "Sobre HOY" seed article (the screenshot), the schedule filter chips, legend and drawer (C-02 / C-02b), the website hero line and W-01 class-gallery eyebrow, W-03 grouping, the W-04 legend and `?movement=` filter, the W-07 chip, the W-08 "Movimiento" fact, the S-05 rooms legend, D-01 tokens, pricing copy ("los 4 movimientos"), a CRM note, D-02 component metas, `--mv-*` CSS hooks, the schema enums and the `intentions` table, `brand.ts`, the media seed, the M-08f `publicNaming` setting, ops-manual chapters 02 / 05 / 07 / 17 / 19 / 27, the page docs, ROADMAP and four stone images. Each one is listed with what happened to it in the changelog entry.
2. **Customer app**: the "Sobre HOY" article is rewritten from the owner's source text ("HOY es un santuario urbano: hot yoga, barre, pilates, meditación y respiración bajo un mismo techo…"). The schedule filter chips and legend are the visible modalities ("Clases / Classes").
3. **Website**: the hero says "varias formas de moverte"; W-01's class-gallery eyebrow is just "01"; W-03 groups modalities by the five brand classes; W-04 filters with `?modality=<slug>` and its legend is the modalities; W-07's chip shows the modality name; W-08 loses the "Movimiento" fact. The four stone images are deleted.
4. **Data and tokens**: `movements` / `Movement` becomes `classTones` / `Tone` with seven hue-named tones (moss, river, clay, sun, sage, slate, plum), one per modality chosen in M-02; `--mv-*` becomes `--tone-*`; `modalities.movement` and `media_assets.movement` become `tone`; the deprecated `intentions` table is deleted; the M-08f `publicNaming` setting is removed.
5. **Docs**: manual chapters 02 (section 7 removed), 05, 07, 17, 19 and 27 in ES + EN; the page docs; design system; ROADMAP §E 22 (superseded) and backlog 5 / 7; website assets, validation and vision; decision D-0013; kanban and README. Older prompts, changelog entries and the frozen `reference/` canvas keep the words as history.
