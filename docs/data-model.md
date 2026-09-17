# Data model

_Generated from `src/data/schema.ts` by `npm run sql`. The TypeScript file is the source of truth; `supabase/schema.sql` is the Postgres draft; this page is the human view._

## Principles
- **Multi-tenant from day one.** Every table has `tenant_id`; RLS scopes every query to the JWT's tenant. No hardcoded studio outside `src/tenant/tenant.ts`.
- **Same interface, two providers.** Pages call `useData()` / `useTable()` (the `DataProvider` contract: list, get, insert, update, remove, subscribe). `MockProvider` (localStorage + change events) today; `SupabaseProvider` (PostgREST + realtime channels) later. Swapping is one line in `src/data/DataContext.tsx`.
- **Realtime by subscription.** `subscribe(table, cb)` is the seam for Supabase `postgres_changes`; the mock emits the same events on every write so UI already updates live.
- **Money is integer COP.** Columns named price/amount/total/etc. are integers.
- **Bilingual content is JSON.** `{ "es": …, "en": … }` in `jsonb` (descriptions, bios, subjects).

## Mapping Mock → Supabase
| Mock (today) | Supabase (later) |
| --- | --- |
| `localStorage['hoyos.db.v1']` | Postgres tables in `public` |
| `MockProvider.emit()` | `supabase.channel().on('postgres_changes')` |
| `demoUsers` + `SessionProvider` | `supabase.auth` + `user_roles` + JWT claim `tenant_id` |
| `tenant.id = 'ten_hoy'` | row in `tenants`, claim set at sign-in |
| `newId()` | `gen_random_uuid()` |

## Tables

### Core · Núcleo

#### `tenants`
Each studio using HoyOS. Today: HOY.  
_Cada estudio que usa HoyOS. Hoy: HOY._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `name` | text |  |
| `legal_name` | text, null |  |
| `timezone` | text |  |
| `currency` | text |  |
| `default_locale` | text |  |
| `settings` | json |  |

#### `feature_flags`
Blocks and flows Admin → Features turns on or off per page.  
_Bloques y flujos que Admin → Features enciende o apaga por página._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | text |  |
| `page_code` | text, null |  |
| `label` | text |  |
| `enabled` | bool |  |
| `audience` | enum (all \| staff \| customers \| beta) |  |

#### `legal_documents`
Terms, privacy and policies, versioned.  
_Términos, privacidad y políticas, versionados._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `kind` | enum (terms \| privacy \| waiver \| policy) |  |
| `version` | text |  |
| `locale` | text |  |
| `title` | text |  |
| `body_md` | text |  |
| `published_at` | timestamptz, null |  |

#### `consents`
Which document version each user accepted.  
_Qué versión de cada documento aceptó cada usuario._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `legal_document_id` | uuid | → `legal_documents`  |
| `accepted_at` | timestamptz |  |
| `ip` | text, null |  |

#### `content_articles`
Club rules (C-13), about-HOY copy and guides, editable without a deploy.  
_Reglas del club (C-13), textos “sobre HOY” y guías, editables sin deploy._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `section` | enum (rules \| faq \| about) |  |
| `icon` | text, null |  |
| `title` | json | {es,en} |
| `summary` | json | {es,en} |
| `body_md` | json | {es,en} markdown |
| `checklist` | json, null | [{es,en}] |
| `video_label` | json, null | {es,en} |
| `required` | bool | must be read (safety) |
| `sort` | int |  |
| `published` | bool |  |

**Who may read / write**
- customer + anon: read where published = true
- coordinator/admin: write (M-02 content CMS)

#### `faq_entries`
Questions and answers for C-14/C-15, grouped by section and page.  
_Preguntas y respuestas de C-14/C-15, agrupadas por sección y página._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `group_key` | text | section id, e.g. s1 (group/order are reserved words in SQL) |
| `group_title` | json | {es,en} |
| `group_lead` | json | {es,en} |
| `page` | int | 1 = C-14, 2 = C-15 |
| `question` | json | {es,en} |
| `answer` | json | {es,en} |
| `sort` | int |  |
| `published` | bool |  |

**Who may read / write**
- customer + anon: read where published = true
- coordinator/admin: write (M-02 content CMS)

