# Website V2.1 to V2.3 back-fill

Source: direct (no prompt text recorded) · back-fill written 2026-09-28 · requester: owner

## Prompt

**Back-fill notice.** This entry was written on 2026-09-28, after the work shipped. The original prompts behind these four commits were not recorded (no verbatim text is available), so nothing below is a prompt quote. Intent is reconstructed from the commits and `docs/website-versions.md`. What is quoted verbatim is the commit messages. Dates are commit dates; `docs/website-versions.md` lists V2.3 as 2026-09-27 while both V2.3 commits are dated 2026-09-26.

Commit messages, verbatim, oldest first:

`fc2d1d3` (2026-09-25)

```
feat(website): publish Living Sanctuary V2.1 depth, portraits and ambient video
```

`89b8375` (2026-09-26)

```
feat(website): publish V2.2 living photos and arched teacher cards

Website code, 16 optimized public sample videos, and public version history only.
Excludes production manifests, conversation records, internal roadmap, and integration documentation.
W-01, W-02, W-04, W-07, W-08, D-01, D-02.
```

`6465f8a` (2026-09-26)

```
feat: add elemental cursor, membership cards and mat booking

P-PLANS, P-SCHEDULE, C-02, C-03, C-04, C-08: shared calendar, CMS thumbnails and 16-mat checkout. Local demo provider only; production schema drafts excluded.
```

`d4c567e` (2026-09-26)

```
fix: refine calendar typography and upcoming-week defaults
```

## Response

Four commits continued the Sanctuary website edition started in 0023.

- **V2.1 Living Sanctuary (`fc2d1d3`, 0.9.2).** Inset shadows, pointer depth, teacher hover, eight sample teacher portraits (`public/images/sanctuary/`), a studio image, three ambient videos (`hoy-hero`, `hoy-ritual`, `hoy-studio`), a corrected logo and a tropical closing scene. `AmbientScene`, `SiteVersionSelect` and the tokens were extended.
- **V2.2 Living photographs (`89b8375`, 0.9.3).** Regenerated hero, class and portrait photographs, sixteen optimized public sample videos (`public/video/living-*.mp4`), full arched teacher cards, page-wide pointer depth and a shared pause. `MediaSlot` gained video support. Touches W-01, W-02, W-04, W-07, W-08, D-01 and D-02.
- **V2.3 Elemental booking (`6465f8a`, 0.9.4).** Contextual orb cursor (`ElementCursor`), `MembershipCard`, CMS class photos (`ClassThumbnail`), a shared day/week/month `SessionCalendar` used by the website and the member schedule, and a two-row, 16-mat booking flow (`MatPicker`, `src/data/mats.ts`, `mat_number` on bookings, checkout and booking confirmation). `MockProvider` bumped to `SEED_VERSION = 3`, extended the demo calendar six weeks ahead and assigned mats to existing bookings. `scripts/test-mat-bookings.mjs` covers the mat rules. Touches P-PLANS, P-SCHEDULE, C-02, C-03, C-04 and C-08. Browser-local demo data only; the production backend is not connected.
- **Calendar polish (`d4c567e`, 0.9.4).** Calendar heading typography in the Sanctuary edition, membership card heading size, `data-movement` on `Chip`, cancelled and completed sessions labelled correctly, and the week view opens on the upcoming week instead of only on Sundays.

Deferred: the mat-booking data has no table or column in `src/data/schema.ts`, `supabase/schema.sql` or `docs/data-model.md` (`mat_number` exists only as a TypeScript module augmentation in `src/data/mats.ts`); the commit says production schema drafts were excluded. See [changelog](../changelog/0024-website-v2-backfill.md), [versions](../website-versions.md) and the kanban Backlog.
