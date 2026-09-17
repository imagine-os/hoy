# 0018 — Owner decisions as settings, an Integraciones page and the long-term lane (2026-09-17)

- **Source**: Justin in the Slack content thread (direct request), same day as Especiales (0017)
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0018-decisions-as-settings.md`

## Prompt (verbatim)

> *My top 3 site suggestions* beyond the artwork: SEO/Open Graph metadata with a prerender step (today a WhatsApp link preview shows nothing), a live "next class in N minutes" widget, and a membership calculator that compares plans by visits per month. The rest is in the vision doc. add these to the longer term plan. its something you can do when there's nothing else to do.
>
> *Decisions only you can make* (all in ROADMAP §E): real address/WhatsApp/email; teacher rate card (seed uses 80–110k COP per class); payroll monthly vs biweekly; which legal versions to publish (4 of 7 are drafts pending counsel); map provider; IVA included in published prices or not; whether Respiración is its own class or lives inside meditation. --- Give me settings for these to be filled in i suppose. something like payroll monthly v biweekly is a feature switch you can program for both.
>
> Rates address wahtsapp email etc are things we can integrate when ready but you can have the integrations page ready to fill in and finalize the connections later when our dev gets to it.

The same message also carried two paragraphs about **mobile wrapping of the stat tiles** and **app-store
readiness** (account and data pages, a public deletion-request page, an admin deletion queue). Those are
handled in `docs/changelog/0019-*.md` by the parallel worker and are not repeated here.

## Response

**Every decision that is a value, not code, is now a setting** — filled in by the owner in M-08, read live by
every screen that used to read `src/tenant/tenant.ts` alone, and falling back to `tenant.ts` while empty.

**1 · M-08a General — contact identity.** Address, city (default Medellín), WhatsApp, email, Instagram (handle
and URL), map coordinates, map label and a Google Maps link, plus a **"Datos confirmados"** switch. Until it is
on, the site footer, W-06, the legal documents' `{{tenant.*}}` tokens, the email footer, the customer app's
contact rows and the manual's `{{tenant:contact}}` block all label the values as pending — exactly what they
did with the placeholders, but now the owner can type the real ones and flip the switch. `useContact()` is the
one reader; `MapSlot` reads the coordinates and the link from it.

**2 · M-08c Payments — the payroll switches and the rate card.** `pricesIncludeIva` (already a toggle) is
documented as the driver of S-04, C-04 and the P-01 "¿Incluye IVA?" card. **Payroll cadence** is a segmented
switch, `monthly | biweekly`, programmed both ways: `payrollCalc.periodsFor()` returns one period per month or
two (1–15, 16–end); M-09a generates one run or two per month and replaces a draft of the other cadence that
covers the same days (an approved or paid one blocks); S-03 navigates by period; the Finance range defaults to
30 or 15 days; the manual's `{{policy:payroll_cadence}}` prints it. **The rate card** is a table of COP per class
by modality with an optional per-teacher override; `payrollCalc.rateFor()` resolves teacher override → modality
→ `teachers.rate_per_class`, and the seed's 80–110k now live on the seeded `tenants.settings` row instead of
only on the teacher profiles. Default payout method, "who signs the payment record" and a withholding flag
complete the card.

**3 · M-08f Content (new code).** Public class naming (`disciplines | movements`, read by C-03 and W-04),
**Respiración as its own class** (the seed now has a `respiracion` modality row; the switch shows or hides it on
W-03, W-07, W-08 and the C-03 filter — off, W-08 keeps its "lives inside the guided classes" sentence), the
**map provider** (`none | osm | google`, read by `MapSlot` with a live preview) and the **legal versions** —
every `legal_documents` version with a publish toggle that A-06 reads, each flip audited.

**4 · M-10 Integraciones (new code).** One card per integration — Wompi, WhatsApp Business (Meta), email
provider, DIAN e-invoicing, maps, Supabase — with the non-secret fields ready to fill (merchant and public
ids, sender number, WABA id, template namespace, provider name, project URL…), a status chip
`simulated → configured → connected`, a "keys live server-side" notice that names the environment variables
instead of storing them, the checklist of what the dev must finish, notes and a link to manual chapter 26. A
new `integrations` table (47 tables); every save is an `audit_log` row. The M-08a "Integraciones" section became
a pointer to it and M-09a's "simulado" badge reads the Wompi row.

**5 · ROADMAP.** §A bumped to 0.7.0; the §E items that became settings are marked "→ setting in M-08x (fill in)";
a new **§G — When nothing else is queued** opens with the three site ideas (SEO/OG + prerender, the
next-class widget, the membership calculator) and lists the rest of `docs/website-vision.md` as one-liners.

**6 · Manual.** Chapter 26 rewritten around M-10 (ES + EN, figures), chapter 16 explains the cadence switch
and the rate card, chapter 01 points at M-08a for the contact details.

Verified with a Playwright flow (27 checks): flipping the cadence to biweekly and regenerating September
produces two runs (1–15 and 16–30) whose totals sum to the monthly run's total; editing the Hot Vinyasa rate
changes the S-03 estimate; editing WhatsApp in M-08a changes the site footer and W-06; M-10 renders in ES and EN
and its save is audited. Deviation noted: the parenthetical layout names first used for M-10's sections broke
`useLayout()` (it matches section names exactly) — the spec now uses plain names and keeps the description in
`notes`.
