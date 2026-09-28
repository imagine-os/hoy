# Responsive QA matrix, 2026-09-28

Reserve / register flow (C-01, C-02, C-04, C-06, C-08, A-02, A-03, A-05, W-04, W-05, P-01) at 360, 390, 768, 1280, 1920, 2560, 3840 px, ES and EN, light theme (plus dark for C-04 and C-06). Captured with `node scripts/screenshots.mjs --widths=360,390,768,1280,1920,2560,3840 --pages=C-01,C-02,C-04,C-06,C-08,A-02,A-03,A-05,W-04,W-05,P-01 --dark=C-04,C-06` on branch `claude/responsive-screenshots` (build of `claude/responsive-app-shell`). Model: Sonnet 5.5.

Note on codes: the brief said "W-05 site plans". In the route manifest W-05 is `/site/teachers` and the site plans page is P-01 `/site/plans`; both were captured.

## How this was checked
- Visually inspected (Read) at 360, 1280 and 3840, ES, light, all 11 pages. EN and dark captures exist but were not inspected one by one; EN/ES copy is the only expected difference.
- 390, 768, 1920 and 2560 were checked by a DOM audit in Chromium (same session and viewport as the screenshots; horizontal overflow, interactive elements under 44 px in either dimension, visible text under 16 px computed size), not by eye.
- Audit numbers are CSS px. The customer/auth shell scales the root font (16 px to 18 / 22 / 28 px at 1920 / 2560 / 3840); the public site header, week grid and several fixed-px controls do not.

## Matrix
`pass` = nothing beyond the family-wide issues G1 to G4 below. Otherwise the cell names the issue ids.

| Page | 360 | 390 | 768 | 1280 | 1920 | 2560 | 3840 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 home | pass | pass | pass | pass | G3 | pass | pass (I-10) |
| C-02 schedule | I-02 I-03 I-04 I-05 | I-02 I-03 I-05 | I-02 I-03 I-05 | I-02 I-03 I-05 | I-02 I-03 | I-02 | I-02 I-03 |
| C-04 checkout | I-06 I-07 | I-06 I-07 | pass | pass | G3 | pass | I-08 I-09 |
| C-06 plans | pass | pass | pass | pass | G3 | pass | pass |
| C-08 booked | pass | pass | pass | pass | G3 | I-11 | I-11 |
| A-02 sign-in | pass | pass | pass | pass | I-12 | I-12 | I-12 |
| A-03 sign-up | I-13 | I-13 | I-13 | I-13 | I-13 G3 | I-13 | I-13 |
| A-05 intention | pass | pass | pass | pass | G3 | pass | pass |
| W-04 site schedule | I-14 I-02b | I-14 I-15 | I-02b | I-02b | I-02b G4 | I-02b G4 | I-02b G4 |
| W-05 site teachers | I-14 | I-14 | pass | pass | G4 | I-16 (not viewed) | I-16 G4 |
| P-01 site plans | I-14 I-17 | I-14 I-17 | I-17 | I-17 | I-17 G4 | G4 | I-17 G4 |

Dark (C-04, C-06): captured at all widths; not inspected. The DOM audit was run in light only.

## Family-wide issues (apply to every page in the family, not repeated per cell)
- **G1** Customer/auth top bar (C-*, A-*): brand link `a.topbar-brand` is 67x24 (height under 44); the ES/EN buttons are 34x44 and 35x44 (width under 44). Confirmed at 360 and 1280; the brand link is still 24 tall at 3840, ES/EN scale up there. Public site: ES/EN 34x44 / 26x44 at 360.
- **G2** Inline text links under 44 px tall: `Elegir mi intención →` 21 (C-02), `Reglas del club →` 18 (C-08), `Olvidé mi contraseña` 21, `Crear cuenta` 18, `Política de privacidad` 16 and `Hub` 23x16 (A-02, A-03), `Términos y condiciones` 18 (A-03), `Hoy no, gracias` 16 (A-05), site footer links 21 (W-04, W-05, P-01). At 3840 they are 28 to 37 tall, still under 44.
- **G3** At 1920 the eyebrow labels and small captions compute to 12.4 px (11 px x 1.125) and 13.5 px, well under the 16 px-equivalent bar (28 to 44 text nodes per page). At 2560 and 3840 only the avatar initials (13.7 px) remain in the customer shell.
- **G4** Public site (W-*, P-01) at 1920 and up: header nav links (34 px tall), `Entrar` (66x36), version select (38 tall) keep their 1280 size; site body copy and captions stay at ~14 px, so at 3840 the header and footer captions are unreadable from a distance. The content column stops at about 1400 CSS px, so on a 3840 screen it fills roughly a third of the width.

