version: 0.6.0
date: 2026-09-17
prompt: docs/prompts/0011-website-brand-content.md
intent: Website + brand content track of the parallel v0.6.0 build. Take the owner's brand PDF ("Contenido de marca — Sobre nosotros, filosofía y clases", Medellín · 2026) and the per-family "Por qué existe" rationale from the value-model deck, put them in code as typed bilingual data, and rebuild the public site around them: a best-in-class landing page, a full About/Philosophy page, new Classes and Class pages, a Plans page that explains the model instead of only listing prices, a real map and WhatsApp form on Contact, and one shared media slot so the artwork the owner still owes is visible and bookable rather than invented.
decision: **Brand prose becomes tenant data, not page markup.** `src/tenant/brand.ts` is new and is now the only place the manifesto, the five "Sobre HOY" paragraphs, the four philosophy paragraphs, the "Nuestras clases" intro, the five class essays and the two taglines are written — every field `{es,en}`, Spanish transcribed from the PDF, English written (not literal: "Everything that was is already behind you… This is HOY."). Each class carries `eyebrow`, `summary`, `movement`, `heated`, a one-line art `brief`, `bring` keys, and **`modalitySlugs`** — the join that lets a page read live duration/intensity/heated from the `modalities` table without touching the seed. The five brand slugs `hot-yoga · barre · pilates · meditacion · respiracion` map onto the seeded modality slugs `hot-vinyasa`, `barre`, `pilates`, `meditacion`+`yin`; **respiración deliberately maps to nothing**, because no modality row exists for it, and W-08 renders that as a sentence ("today it lives inside the guided classes") rather than an empty card. `src/tenant/pricing.ts` gains `FAMILY_ROLE`, `FAMILY_RATIONALE` (role · subtitle · why · optional note, including the Annual Plan's ~$416.000/month footnote) and `DISCIPLINE` — additively: no price, name or existing export changed. `DISCIPLINE.numbers` reads `tenant.studio.mats/classesPerDay/perPersonPerDay` and the number of plan families, so 15 · 4 · 1 · 5 is derived, not typed. `src/tenant/tenant.ts` sets **`city: 'Medellín'`** (the brand manual is headed "Medellín · 2026" and the copy names the city; `timezone` stays `America/Bogota`, Colombia's only IANA zone), adds `location` (approximate El Poblado coordinates labelled "por confirmar"), adds `social`, and marks the contact block `pending: true` with a bilingual `pendingLabel` so screens can label the placeholder phone/email/address instead of presenting them as fact. **One media slot for the whole site.** `MediaSlot` (molecule, + meta) books every future photo/video/illustration: `ratio` 21:9…4:5, `kind`, bilingual `label`, `brief` (always the `title` attribute, printed in the slot in dev), optional `movement` tint, `src` (renders `<img>`/`<video>` the moment a real asset lands), `caption`, `overlay`. Empty it is an intentional branded frame — paper grain over the sand material, movement tint, a dashed inner rule, the ratio, and an "arte pendiente / art pending" chip — so 15 missing artworks are obvious and countable (shot list in `docs/website-vision.md`). `MapSlot` (molecule, + meta) reads `tenant.location` and defaults to `provider="none"`: a branded placeholder with the address line, a Google Maps deep link and the coordinates, making **no network request** so screenshots stay offline-safe; `'osm'` embeds key-less OpenStreetMap, `'google'` Google's key-less embed. **Every site page now renders through `useLayout(spec)`**, so `/#/dev/layout/W-xx` works for all of them and the specs' `layout` arrays finally describe the code (they were aspirational for six of the seven pages). Two new codes: **W-07** `/site/classes` and **W-08** `/site/classes/:slug`. P-01 keeps its canvas code but the site module now owns a `defineSpec({...canvasSpecs['P-01'], layout: […]})` override rather than editing the generated `canvasSpecs.ts`. Two rendering bugs found and fixed while verifying: `.site-section { padding: … 0 }` was a shorthand on the same element as `.container`, wiping the 16px side gutter on mobile (every site page touched the screen edge at 390 — now `padding-top`/`padding-bottom` only), and the movement heading inks (`--mv-*-fg`, mixed for cream paper) fell under 3:1 on the dark theme, so dark now uses the ink token and lets the tint carry the movement.
rejected: (1) Putting the brand prose in `strings.ts` — it is content, not UI labels: 40+ long paragraphs would have buried the 130 real interface strings, and the owner's copy belongs next to the other tenant facts so a second studio can replace it wholesale. `strings.ts` keeps only labels, headings and CTAs. (2) Seeding the class essays as `content_articles` rows — tempting (there is a CMS), but the essays are brand identity, not editorial: they must exist before any data provider is connected, they are versioned with the code, and a page that reads them must not show an empty state. Left as a follow-up for the journal idea instead. (3) Extending the existing `MediaPlaceholder` in `src/modules/customer/ui.tsx` — it is a 6-line div owned by another surface and another worker's files this pass; `MediaSlot` is the shared molecule with a meta, and the customer module keeps using the old one until someone migrates it deliberately (noted in the vision doc). (4) Renaming the seeded modality slugs to match the brand slugs (`hot-vinyasa` → `hot-yoga`) — it would have been the tidier join, but `src/data/**` is owned elsewhere this pass and the slugs are referenced by seeded sessions, teacher specialties and screenshots; `modalitySlugs` is the indirection that costs nothing. (5) Making the philosophy panel a shared component — it is three elements and one CSS class (`.site-panel`) used four times inside one module; a component with a meta would have been ceremony without reuse. (6) Embedding a live map by default — an iframe would have made every screenshot depend on a network the capture script deliberately blocks, and Google's embed is a provider decision the owner has not made. The placeholder carries the address and the coordinates, so no information is lost. (7) Inventing contact details or an exact address to make the page look finished — the placeholders are now labelled "pendiente / pending" instead, which is the honest state and the thing the owner must decide. (8) A carousel for the five classes — the alternating full-width blocks read better on a phone, need no JS, and let every class essay have its own photo slot.
files: src/tenant/brand.ts (new) src/tenant/pricing.ts src/tenant/tenant.ts src/components/molecule/MediaSlot/{MediaSlot.tsx,MediaSlot.css,MediaSlot.meta.ts} (new) src/components/molecule/MapSlot/{MapSlot.tsx,MapSlot.css,MapSlot.meta.ts} (new) src/modules/website/{index.ts,specs.ts,strings.ts,SiteShell.tsx,site.css} src/modules/website/pages/{HomePage.tsx,AboutPage.tsx,ClassesPage.tsx,ClassDetailPage.tsx,ModalitiesPage.tsx,SchedulePage.tsx,TeachersPage.tsx,PlansPage.tsx,ContactPage.tsx} (ClassesPage, ClassDetailPage new) scripts/screenshots.mjs (`:slug` → `hot-yoga` in PARAMS) docs/website-vision.md (new) docs/pages/{W-01,W-02,W-03,W-04,W-05,W-06,P-01}.md docs/pages/{W-07,W-08}.md (new) docs/changelog/0011-website-brand-content.md
codes: W-01 W-02 W-03 W-04 W-05 W-06 W-07 W-08 P-01 D-02

