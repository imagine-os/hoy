# Website V2 validation

Validated on September 25, 2026 against deployed website release 2.0, commit `8188730`:
[Sanctuary website](https://imagine-os.github.io/hoy/#/site?version=sanctuary).

## Build and source checks

- TypeScript and production build passed.
- Source audit fixes: validated edition deep links persist for subsequent website navigation; Classic retains its original default section order; pricing links target the supported plans route; narrow-header language controls use the correct selector; requested ambient videos remain mounted when scrolled offscreen.
- Class slugs and movement-filtered schedule links match the existing routes. Schedule filter changes retain other query parameters.
- Scope: website pages and additive shared components/tokens only. The data provider, hub, operations screens and authentication were not replaced.

## Live visual and interaction checks

- Desktop Sanctuary composition inspected: architectural imagery, typography, stone controls and section layout render correctly.
- Below-fold desktop review covered movement controls, all five class images, community/teachers, pricing and the closing section; no overlaps, clipped text or missing images were found.
- At a 390 CSS-pixel mobile viewport, the header controls fit; the menu opens and closes; navigation to the schedule works.
- Selecting a scheduled class opens the correct sign-in reservation dialog and displays its availability.
- Spanish and English home views, plus the mobile dark appearance, were visually inspected.
- The edition dropdown switches between V1 and V2; website navigation retains the selected edition. The Arde schedule control filters the visible sessions and updates the URL.
- Saved 52 responsive captures: W-01–W-09, P-01, and both A-06 legal routes in ES/EN at 390/1280 CSS pixels, plus four dark home views. See the [capture manifest](website-capture-manifest.json). Class detail was reached through the public classes listing because the simulator route picker omits parameterized routes.
- Responsive captures use actual 390 and 1280 CSS-pixel device-simulator viewports inside browser chrome. The saved screenshot can include that chrome and a scaled simulator frame; its image pixel width is not a claim about the website viewport width.
- Clean desktop reference: [Sanctuary desktop screenshot](screenshots/W-01/es-1348-sanctuary.jpg). Responsive home references: [ES mobile](screenshots/W-01/es-390.jpg), [EN mobile](screenshots/W-01/en-390.jpg), [ES desktop](screenshots/W-01/es-1280.jpg), [EN desktop](screenshots/W-01/en-1280.jpg).

## Validation limits

- The runtime uses `MockProvider`. These checks validate the existing website data interfaces and demo interactions, not a live external database, production reservation, payment or external authentication transaction.
- No video was generated, charged or played as part of this release. Ambient backgrounds currently display their image posters; video playback and loop seams remain to be checked when final clips are supplied.

**Resumen (ES).** Compilación y revisión de código aprobadas. Se revisaron escritorio, móvil de 390 px, ES/EN y modo oscuro móvil; el menú, el horario y el diálogo de reserva funcionan con los datos de demostración. No se probaron una base de datos externa ni videos.