### People · Personas

#### `users`
Login accounts (mirrors auth.users in Supabase).  
_Cuentas de acceso (espejo de auth.users en Supabase)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `email` | text |  |
| `phone` | text, null |  |
| `status` | enum (active \| invited \| locked \| disabled) |  |
| `last_sign_in_at` | timestamptz, null |  |
| `locale` | text, null |  |

#### `profiles`
Person data: name, photo, emergency contact, preferences.  
_Datos de la persona: nombre, foto, emergencia, preferencias._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `full_name` | text |  |
| `initials` | text, null |  |
| `photo_url` | text, null |  |
| `birthday` | date, null |  |
| `emergency_contact` | json, null |  |
| `marketing_optin` | bool |  |
| `whatsapp_verified` | bool |  |
| `notes` | text, null |  |

#### `user_roles`
Role assignments; a user may hold several.  
_Asignación de roles; un usuario puede tener varios._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `role` | enum (super_admin \| admin \| coordinator \| front_desk \| finance \| teacher \| maintenance \| customer) |  |
| `granted_by` | uuid, null | → `users`  |

#### `teachers`
Public and contractual profile of each teacher.  
_Perfil público y contractual de cada profesor._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid, null | → `users`  |
| `display_name` | text |  |
| `bio` | json | {es,en} |
| `photo_url` | text, null |  |
| `specialties` | json | modality ids |
| `certifications` | json, null |  |
| `rate_per_class` | int, null | COP |
| `active` | bool |  |
| `rating_avg` | numeric, null |  |

### Schedule · Horario

#### `modalities`
Class types of the club, each with its movement.  
_Tipos de clase del club, cada uno con su movimiento._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `name_es` | text |  |
| `name_en` | text |  |
| `movement` | enum (enraiza \| fluye \| arde \| libera) |  |
| `description` | json |  |
| `intensity` | int | 1–5 |
| `heated` | bool |  |
| `duration_min` | int |  |
| `active` | bool |  |

#### `rooms`
Physical rooms and their mat capacity.  
_Salas físicas y su capacidad en mats._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `name` | text |  |
| `capacity` | int |  |
| `heated` | bool |  |
| `notes` | text, null |  |

#### `class_templates`
Recurrence rules that generate sessions.  
_Reglas de recurrencia que generan sesiones._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `title` | text |  |
| `modality_id` | uuid | → `modalities`  |
| `teacher_id` | uuid | → `teachers`  |
| `room_id` | uuid | → `rooms`  |
| `weekday` | int | 0=Sun … 6=Sat |
| `start_time` | time |  |
| `duration_min` | int |  |
| `capacity` | int |  |
| `level` | enum (all \| beginner \| intermediate \| advanced) |  |
| `active` | bool |  |

#### `class_sessions`
Each concrete class on the calendar, with live capacity.  
_Cada clase concreta en el calendario, con cupos en vivo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `template_id` | uuid, null | → `class_templates`  |
| `title` | text |  |
| `modality_id` | uuid | → `modalities`  |
| `teacher_id` | uuid | → `teachers`  |
| `room_id` | uuid | → `rooms`  |
| `starts_at` | timestamptz |  |
| `ends_at` | timestamptz |  |
| `capacity` | int |  |
| `booked_count` | int |  |
| `level` | enum (all \| beginner \| intermediate \| advanced) |  |
| `status` | enum (scheduled \| cancelled \| completed) |  |
| `cancel_reason` | text, null |  |

#### `bookings`
One person’s spot in a session.  
_Un cupo de una persona en una sesión._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `session_id` | uuid | → `class_sessions`  |
| `status` | enum (booked \| checked_in \| cancelled \| no_show \| late_cancel) |  |
| `paid_with` | enum (membership \| credit \| single \| trial \| guest \| comp) |  |
| `credit_id` | uuid, null | → `credits`  |
| `checked_in_at` | timestamptz, null |  |
| `cancelled_at` | timestamptz, null |  |
| `rated` | bool |  |

#### `waitlist`
Waiting positions and claim window.  
_Posiciones en espera y ventana de reclamo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `session_id` | uuid | → `class_sessions`  |
| `position` | int |  |
| `status` | enum (waiting \| offered \| claimed \| expired \| left) |  |
| `offered_at` | timestamptz, null |  |
| `claim_until` | timestamptz, null |  |

