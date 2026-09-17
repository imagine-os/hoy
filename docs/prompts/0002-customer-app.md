# 0002 — Customer app: booking flow, account, auth, edge states

- **Source**: coordinator brief (parallel worker "customer experience"), same Slack thread as 0001
- **Date**: 2026-09-17
- **Requester**: studio project lead via coordinator
- **Changelog**: `docs/changelog/0002-customer-app.md`
- **Branch**: `feat/customer` → `main`

## Prompt (summarised, verbatim where it matters)

Build the **customer experience** of HoyOS (wellness club app, Colombia, Spanish-first) in `src/modules/customer/**`,
replacing every customer stub with a real page (mobile-first inside `PhoneShell`, responsive to desktop). Every page:
real data via `useTable`/`useData`, ES+EN strings in the module `strings`, spec from `canvasSpecs[code]` extended with
`defineSpec({...canvasSpecs['C-02'], layout: [...real section names...]})`, states from the spec (empty, error, loading).

1. **Booking flow first**: C-02 schedule (day list with movement chips and capacity, filter by modality / teacher /
   intention) and C-02b week view → C-03 class detail (teacher, room, capacity meter, rules, book / waitlist CTA) →
   C-04 reserve/checkout (Bienvenida pass, credit, membership, or pay; totals from `src/tenant/pricing.ts`, IVA computed
   never typed) → C-05 payment methods (Wompi placeholder "Pago con Wompi" that simulates success; manual transfer
   instructions; integration seam marked in code and spec) → C-08 booked confirmation (add-to-calendar, share, cancel
   window countdown) → C-08b change/cancel → C-20 waitlist → E-01 / E-02 / E-03 / E-04 reachable and in `/#/dev/specs`.
2. **Account and plans**: C-06, C-07, C-07b, C-22 (pause ≤ 30 days, notice before charge), C-11, C-19 (photo, WhatsApp,
   emergency contact, language wired to the real LangToggle), C-24, C-25, C-13, C-14/C-15 (two pages), C-16, C-17, C-18,
   C-23, C-10, C-21.
3. **Auth flow** (`surface: 'public'`, minimal shell): A-01 splash (breathing rings, 7 s, auto-continues), A-02 sign-in
   (demo user picker + disabled Apple/Google/biometric "coming with Supabase Auth"), A-03 create account (validation,
   +57 default, consent row → `/site/legal/*`; inserts `users`/`profiles` rows and signs in).
4. **Realtime feel**: subscribe to `bookings` / `class_sessions` so capacity meters update live.

Rules: one class per person per day; cancellation window 2 h; 15 mats from `tenant`; prices only from `pricing.ts`;
every string ES+EN; touch targets ≥ 44 px; existing components first; new components get a `.meta.ts`; `useLayout(spec)`
on C-02, C-03 and C-19. Docs in the same commit; `[screenshot: <code>]` placeholders; do not run the screenshot script.
Isolation: work in a worktree, own only `src/modules/customer/**`, new component folders, and these docs.

## Response

**Every customer stub is now a real page** (30 routes in the customer module plus 5 public auth routes) and the whole
booking transaction works on the mock data layer: book → booked_count +1 (live via `useTable` subscription) → waitlist
promotion with a 30-minute `claim_until` when someone cancels → credit ledger movements → payments + invoices rows.

### Booking flow
- **C-02 `/app/schedule`** — Day / Week segmented switch (the Week segment is C-02b at `/app/schedule/week`), `DateStrip` for seven days with class
  counts, movement chips inline, filter sheet (time of day, modality, teacher, intention). Filters persist per session.
  Loading = three skeleton rows, empty = "No classes match" + clear filters, Sunday = closed, past days read-only.
  Deep link `?session=<id>` from the website forwards to the class. `useLayout(spec)` wired.
  `[screenshot: C-02]` `[screenshot: C-02b]`
- **C-03 `/app/class/:id`** — hero placeholder with movement chip, title block, capacity meter (amber under 4),
  about, `TeacherCard` → C-18 profile, prep list → C-13, sticky CTA that resolves to book / book-and-pay / trial /
  waitlist / view booking / disabled with the one-class-per-day reason. Cancelled classes render the E-03 block inline.
  `useLayout(spec)` wired. `[screenshot: C-03]`
- **C-04 `/app/checkout/:id`** — entitlement picker in the canvas order (credits → membership → trial → single → packs),
  Colombian payment methods (card / PSE / Nequi via Wompi; transfer / cash manual), `OrderSummary` computing IVA 19 %
  from `policy.ivaRate` (prices are IVA-inclusive), race guard (class filled → waitlist offer), **E-02 inline** when
  Wompi declines (dev mode has a "simulate decline" switch), success sheet. Pack purchases credit the ledger and spend
  one credit for this booking. `[screenshot: C-04]` `[screenshot: E-02]`
- **C-05 `/app/payment-methods`** — the Wompi card with a "test payment" button that simulates approval, saved methods
  derived from approved payments, electronic and manual methods, transfer instructions, compliance note.
  Seam: `src/modules/customer/payments.ts` (`wompiCheckout`, `recordPayment`). `[screenshot: C-05]`
