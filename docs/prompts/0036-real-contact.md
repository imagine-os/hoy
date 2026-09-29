# Real phone and address for the studio

Source: Slack thread (#hoy) · 2026-09-29 13:08 (America/Bogota) · requester: Justin Massion

## Prompt

Phone number for hoy. The address is same as Santa maria tenis club in poblado medellin . You can look it up and uodate the site and app

_Attachment: a WhatsApp contact screenshot showing the contact "HOY · +57 312 7765000 · Celular"._

## Response

Branch `feat/real-contact` from `main` at `b265ac7` (merged with `41757ad`, the 0031 manual LMS), version **0.13.1**. Full record in
`docs/changelog/0036-real-contact.md`.

1. **Phone**: `+57 312 776 5000` (E.164 `+573127765000`; `waLink()` strips it to `https://wa.me/573127765000`), from the
   owner's contact card.
2. **Address**: the studio shares the premises of Santa María Tenis Club. The club's own site
   (<https://www.santamariatenisclub.com/>, checked 2026-09-29) publishes **Cl. 7B Sur # 29C-100, El Poblado, Medellín,
   Antioquia** (the easycancha listing writes the same address as "Calle 7b sur # 29c – 100"; the club describes the spot
   as "entre la loma Los Balsos y Los González, detrás del supermercado La Vaquita de la Transversal inferior").
   **Coordinates** 6.19281, -75.56535 from the club's easycancha listing
   (<https://www.easycancha.com/es-CO/colombia/arriendo/deportes/practica-libre/antioquia/medellin/santa-maria-tenis-club>);
   the club's own page embeds a Google map by address, not by coordinates. Map link: a Google Maps search for the address.
3. **Per-field confirmation**: M-08a's single "Datos confirmados" switch became four (WhatsApp, address, email, Instagram).
   `tenant.ts` ships WhatsApp and address confirmed, email and Instagram pending, so the phone and the address render
   as plain facts on W-06, the site footer (every site page, the address now links to the map), MapSlot (offline
   placeholder shows the street address + the Google Maps link), C-25 "Más" (new "Cómo llegar" row), C-26 (the data
   controller paragraph now names the address and the WhatsApp), the A-06 legal tokens, the M-04 email footer and the
   manual's `{{tenant:contact}}` block. The email keeps its "pendiente" label everywhere (now also in the legal tokens,
   the C-26 paragraph and the M-04 envelope); Instagram keeps it on W-06, the footer and the manual.
4. **Still pending**: the studio's email (`hola@example.com` placeholder), Instagram handle (`@hoy` placeholder), NIT, and
   the owner's own Google Maps share link (M-08a field stays empty; the search link is the default). S-04 receipts print
   the legal name only, no address, so nothing changed there.
5. **Docs**: changelog 0036, kanban, README, ROADMAP §A and §E 21, page docs W-06, C-26, M-08a; W-06 and M-08a recaptured
   (ES + EN, 390 + 1280, light + dark).
