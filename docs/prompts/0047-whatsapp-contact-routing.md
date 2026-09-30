# WhatsApp contact routing by intent

Source: Slack thread (#hoy) · 2026-09-30 · Justin Massion

## Prompt

Give me a pdf of everywhere you point someone to whatsapp, like this.    One issue is that staff this whatsapp number is for front desk, not necessarily the person who handles bigger issues like payroll

_(Attached screenshot: `api.whatsapp.com/send/?phone=573127765000&text=Hi, I have a question about my September 2026 payroll (total $440,000)` — the teacher payroll button on S-03.)_

## Response

Shipped as **v0.21.0** on branch `feat/contact-routing` (from `main` at v0.20.0). Two deliverables: the inventory Justin asked for, and the fix for the problem it exposed.

- **The inventory.** Every WhatsApp handoff in the product — 16 sites (13 wa.me links, 3 copy-only mentions of the number), what each prefills, who sees it and where it should go — lives in the repo as `docs/reference/whatsapp-handoffs.md` (the PDF handed over in the thread was rendered from it). Two were misrouted: the teacher payroll button (S-03) and the Ley 1581 complaint channel (C-26), both landing at the front desk because the product knew one number only.
- **Contacts by topic (M-08a).** `tenants.settings.contacts` is a per-tenant routing table with nine intents — `frontDesk`, `sales`, `specials`, `support`, `finance`, `payroll`, `legal`, `coordinator`, `owner` — each with a name, a WhatsApp number, a role and an hours rule (`always` · `studioHours` · `businessDays`). The new card in `/#/admin/settings` ("Contactos de WhatsApp por tema") edits them, shows where each topic is used (page codes) and what it resolves to right now, and says "recae en recepción" while a row has no number. The front desk is the universal fallback (D-0022); its own number is the studio WhatsApp from the card above unless the owner types another.
- **One helper.** `resolveContact()` in `src/tenant/contacts.ts` (pure, tested by `npm run test:contacts`) applies the rules: no number → front desk; `always` → that number; `studioHours` → that number while the studio is open, else that number with the note "Respondemos el próximo día hábil (…)" / "We reply on the next open day (…)" computed from the M-08a hours, the M-08g exceptions and Colombia's holidays; `businessDays` → that number Monday to Friday excluding holidays, otherwise the front desk while the studio is open, else that number with the note. `useWhatsappLink()` (settings.ts) is the one React reader; `waLink()` stays the low-level builder.
- **All 16 sites rewired.** Footer, contact card, contact CTA and form → `frontDesk`; trial class → `sales`; Especiales on P-01, W-06 and C-06 → `specials`; C-25, C-15 and E-04 → `support`; the transfer receipt (C-05) → `finance`; the data-controller notice (C-26) → `legal`; the S-03 payroll button → `payroll`, with a line saying who receives it; the manual's `{{tenant:contact}}` block lists every configured contact (name · role · number). The two inline messages became string keys, and the C-15 concierge message no longer reads "Hola, soy ." when the name is unknown. Where a contact is off duty the note renders under the button or in the row.
- **Machine surface.** `settings.contacts.update` (M-08a, `settings.write`) and the read-only `contact.whatsapp` (C-25) join `actions.json` (59 actions).
- **Docs.** D-0022, page docs M-08a / S-03 / C-26 / W-06 (and a line on C-25, C-15, E-04, C-05, P-01), manual chapters 13 and 16 (who receives which WhatsApp), `docs/reference/surfaces.md`, ROADMAP §E 48 (the owner supplies the finance / payroll and legal numbers), kanban follow-ups: a `coordinator` route for substitution requests, whether Especiales get a direct coordination number, and the owner's numbers.

Not done on purpose: no second number is typed anywhere — the table ships empty except for roles and hours, so until Justin fills in finance / payroll / legal in M-08a every topic still reaches the front desk (by design, visibly). Captures: M-08a (390 / 1280, ES / EN, light) and the S-03 payroll page (`-payroll`, 390 / 1280) refreshed; dark and 3840 wait for the next capture pass.

Changelog: `docs/changelog/0047-whatsapp-contact-routing.md`. Decision: D-0022.

Model routing: Fable 5.1 (audit, shared code, docs).
