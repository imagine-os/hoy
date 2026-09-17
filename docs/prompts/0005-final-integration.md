# 0005 — Final integration (single writer after three parallel tracks)

- **Source**: coordinator brief (Slack channel C0C29DX1YMB, thread 1789612545.756109), delegated to the integration worker
- **Date**: 2026-09-17
- **Requester**: build coordinator on behalf of Justin (project lead)
- **Changelog**: `docs/changelog/0005-final-integration.md`

## Prompt (summarised — the brief was a task list, not user prose)

Three parallel tracks have landed on `main` (scaffold → docs `ef1dff8` → staff/admin `8e04c8b` → customer
`cb51b69`). You are the only writer now. Read the scaffold handoff, `CLAUDE.md` and the "shared-change
requests" in changelogs 0002 and 0003, then:

0. **Sync** — fast-forward `main`, remove the three worktrees, `npm i`, `npm run build` green before any change.
1. **Apply the shared-change requests** (small, careful edits in shared files):
   a. `LayoutEditorPage` `WIRED` += S-02, M-01, C-02, C-02b, C-03, C-19.
   b. Hub "Customer app" card and the website schedule sign-in prompt link to `/auth/sign-in`; teacher and
      staff role cards keep switching demo users.
   c. `SessionProvider.switchUser` accepts any `users` row id so A-03 signs in as the created account; remove
      the "continues as demo customer" note.
   d. `MockProvider` listens to `storage` and emits `reset` so two tabs see each other's writes; verify with two
      Playwright pages.
   e. `scripts/screenshots.mjs` derives the folder from the route's real `spec.code`, not the `canvasSpecs['X']` regex.
   f. Customer `policy.ts` values (cancel window, claim, IVA, pause, lockout) read from the M-08 tenant settings
      with the same defaults; keep the customer module API stable.
   g. `core.nav.history` in `src/i18n/core.ts`.
   h. Seed: demo customer at most one booking per day; birthdays on ~30 % of profiles.
   i. Kanban: close audit #22 and #26; move finished work to Done; six requested tables as Backlog cards in a
      "Data" lane with a one-line reason each.
   Build and `screenshots -- --smoke` green; commit `fix: wire cross-module requests (…)`.
2. **Full screenshot pass** as JPEG quality 72 (`.jpg`), docs updated to say `.jpg`; every route in es/en ×
   390/1280 (+dark for key pages); keep `docs/screenshots` under 60 MB; `gen-page-doc.mjs` for every code;
   commit `docs: screenshots for every route (es/en × 390/1280) and per-page docs`; chunk the push if HTTP 413.
3. **Session docs and roadmap** — this prompt log, changelog 0005 (v0.3.0, with the alternatives rejected for
   JPEG vs PNG and for policy-in-settings), `ROADMAP.md` "Where we are" with real vs stub counts, `README.md`
   v0.3.0 with the entry routes of the seven perspectives.
4. **Push and check Pages** — push `main` (never force), report the Pages workflow run and the repo's
   `size`, `default_branch`, `has_pages`. Do not enable Pages via the API.
5. **Channel memory** — three memory files (repo and stack, Justin's standing rules, state on 2026-09-17).

## Response

Everything in steps 0–3 was done in three commits on `main` (see the changelog for the SHAs and the numbers):

- **Step 1 — all nine requests applied.** Beyond the brief: the website "buy" button and the SiteShell
  sign-in button also go through `/auth/sign-in`, which now honours `?next=` for customers; `useTable`
  and `useRow` re-read the synchronous snapshot when their query changes (without this the freshly created
  account was seen as a visitor for one render and `RequireRole` bounced it to `/no-access`); the M-08
  policies section gained the four values the customer app needed (payment hold, charge notice, lockout
  attempts and minutes); the S-02 spec drops the scanner api/states (audit #26). Verified with a Playwright
  script: cross-tab write visible in the second tab, A-03 → session is the new `users` row → C-19 shows the
  name, hub card → `/auth/sign-in`, `?next=` respected.
- **Step 2 — screenshots and page docs.** The screenshot script now reads the route manifest the app
  publishes on `window.__hoyos.routes` (`src/app/manifest.ts`) and saves it to
  `docs/screenshots/routes.json`; `gen-page-doc.mjs --all` builds one doc per code from that manifest.
  Captures are JPEG q72 (`[screenshot: <code>]` placeholders in 0002/0003 are now real files).
- **Step 3 — docs.** This file, changelog 0005 (v0.3.0), ROADMAP §A rewritten (65 codes routed, 0 stubs),
  README bumped to 0.3.0 with the entry routes.
- **Not done / left as P1**: the six new tables (schema is a design decision for the owner — see the Data
  lane), a `usePolicy()` hook so pages re-render the instant M-08 changes (today they pick up the value on
  the next navigation), bank account + NIT in M-08 for transfer instructions.
