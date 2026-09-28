version: website 2.1 to 2.3 / HoyOS 0.9.2 to 0.9.4
date: 2026-09-28 (back-fill; commits dated 2026-09-25 and 2026-09-26)
prompt: docs/prompts/0024-website-v2-backfill.md
intent: Record the four website V2.1, V2.2 and V2.3 commits that shipped without a numbered prompt or changelog entry. Intent is reconstructed from the commit messages and docs/website-versions.md; no original prompt text exists.
decision: One back-fill entry with one section per commit, so the history from 0023 (website 2.0, 0.9.1) to the current 0.9.4 has no gap. Commit messages are quoted verbatim in the prompt file; nothing here changes code.
rejected: Splitting into four numbered entries (the commits are one continuous website track and have no prompts to pair with), or leaving the gap and relying on docs/website-versions.md (it lists releases but not decisions, files or the mat-booking schema gap).
files: docs/prompts/0024-website-v2-backfill.md; docs/changelog/0024-website-v2-backfill.md; docs/kanban.md

The four commits below are back-filled. Their `git show --stat` file lists are summarised by folder.

## V2.1 Living Sanctuary (`fc2d1d3`, 2026-09-25, 0.9.2)

prompt intent: publish depth, portraits and ambient video on the Sanctuary edition (reconstructed).
decision: Add inset shadows and pointer depth, teacher hover, eight sample portraits, a studio image, three ambient videos, a corrected logo and a tropical closing scene, all inside the website module and additive tokens.
rejected: not recorded.
files: docs/website-versions.md; package.json; package-lock.json; public/images/sanctuary/{studio-medellin,teacher-*}.webp (9); public/video/hoy-{hero,ritual,studio}.mp4; src/components/molecule/SiteVersionSelect/*; src/components/organism/AmbientScene/*; src/design/tokens.{css,ts}; src/modules/website/{SiteShell.tsx,artwork.ts,edition.ts,sanctuary.css,strings.ts}; src/modules/website/pages/{AboutPage,HomePage,TeachersPage}.tsx

## V2.2 Living photographs (`89b8375`, 2026-09-26, 0.9.3)

prompt intent: publish regenerated living photographs and full arched teacher cards (reconstructed). Codes: W-01, W-02, W-04, W-07, W-08, D-01, D-02.
decision: Ship website code, 16 optimized public sample videos and the public version history only; production manifests, conversation records, the internal roadmap and integration documentation are excluded from the commit. `MediaSlot` learns video, pointer depth becomes page-wide and one shared control pauses motion.
rejected: not recorded beyond the exclusions above.
files: docs/website-versions.md; package.json; package-lock.json; public/video/living-*.mp4 (16: 8 class and scene loops, 8 teacher portraits); src/components/molecule/{Card,MediaSlot}/*; src/components/organism/AmbientScene/AmbientScene.meta.ts; src/design/tokens.{css,ts}; src/modules/website/{SiteShell.tsx,artwork.ts,edition.ts,sanctuary.css,strings.ts}; src/modules/website/pages/{ClassDetailPage,ClassesPage,HomePage,TeachersPage}.tsx

## V2.3 Elemental booking (`6465f8a`, 2026-09-26, 0.9.4)

prompt intent: add the elemental cursor, membership cards and mat booking (reconstructed). Codes: P-PLANS, P-SCHEDULE, C-02, C-03, C-04, C-08.
decision: One shared `SessionCalendar` (day, week, month) serves the website schedule and the member schedule; membership cards replace the plans list; class photos come from the CMS through `ClassThumbnail`; checkout gains a two-row, 16-mat picker with the rules in `src/data/mats.ts`; `MockProvider` publishes a six-week demo horizon and assigns mats to existing bookings (`SEED_VERSION = 3`). Local demo provider only; production schema drafts are excluded. `mat_number` is declared by TypeScript module augmentation on `BookingRow`, not in `src/data/schema.ts`.
rejected: adding the mat column to the schema and `supabase/schema.sql` in the same commit (production schema drafts were deliberately left out; the gap is on the kanban Backlog).
files: docs/website-versions.md; package.json; package-lock.json; scripts/test-mat-bookings.mjs; src/components/atom/ElementCursor/*; src/components/molecule/{ClassRow,ClassThumbnail,MembershipCard}/*; src/components/organism/{Drawer,MatPicker,SessionCalendar}/*; src/data/{MockProvider.ts,mats.ts}; src/design/tokens.{css,ts}; src/modules/customer/{HomePage.tsx,hooks.ts}; src/modules/customer/pages/{BookedPage,CheckoutPage,ClassDetailPage,SchedulePage,WaitlistPage}.tsx; src/modules/website/{SiteShell.tsx,edition.ts,strings.ts}; src/modules/website/pages/{PlansPage,SchedulePage}.tsx; src/tenant/tenant.ts

## Calendar typography and upcoming-week defaults (`d4c567e`, 2026-09-26, 0.9.4)

prompt intent: refine calendar typography and upcoming-week defaults (reconstructed).
decision: Set the calendar period heading and membership card heading in the Sanctuary heading style; `Chip` exposes `data-movement`; the session state label distinguishes completed from cancelled; the week view starts on the week of the next scheduled class on any day, not only on Sundays.
rejected: not recorded.
files: src/components/atom/Chip/Chip.tsx; src/components/molecule/MembershipCard/MembershipCard.css; src/components/organism/SessionCalendar/SessionCalendar.{css,tsx}
