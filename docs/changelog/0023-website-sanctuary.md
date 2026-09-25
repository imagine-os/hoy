version: website 2.0 / HoyOS 0.9.1
date: 2026-09-25
prompt: docs/prompts/0023-website-sanctuary.md
intent: Transform only the public website using Aleja's supplied premium wellness direction.
decision: Preserve the original edition, existing data/CMS seams and routes; implement tactile editorial V2 with supplied images, atmospheric generated art, restrained motion and prepared video inputs.
rejected: Resetting the hub, inventing teacher portraits, claiming production backend readiness, or spending fal credits without a generation request.
files: src/modules/website/*; src/components/organism/AmbientScene/*; src/components/molecule/SiteVersionSelect/*; src/components/molecule/MediaSlot/*; src/design/tokens.*; public/images/sanctuary/*; docs/website-*; docs/pages/W-*.md; docs/pages/P-01.md

W-01–W-09 and P-01 retain their existing functionality. V1 keeps the previous home composition/styles. V2 defaults for new visitors, with ES/EN, light/dark and responsive layouts. New materials never replace global design values used by other HoyOS surfaces.

Build/typecheck passes. A read-only source audit caught and resolved edition navigation persistence, V1 section order, unused pricing query parameters, narrow-header selectors and video offscreen retention. Live visual and interaction checks are recorded in `docs/website-validation.md` after deployment.

Current provider is MockProvider. Classes, teachers, CMS and contact configuration remain connected through their existing shared provider. No external production database or payment integration is newly activated. No video generated or charged.

[Original screenshot](../screenshots/W-01/es-1280-before.jpg) · [V2 screenshot](../screenshots/W-01/es-1280.jpg)

**Resumen (ES).** Santuario V2 rediseña solo el sitio web. Se conserva V1 y la capa compartida de datos. Texturas, fotos y animación suave ya implementadas; videos preparados y pendientes.