- **C-08 `/app/booking/:id`** — `CountdownRing` (switches to "check-in open" inside T−60 m), class card, prep reminder,
  Change / Invite, add to calendar (.ics download), share (Web Share → clipboard), policy note with the exact deadline.
  Past class → read-only + rate CTA; studio-cancelled → E-03 block with refund confirmation and same-day alternatives.
  `[screenshot: C-08]` `[screenshot: E-03]`
- **C-08b `/app/booking/:id/change`** — bottom sheet: policy line (outside / inside the 2 h window), move first
  (same-day replacements, movement match then nearest time; cancel + rebook in one transaction), cancel (destructive,
  names the forfeited credit inside the window), keep booking. `[screenshot: C-08b]`
- **C-20 `/app/waitlist/:id`** — position card, released banner with 30-minute claim countdown and one-tap claim
  (auto-claim toggle spends a credit the moment the spot is offered), expired → passes to the next person + rejoin,
  leave row, dev-only "simulate released spot". `[screenshot: C-20]`
- **E-01 / E-02 / E-03** at `/app/state/empty|declined|cancelled` (demo routes) and inline where the state is real
  (C-01 renders E-01 when the person has no bookings at all). **E-04** at `/auth/locked`, reached after five failed
  sign-in attempts. `[screenshot: E-01]` `[screenshot: E-04]`

### Account and plans
C-06 plans (monthly / yearly switch, "2 months free" computed, current plan marked, Wompi-simulated purchase creates
the membership) · C-07 passes (each button carries the pass into C-04) · C-07b credits (balance, expiry, ledger, top-up)
· C-22 membership (pause 7–30 days with renewal shift, resume, change plan, billing history, cancel-at-period-end with
reason and undo, 3-day charge notice) · C-11 history (classes / payments tabs, receipt sheet with subtotal / IVA /
total, JSON export) · C-19 profile (photo upload → `profiles.photo_url`, edit name / WhatsApp / birthday / emergency
contact, WhatsApp verify chip, notification prefs, **real `LangToggle` persisted to `users.locale`**, review links,
legal, sign out, delete with 30-day note; `useLayout(spec)` wired) · C-24 notifications (derived inbox: message_log +
waitlist offers + upcoming bookings + rate prompts, read state, mark all) · C-25 more (identity card, outbound
WhatsApp / email, secondary group, dev-only state links, sign out) · C-13 rules (six articles, tour placeholder, read
receipts) · C-14 / C-15 FAQ (two pages, six sections, one-open accordion, concierge row) · C-16 invite (pass code,
WhatsApp / email / link, sent list) · C-17 gift card (amount from pricing + custom, recipient, 8:00 delivery date,
250-char message, four designs, `gift_cards` row) · C-18 teachers (gallery + deep-linkable profile with upcoming
classes) · C-23 events (list + detail, member price, RSVP) · C-10 rate (stars, tags, note, anonymous; marks
`bookings.rated`) · A-05 intention page.
`[screenshot: C-06]` `[screenshot: C-07]` `[screenshot: C-07b]` `[screenshot: C-22]` `[screenshot: C-11]`
`[screenshot: C-19]` `[screenshot: C-24]` `[screenshot: C-25]` `[screenshot: C-13]` `[screenshot: C-14]` `[screenshot: C-15]`
`[screenshot: C-16]` `[screenshot: C-17]` `[screenshot: C-18]` `[screenshot: C-23]` `[screenshot: C-10]`

### Auth flow (`/auth/*`, public surface, `AuthShell`)
A-01 splash with `BreathingRings` (7 s `--dur-breath`), auto-continues after 2.8 s · A-02 sign-in with the demo user
picker, email/password (any demo email), five failures → E-04, disabled Apple / Google / biometric with the Supabase
Auth note · A-03 create account with validation, +57 default, password strength, emergency contact, optional photo,
consent row linking `/site/legal/*`, duplicate detection; inserts `users`, `profiles`, `user_roles`, `consents` rows ·
C-21 password recovery in three steps (WhatsApp / email, six-cell OTP with 45 s resend timer and three-strike
invalidation, new password). `[screenshot: A-01]` `[screenshot: A-02]` `[screenshot: A-03]` `[screenshot: C-21]`

### New shared components (all with `.meta.ts` and usages)
`Skeleton` (+`SkeletonRows`), `Notice`, `ListRow` (+`ListGroup`), `SegmentedControl`, `DateStrip`, `CountdownRing`,
`EmptyState`, `Accordion`, `RatingScale`, `OtpInput`, `OrderSummary` (computes IVA), `BreathingRings`.

### Deferred / needs a shared change (see changelog)
Cross-tab realtime (MockProvider does not listen to `storage`), signing in as a freshly created account
(SessionProvider only knows demo users), tables for notifications / reviews / invites / events / payment_methods /
content, policy numbers moving to tenant settings (M-08), hub and website links to `/auth/sign-in`, `WIRED` list in the
layout editor (C-02, C-03, C-19), full screenshot pass.
