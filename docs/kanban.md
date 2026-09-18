# HoyOS kanban

_Updated every turn. Codes reference `src/specs/canvasSpecs.ts` and the module `specs.ts` files; `/#/dev/specs` shows the live built/stub badge per code (v0.8.0 — **0021** Conversación CRM y bandeja de mensajes: `message_log` as the unified communications record, the comms seam, the Conversación tab in M-06, the new S-06 inbox, the unread bell and the S-01 messages card; on top of v0.7.1's **0020** polish and code-quality pass — code splitting, local date keys, dead code, strings, tokens, the visual audit; on top of v0.7.0's two parallel tracks: **0018** owner decisions as settings — M-08a contact identity, M-08c payroll cadence + rate card, M-08f content decisions — plus M-10 Integraciones and ROADMAP §G; **0019** app-store readiness — StatTile fit, C-26 Cuenta y datos, W-09 public deletion page, M-11 deletion queue; 98 routes, 85 codes, 0 stubs, 48 tables (21 with an access contract), 61 components in D-02, 395 captures; on top of v0.6.2's Especiales, v0.6.1's expenses ledger and v0.6.0's three tracks). What is still missing is listed as a plain numbered list in `ROADMAP.md` §F._

## Backlog

### Product
- **P1 leftovers from 0007/0008** (numbered in ROADMAP §B/P1): M-02 editors for `content_articles` / `faq_entries` + an event publisher for `events` (M-03 edits them generically today) · server-side invite reward (`invites.status` only reaches `sent` from the client; `joined` / `rewarded` + `reward_credit_id` need the Supabase function that grants the credit) · staff-side `notifications` sending (front desk / M-04 / M-05 writing a C-24 in-app row — **not** closed by 0021, whose inbox writes `message_log`, the WhatsApp / email record; the two could be joined by one `useMessaging()` call later) and the 90-day retention job · event waitlist (`event_rsvps.status` has no `waitlist` value yet) and attendance marking from S-02 · real Wompi tokenisation behind `wompiTokenise()`
- **From Jas's review (0014), still open**: M-09c has no CSV export for the accountant yet (M-09b has one) · attach the invoice / receipt image to an expense row (needs Supabase Storage, like M-02d's upload) · ~~the "15 días" range stays as a filter until Sergio confirms fortnightly pay periods~~ **0018: the cadence is a switch in M-08c and the range default follows it — Sergio only has to pick**
- Real Supabase Auth behind A-02/A-03/C-21 (SessionProvider already accepts any `users` row)
- **App-store readiness, still open after 0019** (`docs/app-store-compliance.md` §4): the server-side deletion job that M-11's seven-step checklist specifies (anonymise `profiles` + `users`, delete the auth user, purge notifications, keep payments / invoices under the anonymous id, flip `deletion_requests` to done, send the confirmation) · the edge function behind the public W-09 insert (rate-limit, no read-back) · a "report this review" action + moderation queue for C-10 reviews if they go public (Apple 1.2 / Play UGC) · privacy nutrition labels and the Play Data safety form filled from `docs/data-model.md` · the native shell (Capacitor / TWA) and push delivery
- The `--only=/app$` exact-match form of `scripts/screenshots.mjs` skipped C-01 in the 0019 run — check the `$` handling (ROADMAP §F 35)
- PDF receipts (C-11)
- S-02/S-04 follow-ups: offline queue for check-ins, real Wompi link · M-04 MJML designer + real provider · M-05 Meta approval API · M-09 Wompi payouts + DIAN CUFE emission
- M-02d file upload (Supabase Storage — the row stores a URL today) + a server-side scheduled-publish job · M-06 duplicate merge · M-07 signed CSV
- Supabase provider (auth, realtime) · Wompi payments/payroll · ~~WhatsApp CRM~~ **0021: the CRM thread and the S-06 inbox exist over `message_log`; what is left is the Cloud API itself (below)** · email designer
- Live cursors / presence (nice to have)
- **Left by the 0020 polish pass** (ROADMAP §F 25–32): `TableDef.rls` for the 27 tables without one (`message_log` got its contract in 0021) · spec `data:` overrides for M-03 / C-01 / D-01 / D-02 / K-01 / P-01 / A-06 · `useLayout(spec)` on the ~70 fixed-order pages · module layering (`admin/settings.ts` readers → `src/tenant/`, `staff/people.ts` + `audit.ts` → `src/data/`) · one `sessionPhase()` predicate · eslint + prettier, then stricter TS · slim `canvasSpecs.ts`, stop shipping 63 MB of screenshots in `dist/`, per-surface string tables
- **Add `remark-gfm`** (its own changelog entry, with the alternative rejected) and delete the pipe-table transform in `MarkdownViewer` (`preprocessMarkdown()` fences pipe tables into a ```table block because `react-markdown` alone cannot render them; the legal documents were written as lists for the same reason)
- **Left by 0021 (Conversación CRM y bandeja)**: the real **WhatsApp Cloud API webhook → `message_log`** (inbound rows with `direction inbound`, `external_id = wamid`, plus status callbacks sent → delivered → read → failed on the outbound rows; the queued rows released when quiet hours end) · **email inbound (IMAP or SES) → `message_log`** (`channel email`, `direction inbound`, threading by `In-Reply-To` onto the person's `user_id`) and the newsletter sender writing `source newsletter` rows per recipient · an **"Equipo" conversation** in S-06 for `user_id`-null rows (the teacher's substitution request lives only in M-05's log today) · **RLS for `message_log`** applied server-side from the `TableDef.rls` contract (desk roles read / insert / update `read_at`; the customer reads own non-internal rows; the webhook service role inserts inbound) · a per-conversation "assigned to" or "waiting on us" state once two people answer from the same number · `MessageComposer` templates (the M-05 approved templates as one-tap replies) · `scripts/screenshots.mjs --state=` so the open bell popover is captured by the pass (today `S-06/es-1280-popover.jpg` is a hand-made capture)

### Docs & content
- Visual pass follow-ups: per-screen density check of C-03, C-04, S-04, M-03 against their canvas artboards at real size; photography placeholders (`data-ph`) once real imagery exists; consider vendoring Inter/DM Sans woff2 for offline captures
- Canvas audit #9/#30: prune the 32 orphan dictionary keys (n_waiver, wv_sign, at_seg, at_nav, ph_qr, door_scan…) from `reference/canvas/strings.json` consumers
- Canvas audit #24/#25: register in D-02 the components screens use but the library lacks; fix D-02 copy counts (49 sections, 4-tab dock)
- Canvas audit #27: amend plan phase-3 text that still lists check-in and front desk (K-01) · #28: date the v0.1 decision entries · #33: add `data` and `roles` to the C-08b spec
- Resolve the owner decisions listed at `/#/manual/decisions` (ROADMAP §E) and update the chapters — **since 0018 the blocking ones are fields to fill in**: contact details (M-08a), rate card and cadence (M-08c), legal versions and map provider (M-08f), IVA on prices (M-08c); what remains a decision is pack validity, DIAN provider / legal issuer, the Wompi settlement account and the pause rules
- Remove the C-07b and 'C-14 / C-15' compatibility aliases from `scripts/gen-specs.mjs` (routes now use C-07b as the credits ledger and C-14/C-15 separately)
- Enrich `docs/pages/<code>.md` (generated skeletons) with the hand-written "Real vs mock" and section notes per page
- `scripts/screenshots.mjs` has no state parameter, so the collapsed sidebar / rail and the mobile drawer are not captured (0007 verified them by hand) — add `--state=` or a per-route hook
- Photography, video and the drawn contact map for the 12 `media_assets` slots (all `pending`) — the owner supplies these; the map provider is now a setting in M-08f (`none` until chosen) · decide 12 vs the 16 slots `docs/website-vision.md` plans (ROADMAP §F 34)
- **Visual follow-ups from the 0020 audit** (ROADMAP §F 32): one date / time format for admin tables · bilingual names for seed content shown as UI (template names, `cancel_reason`, expense concepts) · dark variant of the yellow accent surface · HUB-01 card-grid composition · D-02 as per-tier routes · `scripts/screenshots.mjs --state=` for the rail and drawer
- `docs/screenshots/_before/0006/` (13 files linked from 0006): keep as history or delete per the documentation rule (ROADMAP §F 33)
- **ROADMAP §G — when nothing else is queued** (0018): SEO/OG + prerender · “next class in N minutes” widget · membership calculator · then the rest of `docs/website-vision.md`

### Decisions
- **Open questions from Jas's review (0014), with Justin to forward** — recorded as ROADMAP §E 31–34:
  - **Sergio**: are teachers paid fortnightly or monthly? — **both are built since 0018**: the M-08c cadence switch drives M-09a (one or two runs per month), S-03 and the Finance range; Sergio picks
  - **Sergio**: does the Coordinator see the monthly total-revenue KPI in the admin panel?
  - **Lore**: do we need to store the customer's sex/gender? (no field today)
  - **Lore**: is there a group-session product for birthdays/events (book room + teacher + an add-on)? — **structurally answered in 0017**: a birthday or event group session is an **Especial** (room in S-05 + teacher + hand price in S-04, payout to payroll); whether it becomes a standard product with a fixed price is still Lore's call

### Repo hygiene
- empty10 placeholder: awaiting Justin's decision (reset to placeholder or delete)

## Doing

## Done

### Conversación CRM y bandeja de mensajes (0021 · v0.8.0)
- **`message_log` is the unified communications record**: `direction` inbound · outbound · internal, `source` manual · automation · newsletter · system, `subject`, `body`, `sent_by`, `read_at` / `read_by` (the team's read receipt), `external_id` (provider id for the webhook); `channel` + `note`, `status` + `received`; bilingual description and a `TableDef.rls` contract (21 of 48 tables); `npm run sql` regenerated; `MockProvider.SEED_VERSION = 2` reseeds an old browser copy
- **Seam** `src/data/comms.ts`: `useMessaging()` (WhatsApp / email / note / mark read; WhatsApp `queued` during M-08 quiet hours, email never), `useConversations()`, `useUnreadInbound()`, `useAuthorOf()`, `toSummary()`; `formatRelative()` in `format.ts`; notes moved from `audit_log member.note` rows into the thread (the audit trail keeps the action without content)
- **Components** (56 → 61, all with metas): `ChatBubble` (member left · studio right · automation dashed · email card with source badge · internal note · unread ring · queued / failed), `MessageComposer` (WhatsApp · Email · Nota, subject, Ctrl+Enter, blocked WhatsApp, quiet-hours hint, read-only), `InboxPopover` (bell + dialog with five unread threads → S-06), `MessageThread` (day separators, system lines, scroll pane), `ConversationList` (search, filters, unread first, compact); `NotificationBell` `expanded` / `controls`; `Timeline` exports `TIMELINE_ICON`
- **M-06 CRM**: tabs Conversación (default, unread count) · Reservas · Pagos; filter chips Todo · WhatsApp · Email · Notas · Sistema; the thread merges messages with bookings, payments and consents as system lines; composer gated by `members.write`; opening the tab marks inbound read; **Abrir en bandeja** → S-06; the drawer, the Notes tab and the audit-note reader are gone
- **S-06 `/staff/inbox[/:id]` Bandeja de mensajes** (new code, desk roles, nav order 1.5): conversation list (search, Todos · No leídos · WhatsApp · Email, unread first) + thread pane with the person's header (plan, WhatsApp verified, masked phone, **Ver ficha CRM** → M-06), the scrolling thread and the composer; the URL is the selection; selecting marks read; list-then-thread below 900 px
- **Bell**: counts inbound rows with `read_at` null for every role that can open S-06 and opens the popover (was: own rows, WhatsApp roles only). **S-01**: "Mensajes sin leer · en N conversaciones" tile, "Mensajes recientes" card (five, unread first, Ver todo), "Abrir bandeja de mensajes" quick action
- **Insert sites** write the new shape: M-05 / M-04 test sends (`outbound · manual`, rendered body, `payload.test`), S-04 receipt (`outbound · system`, invoice number), teacher substitution request (`inbound · system`, `user_id` null — stays out of the inbox)
- **Seed** `seed/messages.ts`: 57 fixed rows + 12 automation rows = 69 messages, 17 conversations, six unread inbound across five people within 48 h, anchored to local clock hours; Juliana has the richest thread
- **Docs**: prompt + changelog 0021, `docs/pages/S-06.md` (new) and M-06 / S-01 / M-04 / M-05 updated, manual 13 rewritten around the thread, the composer and the inbox (+ 04, 24, 26) in ES and EN, `docs/architecture.md` "Communications seam", flow map regenerated, full screenshot pass (98 routes) with before / after pairs for M-06 and S-01
- **Verified**: `npm run build` clean · `npm run sql` no drift · full screenshot pass 0 console errors · smoke exit 0 · `npm run test:dates` 10 / 10 · ES / EN manual chapters section-count check

### Polish pass (0020 · v0.7.1)
- **Bundle**: every module's pages behind `src/app/lazyPage.ts` (`React.lazy`, one `<Suspense>` in `App.tsx`); `docs/**/*.md` indexed at build time by `scripts/lib/docmeta.mjs` (`?docmeta` Vite plugin) with bodies as on-demand `?raw` chunks — main chunk **2 549 kB → 796 kB**, 235 chunks
- **Dates**: `dateKey()` / `fromDateKey()` / `addDays` / `addMonths` / `addDaysKey` / `MS` in `src/i18n/format.ts`; 14 `toISOString().slice(0, 10)` sites and 11 `T12:00:00` workarounds replaced; `formatDate()` accepts a date key; `npm run test:dates` proves 20:00 Bogotá still names today
- **Dead code**: 13 unused exports, 3 unused barrels, 40 unused string keys, `.adm-line-manual`, 7 `eslint-disable` comments; 25 single-file symbols un-exported; `tsconfig` `noImplicitReturns` + `noImplicitOverride`
- **Dedupe**: one `formatCOP` (`$` in both languages), one IVA split (`src/data/tax.ts` `splitIva`, `DEFAULT_IVA_PCT`), one `waLink`, one `fakeRef`, `digitsOf` / `parseDigits` / `isPhone`, `localeOf`
- **Strings**: TopBar / NavBar / LangToggle / ClassRow / RosterRow / Receipt / PageStub / shells (`titleKey`) / SiteShell / TablesPage / SettingsPage / EmailsPage / WhatsAppPage / RegisterPage / ManualPage through `useT()`; `PAYMENT_METHODS.label` and email template names as `Bi`; LiveBlock's ~60 ternaries → `manual.live.*`; `admin.flag.*` (160 Spanish switch labels), `admin.audit.*` (60 action titles), `admin.finance.status.*`
- **Tokens**: 4 hex, 6 rgba, 22 px font sizes, 8 radii, 5 inline styles → `--fs-*` / `--r-*` / `rgba(var(--m-*))`; `--r-2xs` added to D-01; `--color-text-faint` .55 → .72 (eyebrows ≥ 4.5:1)
- **Tenant**: `tenant.dialCode`, `tenant.invoicePrefix`, structured `tenant.openingHours` deriving the hours sentence (`DEFAULT_SETTINGS.openingHours` reads it), neutral address placeholder; `{{studio}}` in email subjects; C-05 reads `settings.payments.bankName`
- **Visual audit**: M-09 tiles fit and statuses / products / providers translated, card headers wrap (M-09 mobile, S-04 390 overflow), M-09c status cells on one line, C-06 single card fills the row, C-02 / S-02 strips fade, S-05 short blocks and upcoming list, single active sidebar item + nav-label breadcrumb, W-01 / S-01 "day is over" states, M-08b Spanish switch labels, K-04 plain decisions, `○` empty icon, membership renewals in the future, role-gated links (M-01 check-in, S-01 quick actions, bell, HUB-01 dev card), `document.title` per route
- **Screenshots**: captured as each surface's demo user with real ids for the seven param routes and a labelled K-03 cover; `npm run flow-map` regenerates `docs/flow-map.md`; prompts 0009 / 0013 reconstructed; every count re-measured
- **Verified**: build clean with the two new flags · `npm run sql` no drift · full screenshot pass 0 console errors · smoke exit 0 · audits: 0 unused exports, 0 unused keys, 0 raw hex / rgba, 0 hardcoded literals in shared components · overflow at 390: S-04 fixed

### Decisions as settings · Integraciones · §G (0018 · v0.7.0)
- **M-08a General**: contact identity as fields — address, city (Medellín), WhatsApp, email, Instagram handle + URL, map lat/lng, map label, Google Maps link — with a **“Datos confirmados”** switch; `useContact()` / `contactOf()` is the one reader (M-08a first, `tenant.ts` as default) and the site footer, W-06, `MapSlot`, the legal `{{tenant.*}}` tokens, the email footer, C-25/C-06/C-16/A-02 contact rows and `{{tenant:contact}}` all label values as pending until it is on
- **M-08c Payments**: `pricesIncludeIva` documented as the driver of S-04 / C-04 / P-01 · **payroll cadence `monthly | biweekly` programmed both ways** (`payrollCalc.periodsFor()`, `periodAt()`; M-09a generates one or two runs per month and replaces an overlapping draft of the other cadence; S-03 navigates by period; Finance default range 30 d / 15 d; `{{policy:payroll_cadence}}`) · **rate card** by modality + per-teacher override (`payrollCalc.rateFor()`: teacher → modality → `rate_per_class`; the seed's 80–110k moved to the seeded settings row) · default payout method · who signs · withholding flag
- **M-08f Content** (new code): public naming `disciplines | movements` (`classDisplay()` on C-03 / W-04) · **Respiración as its own class** (new `respiracion` modality row; `visibleModalities()` hides it on W-03 / W-07 / W-08 / C-03 while off) · map provider `none | osm | google` read by `MapSlot` with a preview · **legal versions** publish toggle per `legal_documents` row (audited `legal.publish` / `legal.unpublish`)
- **M-10 Integraciones** (new code, `/admin/integrations`, super_admin/admin): one card per Wompi · WhatsApp Business · email · DIAN · maps · Supabase with non-secret fields, `simulated → configured → connected` chip, “keys live server-side” notice naming the env vars, dev checklist, notes, manual link; new **`integrations` table** (46 → 47 on its branch; 48 on `main` after the 0019 merge), seeded simulated; `integration.update` audited; M-08a's Integrations section is a pointer; M-09a's badge reads the Wompi row
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
