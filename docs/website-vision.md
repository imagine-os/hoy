---
title: Website vision — what shipped and what comes next
updated: 2026-09-17
version: 0.6.0
---

# Website vision

The public site at `/#/site` is now the studio's brand in code: the owner's own words, typed once in
`src/tenant/brand.ts` and `src/tenant/pricing.ts`, rendered through the design tokens in
`src/design/tokens.ts`. This note records what shipped, what artwork is still missing, and a
prioritised list of the next moves — so the owner can pick, not guess.

## What shipped

| Code | Route | What it is now |
| --- | --- | --- |
| W-01 | `/#/site` | Landing page rebuilt around the manifesto: the cover line over a 21:9 video slot, four movements, the five classes, today's classes, the five-family value model with commercial roles, a slate-blue philosophy panel with pale-yellow headings, teachers, real reviews from the `reviews` table, and a "first step" band that prints the live trial price. Nine sections, reorderable at `/#/dev/layout/W-01`. |
| W-02 | `/#/site/about` | The full "Sobre HOY" (five paragraphs), the four values as movement chips, a 4:3 founders/interior photo slot, "Nuestra filosofía" on the dark brand panel, and the brand board. |
| W-07 | `/#/site/classes` | **New.** The "Nuestras clases" introduction plus one rich alternating block per class, each with a 16:9 photo slot, movement chip and live duration from `modalities`. |
| W-08 | `/#/site/classes/:slug` | **New.** One class in full: the essay, the modality facts (duration, intensity, heated, movement), a derived "what to bring" list, links to the other classes and a CTA into the filtered schedule. |
| W-03 | `/#/site/modalities` | Every modality now cross-links to the class essay it belongs to (`brand.classes[*].modalitySlugs` is the join). |
| W-04 | `/#/site/schedule` | The movement legend is now a filter (`?movement=`), which is what W-08's schedule CTA links to. |
| W-05 | `/#/site/teachers` | Each teacher gets a real 4:3 portrait slot (their `photo_url` when it exists, a branded art-pending frame when it does not). |
| P-01 | `/#/site/plans` | Each family shows its commercial role, subtitle and "Por qué existe" paragraph; the Annual Plan carries its monthly-equivalent footnote; a dark band prints the four discipline numbers (15 · 4 · 1 · 5) and the investor paragraph; an "¿Incluye IVA?" card reads the live M-08 tax policy. |
| W-06 | `/#/site/contact` | `MapSlot` replaces the "mapa pendiente" box, every placeholder contact detail is labelled as pending, and an "escríbenos" form opens WhatsApp with the message prefilled (no backend). |