## New and changed contracts
- `src/tenant/brand.ts` exports `manifesto`, `about`, `philosophy`, `classesIntro`, `classes`,
  `classOrder`, `taglines`, `brandContent`, `brandClass(slug)`, and the types `ClassSlug` / `BrandClass`.
  A new class is one entry in `classes` plus its slug in `classOrder` — no page changes.
- `src/tenant/pricing.ts` adds `FAMILY_ROLE`, `FAMILY_RATIONALE`, `DISCIPLINE` and now imports
  `./tenant` (the discipline numbers are derived from `tenant.studio`). Prices are untouched.
- `src/tenant/tenant.ts` adds `location`, `social`, `contact.pending` and `contact.pendingLabel`;
  `city` is now `'Medellín'`. Any screen printing a contact detail should honour `contact.pending`.
- `MediaSlot` is the only way a photo, video or illustration enters the site. A bare `<img>` for
  content imagery is a regression: the slot is what keeps the shot list honest.
- `MapSlot` defaults to `provider="none"` — keep it that way for anything the screenshot script visits.
- Two new route codes, **W-07** and **W-08**. `scripts/screenshots.mjs` resolves `:slug` to `hot-yoga`.
- `siteSpecs.plans` is the spec the `/site/plans` route now carries (code still `P-01`).

