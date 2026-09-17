# HoyOS kanban

_Updated every turn. Codes reference `src/specs/canvasSpecs.ts` and the module `specs.ts` files; `/#/dev/specs` shows the live built/stub badge per code (v0.7.0, two parallel tracks: **0018** owner decisions as settings — M-08a contact identity, M-08c payroll cadence + rate card, M-08f content decisions — plus M-10 Integraciones and ROADMAP §G; **0019** app-store readiness — StatTile fit, C-26 Cuenta y datos, W-09 public deletion page, M-11 deletion queue; 96 routes, 84 codes, 0 stubs, 48 tables, 56 components in D-02; on top of v0.6.2's Especiales, v0.6.1's expenses ledger and v0.6.0's three tracks). What is still missing is listed as a plain numbered list in `ROADMAP.md` §F._

## Backlog

### Product
- **P1 leftovers from 0007/0008** (numbered in ROADMAP §B/P1): M-02 editors for `content_articles` / `faq_entries` + an event publisher for `events` (M-03 edits them generically today) · server-side invite reward (`invites.status` only reaches `sent` from the client; `joined` / `rewarded` + `reward_credit_id` need the Supabase function that grants the credit) · staff-side `notifications` sending (front desk / M-04 / M-05 writing a row) and the 90-day retention job · event waitlist (`event_rsvps.status` has no `waitlist` value yet) and attendance marking from S-02 · real Wompi tokenisation behind `wompiTokenise()`
- **From Jas's review (0014), still open**: M-09c has no CSV export for the accountant yet (M-09b has one) · attach the invoice / receipt image to an expense row (needs Supabase Storage, like M-02d's upload) · ~~the "15 días" range stays as a filter until Sergio confirms fortnightly pay periods~~ **0018: the cadence is a switch in M-08c and the range default follows it — Sergio only has to pick**
- A-06 legal pages inside the app (site pages exist) · real Supabase Auth behind A-02/A-03/C-21 (SessionProvider already accepts any `users` row)
- **App-store readiness, still open after 0019** (`docs/app-store-compliance.md` §4): the server-side deletion job that M-11's seven-step checklist specifies (anonymise `profiles` + `users`, delete the auth user, purge notifications, keep payments / invoices under the anonymous id, flip `deletion_requests` to done, send the confirmation) · the edge function behind the public W-09 insert (rate-limit, no read-back) · a "report this review" action + moderation queue for C-10 reviews if they go public (Apple 1.2 / Play UGC) · privacy nutrition labels and the Play Data safety form filled from `docs/data-model.md` · the native shell (Capacitor / TWA) and push delivery
- S-04 register page overflows horizontally at 390 px (DesktopShell at phone width; found by the 0019 tile sweep, staff is desktop-first so not fixed there) · the `--only=/app$` exact-match form of `scripts/screenshots.mjs` skipped C-01 in the 0019 run — check the `$` handling
- C-05 transfer instructions can read the payout account from M-08c (M-08c stores it since 0007)
- PDF receipts (C-11)
- S-02/S-04 follow-ups: offline queue for check-ins, real Wompi link · M-04 MJML designer + real provider · M-05 Meta approval API · M-09 Wompi payouts + DIAN CUFE emission
- M-02d file upload (Supabase Storage — the row stores a URL today) + a server-side scheduled-publish job · M-06 duplicate merge · M-07 signed CSV
- Supabase provider (auth, realtime) · Wompi payments/payroll · WhatsApp CRM · email designer
- Code-split the bundle by surface (single ~1.7 MB chunk today) · live cursors / presence (nice to have)
- **Add `remark-gfm`** (its own changelog entry, with the alternative rejected) and delete the pipe-table transform in `MarkdownViewer` (`preprocessMarkdown()` fences pipe tables into a ```table block because `react-markdown` alone cannot render them; the legal documents were written as lists for the same reason)

### Docs & content
- Visual pass follow-ups: per-screen density check of C-03, C-04, S-04, M-03 against their canvas artboards at real size; photography placeholders (`data-ph`) once real imagery exists; consider vendoring Inter/DM Sans woff2 for offline captures
- Canvas audit #9/#30: prune the 32 orphan dictionary keys (n_waiver, wv_sign, at_seg, at_nav, ph_qr, door_scan…) from `reference/canvas/strings.json` consumers
- Canvas audit #24/#25: register in D-02 the components screens use but the library lacks; fix D-02 copy counts (49 sections, 4-tab dock)
- Canvas audit #27: amend plan phase-3 text that still lists check-in and front desk (K-01) · #28: date the v0.1 decision entries · #33: add `data` and `roles` to the C-08b spec
- Resolve the owner decisions listed at `/#/manual/decisions` (ROADMAP §E) and update the chapters — **since 0018 the blocking ones are fields to fill in**: contact details (M-08a), rate card and cadence (M-08c), legal versions and map provider (M-08f), IVA on prices (M-08c); what remains a decision is pack validity, DIAN provider / legal issuer, the Wompi settlement account and the pause rules
- Remove the C-07b and 'C-14 / C-15' compatibility aliases from `scripts/gen-specs.mjs` (routes now use C-07b as the credits ledger and C-14/C-15 separately)
- Enrich `docs/pages/<code>.md` (generated skeletons) with the hand-written "Real vs mock" and section notes per page
- `scripts/screenshots.mjs` has no state parameter, so the collapsed sidebar / rail and the mobile drawer are not captured (0007 verified them by hand) — add `--state=` or a per-route hook
- `docs/prompts/0009-salvage-empty10.md` is missing (0009 shipped with a changelog entry only); `docs/prompts/0013-ops-manual-visual-live.md` is missing the same way (its changelog references it) — the owner's prompt for the whole v0.6.0 cycle is `docs/prompts/0011-website-brand-content.md`
- Photography, video and the drawn contact map for the 12 `media_assets` slots (all `pending`) — the owner supplies these; the map provider is now a setting in M-08f (`none` until chosen)
- **ROADMAP §G — when nothing else is queued** (0018): SEO/OG + prerender · “next class in N minutes” widget · membership calculator · then the rest of `docs/website-vision.md`

### Decisions
- **Open questions from Jas's review (0014), with Justin to forward** — recorded as ROADMAP §E 21–24:
  - **Sergio**: are teachers paid fortnightly or monthly? — **both are built since 0018**: the M-08c cadence switch drives M-09a (one or two runs per month), S-03 and the Finance range; Sergio picks
  - **Sergio**: does the Coordinator see the monthly total-revenue KPI in the admin panel?
  - **Lore**: do we need to store the customer's sex/gender? (no field today)
  - **Lore**: is there a group-session product for birthdays/events (book room + teacher + an add-on)? — **structurally answered in 0017**: a birthday or event group session is an **Especial** (room in S-05 + teacher + hand price in S-04, payout to payroll); whether it becomes a standard product with a fixed price is still Lore's call

### Repo hygiene
- empty10 placeholder: awaiting Justin's decision (reset to placeholder or delete)

## Doing
- (none — 0018 decisions-as-settings and 0019 app-store readiness both pushed, both v0.7.0)

## Done

### Decisions as settings · Integraciones · §G (0018 · v0.7.0)
- **M-08a General**: contact identity as fields — address, city (Medellín), WhatsApp, email, Instagram handle + URL, map lat/lng, map label, Google Maps link — with a **“Datos confirmados”** switch; `useContact()` / `contactOf()` is the one reader (M-08a first, `tenant.ts` as default) and the site footer, W-06, `MapSlot`, the legal `{{tenant.*}}` tokens, the email footer, C-25/C-06/C-16/A-02 contact rows and `{{tenant:contact}}` all label values as pending until it is on
- **M-08c Payments**: `pricesIncludeIva` documented as the driver of S-04 / C-04 / P-01 · **payroll cadence `monthly | biweekly` programmed both ways** (`payrollCalc.periodsFor()`, `periodAt()`; M-09a generates one or two runs per month and replaces an overlapping draft of the other cadence; S-03 navigates by period; Finance default range 30 d / 15 d; `{{policy:payroll_cadence}}`) · **rate card** by modality + per-teacher override (`payrollCalc.rateFor()`: teacher → modality → `rate_per_class`; the seed's 80–110k moved to the seeded settings row) · default payout method · who signs · withholding flag
- **M-08f Content** (new code): public naming `disciplines | movements` (`classDisplay()` on C-03 / W-04) · **Respiración as its own class** (new `respiracion` modality row; `visibleModalities()` hides it on W-03 / W-07 / W-08 / C-03 while off) · map provider `none | osm | google` read by `MapSlot` with a preview · **legal versions** publish toggle per `legal_documents` row (audited `legal.publish` / `legal.unpublish`)
- **M-10 Integraciones** (new code, `/admin/integrations`, super_admin/admin): one card per Wompi · WhatsApp Business · email · DIAN · maps · Supabase with non-secret fields, `simulated → configured → connected` chip, “keys live server-side” notice naming the env vars, dev checklist, notes, manual link; new **`integrations` table** (46 → 47), seeded simulated; `integration.update` audited; M-08a's Integrations section is a pointer; M-09a's badge reads the Wompi row
- **ROADMAP**: §A 0.7.0 · §E items 2 / 11 / 21 / 22 / 27 / 30 / 31 marked “→ setting in M-08x (fill in)” · §F 15 and 20 updated · new **§G — When nothing else is queued** (SEO/OG + prerender, next-class widget, membership calculator, then the vision doc)
- **Manual** ES + EN: `26` rewritten around M-10, `16` cadence switch + rate card, `01` pointer to M-08a
- **Verified**: 27 / 27 Playwright checks — biweekly September = 2.240.000 + 885.000 = the monthly 3.125.000; a Hot Vinyasa rate edit moves the S-03 estimate; a WhatsApp edit moves the site footer and W-06; M-10 renders ES / EN and its save is audited; `npm run build` clean; smoke exit 0

### App-store readiness and stat-tile fit (0019 · v0.7.0)
- **StatTile never wraps**: the value is measured after layout and shrinks (`--stat-fit`, down to 50 %) to the tile width, re-fitting on resize; label and hint clamp to two lines; meta state `long-value`. The phone frame is a named CSS container (`container: phone / inline-size`) so `.grid-3` / `.grid-4` collapse inside it like on a real 390 px phone — the actual cause of Justin's "COP 440,000" on three lines. Sweep of every KPI tile (13 routes, ES + EN, 390 viewport + 1280 frame): **8 wrapped → 0**; two other wrapping figures fixed (OrderSummary amount, C-06 plan price)
- **`deletion_requests`** (46 → 47): who asked (member or public contact), channel app / website / front_desk, status requested → processing → done | cancelled, reason, checklist json, resolved_by; RLS contract; rows never deleted
- **C-26 `/app/account` Cuenta y datos** (new): data controller from M-08, marketing consent per channel (`notification_prefs`), privacy version accepted, download my data (JSON of 20 tables), legal links, two-step delete-account request that says what is kept (invoices, anonymised) and what ends; pending state with cancel; C-19 / C-25 link to it; the old client-side "disable" is gone
- **W-09 `/site/delete-account`** (new): the public URL Google Play requires — email or WhatsApp, reason, retention explanation, no sign-in; footer link on every site page; privacy policy §7 points at both paths
- **M-11 `/admin/crm/deletions`** (new, admin / super_admin): queue with status actions, seven-step anonymisation checklist gating "Marcar hecha", internal note, M-06 link, audit row per move; nav under CRM
- **`docs/app-store-compliance.md`**: Apple + Google Play rows marked done / pending / needs dev, the settings the app already provides, the ordered pre-submission list; rendered in `/#/docs`
- **Manual 23** ES + EN: the real deletion flow (member, public page, desk, admin queue, retention) with figures of the three screens
- Verified: build clean, 47 tables, smoke exit 0, tile sweep 8 → 0, Playwright flow 26 / 26 (member request → public request → admin done → audit trail)

### Especiales (0017 · v0.6.2)
- **Named**: Especiales / Specials — the edge cases handled by hand, living inside the `espacio` family whose "desde" prices already end in a conversation (manual `12`)
- **Two tables** (42 → 44): `special_charges` (concept, hand price, customer or contact, teacher + `teacher_payout`, `space_booking_id`, `payment_id`, `source_item`) and `space_bookings` (room, kind private_event / rental / private_class / maintenance / blocked, window, status held → confirmed → done / cancelled); `payroll_lines.kind` gains `manual` + `special_charge_id`; `payments.user_id` nullable for a non-member payer
- **S-04** "Qué compra" gained **Espacio · Especiales**: the five "desde" items + a free Especial row open the Especial card (concept, agreed amount, teacher + payout, room + window with the S-05 conflict check, note); "Quién" gained **Solo contacto**; one sale writes payment + invoice + `special_charges` + confirmed `space_bookings`, each audited; `?booking=` preloads an S-05 booking and confirms it
- **Payroll**: `payrollCalc.ts` `manualLinesFor` / `draftLinesFor` — M-09a's draft includes one "Especial: <concept>" line per payout, idempotently (delete + recompute, sourced by `special_charge_id`); M-09b, S-03 and the CSV print it; verified run total = classes + manual lines
- **S-05 `/staff/rooms`** (new code): `RoomDayGrid` organism (rooms × hours, classes by movement, bookings by kind, held dashed, "now" line), 14-day strip + any date, booking form that **refuses an overlapping window** and lists what is in the way, confirm / done / cancel, "Cobrar (S-04)"; linked from S-01 and the nav; the teacher's S-03 home lists their own bookings with the payout
- **Website copy** in the brand voice: P-01 "Especiales · Lo que no cabe en un plan", W-06 card, C-06 line — all to WhatsApp from `tenant.contact`, nothing sold online
- **Manual** ES + EN: `12` §3 books in S-05 with the conflict rule, new §7 Especiales; `10` pointer; `16` manual lines
- Seed: second room **Sala de meditación** (demo capacity — real room list is the owner's), four bookings and two Especiales, the delivered birthday being the manual line of the current draft; `gen-sql.mjs` defers forward / circular FKs to an `alter table` block
- Jas's item 34 for Lore answered structurally (see Decisions)


### Expenses ledger (0016 · v0.6.1)
- **Two tables**, additive, bilingual, `commerce` group, with `TableDef.rls` (admin / finance read + write): `expense_templates` (recurring fixed cost: concept, category, amount, cadence `biweekly` | `monthly`, anchor day, vendor, active) and `expenses` (kind `fixed` | `variable`, category, concept, amount, `incurred_on`, `paid_on`, method cash | transfer | card, vendor, note, `template_id`, `created_by`) — 42 → **44**; `npm run sql` regenerated `supabase/schema.sql` and `docs/data-model.md`
- **One arithmetic**: `src/data/expenseCalc.ts` (`dueDatesFor`, `fixedExpensesFor`, no React) is what the seed and M-09c's generator both call — a monthly template falls due on its anchor day, a biweekly one also fifteen days later (the quincena), one due day = one fixed row, an existing row is skipped
- **M-09c `/admin/finance/expenses`** (Jas's point 9): the same 7 / 15 / 30 / 90 días / Todo chips as M-09, tiles for fijos / variables / pagado / por pagar, by-category `BarList`, an add-expense form, the recurring-templates panel with an **idempotent "Generar gastos fijos del periodo"** (regenerating never duplicates a row; a paid row is never deleted), activate / deactivate, a new-template form, and **Marcar pagado** per unpaid row; every write is an `audit_log` row (`expense.*`); new `expenses.read` / `expenses.write` permissions; nav entry "Gastos" next to Finanzas and Nómina; existing components only
- **M-09 Balance del periodo** card: Ingresos (approved payments) − Nómina (payroll runs whose period overlaps the range, at their current total) − Gastos (rows dated in the range, paid or not) = Balance, with the margin and links to M-09a / M-09c; existing cards intact
- **Seed**: six Medellín-realistic templates (arriendo 4.800.000, EPM 1.150.000, internet 189.900, aseo 700.000 / quincena, software 240.000, póliza 380.000), three months of fixed rows generated from them and fifteen variable expenses over 90 days, appended after every other pass so no other page's data shifts
- **Docs**: ops-manual chapter 14 ES + EN "Gastos y balance" with the M-09c and M-09 figures, `docs/pages/M-09c.md`, `docs/pages/M-09.md` updated, finance screenshots retaken (M-09, M-09a, M-09b, M-09c), ROADMAP §A 0.6.1 / §F 21 done, README, `package.json` 0.6.1

### Integration (v0.6.0)
- Merged `work/site` → `work/depth` → `work/manual` onto `main`, `--no-ff` each, build green between merges, **no conflicts** (the three tracks touched disjoint files)
- `MediaSlot` and `MapSlot` gained an optional `slotKey` and read `media_assets` (M-02d) the way `MediaPlaceholder` already did; explicit `src` still wins. Five `site.classes.*` rows added to the seed and `site.hero` made a video slot, so the library covers all **12** places art is owed (W-01, W-02, W-05, W-06, W-07, W-08, C-03, C-13, C-18, C-23)
- `{{pricing:<family>}}` in the manual dropped its private `FAMILY_ROLE` copy and reads `FAMILY_ROLE` / `FAMILY_RATIONALE` from `src/tenant/pricing.ts`, printing the family's role, subtitle and "why it exists" above the price table
- City settled: the app says **Medellín** everywhere; the manual's decision blockquote is narrowed to the real address and contact details, `EmailPreview`'s meta reads `tenant.city`, and every surviving "Bogot" in the repo is the `America/Bogota` timezone
- Manual chapter 16 rewritten in ES and EN against the routes that exist (M-09a, M-09b, per-teacher settle, the self-closing run, the 15-day range, S-03 reading the run); the last two `[screenshot: …]` per language replaced — **64 figures per language, zero placeholders**
- Jas's two items: "Planes claros" → **Planes** / **Plans**, and dark-mode card titles verified readable in the W-01 dark capture
- `package.json` **0.1.0 → 0.6.0** (it had been stale through all of v0.5.0); README, ROADMAP §A/§E/§F and this board updated
- `scripts/screenshots.mjs`: `--only=…$` exact-path matching (so `/manual` can be captured without the chapter route that shares its K-03 code) and `:chapter` → `03-modelo-de-valor`
- Full screenshot pass: **89 routes, 369 captures, 58 MB**, no console errors; six new page docs generated (M-02a…M-02d, M-09a, M-09b), K-03 and S-03 docs now name their labelled captures

### Ops manual, visual and live (0013 · v0.6.0)
- 11 flat chapters became **28 ES + 28 EN in seven parts** (HOY · Operación diaria · Clientes y planes · Dinero · Contenido y marca · Legal y políticas · Sistema); nothing dropped, `LEGACY_SLUGS` keeps old links resolving
- `/manual` is a cover: wordmark, tagline, version, chapter/reading/figure/decision counts, a search box, "start here by role" and a part-by-part grid of `ChapterCard`s; a chapter adds its part eyebrow, role chip, reading time and a sticky `Toc`
- **Live data instead of copied numbers**: `{{pricing[:family]}}`, `{{tenant:hours|contact|capacity}}`, `{{policy[:field]}}`, `{{tables}}` / `{{table:<name>}}`, `{{roles}}`, `{{routes:<surface>}}`, `{{stats}}` / `{{kpi:<name>}}` render through the new `LiveBlock` organism, reading `pricing.ts`, `tenant.ts`, M-08, `tableRegistry`, `roles.ts` and the module registry. An unknown kind degrades into an explanation
- **Real screenshots**: a titled markdown image renders through the new `Figure` organism (framed, captioned, page-code chip, clickable to the live screen) — 64 per language after the integration pass
- New components with metas: `LiveBlock`, `Figure` (organisms), `ChapterCard`, `Toc` (molecules); `MarkdownViewer` gained three additive props (`directive`, `figure`, `headingIds`) so `/#/docs` and the knowledgebase are unchanged
- Pipe tables render again everywhere `MarkdownViewer` is used: `preprocessMarkdown()` fences them into a ```table block (a workaround for the missing `remark-gfm` — see Backlog)
- 27 `DECISIÓN PENDIENTE` flags across the 28 chapters (17 pre-existing + 10 new), each flagged once and cross-referenced, feeding K-04 and ROADMAP §E

### Thin-screen depth (0012 · v0.6.0)
- **Five tables**: `media_assets`, `payroll_runs`, `payroll_lines`, `legal_acceptances`, with `legal_documents` rewritten for versions and bilingual bodies — 38 → **42**
- **M-02 is a family**: M-02a articles (bilingual markdown with a live preview, slug, category, `publish_at`, "publish now"; status is derived, not stored), M-02b FAQ (sections from `group_key`, ↑/↓ ordering, page 1 = C-14 / page 2 = C-15), M-02c events (capacity capped by `tenant.studio.mats`, never below RSVPs taken), M-02d the media library as a checklist of the artwork the studio owes
- **M-09 payouts are real rows**: M-09a `/admin/finance/payouts` generates a period's draft **idempotently** (regenerating deletes and recomputes; approved or paid runs are refused with a reason), M-09b `/admin/finance/payouts/:id` is the per-teacher statement with approve, send via Wompi, mark paid by transfer or cash, per-teacher settle, CSV and print — and the run closes itself as paid once the last teacher is settled. A 15-day range in M-09 because Colombian studios settle biweekly
- **One arithmetic**: `src/data/payrollCalc.ts` has no React and no provider; the seed, M-09a and S-03 all call it, so the three screens cannot disagree. A payout is **not** a `payments` row — money out lives on the run and its lines, with an `audit_log` entry per action and `wompiPayout()` as the dispersion seam
- **S-03 reads the run**: live estimate before finance generates it, `payroll_lines` after, with run status, per-class breakdown, run history, payout method, print and a prefilled WhatsApp link to finance. The placeholder badge is gone
- **A-06 is a versioned bilingual legal library**: six kinds, seven versions, every number a `{{policy.*}}` token and every studio fact a `{{tenant.*}}` token resolved from M-08 at render time, Colombian framing throughout (Ley 1581/2012 + Decreto 1377/2013, Ley 1480/2011 arts. 47 and 51, Ley 527/1999); `legal_acceptances` is append-only; one `LegalDocument` organism serves the site and the new `/app/legal/:kind`
- New components with metas: `MarkdownEditor` (molecule), `LegalDocument` (organism)

### Website and brand content (0011 · v0.6.0)
- `src/tenant/brand.ts` (new) is the only place the manifesto, the "Sobre HOY" and philosophy paragraphs, the five class essays and the taglines are written — every field `{es,en}`, transcribed from the owner's brand PDF. Each class carries `eyebrow`, `summary`, `movement`, `heated`, an art `brief`, `bring` keys and `modalitySlugs`, the join to live duration/intensity/heat
- `src/tenant/pricing.ts` gained `FAMILY_ROLE`, `FAMILY_RATIONALE` and `DISCIPLINE` (additive; no price changed), so P-01 explains the value model instead of listing prices
- `src/tenant/tenant.ts`: `city: 'Medellín'`, new `location` and `social`, and `contact.pending` so screens label the placeholder phone/email/address instead of presenting them as fact
- Two new codes: **W-07** `/site/classes` and **W-08** `/site/classes/:slug`; every site page now renders through `useLayout(spec)`, so `/#/dev/layout/W-xx` works for all of them
- New components with metas: `MediaSlot` and `MapSlot` (molecules). `MapSlot` defaults to `provider="none"` — a branded frame with the address and a Google Maps deep link, no network request, so captures stay offline-safe
- Two rendering bugs fixed while verifying: the mobile side gutter (a `padding` shorthand on the same element as `.container` wiped it at 390) and dark-theme heading contrast on the movement and class cards
- `docs/website-vision.md` (new) carries the shot list for the artwork the owner will supply

### Tenant city (0015 · v0.5.1)
- **Tenant** `city` is **Medellín** (was Bogotá) — C-05's "Medellín · COP" subtitle, the auth-shell footer and the M-04 email footer all follow from `src/tenant/tenant.ts`; `timezone` stays `America/Bogota` (Colombia's IANA zone), README fixed, and the `EmailPreview` D-02 usage now reads the city from the tenant config instead of hardcoding it

### Jas design review (0014 · v0.5.1)
- **C-06** "Tu plan" card shows **Inicio del plan** / **Fin del plan** ("Plan start" / "Plan end") from the existing `memberships.starts_at` and `ends_at ?? renews_at`, through `formatDate()` with the year — no new columns
- **C-02 / C-01** a class with no spots left shows a **Sin cupos** / **Full** pill (danger `Badge`, in place of the capacity meter) and can no longer be booked: the row leads to the waitlist (C-20). `core.common.full` ES is now "Sin cupos"; `ClassRow.meta.ts` documents and renders the `full` state
- **Seed** always has one upcoming class today at capacity (deterministic, applied after the random pass so no other page's data shifts) with a waitlist row behind it
- **S-04** Resumen gained **Valor pagado** (defaults to the invoiced total, untouched = one-click sale) and, when it differs, the difference plus a required **Observación** that blocks "Completar venta" until filled; both persist as `payments.amount_paid` / `payments.note` (schema.ts + supabase/schema.sql + docs/data-model.md) and land in the audit entry
- **C-05** subtitle is "Medellín · COP" — the "IVA 19%" fragment is gone in both languages; receipt and POS maths untouched
- **W-01 / P-01** (dark-mode "Cuatro movimientos" titles, "Planes claros" → "Planes") — handed to the concurrent website workstream, which holds `src/modules/website/**`; both landed in v0.6.0 (`site.plans.title` is now "Planes" / "Plans" and the dark heading inks were fixed and verified in the W-01 dark capture)

### Final integration (0010 · v0.5.0)
- `src/modules/customer/policy.ts` reads `usePolicy()` (`src/modules/admin/settings.ts`): its own `attachPolicy()` peek/fetch/subscribe loop is deleted, `toPolicyValues()` is the one M-08 → `PolicyValues` mapper, and `usePolicyValues()` is exported for new components. `<PolicySync/>` stays (it bridges the hook to the 18 plain `policy.*` readers and the non-React helpers) but now assigns during render, above the router, so the first paint shows stored values
- 0007 and 0008 both keep version 0.5.0 — they shipped together; recorded in ROADMAP §A so the duplicate is not read as an error
- Full screenshot pass: 80 routes, 308 `.jpg` captures retaken, 109 changed — the nine pages 0008 rewired (C-05, C-10, C-13, C-14/C-15, C-16, C-19, C-23, C-24, S-03) and the pages the containment pass shifted; M-08a…M-08e byte-identical to 0007. No console errors, `docs/screenshots` 39 MB. Collapsed-sidebar state skipped — the script has no state parameter
- `gen-page-doc.mjs --all` wrote M-08a…M-08e page docs; `docs/pages/M-08.md` is now the family index and its retired single-page captures were removed
- ROADMAP: §A rewritten for 0.5.0, Data lane done, six numbered P1 leftovers, and new **§F "What remains after this pass (for Justin)"** — 18 numbered items in four groups (mocked integrations, thin screens, owner decisions, repo hygiene). 265 lines
- README at 0.5.0

### Data depth (0008 · v0.5.0)
- Nine new tables, additive, with bilingual labels, `TableGroup` (so M-03 lists them) and a new `TableDef.rls` access contract: `notifications`, `notification_prefs`, `reviews`, `invites`, `events`, `event_rsvps`, `payment_methods`, `content_articles`, `faq_entries` (29 → 38)
- `scripts/gen-sql.mjs` emits `TableDef.rls` as `-- access:` comments per table in `supabase/schema.sql` and as a "Who may read / write" list in `docs/data-model.md`; `docs/roles.md` carries the same matrix per role
- Seed: 6 rule/about articles, 17 FAQ entries (6 sections, 2 pages), 3 upcoming events with RSVPs, a review for every past class marked rated (+ `teachers.rating_avg` recomputed), 2–4 notifications per customer derived from their own bookings/payments, the demo customer's full 3 × 5 preference matrix, saved methods for electronic payers, 5 invites incl. one rewarded with a real `credits` row
- C-24 lists `notifications` (mark one / all read) and owns the channel × category preference matrix (no row = enabled); C-19's three toggles are the per-channel master switch
- C-10 inserts `reviews` (anonymous by default) and updates `teachers.rating_avg`; `/teach/class/:id` shows the session's average, count and top tags read-only
- C-16 writes `invites` with the member's referral code; C-23 lists published `events`, writes `event_rsvps` and pays through the existing Wompi seam (`payments` + `invoices`, `plan_id = null`)
- C-05 manages `payment_methods` (add via the new `wompiTokenise()` seam, remove, make default); `token_ref` is visibly a placeholder and the PAN never reaches HoyOS
- C-13 and C-14/C-15 read `content_articles` / `faq_entries`; `src/modules/customer/content.ts` deleted and the 23 dictionary keys of the derived inbox pruned
- New component `RatingSummary` (molecule, `.meta.ts`, states) — D-02 stays current in the same turn

### Admin shell (0007 · v0.5.0)
- `DesktopShell`: 240 px lane ⇄ 56 px icon rail with tooltips (footer chevron + `[`), collapsed state per surface in localStorage; nav groups fold with a caret (state per group, active route's group forced open); off-canvas drawer with scrim below 900 px, opened from the top bar
- Top bar for staff/admin/dev: sidebar toggle · wordmark · page name + code chip · global search (routes by name/code, members by name, `/` to focus, ↑↓, Enter) · ES/EN · theme · unread bell (`message_log`) · role switcher · dev-mode toggle · spec chip
- New molecules `GlobalSearch` and `NotificationBell` (with metas); `TopBar` gained `leading`, `code` and `center` slots; `RouteDef.nav` gained `group` as an i18n key and `to`
- Feature switches left M-01 for M-08b; M-08 is now M-08a General · M-08b Features · M-08c Payments (payout account, NIT, IVA/DIAN, Wompi env, "keys never stored here") · M-08d Communications · M-08e Branding, each a route with its own spec and an audited section save
- M-01 gained "Today at a glance" (today's classes, occupancy, who is already checked in) in the freed space
- `usePolicy()` exported from `src/modules/admin/settings.ts` — M-08 saves reach consumers immediately
- Design system reachable from the admin sidebar for a super admin (`core.nav.group.design` → tokens, components, specs, layout editor at C-01, knowledgebase); dev surface keeps its own shell and lists the admin group too
- Containment pass: no card-like element lets text escape at 390 or 1280 px (Playwright: 17 real overflows before, 0 after) — `min-width: 0` on flex/grid children, `overflow-wrap: anywhere` for codes/emails/IDs, media and `pre` capped
- D-01 gained `--w-rail: 56px`

### Visual fidelity (0006 · v0.4.0)
- D-01 rewritten from the canvas hoy-brand tokens: `--hoy-c*` palette, `--m-*` RGB triplets, semantic surfaces (frame paper / sand tiles / cream lane / sand ground), Depth shadow scale verbatim, Texture layer as CSS (`--tex-*`), materials (`--mat-*`), surface scale, movements from `movSets.hoy`, radii 4/8/11/16/18/24/32/34, breathe 7 s + spin 1.1 s
- Accent split: `--color-primary` (text, dark → `--cat`) vs `--color-accent-fill` (fills, constant deep blue)
- PhoneShell = canvas phone frame from 900 px (430 × 34 px radius, frame gradient + grain, dock inside the frame, sand ground); DesktopShell = cream lane sidebar with accent pill; top bars cream .9 + blue hairline
- Cards, chips, buttons, segmented, date strip, stat tiles, inputs, toggles, avatars, nav bar, badges, notices, lists, tables on the surface/shadow/texture tokens; no hairline borders in the styled skin (wireframe restores them)
- Inter/DM Sans metric fallbacks (`@font-face size-adjust`), headings in ink with -0.02em, 11 px .14em eyebrows
- `/#/dev/tokens` shows palette, triplets, surfaces, textures, materials and the shadow scale live; `docs/design-system.md` mapping table canvas var → token
- Before/after pairs + `docs/screenshots/_before/0006/comparison.jpg`; full screenshot pass regenerated; smoke green

### Final integration (0005 · v0.3.0)
- `WIRED` += S-02 M-01 C-02 C-02b C-03 C-19 (layout editor badge)
- Hub "Customer app" card, website sign-in button, schedule sign-in prompt and plans "buy" → `/auth/sign-in` (with `?next=`); staff/teacher cards still switch demo users
- SessionProvider accepts any `users` row id (profile + user_roles resolved from the data layer); A-03 signs in as the created account; `useTable`/`useRow` re-peek synchronously on query change
- MockProvider cross-tab realtime: `storage` listener reloads the db and emits `reset` (verified with two Playwright pages)
- Customer policy values read from M-08 `tenants.settings` (`policyFromSettings`, `<PolicySync/>`); M-08 gains payment hold, charge notice and lockout fields; default cancellation window aligned to the canvas (2 h)
- `core.nav.history` shared key · seed: demo customer ≤ 1 booking/day, birthdays on ~30 % of profiles (half this month)
- Screenshot tooling reads the app's own route manifest (`window.__hoyos.routes` → `docs/screenshots/routes.json`), saves JPEG q72; `gen-page-doc.mjs --all`
- Canvas audit #22 (S-04 IVA from pricing + M-08 tax) and #26 (scanner dropped from the S-02 spec) closed
- Full screenshot pass (es/en × 390/1280, dark for key pages) and `docs/pages/<code>.md` for every routed code

### Staff & admin (0003 · v0.2.0)
- S-01 role home with live numbers (next class, arrivals, open shifts, payments, recent activity)
- S-02 front desk check-in: today strip, roster, search, one-tap check-in, walk-in, late/no-show, waitlist promote, `useLayout` wired
- S-04 register & take payment: who · what (pricing.ts) · how, IVA from M-08, receipt, auto check-in
- S-03 teacher app: home, `/teach/class/:id` attendance + notes, `/teach/payroll` (placeholder until Wompi), `/teach/profile`
- M-01 dashboard: KPI row, occupancy chart, audited feature switches, audit trail, `useLayout` wired
- M-02 content CMS (templates, teachers, modalities, rooms) · M-04 email studio · M-05 WhatsApp automations
- M-06 CRM member 360 · M-07 activity log · M-08 settings & policies (`tenants.settings`) · M-09 finance (new code)
- Components: EmptyState, RosterRow, BarList, PhoneBubble, Timeline, EmailPreview, Receipt (with metas)
- Every staff write appends to `audit_log` via `useAudit`

### Customer (0002 · v0.2.0)
- Booking flow: C-02 schedule + C-02b week · C-03 class detail · C-04 checkout (entitlements, IVA computed, Wompi seam, E-02 inline) · C-05 payment methods · C-08 booked + C-08b change sheet · C-20 waitlist (30-min claim) · E-01 E-02 E-03 demo routes + inline states
- Account & plans: C-06 · C-07 · C-07b · C-22 (pause ≤ 30 d, cancel at period end) · C-11 · C-19 (photo, WhatsApp, emergency contact, LangToggle → users.locale) · C-24 · C-25 · C-13 · C-14/C-15 · C-16 · C-17 · C-18 (+ profile) · C-23 · C-10 · A-05
- Auth: A-01 splash · A-02 sign-in (demo picker, lockout → E-04) · A-03 create account · C-21 OTP recovery · E-04 locked
- Components: Skeleton · Notice · ListRow/ListGroup · SegmentedControl · DateStrip · CountdownRing · EmptyState · Accordion · RatingScale · OtpInput · OrderSummary · BreathingRings (all with metas)

### Docs & content (0004)
- Operations manual: 11 ES + 11 EN chapters in `docs/ops-manual/`, bilingual viewer with chapter sidebar, callouts, placeholders, prev/next, print (K-03)
- Decisions pending page auto-extracted from the manual (K-04)
- Canvas v1.5 installed; `CANVAS-AUDIT.md`; `scripts/extract-canvas.mjs`; specs/strings regenerated; C-02b, C-14, C-15 separate; C-07b retired with alias (D-03)
- `docs/flow-map.md` with routes per code
- Docs viewer: grouped sidebar, kanban lanes × columns, changelog newest first, prompt | response, screenshot gallery, mobile picker (K-02); knowledgebase reuses the renderers (K-01)
- MarkdownViewer: callouts, screenshot placeholders, `components` prop (D-02)
- Screenshot rules rewritten; `screenshots.mjs` naming, `--only`, `--label`; `docs/pages` template + generator
- ROADMAP.md (P1–P7, DoD, how-to, open decisions) and README.md (seven perspectives)

### Scaffold (0001 · v0.1.0)
- Repo bootstrap: rules (`CLAUDE.md`), reference material, docs skeleton, Pages workflow
- D-01 design tokens (light/dark, wireframe skin) · ThemeProvider
- i18n core (`useT`, ES/EN, fallback, LangToggle)
- Roles, demo users, SessionProvider, `RequireRole`, dev mode + view-as
- Inspector panel + spec chip + `Ctrl+.` · `/#/dev/specs` index
- Data layer: schema + tableRegistry + MockProvider (localStorage, change events) + Supabase stub + `supabase/schema.sql`
- M-03 Table manager · Layout editor (`/#/dev/layout/:code`) + `useLayout`
- Docs viewer (`/#/docs`), knowledgebase (`/#/dev/knowledgebase`), ops-manual viewer (`/#/manual`)
- Public website scaffold (home, about, modalities, schedule, teachers, plans, contact, legal) · Testing hub (`/#/`)
