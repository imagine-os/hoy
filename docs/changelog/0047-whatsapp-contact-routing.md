version: 0.21.0
date: 2026-09-30
prompt: docs/prompts/0047-whatsapp-contact-routing.md
intent: Justin: "Give me a pdf of everywhere you point someone to whatsapp… this whatsapp number is for front desk, not necessarily the person who handles bigger issues like payroll" — every WhatsApp handoff in the product (16 sites) resolved to the one front desk number, so teacher payroll questions (S-03) and Ley 1581 complaints (C-26) landed at reception.
decision: D-0022 — contact routing by intent, the front desk is the universal fallback. `tenants.settings.contacts` holds nine intents per tenant (`frontDesk`, `sales`, `specials`, `support`, `finance`, `payroll`, `legal`, `coordinator`, `owner`), each with name, WhatsApp, role and an hours rule (`always` · `studioHours` · `businessDays`), edited in M-08a. `resolveContact()` (src/tenant/contacts.ts, pure, `npm run test:contacts`) picks the number: no number → front desk; off duty → front desk while the studio is open, else the contact's number with a "we reply on the next open day (…)" note computed from the M-08a hours, the M-08g exceptions and Colombia's holidays. `useWhatsappLink()` is the one reader; all 16 sites name an intent; `waLink()` stays the low-level builder.
rejected: Hardcoding a second finance number in `src/tenant/tenant.ts` — rejected because the product is multi-tenant and the owner edits contact facts in M-08a, not in code (0018, D-0016 precedent); a `finance_whatsapp` column on `tenants` — rejected, the routing table is settings data with the same fallbacks as the profile fields; a per-page number override (each button its own field) — rejected, the intents are the vocabulary the voice controller and the manual need, and nine rows are what the owner can reason about; routing by the *person's* role instead of the topic — rejected, a teacher asking about payroll and a member sending a receipt are different topics from different roles that reach the same finance contact.
files: src/tenant/contacts.ts; src/tenant/hours.ts; src/modules/admin/settings.ts; src/modules/admin/SettingsPage.tsx; src/modules/admin/actions.ts; src/modules/admin/admin.css; src/modules/admin/strings.ts; src/modules/customer/actions.ts; src/modules/customer/strings.ts; src/modules/customer/pages/MorePage.tsx; src/modules/customer/pages/FaqPage.tsx; src/modules/customer/pages/PlansPage.tsx; src/modules/customer/pages/PaymentMethodsPage.tsx; src/modules/customer/pages/AccountPage.tsx; src/modules/customer/auth/LockedPage.tsx; src/modules/teacher/PayrollPage.tsx; src/modules/teacher/strings.ts; src/modules/website/SiteShell.tsx; src/modules/website/strings.ts; src/modules/website/pages/ClassicHomePage.tsx; src/modules/website/pages/PlansPage.tsx; src/modules/website/pages/ContactPage.tsx; src/components/organism/LiveBlock/LiveBlock.tsx; scripts/test-contacts.mjs; package.json; package-lock.json; public/actions.json; public/hub-map.json; docs/reference/whatsapp-handoffs.md; docs/reference/surfaces.md; docs/decisions.md; docs/kanban.md; docs/README.md; docs/pages/M-08a.md; docs/pages/S-03.md; docs/pages/C-26.md; docs/pages/W-06.md; docs/pages/C-25.md; docs/pages/C-15.md; docs/pages/E-04.md; docs/pages/C-05.md; docs/pages/P-01.md; docs/ops-manual/es/13-crm-y-whatsapp.md; docs/ops-manual/en/13-crm-y-whatsapp.md; docs/ops-manual/es/16-nomina-y-payouts.md; docs/ops-manual/en/16-nomina-y-payouts.md; ROADMAP.md; docs/screenshots/M-08a/*; docs/screenshots/S-03/*-payroll.jpg; docs/screenshots/routes.json; docs/prompts/0047-whatsapp-contact-routing.md; docs/changelog/0047-whatsapp-contact-routing.md
codes: M-08a, S-03, C-26, W-06, C-25, C-15, C-05, C-06, E-04, P-01, W-01, K-03

Model routing: Fable 5.1 (audit, shared code, docs).

Checks: build green · tsc 0 errors · lint:spacing 61 / 61 (baseline unchanged) · manual-lint 0 · hub-map and actions.json regenerated (59 actions, version 0.21.0) · `npm run test:contacts` 26 checks pass · `npm run test:hours` and `npm run test:holidays` pass. The Rollup circular-chunk warning between `src/actions/bus.ts` and `src/actions/index.ts` is the 0046 card, untouched here. Captures refreshed: M-08a 390 / 1280 ES / EN light (`docs/screenshots/M-08a/`) and S-03 `/teach/payroll` 390 / 1280 (`docs/screenshots/S-03/*-payroll.jpg`); dark and 3840 wait for the next capture pass (carded).

## Why

The audit (`docs/reference/whatsapp-handoffs.md`) counted 16 WhatsApp handoffs and one target number: `useContact().whatsapp`,
the front desk. Fourteen of them belong there. Two do not: a teacher asking about a payroll statement (S-03, the screenshot
Justin sent) and a member exercising a Ley 1581 right (C-26, a channel with a fifteen-business-day duty). Nothing in the
product could name another person, so the fix is not a second constant but a table the owner edits.

## What changed

- **Data (`StudioSettings.contacts`).** `src/tenant/contacts.ts` defines `ContactIntent` (nine values), `ContactHours`,
  `ContactRoute { name?, whatsapp?, role?, hours }`, the labels, where each intent is used (page codes) and
  `DEFAULT_CONTACT_ROUTES` (roles and hours only, no numbers). `settings.ts` adds the section to `StudioSettings`,
  `DEFAULT_SETTINGS` and `mergeSettings()` (merged per intent, so a partial stored table still resolves the rest).
- **Rules (`resolveContact`).** Pure, in `contacts.ts`: `frontDesk` or an intent with no number → the front desk (its own
  row's number if set, else `contactOf(settings).whatsapp`, i.e. M-08a profile then tenant.ts); `always` → the number;
  `studioHours` → the number while the studio is open (`effectiveHoursFor` + `zonedNow` in America/Bogota), else the number
  with the note naming the next opening (`nextOpening`); `businessDays` → the number Monday–Friday excluding holidays
  (closed `holiday` overrides and the Colombian calendar), else the front desk while the studio is open, else the number
  with the note naming the next business day. `whatsappLink()` wraps `waLink()`. `DAY_NAME` is exported from `hours.ts` for
  the note. `useWhatsappLink()` in `settings.ts` returns `resolve`, `link`, `display` (number + pending label when it is
  the unconfirmed front desk number) and `contacts`; `whatsappLinksOf()` is its pure twin.
- **The 16 sites.** W-01 footer, W-05 card, W-06 CTA, W-08 form → `frontDesk` (`useWaHref()` now reads the hook); W-02 →
  `sales`; W-03, W-04, W-07, W-11 → `specials`; W-09, W-10, W-12 → `support`; W-13 → `finance` (the number in the transfer
  step); W-14 → `legal` (the number in the data-controller notice); W-15 → `payroll`, plus a line under the button saying who
  receives it ("Tu pregunta llega a {name} (nómina)" or "…a recepción, que la pasa a finanzas"); W-16 `{{tenant:contact}}`
  lists every configured contact as `WhatsApp · <topic>: name · role · number`. The two inline `bi()` messages became
  `site.first.wa` and `site.contact.wa`; C-15 uses `customer.more.whatsapp.textAnon` instead of "Hola, soy .". Where the
  resolved contact carries a `note`, it renders as small text under the button or in the row's subtitle (C-25 shows it in
  place of the static "Respondemos en horario del estudio").
- **M-08a card "Contactos de WhatsApp por tema".** One row per intent: topic, where it is used, what it resolves to right
  now (from the draft, so the effect is visible before saving), name, WhatsApp (hint "Sin número: recae en recepción" /
  "Vacío: el WhatsApp del estudio"), role (staff roles) and hours rule with its explanation. Save is disabled while a number
  has fewer than 10 digits. Reuses `Field`, `Input`, `Select`, `Card` — no new component. `.settings-contact` grid on tokens,
  five columns → two at 1280 → one at 600.
- **Actions.** `settings.contacts.update` (M-08a; params `intent`, `name?`, `whatsapp?`, `role?`, `hours?`;
  `settings.write`; merges one row, stores the full table, same `settings.update` audit row as the card) and `contact.whatsapp`
  (C-25; params `intent?`, `text?`; read-only, answers the resolved recipient, number and wa.me link plus the note).
  `public/actions.json`: 59 actions, 13 permissions, 18 declaring pages.
- **Tests.** `scripts/test-contacts.mjs` (esbuild bundle, like `test-analytics`): fallback for all nine intents, a front
  desk row's own number, payroll on a business day / open Saturday / closed Saturday / late business day / holiday Monday,
  `always`, `studioHours` open, after closing and across a Sunday + holiday, `isBusinessDay` and `nextBusinessDay`.

## Docs

D-0022 in `docs/decisions.md`; the audit copied to `docs/reference/whatsapp-handoffs.md`; `docs/reference/surfaces.md`
(0047 delta, two rows); page docs M-08a, S-03, C-26, W-06 (sections) and C-25, C-15, E-04, C-05, P-01 (changelog lines);
manual chapters 13 (a "who receives which WhatsApp" table under the channel rules) and 16 (the statement button goes to the
payroll contact named in Ajustes); ROADMAP §E 48 (owner: the finance / payroll and legal numbers); kanban follow-ups:
a `coordinator` route for the S-01 substitution request, whether Especiales should skip the front desk relay, the owner's
numbers, and the M-08a / S-03 captures.
