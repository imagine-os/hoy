# Website: remove "How do you want to feel today"

Source: Slack thread (#hoy) · 2026-09-29 12:05 (America/Bogota) · requester: Justin Massion

## Prompt

erase the "How do you want to feel today" component from the experience.

_Note: this is the website half of the same ask. The app side (A-05, the daily intention, and the C-01 card) was retired in 0030 (PR #6); this pass removes the same question from the public website (W-01)._

## Response

Branch `fix/site-no-feel-today` from `main` at `127d656`, version **0.12.2**. Full record in
`docs/changelog/0034-site-no-feel-today.md`.

1. **W-01, V2 (Sanctuary, default)**: the `Movements` section — eyebrow "01 / EL MOVIMIENTO", heading
   "¿Cómo quieres sentirte hoy? / How do you want to feel today?", body "Cuatro formas de volver a ti…" and the four
   stone links to `/site/schedule?movement=` — is gone. The page now runs Hero → Philosophy → Classes → Today → Teachers →
   Plans → Testimonials → First step, and the chapter eyebrows are renumbered (`01 / TU PRÁCTICA`, `02 / NOS ENCONTRAMOS`).
2. **W-01, V1 (classic)**: its `Movements` section ("Cuatro movimientos", body "…Elige cómo quieres sentirte hoy…") is gone too.
3. **Spec and layout editor**: `Movements` is retired from `siteSpecs.home.layout`, so `/#/dev/layout/W-01` no longer
   lists it; a stored layout that still names it drops the id. The spec purpose no longer mentions the four movements.
4. **Strings removed**: `site.new.movements`, `site.new.movementsBody`, `site.new.chapter1`, `site.movements.title`,
   `site.movements.body`, `site.mv.enraiza|fluye|arde|libera` (no other caller). The `.sanctuary-stone*` /
   `.sanctuary-movements` CSS is removed; the stone images stay in `public/images/sanctuary/` (not rendered).
5. **Kept**: the four movements as internal labels — the class meta line on W-01 ("01 / Arde"), the W-04 schedule legend
   and `?movement=` filter (headed "Leyenda", not framed as a feeling), W-03, W-07 and W-08.
6. **Docs**: W-01 page doc, website vision, website assets, flow map, hub map, kanban, README; W-01 recaptured
   (ES + EN, 390 + 1280, light + dark, plus the 390 full-page and hub thumbnails).