#### `intentions`
Answer to “How do you want to feel today?” (A-05).  
_Respuesta a “¿Cómo quieres sentirte hoy?” (A-05)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `date` | date |  |
| `movement` | enum (enraiza \| fluye \| arde \| libera) |  |

#### `reviews`
A class rating (C-10): stars, tags and comment.  
_Calificación de una clase (C-10): estrellas, etiquetas y comentario._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `class_session_id` | uuid | → `class_sessions`  |
| `teacher_id` | uuid | → `teachers`  |
| `rating` | int | 1–5 |
| `tags` | json | good/fix tag keys |
| `comment` | text, null |  |
| `visibility` | enum (anonymous \| named \| private) |  |

**Who may read / write**
- customer: insert + read own rows (user_id = auth.uid()), one per booking
- teacher: read rows for own sessions, without user_id when visibility = anonymous
- coordinator/admin: read all (M-06), never edit the rating

#### `events`
Workshops, sound baths and special events (C-23), published from M-02.  
_Talleres, baños de sonido y eventos especiales (C-23), publicados desde M-02._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `title` | json | {es,en} |
| `kind` | json | {es,en} label |
| `description` | json | {es,en} |
| `bring` | json, null | [{es,en}] |
| `starts_at` | timestamptz |  |
| `ends_at` | timestamptz |  |
| `room_id` | uuid, null | → `rooms`  |
| `host_teacher_id` | uuid, null | → `teachers`  |
| `capacity` | int |  |
| `price_cop` | int | COP, public price |
| `member_price_cop` | int | COP, member price (0 = included) |
| `cover_key` | text, null | media key; placeholder until real imagery |
| `status` | enum (draft \| published \| cancelled) |  |

**Who may read / write**
- customer + anon: read where status = published
- coordinator/admin: write

#### `event_rsvps`
Who is going to an event and with which payment (C-23).  
_Quién va a un evento y con qué pago (C-23)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `event_id` | uuid | → `events`  |
| `user_id` | uuid | → `users`  |
| `status` | enum (going \| cancelled \| attended \| no_show) |  |
| `payment_id` | uuid, null | → `payments`  |
| `guests` | int | extra seats taken |

**Who may read / write**
- customer: insert + read + cancel own rows (user_id = auth.uid())
- front_desk/coordinator/admin: read all, mark attended

### Commerce · Comercio

#### `plans`
Value model v3: passes, memberships, pauses, gifts, space.  
_Modelo de Valor v3: pases, membresías, pausas, regalos, espacio._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `slug` | text |  |
| `family` | enum (bienvenida \| membresia \| pausas \| regalos \| espacio) |  |
| `name_es` | text |  |
| `name_en` | text |  |
| `description` | json |  |
| `price` | int | COP, integer |
| `period` | enum (once \| month \| year), null |  |
| `credits` | int, null |  |
| `validity_days` | int, null |  |
| `is_from_price` | bool |  |
| `badge` | json, null |  |
| `active` | bool |  |
| `sort` | int |  |

#### `memberships`
A person’s active subscription to a plan.  
_Suscripción activa de una persona a un plan._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `plan_id` | uuid | → `plans`  |
| `status` | enum (active \| paused \| past_due \| cancelled \| expired) |  |
| `starts_at` | date |  |
| `renews_at` | date, null |  |
| `ends_at` | date, null |  |
| `paused_until` | date, null |  |

#### `credits`
Ledger of purchased and used classes.  
_Libro mayor de clases compradas y usadas._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `plan_id` | uuid, null | → `plans`  |
| `payment_id` | uuid, null | → `payments`  |
| `delta` | int | + purchase, − use |
| `reason` | enum (purchase \| booking \| refund \| expiry \| gift \| comp \| cancel_return) |  |
| `expires_at` | date, null |  |