## Page issues
- **I-02** C-02, all widths: the page renders two calendars stacked, a Day view and a Week view, each with its own Hoy / Dia / Semana / Mes controls and date input (the second date input shows a different date, 09/29 vs 09/28). Looks like a duplicated or unconditionally rendered instance. Verify it is intended. **I-02b** W-04 shows the Week view only, fine.
- **I-03** C-02 and W-04, every width including 3840: week-grid text is fixed 10 px (day heads, `4 clases`, card time / teacher / seats); 87 to 125 text nodes under 16 px. Does not follow the root scaling. Unreadable at 1920+.
- **I-04** C-02 at 360: the movement chip row is clipped at the right edge (`Fluye` cut, `Filtrar` half visible) and needs a horizontal swipe.
- **I-05** C-02 and W-04 up to 768: the Week and Month calendars need horizontal swiping (`desliza el calendario`); reaching later days is drag/scroll-only, the Day view is the only non-swipe path.
- **I-05b (copy, not layout)** ES date title-cased `28 De Septiembre De 2026`; native date inputs show `mm/dd/yyyy` in ES (C-02, A-03, W-04); `1 cupos`.
- **I-06** C-04 at 360 and 390: 16 mat buttons are 34x48 (width under 44), only 3 to 4 per row of 8 fit at 360 with ~8 px gaps.
- **I-07** C-04 at 360 and 390: the sticky `Confirmar reserva` bar sits over the content above the dock; text from the layer below shows through it, and the `Pagar con` payment options are pushed out of the first screen.
- **I-08** C-04 at 3840: the confirm bar is drawn in the middle of the payment list and hides the `Clase de Prueba` option (list jumps from Membresia to Pase Individual). The page (1714 px tall) is shorter than the 2160 px viewport, so the sticky offset is wrong here.
- **I-09** C-04 at 3840: the mat picker is a narrow centred column (about a third of the content width) beside a full-width class card and payment column; mats and legend look small next to everything else.
- **I-10** C-01 at 3840: the page is 1225 px tall in a 2160 px viewport, the lower 40 percent of the screen is empty. Cosmetic.
- **I-11** C-08 at 2560 and 3840: the countdown ring stays about 175 CSS px while the rest of the page scales, and `EMPIEZA EN` wraps onto two lines inside it; the page fills only the top half of the viewport.
- **I-12** A-02 at 1920, 2560, 3840: the demo-user initials in the avatars compute to 12.2 px (8 text nodes under 16 px).
- **I-13** A-03, all widths: the terms checkbox is 20x20 and does not scale (44 px hit area not confirmed); the profile-photo avatar stays small at 3840.
- **I-14** W-04, W-05, P-01 at 360 and 390: the version `<select>` shrinks to 90 px and truncates `V2.3 · Video`; the icon buttons are 30x44 and the burger 26x44 (width under 44).
- **I-15** W-04, W-05, P-01 at 390: horizontal page overflow (`scrollWidth` above 390): `site-actions` and the burger button are pushed past the right edge, the burger is cut off in `docs/screenshots/W-05/es-390.jpg`. At 360 the select shrinks and it fits, at 390 it does not.
- **I-16** W-05 at 3840 (2560 likely, not viewed): the teacher grid is 5 columns inside the ~1400 px column at 28 px root font, so names break mid-word (`Santia|go`, `Carolin|a`, `Quinte|ro`), the rating wraps (`4.|5`), chips wrap to 2 lines and the disclaimer paragraph is tiny. Cards are about 130 CSS px wide.
- **I-17** P-01 (all widths): the `Escribirnos por WhatsApp` (216x18) and `Horario ↗` (76x18) `a.btn` links are 18 px tall at 360 to 1280, 30 px at 3840.

## Counts
17 distinct page issues (I-02 to I-17 plus I-05b, I-02b as a note) and 4 family-wide issues; 1 blocking layout bug at a phone width (I-15), 2 overlap bugs (I-07, I-08).
