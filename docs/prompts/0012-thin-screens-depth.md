version: 0.6.0
date: 2026-09-17
slug: thin-screens-depth
codes: M-02 M-02a M-02b M-02c M-02d M-09 M-09a M-09b S-03 A-06 C-03 C-05

# Prompt

Deepen the thin screens: content CMS (M-02), finance payouts (M-09), teacher payroll (S-03), legal
copy (A-06), and the photo/map slots on the customer app.

1. **M-02 content CMS** (`/admin/content` and sub-routes, new codes M-02a…M-02d): keep the existing
   entity editors, add an **Articles** editor for `content_articles` (status draft/published/scheduled,
   bilingual title + markdown body with a live `react-markdown` preview, slug, category, publish_at,
   "publish now"), a **FAQ** editor for `faq_entries` (sections, drag-free ordering via up/down,
   bilingual Q/A), an **Events** publisher for `events` (create/edit, publish/unpublish, capacity,
   price, RSVP count read from `event_rsvps`), and a **Media library** backed by a new `media_assets`
   table seeded with one pending row per known slot, so the owner sees a checklist of artwork to
   supply and can paste a URL when it exists. `MediaPlaceholder` accepts an optional `slotKey` and
   renders the `media_assets` URL when `status='ready'`. All writes audited.
2. **M-09 finance payouts**: new `payroll_runs` and `payroll_lines`; a runs list (M-09a) and a run
   detail (M-09b) with the per-teacher statement; actions "generate draft for period" (idempotent),
   approve, mark paid (transfer/cash), send via Wompi through a `wompiPayout()` seam (simulated,
   badge says so) and export CSV. Replace the `value="—"` tile with real numbers. Keep the invoice
   table; add a filter by status.
3. **S-03 teacher payroll** (`/teach/payroll`): read `payroll_runs` / `payroll_lines` for the
   signed-in teacher — current period statement (live from sessions until the run exists, then from
   lines), run history with status chips, per-class breakdown, payout method on file, a WhatsApp link
   to finance, a printable statement. Remove the placeholder badge.
4. **A-06 legal**: make `legal_documents` versioned and bilingual with kinds terms, privacy, waiver
   (liability + heat/health), cancellation (numbers from `usePolicy()` so the page never goes stale),
   refunds, house-rules. Write real, complete, professional Spanish copy with a Colombian law framing
   and an English translation; mark it as a draft pending counsel review. The website page accepts any
   kind and shows version + effective date + a version switcher; a new in-app route `/app/legal/:kind`
   uses the same renderer, a `legal_acceptances` table records who accepted which version, and the
   in-app page shows "accepted on …".
5. **Photo & map slots**: polish `MediaPlaceholder` so empty slots look intentional and branded
   (movement tint, ratio label, "arte pendiente / art pending" chip) and read from `media_assets` via
   `slotKey`. No map component (owned elsewhere this turn).
6. Every new component gets a `.meta.ts`; every new string is `{es,en}`; new tables carry `rls`
   contracts and bilingual labels; run `npm run sql`.

Owner design-feedback round, folded into the same pass: (a) the M-09 range filter must offer a
"15 días / 15 days" option (Colombian studios settle biweekly), used for the KPI tiles and the invoice
filter; (b) M-09b needs an explicit per-teacher "marcar como pagado" action with the classes-taught
count and payment detail visible per teacher, not only a run-level action.

## Response

Built as asked. Five new tables (`media_assets`, `payroll_runs`, `payroll_lines`, `legal_acceptances`,
plus a rewritten `legal_documents` and `content_articles.publish_at`), six new route codes
(M-02a…M-02d, M-09a, M-09b) plus the in-app A-06 route, two new D-02 components (`LegalDocument`
organism, `MarkdownEditor` molecule), one shared payroll arithmetic (`src/data/payrollCalc.ts`) that
the seed, the admin generator and the teacher statement all call, and six legal documents written in
full in Spanish and English with every number and studio fact as a token resolved from M-08 at render
time. Simulated: the Wompi dispersion (`wompiPayout()`), the Wompi charge (unchanged), DIAN CUFE
emission, and file upload for media (a URL is stored, not a binary). Decisions worth knowing: a payout
is not a `payments` row (money out lives on `payroll_runs`, so revenue stays correct); an article's
status is derived from `published` + `publish_at` rather than stored twice; a published legal version
is never edited in place. Details, rejected alternatives and verification in
`docs/changelog/0012-thin-screens-depth.md`.
