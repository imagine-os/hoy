# WhatsApp handoffs — where the product points someone to WhatsApp

Audit date 2026-09-30 · repo imagine-os/hoy @ 02e844a (main, v0.20.0) · model: Fable 5.1 · prompt `docs/prompts/0047-whatsapp-contact-routing.md`.

**Status after 0047 (v0.21.0).** Every row below now names an *intent* and reads its number through `useWhatsappLink()`
(`src/modules/admin/settings.ts`) → `resolveContact()` (`src/tenant/contacts.ts`) → the M-08a table
`tenants.settings.contacts` (D-0022). The "Target today" column describes the state this audit found; the "Should go to"
column is now the intent each site declares: W-01, W-05, W-06, W-08 `frontDesk` · W-02 `sales` · W-03, W-04, W-07, W-11
`specials` · W-09, W-10, W-12 `support` · W-13 `finance` · W-14 `legal` · W-15 `payroll` · W-16 lists every configured
contact. Until the owner types the finance / payroll / legal numbers in M-08a (ROADMAP §E 48) each intent still resolves to
the front desk — by design, and visibly ("recae en recepción").

## Summary

- Total handoffs: **16** (13 wa.me links/buttons, 3 copy-only mentions of the number)
- Misrouted: **2** — W-14 (Customer app C-26 Cuenta y datos), W-15 (Teacher app S-03 Nómina)
- Distinct target numbers: **1** — +57 312 776 5000, the front desk (source: useContact().whatsapp → M-08a settings.profile.whatsapp, default src/tenant/tenant.ts contact.whatsapp)
- Distinct intent categories: **9** — customer support; customer support — account access; finance / billing — payment proof; front desk / general; legal / habeas-data complaints; other — reference for staff; sales — specials / B2B; sales — trial class; teacher payroll
- Distinct prefilled messages: **9** (plus 3 sites with no text)
- The problem in two sentences: every WhatsApp handoff in the product resolves to the same `contact.whatsapp`, which is the front desk's number. Payroll questions from teachers (W-15) and Ley 1581 complaints (W-14) therefore land at the front desk instead of finance / the owner, and nothing in the product knows who else could receive a message.

## Inventory