New shared components: **`MediaSlot`** (the one slot every future photo, video or illustration is
booked with) and **`MapSlot`** (the studio's location, offline-safe by default). Both are in D-02 at
`/#/dev/components`.

Two facts changed in `src/tenant/tenant.ts`: the city is **Medellín** (the brand manual is headed
"Medellín · 2026" and the copy names it; the timezone stays `America/Bogota`, Colombia's only IANA
zone), and `tenant.location` holds approximate El Poblado coordinates marked "por confirmar".

## Shot list — the artwork to produce

Every slot below is already on the site, at the right ratio, with its brief printed in dev mode.
Drop a file in and pass it as `src` — nothing else changes.

| # | Page | Slot | Ratio | Kind | Brief |
| --- | --- | --- | --- | --- | --- |
| 1 | W-01 | Hero | 21:9 | video | Studio at golden hour, slow dolly. The one asset that carries the whole landing page. |
| 2 | W-02 | Founders / interior | 4:3 | photo | Founders / studio interior, natural light, no posed smiles. |
| 3 | W-07 + W-08 | Hot Yoga | 16:9 | photo | Hot room mid-class, low warm key light, steam on the glass, one figure in downward dog. |
| 4 | W-07 + W-08 | Barre | 16:9 | photo | Hands on the barre, shallow depth of field, calf and heel lifted, cream wall behind. |
| 5 | W-07 + W-08 | Pilates | 16:9 | photo | Mat work from above, spine long, teacher's hand cueing the ribcage, morning light. |
| 6 | W-07 + W-08 | Meditación | 16:9 | photo | Seated circle at dusk, one lamp, eyes closed, no faces identifiable. |
| 7 | W-07 + W-08 | Respiración | 16:9 | photo | Close crop of a chest and shoulders mid-inhale, soft backlight, cream tones. |
| 8–15 | W-05 | Teacher portraits ×8 | 4:3 | photo | One portrait per active teacher (Andrés, Paula, Santiago, Manuela, Daniel, Isabela, Felipe, Carolina): studio light, cream backdrop, same crop for all eight so the grid reads as one set. |
| 16 | W-06 | Map | 4:3 | map | Not artwork: a provider decision. `MapSlot` ships `provider="none"` (offline-safe placeholder plus a Google Maps deep link); switch to `"osm"` for a key-less embed or `"google"` once a key exists. |

**15 artworks (1 video, 14 photographs) across 16 slots** — the five class photographs each appear
twice (the W-07 card and the W-08 hero), and the eight portraits should come from one session.

## Next level — 15 ideas, in the order I would fund them

> **2026-09-17 (0018):** Justin picked items 2, 4 and 6 as his top three; they open `ROADMAP.md` **§G — When nothing else
> is queued**, followed by the rest of this list. Item 3 (contact details) is now a setting in M-08a and the map
> provider (item 16 of the shot list) a setting in M-08f.

1. **Produce the shot list (P0).** Every slot above is reserved and labelled. One photo day plus one
   short video pass takes the site from "clearly a placeholder" to finished. Nothing else on this
   list changes the first impression as much.
2. **SEO and Open Graph metadata, plus a prerender step (P0).** The site is a hash-routed SPA on
   GitHub Pages: today a WhatsApp or Instagram link preview shows nothing, and search engines see one
   empty shell. Add per-route `<title>`/`<meta name="description">`/OG tags (a small `usePageMeta`
   hook next to `useLayout`) and a build step that writes a static HTML snapshot per public route.
   Cheap, and it is the difference between being findable and not.
3. **Real contact details and the confirmed address (P0, owner decision).** WhatsApp, email, address,
   Instagram and `tenant.location` are placeholders flagged `pending`. Everything downstream — the
   map, the footer, the WhatsApp deep links, the invoices — reads those four fields.
4. **"Next class in N minutes" widget (P1).** The data is already in `class_sessions` and the site
   already reads it. A live line in the header or hero ("Hot Vinyasa empieza en 42 min · 3 cupos")
   turns the schedule from information into urgency, and it is a few hours of work.
5. **Class-finder quiz (P1).** Three questions — how do you want to feel, how much time, heat or no
   heat — mapped onto the four movements and the five classes, ending on a filtered schedule. It
   answers the one question the copy admits people have ("no necesitas elegir la correcta").
6. **Membership calculator (P1).** A slider for visits per month that compares the Monthly Plan, the
   10-class pack and single passes using `src/tenant/pricing.ts`, and names the break-even. It makes
   the value model argue for itself, and it is the natural companion to the discipline band.
7. **Motion and scroll choreography (P1).** The brand voice is calm, so the motion should be too: a
   slow reveal per section, a parallax drift on the hero media, the breathing rings from the old hero
   reused as a scroll indicator. All through `--dur-*` / `--ease-*` tokens, all behind
   `prefers-reduced-motion`.
8. **Accessibility pass (P1).** Contrast audit of the movement tints in both themes (two dark-mode
   heading colours were already corrected in this pass), visible focus order through the new nav and
   the classes grid, a skip link, and a keyboard run through the schedule drawer and the contact form.
9. **Journal / blog from `content_articles` (P2).** The table and its bilingual markdown bodies
   already exist in the seed and are editable in admin; the site never shows them. A `/site/journal`
   index plus `/site/journal/:slug` would give the studio a reason to be visited between bookings and
   would feed the SEO work in item 2.
10. **Teacher spotlight series (P2).** One teacher per month: a long-form page from `teachers.bio`
    plus three questions, a portrait from the shot list and their upcoming classes. It reuses W-08's
    layout and gives the teachers something to share.
11. **Instagram feed slot (P2).** A six-tile grid under the footer, fed by the Instagram Basic Display
    API through a tiny cached endpoint (never a client-side token). Until then, `MediaSlot` with
    `kind="photo"` and a "feed pending" label holds the space honestly.
12. **WhatsApp deep links everywhere (P2).** The contact form already builds a prefilled `wa.me`
    link. Extend the pattern: a per-class "ask about this class" link, a per-plan "ask about this
    plan" link, and a booking-intent link from the schedule drawer — each with the context in the
    message so the front desk does not have to ask twice.
13. **PWA install (P2).** A manifest, an icon set from the wordmark and a service worker that caches
    the shell would let members keep HOY on the home screen. Best done after the customer app's
    offline story is decided, so it is one decision, not two.
14. **Testimonial curation (P3).** The home page reads real `reviews` rows with comments. Add a
    `featured` flag (or a small admin picker) so the studio chooses which three appear, instead of
    taking the three most recent.
15. **Bilingual SEO and the `/en` question (P3).** The language toggle is client-side, so both
    languages share one URL and only one can be indexed. If the English audience matters (foreign
    residents, visitors), the site needs real per-language URLs — which is a routing decision worth
    making once, with item 2.

## Notes for whoever picks this up

- All brand prose lives in `src/tenant/brand.ts`. Adding a class means adding one entry there (with
  its `modalitySlugs` so the schedule joins) — no page needs editing.
- The class slugs are `hot-yoga · barre · pilates · meditacion · respiracion`. They map onto the
  seeded modality slugs `hot-vinyasa`, `barre`, `pilates`, `meditacion` + `yin`; **respiración has no
  modality row**, because today it is taught inside the guided classes, and W-08 says so in words.
- Never add a photograph as a bare `<img>`: use `MediaSlot`, so the missing ones stay visible and the
  shot list above stays true.

---

## Resumen (ES)

El sitio público ya es la marca en código: todo el texto del manual de marca (manifiesto, «Sobre
HOY», filosofía y los cinco ensayos de clase) vive una sola vez en `src/tenant/brand.ts`, y el «por
qué existe» de cada familia de precios en `src/tenant/pricing.ts`. Se rehízo la portada (W-01), se
amplió Sobre HOY (W-02), se crearon **Clases** (W-07) y **Clase** (W-08), Planes (P-01) ahora explica
el modelo y la disciplina (15 · 4 · 1 · 5) y muestra la nota de IVA leída de M-08, y Contacto (W-06)
tiene mapa, CTA de WhatsApp y formulario. Dos componentes nuevos: `MediaSlot` (todo hueco de foto o
video del sitio) y `MapSlot`. La ciudad del estudio pasó a **Medellín**.

Falta, sobre todo, **la imagen**: son **15 piezas (1 video y 14 fotos) en 16 huecos**, todos ya
reservados con su proporción y su brief (ver la tabla «Shot list»). Después de las fotos, las tres
prioridades son: metadatos SEO/OG con prerender para GitHub Pages, confirmar los datos de contacto y
la dirección real, y el widget «próxima clase en N minutos». La lista completa, en orden de
prioridad, está arriba.
