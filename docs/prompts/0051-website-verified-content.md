# Website: the studio's verified content, the FAQ and the terms

Source: Claude Code session · 2026-10-01 · Justin Massion, forwarding Lorena Medina

## Prompt

Attachments: `HOY_Terminos_y_Condiciones.docx`, `HOY_FAQ_Corrections_Remove.docx`, `WEBSITE_MODIF.pdf`
(kept in `reference/uploads/`; the PDF as a text extract, `WEBSITE_MODIF.md`).

[10/1/26, 4:46:07 PM] Lorena Medina: WEBSITE MODIF contains all adjustments with verified info
[10/1/26, 4:46:15 PM] Lorena Medina: FAQ and terms and conditions are new
[10/1/26, 4:46:23 PM] Lorena Medina: i mean they are not in the website yet

Please update the website. And see if there's anywhere in the user manual or elsewhere this info applies to. The instructions are in the docs.

make sure the FAQ section is beautiful.

Send screenshots of each of the changes when ready

Merge when ready

## Brief (decided before the build)

1. **WEBSITE MODIF is the source of truth** for the public copy, the seven classes, the teachers, the prices and the
   contact. Every string stays bilingual; the English is a translation of the verified Spanish.
2. **The business model changes with it.** The launch price list has no membership, no credits and no short pauses:
   a trial class, an individual class, the 12-class package (3 months, freeze once ≤ 30 days, non-refundable, a
   special price for Santa María Tennis Club affiliates), private classes (≤ 3 people, + per extra person) and gift
   cards at the class price. `credits` becomes `class_ledger`; memberships stay as a dormant table; C-22 is retired.
3. **The FAQ doc's REMOVE list applies everywhere:** credits, self check-in (reception only), Nequi and Daviplata,
   and the teacher payroll "ask about the statement" WhatsApp button.
4. **Real teacher names** are the studio's published team; they replace the fictional demo teachers. No generated
   portrait, invented bio or public rating stands next to a real name: a monogram in the tone of their class.
5. **The FAQ page is new (W-10)** and has to be beautiful: search, a topic index, numbered sections, an editorial
   accordion and the live price table inside the answers.
6. **Terms v2.0** publish the owner's document as written, with the yellow "Por definir" items shown as visible
   callouts, never filled in by us.
7. The ops manual (ES + EN), the page docs, the component library, the schema and the screenshots follow in the same
   turn.

## Response

Shipped as **v0.22.0** (changelog `docs/changelog/0051-website-verified-content.md`).

- **Website.** Hero line "Muévete. Respira. Vive el presente."; "Movimiento para todos" panel; the classes band
  ("No venimos a entrenar cuerpos. Venimos a despertar presencia." + the seven-methodologies sub-head) with seven
  `ClassArch` arches (title + keywords); "¿Cómo te quieres mover hoy?"; About gains "La filosofía de HOY"
  (Nuestra filosofía · Nuestro propósito); W-07 "Nuestras clases" rewritten with the seven classes; W-08 per class
  (concept, intention, keys, messages, method, intensity, what to bring, who guides it); W-04 schedule on the seven
  classes; W-05 the seven real teachers with their class; P-01 the launch price list; W-06 contact with WhatsApp
  Business, info@humanclub.com, @hoyhumanclub and the landmark; **W-10 Preguntas frecuentes** (new).
- **Terms and policies.** Terms v2.0 (14 sections) published with "Por definir" callouts; cancellation and refund
  policies rewritten (12 h, no-show rule, illness reschedule, non-refundable package).
- **Member app.** C-06 Paquetes, C-07 trial / individual, C-07b **Mis clases** (balance, expiry, freeze once, resume),
  C-04 pays with a package class, C-05 card / PSE / Wompi QR (+ pay at the desk, as the terms allow), C-17 gift
  cards (class or package, quantity), C-22 retired → C-07b.
- **Staff and teacher.** S-04 sells the launch items, private classes by number of people, Wompi QR at the desk, no
  Nequi; S-03 roster is read-only (check-in only at reception) with "Cerrar clase"; payroll statement without the
  WhatsApp ask; rosters translate how a booking was paid.
- **Everywhere else.** Seed (classes, teachers, timetable, ledger, FAQ, messages), schema + SQL + data model,
  component library (ClassArch, PriceTable, FaqAnswer, PackageCard, ClassThumbnail tone tile), the ops manual
  chapters 01–27 in both languages, admin templates (package expiring), hub map.
- **Open with the owner:** the "Por definir" items of the terms, illness evidence, corporate prices, the NIT, room
  temperature per class, the gift-card redemption flow at the desk.
