version: 0.22.0
date: 2026-10-01
prompt: docs/prompts/0051-website-verified-content.md
intent: Lorena (via Justin): "WEBSITE MODIF contains all adjustments with verified info · FAQ and terms and conditions are new" — "Please update the website. And see if there's anywhere in the user manual or elsewhere this info applies to … make sure the FAQ section is beautiful. Send screenshots of each of the changes when ready. Merge when ready"
decision: (1) **The verified content replaces the placeholders everywhere it appears.** Hero line "Muévete. Respira. Vive el presente."; "Movimiento para todos"; the classes band "No venimos a entrenar cuerpos. Venimos a despertar presencia." with the seven-methodologies sub-head; "¿Cómo te quieres mover hoy?"; About "La filosofía de HOY" (Nuestra filosofía · Nuestro propósito); W-07 "Nuestras clases"; contact WhatsApp Business +57 312 776 5000, info@humanclub.com, @hoyhumanclub, "Contiguo al Colegio Santa María del Rosario" (all four `confirmed`). (2) **Seven classes** (Ligereza, Híbrido, Fuego, Sólido, Centro, Alineación, Pulso) in `src/tenant/brand.ts` with concept, intention, keys, messages, method, intensity and one tone each (river, plum, clay, slate, moss, sage, sun); modalities, timetable (Mon–Fri 4 + Sat 4), media slots and every class surface follow. The arches the brief asked for are a new **ClassArch** molecule (tone gradient, limestone overlay, number, name, tagline, keywords; a ready `site.classes.<slug>` photo fills it). (3) **Seven real teachers**, one per class (Carolina Cifuentes · Pulso, Raghu · Híbrido, Sara Estrada · Fuego, Andre Cardona · Sólido, Sara Crismatt Duque · Ligereza, María Camila Pinzón · Alineación, Tatiana Ramirez · Centro); the teacher demo persona is Carolina. They are the studio's published team, so they are not "personal data" in the sense of the repo rule; account email and phone stay fictional, there is no generated portrait, invented bio or public rating next to a real name (a monogram in the class tone instead), and seeded conversations and events never name a real teacher. (4) **The launch price list** (`src/tenant/pricing.ts`): trial 35 000, individual 55 000, 12-class package 600 000 (3 months, freeze once ≤ 30 days, non-refundable), the same package for Santa María Tennis Club affiliates 480 000, private class 250 000 (≤ 3 people) + 60 000 per additional person, gift cards at 55 000 / 600 000; space and corporate stay on request. **HOY sells classes, never credits:** the `credits` table is renamed `class_ledger` (+ `frozen_from` / `frozen_until`), `paid_with: 'credit'` → `'package'`, `memberships` stays a dormant table and C-22 is retired (redirects to C-07b). Policies move to a pure `src/tenant/policies.ts` (cancellation 12 h, freeze 30 days × 1, …) that the seed can import without React. (5) **The FAQ doc's REMOVE list, applied everywhere:** credits (app, staff, admin, manual, templates, samples), self check-in (the S-03 roster is read-only; check-in is only at reception; `checkin.write` leaves the teacher role), Nequi and Daviplata (customer, desk, admin, flags, integration copy), the teacher payroll "Preguntar por el extracto" WhatsApp button. (6) **W-10 Preguntas frecuentes (new page)**: search with accent folding, a sticky numbered topic index (chips under 1024 px), five numbered sections, the new editorial `Accordion` variant, answers rendered by **FaqAnswer** where a `{{pricing:<families>}}` line becomes a live **PriceTable**, the first question open, a closing contact card and FAQ JSON-LD; linked from the nav, the footer, P-01 and contact. (7) **Terms v2.0** publish the owner's 14 sections as written; the yellow "Por definir" items render as highlighted callouts (`LegalDocument` `legaldoc-pending`), never filled in by us; `{{price.<id>}}` and `{{tenant.landmark}}` / `{{tenant.instagram}}` tokens keep numbers in one place. Cancellation and refund policies rewritten to the FAQ (12 h, no refund for a no-show, illness → reschedule). (8) **Member app.** C-06 Paquetes, C-07 trial / individual, C-07b **Mis clases** (classes left, expiry, freeze once with preview, resume early, every movement), C-04 pays with a package class, C-05 card / PSE / Wompi QR plus paying at the desk (the terms keep cash at reception), C-17 gift cards with quantity 1–10. (9) **Desk and admin.** S-04 sells the launch items, the private class by number of people (price computed), Wompi QR at the desk; rosters (S-02, S-03) translate how a booking was paid (closes the 0049 follow-up); M-06 "Sin clases" segment; M-10 Wompi copy; M-05 / M-04 default template "Paquete por vencer" replaces the membership renewal; M-12 "Paquetes por vencer" (`packagesExpiring*`); M-08a freeze fields replace the membership pause, M-08f loses the retired breathwork toggle, M-08b no longer seeds Nequi / Daviplata flags. (10) **Ops manual, ES + EN:** chapters 02 (seven classes), 03 (value model), 10 (sales), 11 (frozen packages and gifts) rewritten; 01, 04–09, 13, 14, 16, 17, 19–21, 24–27, the index and STYLE corrected; new studio keys `smtc_benefit`, `booking_lead`, `no_show_rule`, `checkin_rule`, `class_language`. (11) Seed version 9; `npm run sql` regenerated `supabase/schema.sql` and `docs/data-model.md`.
rejected: Keeping the membership and credits running beside the launch list ("they may come back") — rejected: the FAQ says there is no credit system and the price list has no recurring plan, so two models would contradict the public page; the table stays dormant, nothing sells it. Publishing the terms with our own answers in the "Por definir" gaps — rejected: those are legal decisions for the owner; they show as visible callouts until she decides. Generated portraits for the real teachers — rejected: a fabricated face next to a real name misrepresents a person; monograms until the photo session. Keeping the class concept photos (hot yoga, barre, pilates…) on the new classes — rejected: they show practices the studio no longer names; the tone arches carry the classes until real photos land. Removing cash from the member app because the FAQ lists only website / QR / PSE — rejected: the owner's terms (§6) keep "en recepción hay diferentes medios de pago, incluido el efectivo".
files: src/tenant/{pricing.ts,brand.ts,tenant.ts,policies.ts}; src/data/{schema.ts,packages.ts,analytics.ts,useAnalytics.ts,labels.ts,mats.ts,MockProvider.ts}; src/data/seed/{catalog.ts,index.ts,content.ts,legal.ts,media.ts,messages.ts,specials.ts,views.ts,studioPolicies.ts,expenses.ts,manual.ts}; src/auth/{demoUsers.ts,permissions.ts}; src/components/molecule/{ClassArch,PriceTable,FaqAnswer}/* (new); src/components/molecule/{PackageCard (was MembershipCard),Accordion,PriceRow,ClassThumbnail}/*; src/components/organism/{LegalDocument,LiveBlock,MarkdownViewer}/*; 17 component metas (samples: classes, packages, no credits, no Nequi); src/modules/website/{strings.ts,specs.ts,index.ts,pages.ts,hooks.ts,jsonLd.ts,artwork.ts,SiteShell.tsx,faq.css,site.css,sanctuary.css}; src/modules/website/pages/{HomePage,ClassicHomePage,AboutPage,ClassesPage,ClassDetailPage,TeachersPage,PlansPage,ContactPage,SchedulePage,ModalitiesPage,FaqPage (new)}.tsx; src/modules/customer/{strings.ts,specs.ts,hooks.ts,policy.ts,payments.ts,actions.ts,index.ts,pages.ts,HomePage.tsx,legal.tsx} + pages/{PlansPage,PassesPage,CheckoutPage,PaymentMethodsPage,GiftPage,MorePage,ProfilePage,ClassDetailPage,SchedulePage,BookedPage}.tsx, pages/MembershipPage.tsx (deleted); src/modules/staff/{RegisterPage,CheckinPage}.tsx, rooms.ts, strings.ts; src/modules/teacher/{ClassPage,PayrollPage}.tsx, strings.ts, specs.ts; src/modules/admin/{SettingsPage,EventsAdminPage,EmailsPage,WhatsAppPage,CrmPage,AnalyticsPage}.tsx, settings.ts, strings.ts, specs.ts, integrationDefs.ts; src/modules/ops-manual/strings.ts; src/specs/retired.ts; src/hub/hubMap.data.ts; src/design/tokens.ts (`--r-arch`); scripts/{screenshots.mjs,test-mat-bookings.mjs,test-analytics.mjs,spacing-baseline.json}; public/images/sanctuary/teacher-*.webp and public/video/living-{teacher-*,hot-yoga,barre,pilates,meditacion,respiracion}.mp4 (deleted); supabase/schema.sql; docs/{data-model.md,website-assets.md,kanban.md}; docs/ops-manual/{es,en}/* (23 chapters each) + STYLE.md; docs/pages/*; docs/screenshots/*; reference/uploads/{WEBSITE_MODIF.md,HOY_FAQ_Corrections_Remove.docx,HOY_Terminos_y_Condiciones.docx}; reference/README.md; package.json
codes: W-01, W-02, W-03, W-04, W-05, W-06, W-07, W-08, W-10 (new), P-01, A-06, C-01, C-04, C-05, C-06, C-07, C-07b, C-08, C-17, C-19, C-22 (retired), C-25, S-02, S-03, S-04, M-04, M-05, M-06, M-08a, M-08b, M-08f, M-10, M-12, K-03, D-02

Model routing: Opus 5.5 (build).

Checks: build green · tsc 0 errors · lint:spacing 60 / 60 (baseline lowered from 61; the FAQ sticky offset uses `--h-topbar` + `--sp-4xl`) · manual-lint 0 · test:dates, test:holidays, test:hours, test:contacts, test:analytics, test-mat-bookings pass · screenshot smoke: no console errors on any route · no `⟨key⟩` (every referenced string key resolves, dynamic `paid_with`, payment-method and ledger-reason keys included) · no horizontal overflow at 390 on the website pages.

## Why

The website, the app and the manual described a studio that does not exist any more: five disciplines with a hot
room, eight fictional teachers, a membership with credits and pauses, Nequi, self check-in, a teacher button to
question payroll. The studio sent the verified version of all of it. Leaving any of the old model behind (a "credit"
in a cancellation message, a "Nequi" in the desk, a hot-yoga photo on a class page) would contradict the new public
FAQ and terms on the same site.

## What changed, by surface

### Website (W-xx, P-01, A-06)
- **W-01 Inicio.** Hero tagline; "Movimiento para todos" panel; the classes band with the statement, the sub-head and
  seven `ClassArch` arches (alternating heights, keywords below; a snap-scrolling strip under 1200 px); "¿Cómo te
  quieres mover hoy?"; teachers as a numbered list of the seven with a tone monogram and their class; plans with the
  trial, the package and the private class.
- **W-02 Sobre HOY.** "La filosofía de HOY" dark panel: Nuestra filosofía, Nuestro propósito, the closing question and
  the pull-quote.
- **W-07 Clases.** The new "Nuestras clases" intro (lead, statement, three paragraphs, question, close) and seven rows,
  each a large arch beside concept, intention, keys, method, who guides it, "Leer más" and the schedule link.
- **W-08 Clase.** Hero arch, concept, intention (quote), keys / messages / method cards, the class in data (60 min,
  intensity dots, room temperature), what to bring (from the FAQ), the other six arches, the trial-class band.
- **W-04 Horario · W-03 Modalidades.** The seven classes, their tones and teachers; no breathwork toggle.
- **W-05 Profesores.** Seven cards: a monogram arch in the class tone ("Retrato por confirmar"), name, tagline, the class
  chip linking to W-08. No ratings, no generated faces.
- **P-01 Planes.** Two `PackageCard`s (the package and the affiliates' price), the trial and individual passes,
  private classes and gift cards, the on-request space and corporate formats, a FAQ band, the studio discipline and
  the IVA note. The package and pass grids now span the content width (they stopped at 65.6 rem before).
- **W-06 Contacto.** WhatsApp Business, the confirmed email and Instagram, the landmark, a "Preguntas frecuentes"
  button.
- **W-10 Preguntas frecuentes (new).** See decision (6). Spacing: `--section` between groups, `--block` inside, the
  index sticks at `--h-topbar + --sp-4xl`; 44 px targets everywhere; the editorial accordion keeps the hairlines and
  the serif questions of the sanctuary edition.
- **A-06 Términos.** v2.0 with "Por definir" callouts; v1.0 kept as history.

### Member app (C-xx)
C-06, C-07, C-07b, C-04, C-05, C-17 as in decision (8); C-01 shows the package (classes left, expiry or "congelado
hasta"); C-19 / C-25 link "Mis clases"; C-08 says "check-in en recepción"; every cancellation, waitlist and change text
speaks of classes returning to the package, with the 12 h window.

### Desk, teacher, admin
S-04, S-02, S-03, M-04, M-05, M-06, M-08a, M-08b, M-08f, M-10, M-12 as in decision (9).

### Library (D-02)
New: **ClassArch**, **PriceTable** (+ `itemsForFamilies`), **FaqAnswer**. Changed: **PackageCard** (was
MembershipCard), **Accordion** (`variant="editorial"`), **PriceRow** (`+` for per-person items), **ClassThumbnail** (tone
tile instead of a stock photo), **LegalDocument** (pending callout, `price` tokens), **LiveBlock** (freeze policy keys,
package families). Samples in 17 metas no longer show credits, memberships, Nequi or the old class names. Token:
`--r-arch` in D-01.

### Docs
Ops manual (decision 10), page docs (a 0051 section on every page above), `docs/website-assets.md` (the deleted
portraits and loops, the unused supplied class stills), kanban, reference uploads.

## Open with the owner
- The terms' "Por definir" items: late cancellation (< 12 h), illness evidence, retracto / reversión, PQR channel and
  response time, applicable law and jurisdiction.
- Corporate experience prices; the NIT; the target room temperature per class.
- A real gift-card redemption flow at the desk (today: sell the item with amount paid 0 and the code in the note).
