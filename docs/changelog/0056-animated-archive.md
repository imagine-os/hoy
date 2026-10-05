version: 0.23.1
date: 2026-10-05
prompt: docs/prompts/0056-animated-archive.md
intent: Make the earlier animated website selectable without replacing the current verified edition.
decision: Add an explicit URL-addressed read-only archive of 46beed7; Latest remains the bare-URL default.
rejected: Reverting verified teachers/prices or attaching fictional portrait loops to real teachers would change the current studio information.
files: src/modules/website/{archive,edition,links,pages,SiteShell,strings,site,jsonLd}; src/components/molecule/{SiteVersionSelect,SiteArchiveNotice,ArchivedMembershipCard,PriceRow}; restored public/images/sanctuary/teacher-* and public/video/living-*; docs/website-versions.md

## Public pages

W-01, W-02, W-03, W-05, W-07, W-08 and P-01 preserve the pre-verification design. The historical catalog is never inserted into the operational provider. The archive provider blocks writes, suppresses current layout/media overrides, and has no live historical timetable or reviews. All 21 restored assets are byte-identical to the source commit.

Latest keeps its current teachers, seven classes, launch prices, FAQ, policies and contact information. Classic remains a visual skin of Latest, not a historical data version. Public links keep explicit edition/motion query state. Refresh and browser history do not rely on a remembered edition. Version changes on incompatible class-detail slugs go to the class index.

Archived purchase actions open current plans; schedule, FAQ, legal and contact links switch explicitly to Latest. The archive has no LocalBusiness structured data. Existing reduced-motion, save-data, visibility pause and static-poster behavior are preserved.

## Verification

Source review, TypeScript, unchanged spacing baseline (60), route-boundary tests and byte-for-byte media restoration pass. CI run 37337965055 passed all 15 browser-flow checks in both languages at 344/390/768/1280, including real teacher/class playback, Back/Forward, refresh, current-data preservation, historical purchase exits, standalone Coming Soon and reduced motion. Its build caught a malformed 0057 changelog header; corrected before release. The final exact-head workflow also checks the production bundle.

[Archived teachers, desktop](../screenshots/W-05/en-1280-archive.jpg) · [archived teachers, phone](../screenshots/W-05/en-390-archive.jpg) · [archived home, desktop](../screenshots/W-01/es-1280-archive.jpg)

The new focused QA workflow uploads only compact captures/report with one-day retention. Existing deploy workflow, CI budget and artifact-retention settings were not changed.