#### `payments`
Each charge, via Wompi or manual.  
_Cada cobro, por Wompi o manual._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `plan_id` | uuid, null | → `plans`  |
| `amount` | int | COP, integer |
| `currency` | text |  |
| `method` | enum (card \| pse \| nequi \| cash \| transfer \| gift_card) |  |
| `provider` | enum (wompi \| manual) |  |
| `provider_ref` | text, null |  |
| `status` | enum (pending \| approved \| declined \| refunded \| voided) |  |
| `paid_at` | timestamptz, null |  |
| `taken_by` | uuid, null | → `users` staff user for manual payments |

#### `invoices`
Fiscal document per payment (DIAN later).  
_Documento fiscal por pago (DIAN más adelante)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `payment_id` | uuid | → `payments`  |
| `number` | text |  |
| `subtotal` | int | COP, integer |
| `tax` | int | COP, integer |
| `total` | int | COP, integer |
| `issued_at` | timestamptz |  |
| `pdf_url` | text, null |  |
| `dian_cufe` | text, null |  |

#### `gift_cards`
Vouchers bought to give away, with scheduled delivery.  
_Bonos comprados para regalar, con entrega programada._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `code` | text |  |
| `buyer_user_id` | uuid, null | → `users`  |
| `recipient_name` | text |  |
| `recipient_contact` | text |  |
| `amount` | int | COP, integer |
| `balance` | int | COP, integer |
| `deliver_at` | timestamptz, null |  |
| `redeemed_by` | uuid, null | → `users`  |
| `status` | enum (scheduled \| sent \| redeemed \| expired) |  |

#### `payment_methods`
Methods the person saved (C-05). The token belongs to Wompi; we never store the card.  
_Métodos que la persona guardó (C-05). El token es de Wompi; nunca guardamos la tarjeta._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `provider` | enum (wompi \| manual) |  |
| `kind` | enum (card \| pse \| nequi \| transfer \| cash) |  |
| `brand` | text | Visa, Mastercard, Nequi, Bancolombia… |
| `last4` | text, null |  |
| `token_ref` | text, null | Wompi token placeholder — never a real PAN or token in the mock |
| `is_default` | bool |  |
| `expires` | text, null | MM/YY |

**Who may read / write**
- customer: full control of own rows (user_id = auth.uid())
- front_desk: read brand/last4 only, to recognise a payment at the desk
- nobody: token_ref is never selectable from the client once Wompi is live (vault column)

#### `invites`
Invites members send (C-16) and the reward credit once the guest joins.  
_Invitaciones enviadas por miembros (C-16) y el crédito de recompensa cuando el invitado entra._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `inviter_user_id` | uuid | → `users`  |
| `invitee_phone` | text, null |  |
| `invitee_email` | text, null |  |
| `invitee_user_id` | uuid, null | → `users`  |
| `channel` | enum (whatsapp \| email \| link) |  |
| `code` | text |  |
| `session_id` | uuid, null | → `class_sessions` class the invite was sent from |
| `status` | enum (sent \| opened \| joined \| rewarded) |  |
| `reward_credit_id` | uuid, null | → `credits`  |

**Who may read / write**
- customer: insert + read own rows (inviter_user_id = auth.uid())
- front_desk: read by code, to honour a pass at the desk
- admin/finance: write status and reward_credit_id (the reward is granted server-side)

### Comms · Comunicaciones

#### `email_templates`
Versioned transactional emails (M-04).  
_Emails transaccionales versionados (M-04)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | text |  |
| `name` | text |  |
| `trigger` | text |  |
| `subject` | json |  |
| `body_mjml` | text |  |
| `version` | int |  |
| `active` | bool |  |

#### `wa_templates`
Meta-approved templates with variables.  
_Plantillas aprobadas por Meta con variables._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `key` | text |  |
| `name` | text |  |
| `category` | enum (utility \| marketing \| authentication) |  |
| `body` | json |  |
| `approval_status` | enum (draft \| pending \| approved \| rejected) |  |
| `active` | bool |  |

#### `automations`
Trigger → channel → template, with quiet hours.  
_Disparador → canal → plantilla, con horas de silencio._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `name` | text |  |
| `trigger` | text |  |
| `channel` | enum (whatsapp \| email \| push) |  |
| `template_key` | text |  |
| `delay_min` | int |  |
| `quiet_hours` | json, null |  |
| `enabled` | bool |  |

