version: 0.21.3
date: 2026-09-30
prompt: docs/prompts/0050-manual-read-edit-figures.md
intent: Justin: "need mark unread in roles in operations manual. maybe it should be top and bottom for marking something as read? or ? … where does the request a change go … Can a super admin edit right on the page itself without submitting a change request? … The mobile images are to big" — K-03's read state was one-way and only at the top, only `{{editable:…}}` sections could be edited in place, and phone captures rendered at full column width on the live site.
decision: (1) The read state is a toggle (`ReadToggle` molecule): unread → primary "Marcar como leído"; read → "✓ Leído el {date}" + outline "Marcar como no leído"; outdated → "Hay una versión nueva" + both. It renders in the chapter head and in a new `ChapterFoot` card at the end of every chapter body (team roles), with "Siguiente →" the next chapter of the reader's role list. `useMarkUnread()` deletes the person's `manual_progress` rows for the chapter (the newest row wins in `useProgress`, so all go; history lives in `audit_log` as `manual.unread`); new action `manual.markUnread`. (2) `canEditSection(role, section)`: admin and super_admin edit every `##` section, coordinator only `{{editable:coordinator}}`, others none; `canEditLevel` stays for policies; `manual.editSection` / `manual.restoreSection` follow it. Unmarked sections show Editar to admins with **no tag** (the quieter of "no tag" / "Solo admin"; the Editar button's title explains it). The chapter badge counts what the viewer may edit ("{n} secciones editables por ti"), else the marked count. The request box names K-04 with a link for leads and tells admins they can edit directly. (3) Phone figures: the manual passes `device` from the markdown path; `isPhoneCapture()` accepts Vite's hashed names (`es-390-<hash>.jpg`, the real cause: the old `-390.jpg$` test never matched in a build); an unhinted portrait image (w/h < 0.7) becomes mobile on load. Mobile = `max-width: 22.5rem`, centred, hairline border, `--r-lg` frame, inner radius `--r-lg − --sp-sm`. Two adjacent phone-figure paragraphs are merged into one paragraph, which `MarkdownViewer` hands to the new `figureGroup` prop → `FigurePair` (two columns of ≤ 22.5rem from 768 px, `--grid-gap`, stacked below).
rejected: A floating / sticky "mark as read" bar at the bottom of the viewport — rejected in favour of head + foot: it covers content on phones, competes with the shell's dock, and a reader who reaches the end is exactly where the foot sits; a switch (on/off) for read — rejected for the same reason as 0049's "No vino": an unnamed switch does not say what flipping it does, two named buttons do; setting `read_at: null` instead of deleting — rejected, `useProgress` keeps the newest row per chapter by `read_at`, a null row would sort unpredictably and every reader would need a filter; unrestricted in-place editing for coordinators too — rejected, coordination edits the house rules marked for it and requests the rest, so the owner keeps authority over policy text; a "Solo admin" tag on every unmarked section — rejected as noise (it would appear on ~80 % of sections for admins); pairing by CSS alone (inline-block figures) — rejected, a single phone figure must centre and a pair must not depend on whitespace; pairing three or more phones — out of scope, a third phone capture stays on its own.
files: src/modules/ops-manual/ManualPage.tsx; src/modules/ops-manual/lms.tsx; src/modules/ops-manual/editing.tsx; src/modules/ops-manual/manualData.ts; src/modules/ops-manual/manualActions.ts; src/modules/ops-manual/actionDefs.ts; src/modules/ops-manual/strings.ts; src/modules/ops-manual/manual.css; src/modules/ops-manual/specs.ts; src/components/molecule/ReadToggle/{ReadToggle.tsx,ReadToggle.css,ReadToggle.meta.ts}; src/components/molecule/ChapterFoot/{ChapterFoot.tsx,ChapterFoot.css,ChapterFoot.meta.ts}; src/components/organism/FigurePair/{FigurePair.tsx,FigurePair.css,FigurePair.meta.ts}; src/components/organism/Figure/{Figure.tsx,Figure.css,Figure.meta.ts}; src/components/organism/MarkdownViewer/{MarkdownViewer.tsx,MarkdownViewer.css,MarkdownViewer.meta.ts}; src/app/captureDates.ts; public/actions.json; public/hub-map.json; docs/ops-manual/STYLE.md; docs/ops-manual/README.md; docs/pages/K-03.md; docs/reference/surfaces.md; docs/kanban.md; docs/README.md; docs/prompts/0050-manual-read-edit-figures.md; docs/changelog/0050-manual-read-edit-figures.md; docs/screenshots/K-03/{es,en}-{390,1280}[-dark][-cover].jpg; docs/screenshots/routes.json; docs/screenshots/_brand/manual-read-edit-figures-2026-09-30.jpg; package.json; package-lock.json
codes: K-03, K-04, D-02

Model routing: Opus 5.5 (build).

Checks: build green · tsc 0 errors · lint:spacing 61 / 61 (baseline unchanged; every new value is a token, the 22.5rem caps are layout widths) · manual-lint 0 · browser checks on the preview build: front desk marks 04 read from the foot, the head shows "Leído el …", unmarking drops the cover from 4 → 3 of 17 required and removes both ✓ in the lists; `manual.markRead` / `manual.markUnread` over `window.__hoyos.run` ok with `manual.read` / `manual.unread` audit rows; chapter 04 edit buttons: admin 10 / 10 sections, coordinator 2 (its marked ones), front desk 0; `manual.editSection` as front desk refused; chapter 10 at 1280: phone figures 234 px each in a pair and 360 px alone (were 492 px, "desktop"); foot, head and K-04 link targets 44 px; teacher chapter 06 at 390 / 1280 dark and light without console errors · captures K-03 cover + chapter ES / EN × 390 / 1280 light + dark.

## Why

The read mark was a dead end (no way back after a mistaken tap) and lived only at the top, so a reader who finished had
to scroll up. Admins had to file a request to themselves for any paragraph that was not pre-marked. Phone captures were
meant to be narrow, but the file-name check missed every hashed URL in the build, so on the live site they rendered at
desktop width — one screen tall each.

## What changed

- **ReadToggle (new molecule).** `state: unread | read | outdated`, `readLabel`, `labels`, `onMark`, `onUnmark`, `busy`.
  Buttons `md` (44 px): primary with `check` icon; outline for unmark; the read line is `role="status"` in
  `--color-success`, `--gap-inline` icon gap, `--gap-control` between items.
- **ChapterFoot (new molecule).** Slim card: `--card-pad`, 1 px border, `--r-md`, `--block` above; the question, the
  toggle, and the "Siguiente →" link (44 px, right-aligned, left-aligned under 640 px). Hidden in print.
- **K-03 chapter.** `ReadButton` renders `ReadToggle`; `ChapterFootBlock` + `useNextChapter()` (next by number in the
  lens role's required + recommended list, else the next chapter). The badge: `manual.edit.countYou` when the viewer can
  edit, else `manual.edit.count`.
- **SectionBlock.** `canEditSection`; tools row appears for anyone who can edit; `is-admin-editable` class on unmarked
  sections an admin can edit; Editar carries a `title` (level hint or admin hint).
- **RequestBox.** Leads: "Ver todas las solicitudes (K-04) →" (44 px link); admins: "Como admin no necesitas pedir el
  cambio: usa «Editar» en la sección…".
- **Figure.** `isPhoneCapture(path)` exported; portrait-on-load fallback; mobile cap 22.5rem (was 18.75rem, and 100 % under
  640 px), `--r-lg` frame without shadow.
- **MarkdownViewer.** A paragraph of only titled images (two or more) → `figureGroup(children)` (or `.mdv-figures`).
- **FigurePair (new organism).** Grid, `--grid-gap`, two columns of `minmax(0, 22.5rem)` from 768 px.
- **Strings.** `manual.read.unmark`, `manual.foot.title`, `manual.edit.adminHint`, `manual.edit.countYou`,
  `manual.req.adminLead`, `manual.req.see`, `admin.audit.manual.unread`; `manual.edit.levelHint` rewritten for the three
  tiers.

## Deviations from the brief

- Unmark **deletes** the rows rather than setting `read_at: null` (the brief allowed either; see rejected).
- The pair's two columns are `minmax(0, 22.5rem)` from 768 px *viewport*; at 1280 the manual's reading column is ~490 px
  (docs sidebar + manual sidebar + outline), so a pair shows two ~234 px phones there and a single phone shows at 360 px.
  From 1920 the pair reaches its full 360 px each.
- `ReadButton` stays exported from `lms.tsx` (it is the data-bound wrapper); the presentational part is the new library
  component `ReadToggle`, so the library entry has real states.

## Before / after

![Manual read toggle, admin edit, phone figures before and after](../screenshots/_brand/manual-read-edit-figures-2026-09-30.jpg)