## Verification
- `npm run build`: zero TypeScript errors, `vite build` clean (bundle unchanged at ~1.67 MB / 500 kB gzip;
  the new CSS is +2 kB).
- Visual pass with `playwright-core` against `vite preview` on port **4181** (4173 is shared with the
  other parallel workers, and `npm run screenshots` was deliberately not run): `/#/site`,
  `/#/site/about`, `/#/site/classes`, `/#/site/classes/hot-yoga`, `/#/site/classes/respiracion`,
  `/#/site/plans`, `/#/site/contact`, `/#/site/teachers`, `/#/site/schedule` at 390 and 1280 in ES,
  plus 1280 dark in EN. No console errors beyond the intentional aborted font requests.
- Fixed from that pass: the mobile side gutter (see `decision`), dark-theme heading contrast on the
  movement and class cards, the 5-up class and value grids orphaning a fifth card, oversized 4:3
  slots on About and Contact, the Espacio plan card now spanning both columns, and duplicate
  testimonial quotes (the seed repeats five phrases, so the home page de-duplicates by comment).
- The full ES/EN × 390/1280 screenshot set for W-01…W-08 and P-01 still has to be regenerated by
  whoever runs the release pass; the page docs point at the paths it will write.

---

## Integration (0.6.0)

The three v0.6.0 tracks were built in parallel worktrees and could not see each other. This section
records what the integration pass changed on top of them, on branch `integrate/0.6.0`.

**Merge order** — `main` (af650ab) → `work/site` → `work/depth` → `work/manual`, each `--no-ff`, with
`npm run build` green between merges. **No merge conflicts**: the three tracks touched disjoint files
(the one file both site and depth could have collided on, `src/modules/website/pages/LegalPage.tsx`,
was only edited by depth).

**Reconciliation**

- **`MediaSlot` and `MapSlot` meet the media library.** Site built the two molecules; depth built
  `media_assets` and taught `MediaPlaceholder` to read it. Both slots now take an optional `slotKey`:
  a `ready` row renders the real photo, video or drawn map, a `pending` row lends its brief, label,
  ratio and movement. An explicit `src` still wins, so a teacher's own `photo_url` is never replaced
  by the generic portrait brief. Metas updated (new prop, new states, a library usage).
- **Five `site.classes.*` rows added to the media seed** so W-07 and W-08 book a slot per class, and
  `site.hero` became the **video** slot W-01 actually renders (its brief now covers both the
  ultra-wide panorama and the slow golden-hour dolly). The library is **12 rows**; `docs/pages/M-02.md`
  lists every key and where it renders. Site slots wired: `site.hero` (W-01, 21:9), `site.about`
  (W-02, 4:3), `site.classes.<slug>` (W-07 + W-08, 16:9), `teacher.portrait` (W-05, 4:3),
  `site.contact.map` (W-06).
- **`{{pricing:<family>}}` reads the value model.** `LiveBlock` had its own private `FAMILY_ROLE`
  copy; it now imports `FAMILY_ROLE` and `FAMILY_RATIONALE` from `src/tenant/pricing.ts` (site's
  addition) and prints the family's subtitle, its "why it exists" paragraph and its optional note
  around the price table. One source, three surfaces (K-03, P-01, the value-model chapter).