#### `message_log`
Everything sent via WhatsApp, email or push.  
_Todo lo enviado por WhatsApp, email o push._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid, null | → `users`  |
| `channel` | enum (whatsapp \| email \| push) |  |
| `template_key` | text, null |  |
| `automation_id` | uuid, null | → `automations`  |
| `status` | enum (queued \| sent \| delivered \| read \| failed) |  |
| `sent_at` | timestamptz, null |  |
| `payload` | json, null |  |

#### `notifications`
The C-24 inbox: what the studio sends, with read state and a deep link.  
_La bandeja de C-24: lo que el estudio envía, con estado de lectura y enlace profundo._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `kind` | enum (booking \| waitlist \| payment \| class \| event \| review \| invite \| studio) |  |
| `title` | json | {es,en} |
| `body` | json | {es,en} |
| `read_at` | timestamptz, null |  |
| `deep_link` | text, null | in-app route, e.g. /app/booking/:id |
| `sent_via` | enum (in_app \| whatsapp \| email \| push) |  |

**Who may read / write**
- customer: read own rows and update read_at only (user_id = auth.uid())
- front_desk/coordinator/admin: insert for a member (send)
- retention: rows older than 90 days are deleted by a scheduled job

#### `notification_prefs`
Channel × category each person accepts (C-24 / C-19). No row = enabled.  
_Canal × categoría que cada persona acepta (C-24 / C-19). Sin fila = activado._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `user_id` | uuid | → `users`  |
| `channel` | enum (whatsapp \| email \| push) |  |
| `category` | enum (bookings \| waitlist \| payments \| events \| marketing) |  |
| `enabled` | bool |  |

**Who may read / write**
- customer: full control of own rows (user_id = auth.uid())
- admin: read only, to respect a mute before sending
- marketing category is opt-out per channel; transactional categories always deliver in-app

### System · Sistema

#### `audit_log`
Who did what, on which entity, when (M-07).  
_Quién hizo qué, sobre qué entidad, cuándo (M-07)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `actor_id` | uuid, null | → `users`  |
| `action` | text |  |
| `entity` | text |  |
| `entity_id` | text, null |  |
| `diff` | json, null |  |
| `ip` | text, null |  |

#### `docs_entries`
Index of docs/ for search and links (the .md files are the source).  
_Índice de docs/ para búsqueda y enlaces (los .md son la fuente)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `path` | text |  |
| `title` | text |  |
| `kind` | enum (prompt \| changelog \| rule \| guide \| manual) |  |
| `page_codes` | json, null |  |

### Design · Diseño

#### `components`
Index of the D-02 library (the .meta.ts files are the source).  
_Índice de la biblioteca D-02 (los .meta.ts son la fuente)._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `name` | text |  |
| `tier` | enum (atom \| molecule \| organism \| template) |  |
| `states` | json, null |  |
| `used_by` | json, null |  |

#### `page_layouts`
Per-page section order saved from the drag-and-drop editor.  
_Orden de secciones por página guardado desde el editor drag-and-drop._

| column | type | notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `tenant_id` | uuid | → `tenants` Owning studio (multi-tenant) |
| `created_at` | timestamptz |  |
| `updated_at` | timestamptz |  |
| `page_code` | text |  |
| `sections` | json | ordered section names |
| `hidden` | json, null | section names hidden |
| `updated_by` | uuid, null | → `users`  |

## Seed data (`src/data/seed/`)
6 modalities, 1 room (15 mats), 8 teachers, 24 weekly templates (4/day Mon–Sat), sessions for −7…+7 days, 9 demo staff/users + 30 customers, memberships/credits/payments/invoices, bookings filling sessions, waitlists on full classes, today's intentions, feature flags from every spec toggle, legal docs + consents, 2 gift cards, 3 email templates, 3 WhatsApp templates, 3 automations, message and audit logs. Deterministic PRNG; reseeds daily so "today" always has classes.

## Adding a table
1. Add a `TableDef` to `src/data/schema.ts` (and a typed row interface if pages use it).
2. Seed it in `src/data/seed/index.ts`.
3. `npm run sql` → regenerates `supabase/schema.sql` and this file.
4. Reference it in the page's `PageSpec.data` so the inspector links to it.