| ID | file:line | Surface / page | Who sees it | Trigger | Prefilled message | Target today (source) | Intent | Should go to | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| W-01 | `src/modules/website/SiteShell.tsx:117` | Website footer (every /#/site/* page) | public visitor | Footer link 'WhatsApp +57 312 776 5000' | (none — opens the chat with no text) | +57 312 776 5000 | front desk / general | front desk | OK | Number rendered from useContact(); 'pending' suffix if unconfirmed. |
| W-02 | `src/modules/website/pages/ClassicHomePage.tsx:149` | Website home W-01, classic edition only (?edition=classic; default is 'sanctuary', which has no WhatsApp CTA) | public visitor | Button 'Escríbenos por WhatsApp' / 'Write to us on WhatsApp' in the trial-class panel | ES: Hola HOY, quiero una clase de prueba.<br>EN: Hi HOY, I would like a trial class. | +57 312 776 5000 | sales — trial class | front desk | OK | Message is an inline bi() literal, not a strings.ts key. |
| W-03 | `src/modules/website/pages/PlansPage.tsx:37` | Website plans P-01 (/#/site/plans), 'Espacio' (space rental) card | public visitor | Link-button 'Escribirnos por WhatsApp' under the space-rental prices | ES: Hola HOY, quiero preguntar por un especial: un evento privado o una sesión de grupo.<br>EN: Hi HOY, I would like to ask about a special: a private event or a group session. | +57 312 776 5000 | sales — specials / B2B | front desk as intake; coordination quotes (manual ch. 12) | OK | Manual ch. 12: 'Recepción no cotiza: pasa el contacto a coordinación el mismo día'. Acceptable as intake; a coordinator route would skip the relay. |
| W-04 | `src/modules/website/pages/PlansPage.tsx:47` | Website plans P-01, 'Especiales' section | public visitor | Button 'Escribirnos por WhatsApp' | same as W-03 (site.plans.specials.wa) | +57 312 776 5000 | sales — specials / B2B | front desk as intake; coordination quotes | OK | Same string key as W-03. |
| W-05 | `src/modules/website/pages/ContactPage.tsx:32` | Website contact W-06 (/#/site/contact), WhatsApp card | public visitor | Card value '+57 312 776 5000' is a link | (none) | +57 312 776 5000 | front desk / general | front desk | OK |  |
| W-06 | `src/modules/website/pages/ContactPage.tsx:58` | Website contact W-06, primary CTA | public visitor | Button 'Abrir WhatsApp' / 'Open WhatsApp' | ES: Hola HOY, quiero información.<br>EN: Hi HOY, I would like some information. | +57 312 776 5000 | front desk / general | front desk | OK | Inline bi() literal. |
| W-07 | `src/modules/website/pages/ContactPage.tsx:70` | Website contact W-06, 'Especiales' card | public visitor | Button 'Escribirnos por WhatsApp' | same as W-03 (site.plans.specials.wa) | +57 312 776 5000 | sales — specials / B2B | front desk as intake; coordination quotes | OK |  |
| W-08 | `src/modules/website/pages/ContactPage.tsx:26-28, 106` | Website contact W-06, 'Escríbenos' form | public visitor | Button 'Enviar por WhatsApp' / 'Send on WhatsApp' (disabled until a message is typed); window.open(wa.me) | ES: Hola HOY, soy {name} ({phone}). {message}<br>EN: Hi HOY, I am {name} ({phone}). {message}  (site.contact.fTemplate; free text) | +57 312 776 5000 | front desk / general | front desk | OK | Free text can carry any intent; nothing stored. |
| W-09 | `src/modules/customer/pages/MorePage.tsx:47` | Customer app C-25 Más (/#/app/more) | customer / member | List row 'Escribir al estudio' / 'WhatsApp the studio'; subtitle shows the number + 'Respondemos en horario del estudio' | ES: Hola, soy {name}. Tengo una pregunta:<br>EN: Hi, it is {name}. I have a question:  (customer.more.whatsapp.text, first name) | +57 312 776 5000 | customer support | front desk | OK | Reply-window text is a static string in customer/policy.ts, not hours-aware. |
| W-10 | `src/modules/customer/pages/FaqPage.tsx:31` | Customer app C-15 FAQ page 2 (/#/app/faq/2), concierge card | customer / member | Button 'WhatsApp →' next to '¿No está tu pregunta? Una persona te responde.' | same key as W-09 with name '' → renders 'Hola, soy . Tengo una pregunta:' (copy bug: empty name) | +57 312 776 5000 | customer support | front desk | OK | Fix the empty-name message when refactoring. |
| W-11 | `src/modules/customer/pages/PlansPage.tsx:130` | Customer app C-06 Planes (/#/app/plans), specials card | customer / member | Button 'Escríbenos →' / 'Write to us →' | ES: Hola HOY, quiero preguntar por un especial: un evento privado o una sesión de grupo.<br>EN: Hi HOY, I would like to ask about a special: a private event or a group session.  (customer.plans.specials.wa) | +57 312 776 5000 | sales — specials / B2B | front desk as intake; coordination quotes | OK | Duplicate of site.plans.specials.wa in a second module. |
| W-12 | `src/modules/customer/auth/LockedPage.tsx:33` | Auth E-04 Acceso en pausa (/#/auth/locked) | customer (locked out) | Button 'Escribir al estudio' / 'WhatsApp the studio' | ES: Hola, no puedo entrar a mi cuenta.<br>EN: Hi, I cannot sign in to my account.  (customer.locked.whatsappText) | +57 312 776 5000 | customer support — account access | front desk (escalate to admin if account security) | OK |  |
| W-13 | `src/modules/customer/pages/PaymentMethodsPage.tsx:90` | Customer app C-05 Medios de pago (/#/app/payment-methods), transfer steps | customer / member | Copy only, no link: step 2 of 'Cómo pagar por transferencia' | ES: Envía el comprobante por WhatsApp a {whatsapp}.<br>EN: Send the receipt by WhatsApp to {whatsapp}.  (customer.pay.transfer.step2) | +57 312 776 5000 (interpolated) | finance / billing — payment proof | front desk (step 3: 'Recepción confirma') | OK | Not a link; the number is typed into the sentence. |
| W-14 | `src/modules/customer/pages/AccountPage.tsx:103` | Customer app C-26 Cuenta y datos (/#/app/account), data-controller card | customer / member | Copy only, no link: the Ley 1581 data-controller notice | ES: … Para cualquier consulta, corrección o queja escribe a {email} o por WhatsApp al {whatsapp}: respondemos en máximo quince días hábiles.<br>EN: … For any enquiry, correction or complaint write to {email} or WhatsApp {whatsapp}: we answer within fifteen business days at most.  (customer.account.controller.body) | +57 312 776 5000 (interpolated) | legal / habeas-data complaints | owner / admin (the data controller) | MISROUTED | A legal complaint channel with a 15-business-day duty; the front desk is not the data controller. |
| W-15 | `src/modules/teacher/PayrollPage.tsx:76, 170 (+ strings.ts:87, 118-119)` | Teacher app S-03 Nómina (/#/teach/payroll), statement footer | teacher (route also open to 'finance') | Button 'Preguntar por este extracto' / 'Ask about this statement'; paid-state copy 'Si algo no cuadra, escríbenos' points at the same button | ES: Hola, tengo una pregunta sobre mi nómina de {period} (total {total}).<br>EN: Hi, I have a question about my {period} payroll (total {total}).  (teacher.payroll.ask.text) | +57 312 776 5000 | teacher payroll | payroll / finance (or owner) | MISROUTED | Manual ch. 16 §3 and docs/pages/S-03.md:90 both describe this as 'a WhatsApp button to finance'; the code sends it to the front desk number. | **Removed in 0051** (the studio asked to drop the "Ask about the statement" option; the `payroll` intent stays for M-08a routing).
| W-16 | `docs/ops-manual/{es,en}/01-quienes-somos-y-filosofia.md:48 via src/components/organism/LiveBlock/LiveBlock.tsx:175` | Operations manual ch. 01 (/#/docs/manual/01), {{tenant:contact}} live block | staff (every role) | Rendered as text rows (no link): 'WhatsApp +57 312 776 5000' | (none — reference table) | +57 312 776 5000 | other — reference for staff | front desk number is correct here | OK | Informational; the manual has no per-role contact list (finance, coordination, owner). |

All 16 rows resolve the number through useContact().whatsapp → M-08a settings.profile.whatsapp, default src/tenant/tenant.ts contact.whatsapp.

## Reviewed and excluded (not a studio handoff)

- `src/modules/customer/pages/InvitePage.tsx:37` — wa.me to the invited friend's number (or the share sheet) — not a studio handoff.
- `src/modules/teacher/HomePage.tsx:60 + strings.ts:20,26` — Substitution request: inserts a message_log row with payload.to = 'coordinator'; copy says 'Coordinación recibe la solicitud por WhatsApp'. No wa.me link today — a natural future 'coordinator' intent.
- `src/modules/customer/strings.ts:847` — 'si cambiaste de idea, escríbenos' (deletion in progress) — no link and no number.
- `src/modules/website/pages/DeleteAccountPage.tsx, SignUpPage, ProfilePage, RegisterPage` — Collect the person's own WhatsApp number — not handoffs.
- `M-05 /admin/whatsapp, S-06 inbox, MessageComposer, M-06 Conversación` — Outbound messaging from the studio number (simulated) — not handoffs.
- `docs/pages/*.md, public/hub-map.json, src/specs/canvasSpecs.ts` — Documentation and spec text mentioning WhatsApp; no rendered link.

## Notes on the mechanisms this fix builds on

### (a) Existing tenant / phone / hours settings

- One number only: src/tenant/tenant.ts `contact.whatsapp = '+57 312 776 5000'` (confirmed by the owner, prompt 0036, 2026-09-29) with `contact.confirmed` per-field flags and `pendingLabel`.
- Per-tenant override exists: M-08a Ajustes → General (/#/admin/settings, src/modules/admin/SettingsPage.tsx:129) edits `tenants.settings.profile.whatsapp` (+ `confirmedFields.whatsapp`). Reader: `useContact()` / `contactOf()` in src/modules/admin/settings.ts:152-190 (falls back to tenant.ts). All 16 sites above resolve the number through it (website via `useWaHref()`/`waHref()` in src/modules/website/SiteShell.tsx:31-37).
- Link builder: `waLink(phone, text)` in src/i18n/format.ts:69-70 → https://wa.me/<digits>?text=<encoded>. Every handoff calls it directly with `contact.whatsapp`; there is no intent parameter and no other phone anywhere (no finance / payroll / coordinator / owner contact in tenant.ts, settings.ts or the seed).
- Related settings already in StudioSettings (settings.ts:19-48): `comms.whatsappSender` (sender name, M-08d), `quietHours`, `payroll.signedBy` (a name, no phone), `payments.*` (bank account). None is a contact routing table.
- Hours are already data (prompt 0041, D-0016): `useOpeningHours()` (settings.ts) merges M-08a `openingHours` with `hours_overrides` rows (M-08g, /#/admin/settings hours; Colombian holidays from src/tenant/holidays.co.ts). `hours.today`, `todayKey`, `overrides`, `upcomingOverrides()` and `overrideLine()` in src/tenant/hours.ts give everything an hours/holiday-aware fallback needs.
- The customer app's reply promise is static: `policy.replyWindow = 'Respondemos en horario del estudio'` (src/modules/customer/policy.ts:53), shown on C-25.

### (b) i18n mechanism

- i18n: every module exports `strings: StringTable` (`{ es, en }` per key, `module.section.key`), read with `useI18n().t(key, params)` (`{param}` interpolation) and `bi()` for `{es,en}` objects; Spanish required, English falls back. Two handoff messages are inline `bi()` literals instead of keys (W-02, W-06).
- Prefilled messages live in three string tables: src/modules/website/strings.ts (`site.plans.specials.wa`, `site.contact.fTemplate`), src/modules/customer/strings.ts (`customer.more.whatsapp.text`, `customer.plans.specials.wa`, `customer.locked.whatsappText`, `customer.pay.transfer.step2`, `customer.account.controller.body`), src/modules/teacher/strings.ts (`teacher.payroll.ask.text`).

### (c) Numbered docs, version, actions registry

- package.json version: 0.20.0 (HEAD 02e844a on main, 2026-09-30).
- Prompts: docs/prompts/NNNN-slug.md, highest 0046-tables-calendar-timeline.md → next is 0047. Changelog: docs/changelog/NNNN-slug.md, highest 0046-tables-calendar-timeline.md (same slug as the prompt). Rule (docs/rules/documentation.md): take the next free NNNN; renumber on collision.
- Decisions: a single file docs/decisions.md with `### D-00NN — title` sections; highest D-0021 (views are rows; realtime is Supabase first) → next is D-0022.
- Kanban: docs/kanban.md (header paragraph lists the version per prompt; `## Backlog` with `NNNN follow-up` bullets naming the model).
- Page docs: docs/pages/<code>.md (S-03.md, W-06.md, C-25.md, E-04.md exist). Surfaces: docs/reference/surfaces.md. Ops manual: docs/ops-manual/{es,en}/NN-slug.md (ch. 13 CRM y WhatsApp, ch. 16 nómina, ch. 26 integraciones).
- Actions registry: declared per module in src/modules/{customer,admin,dev}/actions.ts (`ActionDef` from src/actions/types.ts) and attached to `PageSpec.actions`; `scripts/gen-actions.mjs` writes public/actions.json (schema hoy.actions/1, 57 actions today, none about contact or WhatsApp). Run-time bus: src/actions/bus.ts (`window.__hoyos.run`).

## The fix (built in 0047, as proposed)

1. **Per-tenant contact routing table** in M-08a settings (new `StudioSettings.contacts`, rendered in /#/admin/settings): rows keyed by intent — `frontDesk`, `sales`, `specials`, `support`, `finance`, `payroll`, `legal`, `coordinator`, `owner` — each with name, WhatsApp number (E.164), role, and hours behaviour (`always` | `studioHours` | `businessDays`). Every intent falls back to `frontDesk`; `frontDesk` defaults to `tenant.contact.whatsapp`.
2. **One helper** `whatsappLink(intent, message)` (next to `waLink` in src/i18n/format.ts or a new src/tenant/contacts.ts + `useWhatsappLink()` hook reading `useSettings()` and `useOpeningHours()`): resolves intent → contact, applies the hours/holiday-aware fallback (outside the contact's hours: route to front desk when the studio is open, otherwise keep the number and append a 'we reply next open day: {day}' line from `hours.today`/`upcomingOverrides`), and returns the wa.me URL. Replace the 13 direct `waLink(contact.whatsapp, …)` / `waHref(…)` calls and the two interpolated numbers (W-13, W-14) with it; move the two inline `bi()` messages (W-02, W-06) into strings.ts; fix the empty-name message on W-10.
3. **Actions registry**: a `settings.contacts.update` action (params intent, name, whatsapp, role, hours; permission `settings.write`) declared in src/modules/admin/actions.ts on the M-08a spec, plus a read-only `contact.whatsapp` action (param intent) so the voice controller / WebMCP can 'open WhatsApp for payroll'. Regenerated into public/actions.json by the build.
4. **Docs same turn**: prompt/changelog 0047, D-0022 (intent-based contact routing, front desk as the universal fallback), kanban, docs/pages/M-08a.md + S-03.md + C-26.md, manual ch. 13/16/21 ('Número de WhatsApp… coordinación / admin' table), docs/reference/surfaces.md.