- **City.** The manual's `DECISIÓN PENDIENTE` "Medellín vs Bogotá" is rewritten in ES and EN: the app
  says **Medellín** everywhere per the brand PDF, `America/Bogota` stays because it is Colombia's
  only IANA zone, and what is still pending is the owner's confirmation plus the **real address,
  WhatsApp and email**. It stays a `> DECISIÓN PENDIENTE:` / `> DECISION NEEDED:` blockquote so K-04
  still lists it. `README.md` follows; `EmailPreview.meta.ts` reads `tenant.city` instead of a
  hardcoded "Bogotá". Every surviving "Bogot" in the repo is the timezone.
- **Manual chapter 16 (nómina y payouts) now describes the code that exists** — M-09a
  `/admin/finance/payouts` with its idempotent draft generator, M-09b `/admin/finance/payouts/:id`
  with approve, Wompi/transfer/cash and per-teacher settle, the run closing itself when the last
  teacher is paid, M-09's 15-day range, `payrollCalc.ts` as the single arithmetic, a payout not being
  a `payments` row, and S-03 reading the run instead of estimating. Rewritten in ES and EN.
- **Screenshot placeholders closed.** The last two `[screenshot: …]` lines per language (both S-03
  payroll, in chapters 06 and 16) are real captures. The manual now carries **64 figures per
  language and zero placeholders**.
- **Jas's design feedback** (the owner's designer), owed by this push: **"Quitar la palabra
  'claros'"** — `site.plans.title` is `Planes` / `Plans` (it read "Planes claros" / "Clear plans");
  and **"PÁGINA WEB OSCURO: no se ve"** — the dark-theme heading inks on the four movement cards and
  the five class cards were fixed in 0011 and verified here in the W-01 dark capture.

**Version** — `package.json` was stale at **0.1.0** all through v0.5.0 while README, ROADMAP and the
changelog said 0.5.0. It is now **0.6.0** and the file and the docs agree again.

**Tooling** — `scripts/screenshots.mjs`: `--only=` entries may end with `$` for an exact path match
(`--only=/manual$` captures the manual cover without the chapter routes, which share the K-03 code
and would otherwise overwrite it), and the `:chapter` param is `03-modelo-de-valor` instead of the
retired `03-recepcion`.

**Backlog raised, not fixed** — `remark-gfm` (both workers wrote a workaround for the missing pipe
tables; adding the dependency and deleting the `MarkdownViewer` transform is one follow-up) and a
Respiración `modalities` row so W-08 can show facts instead of a sentence. Both are in
`docs/kanban.md` and `ROADMAP.md` §F(e).

**Counts after the full screenshot pass** — 89 routes, 77 page codes, 0 stubs, 42 tables, 365
captures (54 MB), 28 + 28 manual chapters, 55 components in D-02, 27 pending owner decisions.

**Files touched by the integration** — `src/components/molecule/MediaSlot/{MediaSlot.tsx,MediaSlot.meta.ts}`
`src/components/molecule/MapSlot/{MapSlot.tsx,MapSlot.meta.ts}`
`src/components/organism/LiveBlock/{LiveBlock.tsx,LiveBlock.css}`
`src/components/organism/EmailPreview/EmailPreview.meta.ts` `src/data/seed/media.ts`
`src/modules/website/pages/{HomePage,AboutPage,ClassesPage,ClassDetailPage,TeachersPage,ContactPage}.tsx`
`scripts/screenshots.mjs` `package.json` `README.md` `ROADMAP.md` `docs/kanban.md`
`docs/prompts/0011-website-brand-content.md` (new) `docs/pages/{M-02,K-03,K-04,S-03,W-07,W-08}.md`
`docs/pages/{M-02a,M-02b,M-02c,M-02d,M-09a,M-09b}.md` (new)
`docs/ops-manual/{es,en}/{01-quienes-somos-y-filosofia,06-maestros,16-nomina-y-payouts}.md`
`docs/screenshots/**` `docs/changelog/0011-website-brand-content.md`
