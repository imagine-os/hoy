# HoyOS flow map (from the canvas, corrected v1.5)

Codes are the canvas artboard ids; the **Route** column links to the screen in this app (hash routes, live when read at `/#/docs/flow-map`). Built vs stub status per code is at `/#/dev/specs`. Codes marked _not routed yet_ (A-01, A-02, A-03, C-21, E-01…E-04) wait for real auth (roadmap P2). Source: `reference/canvas/Hoy Wellness System.dc.html` v1.5 and `reference/canvas/CANVAS-AUDIT.md`.

Names are the section headers (EN / ES). Source of truth for prices is `src/tenant/pricing.ts` (Modelo de Valor v3); for policies, M-08 (`/#/admin/settings`).

## Public / pre-login — Onboarding & authentication (Registro y autenticación)

| Code | EN / ES | Purpose | Route |
|------|---------|---------|-------|
| A-01 | Splash / breathing load · Splash / carga que respira | Breathing rings around the wordmark while session, flags and locale load. | _not routed yet_ |
| A-02 | Sign in · Iniciar sesión | Biometric first on a known device, then Apple/Google, then email + password; staff land on S-01. | _not routed yet_ |
| A-03 | Create account · Crear cuenta | Two-step sign-up with WhatsApp as the primary channel, emergency contact and optional photo. | _not routed yet_ |
| A-06 | Terms & privacy · Términos y privacidad | Versioned legal pages (Ley 1581) linked from sign-up, settings and the website. | [`/site/legal/terms`](#/site/legal/terms) · + /site/legal/privacy |
| A-05 | Intention check · Intención del día | "¿Cómo quieres sentirte hoy?" — one of four verbs re-orders the day's classes. | [`/app/intention`](#/app/intention) |

## Customer — core (Núcleo del cliente)

| Code | EN / ES | Purpose |
|------|---------|---------|
| C-01 | Home dashboard · Panel de inicio | Today's classes, my booking, announcements, membership and feedback nudges. | [`/app`](#/app) |
| C-02 | Class schedule · Horario de clases | Today view with filters; full classes show Waitlist. | [`/app/schedule`](#/app/schedule) |
| C-02b | Class schedule · week · Horario · semana | Six-column day grid of time chips; same data and filters as Today. | [`/app/schedule`](#/app/schedule) · week view inside C-02 |
| C-03 | Class detail · Detalle de clase | Class, teacher, what to bring, capacity, reserve CTA. | [`/app/class/:id`](#/app/class/ses_demo) |
| C-04 | Reserve & checkout · Reservar y pagar | Picks the cheapest valid entitlement; IVA and total computed from `plans`. | [`/app/checkout/:id`](#/app/checkout/ses_demo) · demo id ses_demo |
| C-05 | Payment methods · Métodos de pago | Cards, PSE, Nequi, Daviplata, Bancolombia, Mercado Pago, wallets, cash at desk. | [`/app/payment-methods`](#/app/payment-methods) |
| C-06 | Membership plans · Planes de membresía | Mensual $520.000 / Anual $4.990.000, sold without blocking the booking. | [`/app/plans`](#/app/plans) |
| C-07 | Bienvenida passes · Pases Bienvenida | Trial $39.000, Single $58.000, 3-pack $110.000, 10-pack $490.000 — each reservable on the spot. | [`/app/passes`](#/app/passes) |
| P-01 | Plans & prices · Planes y precios | The whole value model (Bienvenida, Membresía, Pausas, Regalos, Espacio) on one page. | [`/site/plans`](#/site/plans) |

## Customer — depth (Profundidad del cliente)

| Code | EN / ES | Purpose |
|------|---------|---------|
| C-08 | Booked class & countdown · Clase reservada y cuenta atrás | Everything you can do to a held reservation; countdown to class. | [`/app/booking/:id`](#/app/booking/ses_demo) |
| C-08b | Cancel or reschedule · Cancelar o reprogramar | One sheet, two outcomes; moving offered first (keeps the credit). | [`/app/booking/:id`](#/app/booking/ses_demo) · sheet inside C-08 |
| C-10 | Rate your class · Califica tu clase | Five-second feedback with directional chips; skippable. | [`/app/rate/:id`](#/app/rate/ses_demo) |
| C-11 | History & payments · Historial y pagos | Classes attended and every peso paid, receipts forwardable. | [`/app/history`](#/app/history) |
| C-13 | Club rules & practices · Reglas y buenas prácticas | Hot-room safety, preparation, etiquette, tour, emergencies, about HOY. | [`/app/rules`](#/app/rules) |
| C-14 | Preguntas frecuentes (1/2) | FAQ sections 01–03: first time, bookings, plans. | [`/app/faq`](#/app/faq) · one FAQ route, two pages |
| C-15 | Preguntas frecuentes (2/2) | FAQ sections 04–06: the space, getting there, contact — ends with a human. | [`/app/faq`](#/app/faq) · one FAQ route, two pages |
| C-16 | Invite a guest · Invita a alguien | Send a pass by WhatsApp, email or link. | [`/app/invite`](#/app/invite) |
| C-17 | Gift card · Tarjeta regalo | Amount (from $58.000), recipient, delivery date, message, design, pay. | [`/app/gift`](#/app/gift) |
| C-18 | Teacher gallery · Galería de profesores | Choose a teacher, not just a slot; profile and upcoming classes. | [`/app/teachers`](#/app/teachers) |
| C-19 | Profile & settings · Perfil y ajustes | Everything about me, notification prefs, membership summary, public review link. | [`/app/profile`](#/app/profile) |

## Customer — flows, phase 6 (Flujos del cliente)

| Code | EN / ES | Purpose |
|------|---------|---------|
| C-20 | Waitlist & claim window · Lista de espera y reclamo | Position, the 30-minute claim rule, one-tap claim, optional auto-claim. | [`/app/waitlist/:id`](#/app/waitlist/ses_demo) |
| C-21 | Password recovery · Recuperar contraseña | Six-digit WhatsApp OTP, email fallback; not rate-limited. | _not routed yet_ |
| C-22 | Manage membership · Gestionar membresía | Freeze, change, cancel — with the studio's notice periods. | [`/app/membership`](#/app/membership) |
| C-23 | Event & RSVP · Evento y RSVP | Sound baths, workshops, retreats with own pricing, capacity and guest rules. | [`/app/events/:id`](#/app/events/ses_demo) |
| C-24 | Notifications · Notificaciones | Inbox of everything the studio sent, with deep links. | [`/app/notifications`](#/app/notifications) |
| C-25 | More · profile, rules, contact · Más · perfil, reglas, contacto | Fourth dock tab: profile, club rules, FAQ, contact. | [`/app/more`](#/app/more) |
| C-26 | Account & data · Cuenta y datos | Data controller, consents, download my data, legal documents, delete my account (request → M-11). | [`/app/account`](#/app/account) |

## Customer — states and edges, phase 7 (Estados y bordes)

| Code | EN / ES | Purpose |
|------|---------|---------|
| E-01 | Home · first-time empty · Inicio · primera vez | Day-one home that teaches the next step. | _not routed yet_ |
| E-02 | Payment declined · Pago rechazado | Nothing charged, spot held nine minutes, switch method or pay cash. | _not routed yet_ |
| E-03 | Class cancelled by studio · Clase cancelada por el estudio | Credit already returned, two replacement classes ready. | _not routed yet_ |
| E-04 | Sign-in locked · Inicio bloqueado | 15-minute lockout countdown routing to C-21. | _not routed yet_ |

## Staff (Staff y recepción)

| Code | EN / ES | Purpose |
|------|---------|---------|
| S-01 | Role home · Inicio por rol | One app, six doors: student, teacher, front desk, coordinator, finance, super admin. | [`/staff`](#/staff) |
| S-02 | Front desk check-in · Check-in en recepción | Roster, check-in by name, member search, now/next/later strip, teacher arrivals, reference rail. | [`/staff/checkin`](#/staff/checkin) |
| S-03 | Teacher app · App del profesor | Schedule, roster and attendance, own content, reviews, payroll. | [`/teach`](#/teach) |
| S-04 | Register & take payment · Registrar y recibir pago | Who / what / how in one screen; completing the sale checks the person in. | [`/staff/register`](#/staff/register) |

## Admin CMS (CMS de administración)

| Code | EN / ES | Purpose |
|------|---------|---------|
| M-01 | Admin dashboard & features · Panel y features | KPIs plus the feature-switch table every spec's toggles mirror. | [`/admin`](#/admin) |
| M-02 | Content: classes & teachers · Contenido: clases y profesores | Class types, schedule, teachers, pricing, content — feeds app, staff tools, website. | [`/admin/content`](#/admin/content) |
| M-03 | Tables & relations · Tablas y relaciones | The data model (entities, keys, cardinality) — shape of the mock data. | [`/admin/tables`](#/admin/tables) |
| M-04 | Transactional emails · Correos transaccionales | Every automated email, ES + EN, with trigger and deep link. | [`/admin/emails`](#/admin/emails) |
| M-05 | WhatsApp automations · Automatizaciones WhatsApp | Approved templates, triggers, timing, quiet hours. | [`/admin/whatsapp`](#/admin/whatsapp) |
| M-06 | CRM · member 360 · CRM · ficha del cliente | One timeline per person: payments, attendance, WhatsApp, email, notes. | [`/admin/crm`](#/admin/crm) |
| M-07 | All activity log · Registro de actividad | Immutable audit of who did what, when. | [`/admin/activity`](#/admin/activity) |
| M-08 | Studio settings & policies · Ajustes y políticas | Identity, hours, rooms, cancellation 4 h, waitlist 30 min, late grace 15 min, tax, integrations. | [`/admin/settings`](#/admin/settings) |

## Design system & knowledgebase

| Code | EN / ES | Purpose |
|------|---------|---------|
| D-01 | Materials & tokens · Materiales y tokens | Palette, type, textures, elevation, radii; styled vs wireframe. | [`/dev/tokens`](#/dev/tokens) |
| D-02 | Component library · Librería de componentes | Atoms → molecules → organisms → templates → pages; living inventory. | [`/dev/components`](#/dev/components) |
| K-01 | Plan, kanban & changelog · Plan, kanban y changelog | 10-phase plan, board, changelog with intent / decision / alternative / files / version. | [`/dev/knowledgebase`](#/dev/knowledgebase) |

## Dependencies

Data (entity → screens that read or write it; entity names follow M-03 / the spec `data` arrays):

- **users, profiles, sessions, devices** → A-02, A-03, C-19, C-21, E-04, S-01, S-04, M-06
- **consents, legal_documents** → A-03, A-06, S-04
- **feature_flags** → A-01 (fetch), M-01 (edit); every spec's toggles mirror M-01
- **classes, schedules, teachers, rooms, capacity** → C-01, C-02, C-02b, C-03, C-18, S-02, S-03, M-02; policies from M-08
- **bookings, waitlists** → C-01, C-03, C-04, C-08, C-08b, C-20, E-03, S-02, S-03, M-06; cancellation window from M-08
- **plans, plan_prices, packages** (`plans` object) → P-01, C-04, C-06, C-07, C-17 (from-price), C-22, S-04, M-02, D-02 pricing card
- **orders, payments, invoices, refunds** → C-04, C-05, C-11, C-17, C-23, E-02, S-04, M-06, M-07
- **memberships, subscriptions, freezes** → C-01, C-06, C-19, C-22, C-25, M-06
- **credits, credit_ledger** → C-04, C-08b, C-11, C-16, C-17, E-03, M-06
- **intentions, movement_tags** → A-05 → ordering of C-01 / C-02
- **reviews, ratings** → C-10, C-18, S-03
- **content_articles, faq_entries** → C-13, C-14, C-15, C-25, S-02 reference rail, M-02
- **events, rsvps** → C-01, C-23
- **notifications, wa_message_log, email_send_log** → C-24, C-20, C-21, M-04, M-05, M-06
- **audit_log** → A-02, S-01, S-04, M-01, M-07
- **studio_profile, opening_hours, policies, tax_config** (M-08) → C-08, C-11, C-15, C-20, E-03, S-02, C-04 (IVA)

Screen-to-screen:

- A-01 → A-02 → (A-03 → A-06) → A-05 → C-01; staff accounts A-02 → S-01
- C-01 → C-02 ⇄ C-02b → C-03 → C-04 → (C-05 | C-06 | C-07 | P-01) → C-08 → C-08b; C-04 failure → E-02; studio cancellation → E-03
- C-03 full → C-20 (claim) → C-08
- C-08 after class → C-10 → C-11
- C-25 → C-19 · C-13 · C-14/C-15 · contact; C-19 → C-22 · C-24 · A-06 · C-26; C-26 → A-06 · M-11 (request); W-09 → M-11 (request)
- A-02 → C-21 (forgot) ; A-02 lockout → E-04 → C-21
- C-01 event card → C-23; C-01 first run → E-01
- S-01 → S-02 → S-04 (register & pay) ; S-01 → S-03
- M-01 flags → every screen's toggles; M-02 content → C-02/C-03/C-13/C-18/website; M-03 → data shape of everything; M-08 policies → C-08, C-20, S-02, C-04
- K-01 records every change; D-02 must list every component the screens above use
