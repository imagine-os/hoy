-- HoyOS — Supabase / Postgres schema draft
-- GENERATED from src/data/schema.ts by scripts/gen-sql.mjs. Edit the TS, regenerate, review, then apply as a migration.
-- Conventions: every table has id, tenant_id, created_at, updated_at. RLS is on everywhere.
-- tenant_id is read from the JWT claim (auth.jwt() ->> 'tenant_id'); clients never send it.
-- tenants.tenant_id is a self-reference (a tenant row belongs to itself) so the base-column rule holds everywhere.

create extension if not exists pgcrypto;

-- helper: current tenant from the JWT
create or replace function public.current_tenant_id() returns uuid
language sql stable as $$ select nullif(auth.jwt() ->> 'tenant_id', '')::uuid $$;

-- helper: does the current user hold a role in this tenant?
create or replace function public.has_role(role_name text) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.tenant_id = public.current_tenant_id() and ur.role = role_name
  )
$$;

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- core · Each studio using HoyOS. Today: HOY.
create table if not exists public.tenants (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  name text not null,
  legal_name text,
  timezone text not null,
  currency text not null,
  default_locale text not null,
  settings jsonb not null
);
create index if not exists tenants_tenant_idx on public.tenants(tenant_id);
create trigger tenants_touch before update on public.tenants for each row execute function public.touch_updated_at();
alter table public.tenants enable row level security;
create policy "tenants: tenant read" on public.tenants for select using (tenant_id = public.current_tenant_id());
create policy "tenants: staff write" on public.tenants for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Blocks and flows Admin → Features turns on or off per page.
create table if not exists public.feature_flags (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null,
  page_code text,
  label text not null,
  enabled boolean not null default false,
  audience text not null check (audience in ('all', 'staff', 'customers', 'beta'))
);
create index if not exists feature_flags_tenant_idx on public.feature_flags(tenant_id);
create trigger feature_flags_touch before update on public.feature_flags for each row execute function public.touch_updated_at();
alter table public.feature_flags enable row level security;
create policy "feature_flags: tenant read" on public.feature_flags for select using (tenant_id = public.current_tenant_id());
create policy "feature_flags: staff write" on public.feature_flags for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Terms, privacy, waiver, cancellation, refunds and house rules — bilingual and versioned.
-- access:
--   · anon + customer: read where status = published
--   · admin: write (a new version is a new row; a published row is never edited in place)
--   · counsel review: status stays draft until the owner publishes
create table if not exists public.legal_documents (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check (kind in ('terms', 'privacy', 'waiver', 'cancellation', 'refunds', 'house-rules')),
  -- kind + version, e.g. terms-1.0
  slug text not null,
  -- semver-ish, e.g. 1.0
  version text not null,
  status text not null check (status in ('draft', 'published')),
  -- the date the version governs from
  effective_from date not null,
  -- {es,en}
  title jsonb not null,
  -- {es,en} one line
  summary jsonb not null,
  -- {es,en} markdown; {{policy.*}} tokens are resolved from M-08 at render time
  body_md jsonb not null,
  -- the member must accept this version (waiver, terms)
  requires_acceptance boolean not null default false,
  published_at timestamptz
);
create index if not exists legal_documents_tenant_idx on public.legal_documents(tenant_id);
create trigger legal_documents_touch before update on public.legal_documents for each row execute function public.touch_updated_at();
alter table public.legal_documents enable row level security;
create policy "legal_documents: tenant read" on public.legal_documents for select using (tenant_id = public.current_tenant_id());
create policy "legal_documents: staff write" on public.legal_documents for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Every request to delete an account (Ley 1581 deletion right; App Store 5.1.1(v) and Google Play): who asked, through which channel, its status and who closed it. Anonymisation runs server-side; the app only records and tracks the case (C-26, W-09, M-11).
-- access:
--   · customer: insert one row for self (user_id = auth.uid()) and read own rows; may set status = cancelled while still requested
--   · anon (public W-09): insert only, user_id null, through an edge function that rate-limits and never reads back
--   · admin/super_admin: read all, update status / resolved_* / checklist / note (M-11)
--   · never deleted: the request is the proof the right was honoured; the deletion itself is a server-side job that anonymises profiles + users and keeps payments / invoices for the retention period
create table if not exists public.deletion_requests (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- null when it came from the public page (W-09) — email / phone identify the person
  user_id uuid,
  email text,
  phone text,
  channel text not null check (channel in ('app', 'website', 'front_desk')),
  status text not null check (status in ('requested', 'processing', 'done', 'cancelled')),
  reason text,
  requested_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by uuid,
  -- M-11 anonymisation checklist: { step: true } per completed step
  checklist jsonb,
  -- internal note for the admin who processes it
  note text
);
create index if not exists deletion_requests_tenant_idx on public.deletion_requests(tenant_id);
create index if not exists deletion_requests_user_id_idx on public.deletion_requests(user_id);
create index if not exists deletion_requests_resolved_by_idx on public.deletion_requests(resolved_by);
create trigger deletion_requests_touch before update on public.deletion_requests for each row execute function public.touch_updated_at();
alter table public.deletion_requests enable row level security;
create policy "deletion_requests: tenant read" on public.deletion_requests for select using (tenant_id = public.current_tenant_id());
create policy "deletion_requests: staff write" on public.deletion_requests for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Which document version each user accepted.
create table if not exists public.consents (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null,
  legal_document_id uuid not null references public.legal_documents(id) on delete set null,
  accepted_at timestamptz not null,
  ip text
);
create index if not exists consents_tenant_idx on public.consents(tenant_id);
create index if not exists consents_user_id_idx on public.consents(user_id);
create index if not exists consents_legal_document_id_idx on public.consents(legal_document_id);
create trigger consents_touch before update on public.consents for each row execute function public.touch_updated_at();
alter table public.consents enable row level security;
create policy "consents: tenant read" on public.consents for select using (tenant_id = public.current_tenant_id());
create policy "consents: staff write" on public.consents for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Acceptance of one concrete document version (A-06): what the person signed and when.
-- access:
--   · customer: insert + read own rows (user_id = auth.uid()); never update nor delete
--   · admin/finance: read all (proof of the signed waiver)
--   · append-only: a new acceptance is a new row, so the history survives a new version
create table if not exists public.legal_acceptances (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null,
  document_id uuid not null references public.legal_documents(id) on delete set null,
  -- denormalised legal_documents.kind, so “did they sign the waiver?” is one query
  kind text not null,
  version text not null,
  accepted_at timestamptz not null,
  channel text not null check (channel in ('app', 'website', 'front_desk', 'import')),
  ip text
);
create index if not exists legal_acceptances_tenant_idx on public.legal_acceptances(tenant_id);
create index if not exists legal_acceptances_user_id_idx on public.legal_acceptances(user_id);
create index if not exists legal_acceptances_document_id_idx on public.legal_acceptances(document_id);
create trigger legal_acceptances_touch before update on public.legal_acceptances for each row execute function public.touch_updated_at();
alter table public.legal_acceptances enable row level security;
create policy "legal_acceptances: tenant read" on public.legal_acceptances for select using (tenant_id = public.current_tenant_id());
create policy "legal_acceptances: staff write" on public.legal_acceptances for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · One art slot per place in the app and the site (M-02d): what is missing, in which ratio and with which brief.
-- access:
--   · anon + customer: read where status = ready
--   · coordinator/admin: write (M-02d media library)
--   · url points at storage; HoyOS never stores the binary in a row
create table if not exists public.media_assets (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- stable key a component asks for, e.g. class.hero
  slot_key text not null,
  kind text not null check (kind in ('photo', 'video', 'illustration')),
  -- CSS aspect-ratio, e.g. 16 / 9
  ratio text not null,
  -- {es,en} where the slot shows
  label jsonb not null,
  -- {es,en} alternative text
  alt jsonb not null,
  -- {es,en} what to shoot
  brief jsonb not null,
  -- movement tint of the empty slot
  movement text check (movement in ('enraiza', 'fluye', 'arde', 'libera')),
  url text,
  -- photographer / licence
  credit text,
  status text not null check (status in ('pending', 'ready')),
  sort integer not null
);
create index if not exists media_assets_tenant_idx on public.media_assets(tenant_id);
create trigger media_assets_touch before update on public.media_assets for each row execute function public.touch_updated_at();
alter table public.media_assets enable row level security;
create policy "media_assets: tenant read" on public.media_assets for select using (tenant_id = public.current_tenant_id());
create policy "media_assets: staff write" on public.media_assets for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Club rules (C-13), about-HOY copy and guides, editable without a deploy.
-- access:
--   · customer + anon: read where published = true
--   · coordinator/admin: write (M-02 content CMS)
create table if not exists public.content_articles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  section text not null check (section in ('rules', 'faq', 'about')),
  icon text,
  -- {es,en}
  title jsonb not null,
  -- {es,en}
  summary jsonb not null,
  -- {es,en} markdown
  body_md jsonb not null,
  -- [{es,en}]
  checklist jsonb,
  -- {es,en}
  video_label jsonb,
  -- must be read (safety)
  required boolean not null default false,
  sort integer not null,
  published boolean not null default false,
  -- scheduled publication; published + a future publish_at = scheduled (M-02a)
  publish_at timestamptz
);
create index if not exists content_articles_tenant_idx on public.content_articles(tenant_id);
create trigger content_articles_touch before update on public.content_articles for each row execute function public.touch_updated_at();
alter table public.content_articles enable row level security;
create policy "content_articles: tenant read" on public.content_articles for select using (tenant_id = public.current_tenant_id());
create policy "content_articles: staff write" on public.content_articles for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- core · Questions and answers for C-14/C-15, grouped by section and page.
-- access:
--   · customer + anon: read where published = true
--   · coordinator/admin: write (M-02 content CMS)
create table if not exists public.faq_entries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- section id, e.g. s1 (group/order are reserved words in SQL)
  group_key text not null,
  -- {es,en}
  group_title jsonb not null,
  -- {es,en}
  group_lead jsonb not null,
  -- 1 = C-14, 2 = C-15
  page integer not null,
  -- {es,en}
  question jsonb not null,
  -- {es,en}
  answer jsonb not null,
  sort integer not null,
  published boolean not null default false
);
create index if not exists faq_entries_tenant_idx on public.faq_entries(tenant_id);
create trigger faq_entries_touch before update on public.faq_entries for each row execute function public.touch_updated_at();
alter table public.faq_entries enable row level security;
create policy "faq_entries: tenant read" on public.faq_entries for select using (tenant_id = public.current_tenant_id());
create policy "faq_entries: staff write" on public.faq_entries for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Login accounts (mirrors auth.users in Supabase).
create table if not exists public.users (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  phone text,
  status text not null check (status in ('active', 'invited', 'locked', 'disabled')),
  last_sign_in_at timestamptz,
  locale text
);
create index if not exists users_tenant_idx on public.users(tenant_id);
create trigger users_touch before update on public.users for each row execute function public.touch_updated_at();
alter table public.users enable row level security;
create policy "users: tenant read" on public.users for select using (tenant_id = public.current_tenant_id());
create policy "users: staff write" on public.users for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Person data: name, photo, emergency contact, preferences.
create table if not exists public.profiles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  full_name text not null,
  initials text,
  photo_url text,
  birthday date,
  emergency_contact jsonb,
  marketing_optin boolean not null default false,
  whatsapp_verified boolean not null default false,
  notes text
);
create index if not exists profiles_tenant_idx on public.profiles(tenant_id);
create index if not exists profiles_user_id_idx on public.profiles(user_id);
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
alter table public.profiles enable row level security;
create policy "profiles: tenant read" on public.profiles for select using (tenant_id = public.current_tenant_id());
create policy "profiles: staff write" on public.profiles for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Role assignments; a user may hold several.
create table if not exists public.user_roles (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  role text not null check (role in ('super_admin', 'admin', 'coordinator', 'front_desk', 'finance', 'teacher', 'maintenance', 'customer')),
  granted_by uuid references public.users(id) on delete set null
);
create index if not exists user_roles_tenant_idx on public.user_roles(tenant_id);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_granted_by_idx on public.user_roles(granted_by);
create trigger user_roles_touch before update on public.user_roles for each row execute function public.touch_updated_at();
alter table public.user_roles enable row level security;
create policy "user_roles: tenant read" on public.user_roles for select using (tenant_id = public.current_tenant_id());
create policy "user_roles: staff write" on public.user_roles for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- people · Public and contractual profile of each teacher.
create table if not exists public.teachers (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  -- {es,en}
  bio jsonb not null,
  photo_url text,
  -- modality ids
  specialties jsonb not null,
  certifications jsonb,
  -- COP
  rate_per_class integer,
  active boolean not null default false,
  rating_avg numeric(12,2)
);
create index if not exists teachers_tenant_idx on public.teachers(tenant_id);
create index if not exists teachers_user_id_idx on public.teachers(user_id);
create trigger teachers_touch before update on public.teachers for each row execute function public.touch_updated_at();
alter table public.teachers enable row level security;
create policy "teachers: tenant read" on public.teachers for select using (tenant_id = public.current_tenant_id());
create policy "teachers: staff write" on public.teachers for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Class types of the club, each with its movement.
create table if not exists public.modalities (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  name_es text not null,
  name_en text not null,
  movement text not null check (movement in ('enraiza', 'fluye', 'arde', 'libera')),
  description jsonb not null,
  -- 1–5
  intensity integer not null,
  heated boolean not null default false,
  duration_min integer not null,
  active boolean not null default false
);
create index if not exists modalities_tenant_idx on public.modalities(tenant_id);
create trigger modalities_touch before update on public.modalities for each row execute function public.touch_updated_at();
alter table public.modalities enable row level security;
create policy "modalities: tenant read" on public.modalities for select using (tenant_id = public.current_tenant_id());
create policy "modalities: staff write" on public.modalities for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Physical rooms and their mat capacity.
create table if not exists public.rooms (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  capacity integer not null,
  heated boolean not null default false,
  notes text
);
create index if not exists rooms_tenant_idx on public.rooms(tenant_id);
create trigger rooms_touch before update on public.rooms for each row execute function public.touch_updated_at();
alter table public.rooms enable row level security;
create policy "rooms: tenant read" on public.rooms for select using (tenant_id = public.current_tenant_id());
create policy "rooms: staff write" on public.rooms for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Recurrence rules that generate sessions.
create table if not exists public.class_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  modality_id uuid not null references public.modalities(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  room_id uuid not null references public.rooms(id) on delete set null,
  -- 0=Sun … 6=Sat
  weekday integer not null,
  start_time time not null,
  duration_min integer not null,
  capacity integer not null,
  level text not null check (level in ('all', 'beginner', 'intermediate', 'advanced')),
  active boolean not null default false
);
create index if not exists class_templates_tenant_idx on public.class_templates(tenant_id);
create index if not exists class_templates_modality_id_idx on public.class_templates(modality_id);
create index if not exists class_templates_teacher_id_idx on public.class_templates(teacher_id);
create index if not exists class_templates_room_id_idx on public.class_templates(room_id);
create trigger class_templates_touch before update on public.class_templates for each row execute function public.touch_updated_at();
alter table public.class_templates enable row level security;
create policy "class_templates: tenant read" on public.class_templates for select using (tenant_id = public.current_tenant_id());
create policy "class_templates: staff write" on public.class_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Each concrete class on the calendar, with live capacity.
create table if not exists public.class_sessions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  template_id uuid references public.class_templates(id) on delete set null,
  title text not null,
  modality_id uuid not null references public.modalities(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  room_id uuid not null references public.rooms(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null,
  booked_count integer not null,
  level text not null check (level in ('all', 'beginner', 'intermediate', 'advanced')),
  status text not null check (status in ('scheduled', 'cancelled', 'completed')),
  cancel_reason text
);
create index if not exists class_sessions_tenant_idx on public.class_sessions(tenant_id);
create index if not exists class_sessions_template_id_idx on public.class_sessions(template_id);
create index if not exists class_sessions_modality_id_idx on public.class_sessions(modality_id);
create index if not exists class_sessions_teacher_id_idx on public.class_sessions(teacher_id);
create index if not exists class_sessions_room_id_idx on public.class_sessions(room_id);
create trigger class_sessions_touch before update on public.class_sessions for each row execute function public.touch_updated_at();
alter table public.class_sessions enable row level security;
create policy "class_sessions: tenant read" on public.class_sessions for select using (tenant_id = public.current_tenant_id());
create policy "class_sessions: staff write" on public.class_sessions for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · A room taken by something other than a class: private event, rental, private class, maintenance or a block (S-05). An Especial may pay for it.
-- access:
--   · front_desk/coordinator/admin/finance/super_admin: full control
--   · teacher: read bookings whose teacher_id resolves to their teachers row (S-03)
--   · customer: read own bookings (customer_id = auth.uid())
--   · a booking in status cancelled frees the room; done is history and is never edited
create table if not exists public.space_bookings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  room_id uuid not null references public.rooms(id) on delete set null,
  kind text not null check (kind in ('private_event', 'rental', 'private_class', 'maintenance', 'blocked')),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_id uuid references public.users(id) on delete set null,
  -- who it is for when they are not a member (a company, a birthday host)
  contact_name text,
  -- teacher booked with the room; their payout lives on the special charge
  teacher_id uuid references public.teachers(id) on delete set null,
  -- the Especial that paid for this window (S-04)
  special_charge_id uuid,
  status text not null check (status in ('held', 'confirmed', 'cancelled', 'done')),
  note text,
  -- staff user who booked it
  created_by uuid references public.users(id) on delete set null
);
create index if not exists space_bookings_tenant_idx on public.space_bookings(tenant_id);
create index if not exists space_bookings_room_id_idx on public.space_bookings(room_id);
create index if not exists space_bookings_customer_id_idx on public.space_bookings(customer_id);
create index if not exists space_bookings_teacher_id_idx on public.space_bookings(teacher_id);
create index if not exists space_bookings_special_charge_id_idx on public.space_bookings(special_charge_id);
create index if not exists space_bookings_created_by_idx on public.space_bookings(created_by);
create trigger space_bookings_touch before update on public.space_bookings for each row execute function public.touch_updated_at();
alter table public.space_bookings enable row level security;
create policy "space_bookings: tenant read" on public.space_bookings for select using (tenant_id = public.current_tenant_id());
create policy "space_bookings: staff write" on public.space_bookings for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · One person’s spot in a session.
create table if not exists public.bookings (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  session_id uuid not null references public.class_sessions(id) on delete set null,
  status text not null check (status in ('booked', 'checked_in', 'cancelled', 'no_show', 'late_cancel')),
  paid_with text not null check (paid_with in ('membership', 'credit', 'single', 'trial', 'guest', 'comp')),
  credit_id uuid,
  checked_in_at timestamptz,
  cancelled_at timestamptz,
  rated boolean not null default false
);
create index if not exists bookings_tenant_idx on public.bookings(tenant_id);
create index if not exists bookings_user_id_idx on public.bookings(user_id);
create index if not exists bookings_session_id_idx on public.bookings(session_id);
create index if not exists bookings_credit_id_idx on public.bookings(credit_id);
create trigger bookings_touch before update on public.bookings for each row execute function public.touch_updated_at();
alter table public.bookings enable row level security;
create policy "bookings: tenant read" on public.bookings for select using (tenant_id = public.current_tenant_id());
create policy "bookings: staff write" on public.bookings for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Waiting positions and claim window.
create table if not exists public.waitlist (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  session_id uuid not null references public.class_sessions(id) on delete set null,
  position integer not null,
  status text not null check (status in ('waiting', 'offered', 'claimed', 'expired', 'left')),
  offered_at timestamptz,
  claim_until timestamptz
);
create index if not exists waitlist_tenant_idx on public.waitlist(tenant_id);
create index if not exists waitlist_user_id_idx on public.waitlist(user_id);
create index if not exists waitlist_session_id_idx on public.waitlist(session_id);
create trigger waitlist_touch before update on public.waitlist for each row execute function public.touch_updated_at();
alter table public.waitlist enable row level security;
create policy "waitlist: tenant read" on public.waitlist for select using (tenant_id = public.current_tenant_id());
create policy "waitlist: staff write" on public.waitlist for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Answer to “How do you want to feel today?” (A-05).
create table if not exists public.intentions (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  date date not null,
  movement text not null check (movement in ('enraiza', 'fluye', 'arde', 'libera'))
);
create index if not exists intentions_tenant_idx on public.intentions(tenant_id);
create index if not exists intentions_user_id_idx on public.intentions(user_id);
create trigger intentions_touch before update on public.intentions for each row execute function public.touch_updated_at();
alter table public.intentions enable row level security;
create policy "intentions: tenant read" on public.intentions for select using (tenant_id = public.current_tenant_id());
create policy "intentions: staff write" on public.intentions for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · A class rating (C-10): stars, tags and comment.
-- access:
--   · customer: insert + read own rows (user_id = auth.uid()), one per booking
--   · teacher: read rows for own sessions, without user_id when visibility = anonymous
--   · coordinator/admin: read all (M-06), never edit the rating
create table if not exists public.reviews (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  class_session_id uuid not null references public.class_sessions(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  -- 1–5
  rating integer not null,
  -- good/fix tag keys
  tags jsonb not null,
  comment text,
  visibility text not null check (visibility in ('anonymous', 'named', 'private'))
);
create index if not exists reviews_tenant_idx on public.reviews(tenant_id);
create index if not exists reviews_user_id_idx on public.reviews(user_id);
create index if not exists reviews_class_session_id_idx on public.reviews(class_session_id);
create index if not exists reviews_teacher_id_idx on public.reviews(teacher_id);
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();
alter table public.reviews enable row level security;
create policy "reviews: tenant read" on public.reviews for select using (tenant_id = public.current_tenant_id());
create policy "reviews: staff write" on public.reviews for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Workshops, sound baths and special events (C-23), published from M-02.
-- access:
--   · customer + anon: read where status = published
--   · coordinator/admin: write
create table if not exists public.events (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  -- {es,en}
  title jsonb not null,
  -- {es,en} label
  kind jsonb not null,
  -- {es,en}
  description jsonb not null,
  -- [{es,en}]
  bring jsonb,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  room_id uuid references public.rooms(id) on delete set null,
  host_teacher_id uuid references public.teachers(id) on delete set null,
  capacity integer not null,
  -- COP, public price
  price_cop integer not null,
  -- COP, member price (0 = included)
  member_price_cop integer not null,
  -- media key; placeholder until real imagery
  cover_key text,
  status text not null check (status in ('draft', 'published', 'cancelled'))
);
create index if not exists events_tenant_idx on public.events(tenant_id);
create index if not exists events_room_id_idx on public.events(room_id);
create index if not exists events_host_teacher_id_idx on public.events(host_teacher_id);
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
alter table public.events enable row level security;
create policy "events: tenant read" on public.events for select using (tenant_id = public.current_tenant_id());
create policy "events: staff write" on public.events for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- schedule · Who is going to an event and with which payment (C-23).
-- access:
--   · customer: insert + read + cancel own rows (user_id = auth.uid())
--   · front_desk/coordinator/admin: read all, mark attended
create table if not exists public.event_rsvps (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event_id uuid not null references public.events(id) on delete set null,
  user_id uuid not null references public.users(id) on delete set null,
  status text not null check (status in ('going', 'cancelled', 'attended', 'no_show')),
  payment_id uuid,
  -- extra seats taken
  guests integer not null
);
create index if not exists event_rsvps_tenant_idx on public.event_rsvps(tenant_id);
create index if not exists event_rsvps_event_id_idx on public.event_rsvps(event_id);
create index if not exists event_rsvps_user_id_idx on public.event_rsvps(user_id);
create index if not exists event_rsvps_payment_id_idx on public.event_rsvps(payment_id);
create trigger event_rsvps_touch before update on public.event_rsvps for each row execute function public.touch_updated_at();
alter table public.event_rsvps enable row level security;
create policy "event_rsvps: tenant read" on public.event_rsvps for select using (tenant_id = public.current_tenant_id());
create policy "event_rsvps: staff write" on public.event_rsvps for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Value model v3: passes, memberships, pauses, gifts, space.
create table if not exists public.plans (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null,
  family text not null check (family in ('bienvenida', 'membresia', 'pausas', 'regalos', 'espacio')),
  name_es text not null,
  name_en text not null,
  description jsonb not null,
  -- COP, integer
  price integer not null,
  period text check (period in ('once', 'month', 'year')),
  credits integer,
  validity_days integer,
  is_from_price boolean not null default false,
  badge jsonb,
  active boolean not null default false,
  sort integer not null
);
create index if not exists plans_tenant_idx on public.plans(tenant_id);
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();
alter table public.plans enable row level security;
create policy "plans: tenant read" on public.plans for select using (tenant_id = public.current_tenant_id());
create policy "plans: staff write" on public.plans for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · A person’s active subscription to a plan.
create table if not exists public.memberships (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  plan_id uuid not null references public.plans(id) on delete set null,
  status text not null check (status in ('active', 'paused', 'past_due', 'cancelled', 'expired')),
  starts_at date not null,
  renews_at date,
  ends_at date,
  paused_until date
);
create index if not exists memberships_tenant_idx on public.memberships(tenant_id);
create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_plan_id_idx on public.memberships(plan_id);
create trigger memberships_touch before update on public.memberships for each row execute function public.touch_updated_at();
alter table public.memberships enable row level security;
create policy "memberships: tenant read" on public.memberships for select using (tenant_id = public.current_tenant_id());
create policy "memberships: staff write" on public.memberships for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Ledger of purchased and used classes.
create table if not exists public.credits (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  payment_id uuid,
  -- + purchase, − use
  delta integer not null,
  reason text not null check (reason in ('purchase', 'booking', 'refund', 'expiry', 'gift', 'comp', 'cancel_return')),
  expires_at date
);
create index if not exists credits_tenant_idx on public.credits(tenant_id);
create index if not exists credits_user_id_idx on public.credits(user_id);
create index if not exists credits_plan_id_idx on public.credits(plan_id);
create index if not exists credits_payment_id_idx on public.credits(payment_id);
create trigger credits_touch before update on public.credits for each row execute function public.touch_updated_at();
alter table public.credits enable row level security;
create policy "credits: tenant read" on public.credits for select using (tenant_id = public.current_tenant_id());
create policy "credits: staff write" on public.credits for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Each charge, via Wompi or manual.
create table if not exists public.payments (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- null only for an Especial sold to a non-member contact (special_charges.contact_name carries who paid)
  user_id uuid references public.users(id) on delete set null,
  -- null for an event RSVP or an Especial (special_charges)
  plan_id uuid references public.plans(id) on delete set null,
  -- COP, integer
  amount integer not null,
  -- COP, integer — what the desk actually received; equals amount unless a note explains why
  amount_paid integer,
  currency text not null,
  method text not null check (method in ('card', 'pse', 'nequi', 'cash', 'transfer', 'gift_card')),
  provider text not null check (provider in ('wompi', 'manual')),
  provider_ref text,
  status text not null check (status in ('pending', 'approved', 'declined', 'refunded', 'voided')),
  paid_at timestamptz,
  -- staff user for manual payments
  taken_by uuid references public.users(id) on delete set null,
  -- Why the received amount differs from the invoice (S-04 requires it when it does)
  note text
);
create index if not exists payments_tenant_idx on public.payments(tenant_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_plan_id_idx on public.payments(plan_id);
create index if not exists payments_taken_by_idx on public.payments(taken_by);
create trigger payments_touch before update on public.payments for each row execute function public.touch_updated_at();
alter table public.payments enable row level security;
create policy "payments: tenant read" on public.payments for select using (tenant_id = public.current_tenant_id());
create policy "payments: staff write" on public.payments for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Fiscal document per payment (DIAN later).
create table if not exists public.invoices (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payment_id uuid not null references public.payments(id) on delete set null,
  number text not null,
  -- COP, integer
  subtotal integer not null,
  -- COP, integer
  tax integer not null,
  -- COP, integer
  total integer not null,
  issued_at timestamptz not null,
  pdf_url text,
  dian_cufe text
);
create index if not exists invoices_tenant_idx on public.invoices(tenant_id);
create index if not exists invoices_payment_id_idx on public.invoices(payment_id);
create trigger invoices_touch before update on public.invoices for each row execute function public.touch_updated_at();
alter table public.invoices enable row level security;
create policy "invoices: tenant read" on public.invoices for select using (tenant_id = public.current_tenant_id());
create policy "invoices: staff write" on public.invoices for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Vouchers bought to give away, with scheduled delivery.
create table if not exists public.gift_cards (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  code text not null,
  buyer_user_id uuid references public.users(id) on delete set null,
  recipient_name text not null,
  recipient_contact text not null,
  -- COP, integer
  amount integer not null,
  -- COP, integer
  balance integer not null,
  deliver_at timestamptz,
  redeemed_by uuid references public.users(id) on delete set null,
  status text not null check (status in ('scheduled', 'sent', 'redeemed', 'expired'))
);
create index if not exists gift_cards_tenant_idx on public.gift_cards(tenant_id);
create index if not exists gift_cards_buyer_user_id_idx on public.gift_cards(buyer_user_id);
create index if not exists gift_cards_redeemed_by_idx on public.gift_cards(redeemed_by);
create trigger gift_cards_touch before update on public.gift_cards for each row execute function public.touch_updated_at();
alter table public.gift_cards enable row level security;
create policy "gift_cards: tenant read" on public.gift_cards for select using (tenant_id = public.current_tenant_id());
create policy "gift_cards: staff write" on public.gift_cards for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Methods the person saved (C-05). The token belongs to Wompi; we never store the card.
-- access:
--   · customer: full control of own rows (user_id = auth.uid())
--   · front_desk: read brand/last4 only, to recognise a payment at the desk
--   · nobody: token_ref is never selectable from the client once Wompi is live (vault column)
create table if not exists public.payment_methods (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  provider text not null check (provider in ('wompi', 'manual')),
  kind text not null check (kind in ('card', 'pse', 'nequi', 'transfer', 'cash')),
  -- Visa, Mastercard, Nequi, Bancolombia…
  brand text not null,
  last4 text,
  -- Wompi token placeholder — never a real PAN or token in the mock
  token_ref text,
  is_default boolean not null default false,
  -- MM/YY
  expires text
);
create index if not exists payment_methods_tenant_idx on public.payment_methods(tenant_id);
create index if not exists payment_methods_user_id_idx on public.payment_methods(user_id);
create trigger payment_methods_touch before update on public.payment_methods for each row execute function public.touch_updated_at();
alter table public.payment_methods enable row level security;
create policy "payment_methods: tenant read" on public.payment_methods for select using (tenant_id = public.current_tenant_id());
create policy "payment_methods: staff write" on public.payment_methods for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Invites members send (C-16) and the reward credit once the guest joins.
-- access:
--   · customer: insert + read own rows (inviter_user_id = auth.uid())
--   · front_desk: read by code, to honour a pass at the desk
--   · admin/finance: write status and reward_credit_id (the reward is granted server-side)
create table if not exists public.invites (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inviter_user_id uuid not null references public.users(id) on delete set null,
  invitee_phone text,
  invitee_email text,
  invitee_user_id uuid references public.users(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email', 'link')),
  code text not null,
  -- class the invite was sent from
  session_id uuid references public.class_sessions(id) on delete set null,
  status text not null check (status in ('sent', 'opened', 'joined', 'rewarded')),
  reward_credit_id uuid references public.credits(id) on delete set null
);
create index if not exists invites_tenant_idx on public.invites(tenant_id);
create index if not exists invites_inviter_user_id_idx on public.invites(inviter_user_id);
create index if not exists invites_invitee_user_id_idx on public.invites(invitee_user_id);
create index if not exists invites_session_id_idx on public.invites(session_id);
create index if not exists invites_reward_credit_id_idx on public.invites(reward_credit_id);
create trigger invites_touch before update on public.invites for each row execute function public.touch_updated_at();
alter table public.invites enable row level security;
create policy "invites: tenant read" on public.invites for select using (tenant_id = public.current_tenant_id());
create policy "invites: staff write" on public.invites for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · A charge whose concept and price were typed by hand at the desk (S-04): a private event, a rental, a group session, a special request. It may carry a manual teacher payout and a room booking.
-- access:
--   · front_desk/coordinator/admin/finance/super_admin: full control
--   · teacher: read rows where teacher_id resolves to their teachers row (the payout feeds their S-03 statement)
--   · customer: read own rows (customer_id = auth.uid())
--   · the money in is the linked payments row; the money out is the payroll_lines row of kind manual — this table joins the two
create table if not exists public.special_charges (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- free text, e.g. "Cumpleaños de Mariana · sala + profe"
  concept text not null,
  -- COP, integer — the price agreed by hand (IVA handled by S-04 as for any sale)
  amount integer not null,
  customer_id uuid references public.users(id) on delete set null,
  -- who paid when they are not a member
  contact_name text,
  teacher_id uuid references public.teachers(id) on delete set null,
  -- COP, integer — what the teacher is paid for this Especial; becomes a payroll_lines row of kind manual
  teacher_payout integer,
  space_booking_id uuid references public.space_bookings(id) on delete set null,
  payment_id uuid not null references public.payments(id) on delete set null,
  -- pricing.ts espacio item the concept started from (privada, taller, foto…), null when typed free
  source_item text,
  note text,
  created_by uuid references public.users(id) on delete set null
);
create index if not exists special_charges_tenant_idx on public.special_charges(tenant_id);
create index if not exists special_charges_customer_id_idx on public.special_charges(customer_id);
create index if not exists special_charges_teacher_id_idx on public.special_charges(teacher_id);
create index if not exists special_charges_space_booking_id_idx on public.special_charges(space_booking_id);
create index if not exists special_charges_payment_id_idx on public.special_charges(payment_id);
create index if not exists special_charges_created_by_idx on public.special_charges(created_by);
create trigger special_charges_touch before update on public.special_charges for each row execute function public.touch_updated_at();
alter table public.special_charges enable row level security;
create policy "special_charges: tenant read" on public.special_charges for select using (tenant_id = public.current_tenant_id());
create policy "special_charges: staff write" on public.special_charges for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · One monthly teacher payroll run (M-09a): period, status, total and payout method.
-- access:
--   · finance/admin: full control
--   · teacher: read runs that contain a line of their own (S-03)
--   · a run in status paid is immutable; a correction is a new adjustment line in the next run
create table if not exists public.payroll_runs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('draft', 'approved', 'paid')),
  -- COP, sum of payroll_lines.amount
  total integer not null,
  method text not null check (method in ('wompi', 'transfer', 'cash')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  -- Wompi payout reference (simulated today)
  provider_ref text,
  notes text
);
create index if not exists payroll_runs_tenant_idx on public.payroll_runs(tenant_id);
create index if not exists payroll_runs_approved_by_idx on public.payroll_runs(approved_by);
create trigger payroll_runs_touch before update on public.payroll_runs for each row execute function public.touch_updated_at();
alter table public.payroll_runs enable row level security;
create policy "payroll_runs: tenant read" on public.payroll_runs for select using (tenant_id = public.current_tenant_id());
create policy "payroll_runs: staff write" on public.payroll_runs for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · One class taught, bonus, adjustment or manual Especial payout inside a run (M-09b, S-03).
-- access:
--   · finance/admin: full control while the run is draft
--   · teacher: read own lines (teacher_id resolves to their teachers row)
--   · nobody: lines of a paid run are read-only
create table if not exists public.payroll_lines (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  run_id uuid not null references public.payroll_runs(id) on delete set null,
  teacher_id uuid not null references public.teachers(id) on delete set null,
  -- null for a bonus, an adjustment or a month older than the session window
  class_session_id uuid references public.class_sessions(id) on delete set null,
  -- manual = a teacher payout agreed by hand on an Especial (special_charges.teacher_payout), pulled into the run by the draft generator
  kind text not null check (kind in ('class', 'bonus', 'adjustment', 'manual')),
  -- source of a manual line — the generator uses it to stay idempotent
  special_charge_id uuid references public.special_charges(id) on delete set null,
  -- COP, teachers.rate_per_class at the time of the run
  rate integer not null,
  -- COP, signed: an adjustment may be negative
  amount integer not null,
  -- checked-in students, for the statement
  attendees integer,
  -- set when this teacher is settled; a run may be paid teacher by teacher (M-09b)
  paid_at timestamptz,
  paid_method text check (paid_method in ('wompi', 'transfer', 'cash')),
  note text
);
create index if not exists payroll_lines_tenant_idx on public.payroll_lines(tenant_id);
create index if not exists payroll_lines_run_id_idx on public.payroll_lines(run_id);
create index if not exists payroll_lines_teacher_id_idx on public.payroll_lines(teacher_id);
create index if not exists payroll_lines_class_session_id_idx on public.payroll_lines(class_session_id);
create index if not exists payroll_lines_special_charge_id_idx on public.payroll_lines(special_charge_id);
create trigger payroll_lines_touch before update on public.payroll_lines for each row execute function public.touch_updated_at();
alter table public.payroll_lines enable row level security;
create policy "payroll_lines: tenant read" on public.payroll_lines for select using (tenant_id = public.current_tenant_id());
create policy "payroll_lines: staff write" on public.payroll_lines for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Template for one fixed studio cost (rent, utilities, cleaning…) with its cadence; M-09c generates the period’s expenses from it.
-- access:
--   · admin/finance: full control (M-09c)
--   · nobody else reads: expenses are studio-internal
--   · deactivate instead of delete once a template has generated rows, so history keeps its origin
create table if not exists public.expense_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  concept text not null,
  category text not null check (category in ('rent', 'utilities', 'internet', 'cleaning', 'software', 'insurance', 'supplies', 'maintenance', 'marketing', 'fees', 'other')),
  -- COP per occurrence
  amount integer not null,
  cadence text not null check (cadence in ('biweekly', 'monthly')),
  -- day of month it falls due (1–28); biweekly also falls due 15 days later
  anchor_day integer not null,
  vendor text,
  active boolean not null default false,
  note text
);
create index if not exists expense_templates_tenant_idx on public.expense_templates(tenant_id);
create trigger expense_templates_touch before update on public.expense_templates for each row execute function public.touch_updated_at();
alter table public.expense_templates enable row level security;
create policy "expense_templates: tenant read" on public.expense_templates for select using (tenant_id = public.current_tenant_id());
create policy "expense_templates: staff write" on public.expense_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- commerce · Every studio expense, fixed (generated from a template) or variable (recorded by hand); it subtracts in the M-09 balance.
-- access:
--   · admin/finance: full control (M-09c)
--   · nobody else reads: expenses are studio-internal
--   · a paid row (paid_on set) is never deleted by the generator; corrections are a new row with a note
create table if not exists public.expenses (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check (kind in ('fixed', 'variable')),
  category text not null check (category in ('rent', 'utilities', 'internet', 'cleaning', 'software', 'insurance', 'supplies', 'maintenance', 'marketing', 'fees', 'other')),
  concept text not null,
  -- COP, integer
  amount integer not null,
  -- the day the cost falls due or was incurred
  incurred_on date not null,
  -- null = still to pay
  paid_on date,
  method text not null check (method in ('cash', 'transfer', 'card')),
  vendor text,
  note text,
  -- set when generated from a recurring template (kind = fixed)
  template_id uuid references public.expense_templates(id) on delete set null,
  created_by uuid references public.users(id) on delete set null
);
create index if not exists expenses_tenant_idx on public.expenses(tenant_id);
create index if not exists expenses_template_id_idx on public.expenses(template_id);
create index if not exists expenses_created_by_idx on public.expenses(created_by);
create trigger expenses_touch before update on public.expenses for each row execute function public.touch_updated_at();
alter table public.expenses enable row level security;
create policy "expenses: tenant read" on public.expenses for select using (tenant_id = public.current_tenant_id());
create policy "expenses: staff write" on public.expenses for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Versioned transactional emails (M-04).
create table if not exists public.email_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null,
  name text not null,
  trigger text not null,
  subject jsonb not null,
  body_mjml text not null,
  version integer not null,
  active boolean not null default false
);
create index if not exists email_templates_tenant_idx on public.email_templates(tenant_id);
create trigger email_templates_touch before update on public.email_templates for each row execute function public.touch_updated_at();
alter table public.email_templates enable row level security;
create policy "email_templates: tenant read" on public.email_templates for select using (tenant_id = public.current_tenant_id());
create policy "email_templates: staff write" on public.email_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Meta-approved templates with variables.
create table if not exists public.wa_templates (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null,
  name text not null,
  category text not null check (category in ('utility', 'marketing', 'authentication')),
  body jsonb not null,
  approval_status text not null check (approval_status in ('draft', 'pending', 'approved', 'rejected')),
  active boolean not null default false
);
create index if not exists wa_templates_tenant_idx on public.wa_templates(tenant_id);
create trigger wa_templates_touch before update on public.wa_templates for each row execute function public.touch_updated_at();
alter table public.wa_templates enable row level security;
create policy "wa_templates: tenant read" on public.wa_templates for select using (tenant_id = public.current_tenant_id());
create policy "wa_templates: staff write" on public.wa_templates for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Trigger → channel → template, with quiet hours.
create table if not exists public.automations (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  trigger text not null,
  channel text not null check (channel in ('whatsapp', 'email', 'push')),
  template_key text not null,
  delay_min integer not null,
  quiet_hours jsonb,
  enabled boolean not null default false
);
create index if not exists automations_tenant_idx on public.automations(tenant_id);
create trigger automations_touch before update on public.automations for each row execute function public.touch_updated_at();
alter table public.automations enable row level security;
create policy "automations: tenant read" on public.automations for select using (tenant_id = public.current_tenant_id());
create policy "automations: staff write" on public.automations for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Everything sent via WhatsApp, email or push.
create table if not exists public.message_log (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references public.users(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email', 'push')),
  template_key text,
  automation_id uuid references public.automations(id) on delete set null,
  status text not null check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  sent_at timestamptz,
  payload jsonb
);
create index if not exists message_log_tenant_idx on public.message_log(tenant_id);
create index if not exists message_log_user_id_idx on public.message_log(user_id);
create index if not exists message_log_automation_id_idx on public.message_log(automation_id);
create trigger message_log_touch before update on public.message_log for each row execute function public.touch_updated_at();
alter table public.message_log enable row level security;
create policy "message_log: tenant read" on public.message_log for select using (tenant_id = public.current_tenant_id());
create policy "message_log: staff write" on public.message_log for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · The C-24 inbox: what the studio sends, with read state and a deep link.
-- access:
--   · customer: read own rows and update read_at only (user_id = auth.uid())
--   · front_desk/coordinator/admin: insert for a member (send)
--   · retention: rows older than 90 days are deleted by a scheduled job
create table if not exists public.notifications (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  kind text not null check (kind in ('booking', 'waitlist', 'payment', 'class', 'event', 'review', 'invite', 'studio')),
  -- {es,en}
  title jsonb not null,
  -- {es,en}
  body jsonb not null,
  read_at timestamptz,
  -- in-app route, e.g. /app/booking/:id
  deep_link text,
  sent_via text not null check (sent_via in ('in_app', 'whatsapp', 'email', 'push'))
);
create index if not exists notifications_tenant_idx on public.notifications(tenant_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create trigger notifications_touch before update on public.notifications for each row execute function public.touch_updated_at();
alter table public.notifications enable row level security;
create policy "notifications: tenant read" on public.notifications for select using (tenant_id = public.current_tenant_id());
create policy "notifications: staff write" on public.notifications for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- comms · Channel × category each person accepts (C-24 / C-19). No row = enabled.
-- access:
--   · customer: full control of own rows (user_id = auth.uid())
--   · admin: read only, to respect a mute before sending
--   · marketing category is opt-out per channel; transactional categories always deliver in-app
create table if not exists public.notification_prefs (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email', 'push')),
  category text not null check (category in ('bookings', 'waitlist', 'payments', 'events', 'marketing')),
  enabled boolean not null default false
);
create index if not exists notification_prefs_tenant_idx on public.notification_prefs(tenant_id);
create index if not exists notification_prefs_user_id_idx on public.notification_prefs(user_id);
create trigger notification_prefs_touch before update on public.notification_prefs for each row execute function public.touch_updated_at();
alter table public.notification_prefs enable row level security;
create policy "notification_prefs: tenant read" on public.notification_prefs for select using (tenant_id = public.current_tenant_id());
create policy "notification_prefs: staff write" on public.notification_prefs for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- system · Who did what, on which entity, when (M-07).
create table if not exists public.audit_log (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  ip text
);
create index if not exists audit_log_tenant_idx on public.audit_log(tenant_id);
create index if not exists audit_log_actor_id_idx on public.audit_log(actor_id);
create trigger audit_log_touch before update on public.audit_log for each row execute function public.touch_updated_at();
alter table public.audit_log enable row level security;
create policy "audit_log: tenant read" on public.audit_log for select using (tenant_id = public.current_tenant_id());
create policy "audit_log: staff write" on public.audit_log for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- system · Index of docs/ for search and links (the .md files are the source).
create table if not exists public.docs_entries (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  path text not null,
  title text not null,
  kind text not null check (kind in ('prompt', 'changelog', 'rule', 'guide', 'manual')),
  page_codes jsonb
);
create index if not exists docs_entries_tenant_idx on public.docs_entries(tenant_id);
create trigger docs_entries_touch before update on public.docs_entries for each row execute function public.touch_updated_at();
alter table public.docs_entries enable row level security;
create policy "docs_entries: tenant read" on public.docs_entries for select using (tenant_id = public.current_tenant_id());
create policy "docs_entries: staff write" on public.docs_entries for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- design · Index of the D-02 library (the .meta.ts files are the source).
create table if not exists public.components (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  tier text not null check (tier in ('atom', 'molecule', 'organism', 'template')),
  states jsonb,
  used_by jsonb
);
create index if not exists components_tenant_idx on public.components(tenant_id);
create trigger components_touch before update on public.components for each row execute function public.touch_updated_at();
alter table public.components enable row level security;
create policy "components: tenant read" on public.components for select using (tenant_id = public.current_tenant_id());
create policy "components: staff write" on public.components for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- design · Per-page section order saved from the drag-and-drop editor.
create table if not exists public.page_layouts (
  -- Primary key
  id uuid primary key default gen_random_uuid(),
  -- Owning studio (multi-tenant)
  tenant_id uuid not null references public.tenants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_code text not null,
  -- ordered section names
  sections jsonb not null,
  -- section names hidden
  hidden jsonb,
  updated_by uuid references public.users(id) on delete set null
);
create index if not exists page_layouts_tenant_idx on public.page_layouts(tenant_id);
create index if not exists page_layouts_updated_by_idx on public.page_layouts(updated_by);
create trigger page_layouts_touch before update on public.page_layouts for each row execute function public.touch_updated_at();
alter table public.page_layouts enable row level security;
create policy "page_layouts: tenant read" on public.page_layouts for select using (tenant_id = public.current_tenant_id());
create policy "page_layouts: staff write" on public.page_layouts for all using (tenant_id = public.current_tenant_id() and (public.has_role('super_admin') or public.has_role('admin') or public.has_role('coordinator')));

-- foreign keys to tables created later in this file (kept out of the create table so the order above stays by group)
alter table public.deletion_requests add constraint deletion_requests_user_id_fk foreign key (user_id) references public.users(id) on delete set null;
alter table public.deletion_requests add constraint deletion_requests_resolved_by_fk foreign key (resolved_by) references public.users(id) on delete set null;
alter table public.consents add constraint consents_user_id_fk foreign key (user_id) references public.users(id) on delete set null;
alter table public.legal_acceptances add constraint legal_acceptances_user_id_fk foreign key (user_id) references public.users(id) on delete set null;
alter table public.space_bookings add constraint space_bookings_special_charge_id_fk foreign key (special_charge_id) references public.special_charges(id) on delete set null;
alter table public.bookings add constraint bookings_credit_id_fk foreign key (credit_id) references public.credits(id) on delete set null;
alter table public.event_rsvps add constraint event_rsvps_payment_id_fk foreign key (payment_id) references public.payments(id) on delete set null;
alter table public.credits add constraint credits_payment_id_fk foreign key (payment_id) references public.payments(id) on delete set null;

-- ---------------------------------------------------------------------------------------------
-- RLS notes per role (refine per table when the real backend lands):
--   super_admin, admin   full read/write in their tenant (policy above)
--   coordinator          write on schedule, content, comms; read everything else
--   front_desk           write bookings, checkins (bookings.status), payments(manual), profiles; read classes
--   finance              read payments, invoices, memberships, credits; write refunds, payroll
--   teacher              read own class_sessions/bookings (teacher_id = own teachers.id); write attendance
--   maintenance          read rooms/class_sessions; write maintenance tables (future)
--   customer             read own rows (user_id = auth.uid()) in bookings, credits, memberships, payments,
--                        invoices, consents, intentions, waitlist; read public catalog (modalities, teachers,
--                        class_sessions, plans, legal_documents)
--   anon (public site)   read modalities, teachers(active), class_sessions(scheduled), plans(active), legal_documents(published)
-- Realtime: enable on class_sessions, bookings, waitlist, feature_flags, page_layouts.
-- Wompi webhooks write payments/invoices through an edge function with the service role, never from the client.
