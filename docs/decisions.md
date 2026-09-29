# Engineering decisions

Append-only. One `### D-NNNN — title` block per decision, newest at the bottom, never renumbered and
never rewritten: a decision that stops being true gets a **new** block that supersedes it, with the
old one left in place and marked. Product and studio decisions the owner still has to make live
elsewhere — `/#/manual/decisions` (K-04) and `ROADMAP.md` §E; this file is about how the software is
built. Changelog entries (`docs/changelog/NNNN-*.md`) carry the full reasoning for a change; this is
the short, citable index.

Fields: **Date**, **Status** (accepted · superseded by D-NNNN), **Context**, **Decision**,
**Alternative rejected**.

---

### D-0001 — Previews are real captures with a capped live-iframe upgrade

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** HUB-01 had to show what each surface looks like. The reference hub (cal-tenant-law)
  renders every card as a live iframe; with the twenty-odd surfaces HoyOS has, that boots twenty
  copies of the app on the first screen a tester ever opens, and a screenshot then captures whatever
  happened to finish loading.
- **Decision.** Two layers, static first. Every preview shows a committed JPEG capture
  (`docs/screenshots/<code>/thumb-*`, produced by `npm run thumbnails`) over a hue-tinted idle tile,
  loaded eagerly. On top of that, `PagePreview` upgrades to the running page in a `DeviceFrame` when
  the card is on screen (`IntersectionObserver`, 160 px margin) and a `LivePreviewBudget` of **six
  frames in document order** has a slot. Live frames are off entirely when the hub is itself framed,
  when the URL carries `live=0`, and under `navigator.webdriver` — so a capture is deterministic.
- **Alternative rejected.** Live iframes only (unusable on a phone, non-deterministic captures) and
  static thumbnails only (honest but dead — a testing hub should let you see the thing run).

### D-0002 — The actions registry is the WebMCP surface

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** Pages have to declare what they can be asked to do — for an agent today (MCP / WebMCP)
  and for the voice controller later — without every page inventing its own protocol, and without an
  agent having to open a page to learn that the page exists.
- **Decision.** `ActionDef { id, label{es,en}, intent{es,en}, params?, permission? }` in
  `src/actions/types.ts`. A page **declares** its actions in its `PageSpec.actions` and **mounts**
  handlers for the same ids with `useActions(spec, handlers)`. `listActions()` walks every routed
  spec, so the whole vocabulary is readable from any page, each entry carrying its page code, route
  and a live `mounted` flag; `run(id, params)` returns `{ ok, message }` and never throws.
  `window.__hoyos.actions` (a getter) and `window.__hoyos.run` are the public surface, documented in
  `docs/reference/surfaces.md`. The `id` is `<page>.<verb>` and is treated as stable; `intent` is the
  phrase a person would say, which is what the voice vocabulary will be built from.
  `permission` is advisory metadata for agents; each gated handler enforces its own role check today
  (`hub.toggleDevMode` and `hub.toggleWireframe` throw `requires super_admin`, so `run()` returns
  `{ ok: false }`), and server-side enforcement comes with the proxy.
- **Alternative rejected.** Registering handlers only (no declaration), which makes the vocabulary
  depend on what is currently open; and a DOM-annotation scheme (`data-action` attributes), which
  cannot carry bilingual intents, parameter types or permissions.

### D-0003 — Spanish stays the primary language

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** The rebuilt hub was the moment to revisit it: the engineering docs are English-first,
  and the reference hub is English.
- **Decision.** Spanish stays the source. `<html lang="es">` by default, every string is `{ es, en }`
  with `es` required and `en` falling back to it, and copy is written in Spanish first and then
  translated. The studio team in Medellín reads Spanish; English is for the owner, the docs and
  future tenants. The language toggle is on the hub's brand band, not buried.
- **Alternative rejected.** Flipping to English-first now that the system has more English
  documentation than Spanish UI — it would make the people who actually use the software second-class
  readers of their own tool.

### D-0004 — Large-screen scale is a hub-scoped `--ui` band; global scaling is deferred

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** The quality bar is phone to 4K TV, legible at ten feet and usable as a desk monitor.
  At 3840 px a 1120 px content column with 16 px body text is a thin, unreadable strip.
- **Decision.** One variable scoped to the hub: `.hub { --ui: 1 }`, `1.125` at ≥ 1920, `1.375` at
  ≥ 2560, `1.75` at ≥ 3840, multiplied into the hub's type sizes, medallions, padding, gaps and grid
  max-width. CSS does the scaling; `useUiScale()` reads the value in JS only where CSS cannot help —
  the cap on the phone preview's device scale. The pattern is proven on one surface before it is
  applied to all of them.
- **Alternative rejected.** Scaling the root font size globally at those breakpoints — it changes all
  101 routes at once in a pass nobody can review, and every hard-coded `px` in the system (frames,
  icon sizes, the phone shell) would drift out of proportion with it.

### D-0005 — Thumbnails ship as committed JPEGs, generated by the screenshot pass

- **Date** 2026-09-20 · **Status** accepted · **Changelog** `docs/changelog/0022-hub-home-redesign.md`
- **Context.** The previews need an image per page code, per language, per theme, available offline
  and on GitHub Pages, and reviewable in a diff.
- **Decision.** `npm run thumbnails` (`scripts/screenshots.mjs --thumbs`) writes
  `docs/screenshots/<CODE>/thumb-<lang>-desktop[-dark].jpg` at **640 × 400** (1280 × 800 viewport,
  `deviceScaleFactor` 0.5, not full-page) and, for phone surfaces, `thumb-<lang>-phone[-dark].jpg` at
  **195 × 422** — **JPEG quality 64**, committed with the change. `src/app/thumbnails.ts` resolves the
  best match (exact language + theme → light → Spanish → any capture of that code) and the map of
  URLs lives in `src/app/thumbnailMap.ts`, imported dynamically so ~490 asset URLs stay out of the
  entry chunk.
- **Alternative rejected.** Generating thumbnails at build time from the full-size captures (another
  image toolchain in the build for something the screenshot pass already has a browser open for), and
  rendering the card art as CSS/SVG mock-ups (pretty, and a lie the moment a screen changes).

### D-0006 — The customer app is full-viewport at every width; the phone bezel exists only in the hub's DeviceFrame simulator

- **Date** 2026-09-28 · **Status** accepted · **Changelog** `docs/changelog/0025-responsive-app-shell.md`
- **Context.** Justin: "on desktop, as we're working through the reserve and register process it switches from the
  desktop experience to mobile. It should all flow as one experience. Also, mobile is currently living in a mockup
  of a phone." Both were the same rule: `PhoneShell.css` drew the canvas phone frame (430 px, 34 px radius, sand
  ground, internal scroll) from 900 px up, and every `/app/*` and `/teach*` route rendered inside it — so the
  website (1120–1520 px) handed a desktop user to a 480 px auth column and then to a 430 px phone.
- **Decision.** One responsive shell for customer and teacher, `AppShell`: below 900 px it is the current phone
  layout (content column, sticky bottom dock); at 900 px and up it is a full-viewport page with a top bar
  (wordmark, primary nav, language, avatar) and content in a centred container (`--w-app` 1200 px, growing with the
  `--ui` band). No bezel, no inner scroll container — the document scrolls. The phone bezel survives in exactly one
  place: `DeviceFrame` (hub previews, `/#/dev/simulator`), which renders the real page in a 390 × 844 iframe with
  `chrome`. `RouteDef.layout` is now honoured by `withShell()`: `mobile` → AppShell, `desktop` → DesktopShell,
  `auto` → the surface default. Auth (`AuthShell`) adopts the same top bar and a 480 → 576 px column, and the site's
  bottom sheets become centred dialogs at 900 px, so reserve and register read as one system from site to app.
- **Alternative rejected.** Keeping the frame and adding a "desktop mode" toggle — it keeps the mockup as the default,
  and the flow would still jump widths at each hand-off. Also rejected: picking the shell per viewport in JS
  (PhoneShell below 900, DesktopShell above) — the sidebar shell is staff tooling, not a member experience, and the
  nav items already come from `RouteDef.nav`, so one shell can simply change how it draws them.

### D-0007 — The `--ui` large-screen scale band applies globally, not hub-only

- **Date** 2026-09-28 · **Status** accepted · supersedes the deferral in D-0004 · **Changelog** `docs/changelog/0025-responsive-app-shell.md`
- **Context.** D-0004 proved the band on the hub and deferred the rest: at 3840 px the checkout was a 430 px strip
  with 16 px body text and the website a 1520 px strip — not legible from ten feet, not usable as a desk monitor.
- **Decision.** `--ui` moves from `.hub` to `:root` in the generated tokens (`1` · `1.125` ≥ 1920 · `1.375` ≥ 2560 ·
  `1.75` ≥ 3840) and drives `html { font-size: calc(100% * var(--ui)) }`. Spacing (`--sp-*`), control heights
  (`--h-ctl` 2.75rem = 44 px), bar heights and layout widths (`--w-content`, `--w-app`, `--w-sidebar`) are rem, so
  type, spacing, controls and containers scale together on every surface; the hub drops its own
  `calc(var(--sp-*) * var(--ui))` multipliers (px values like `44px * var(--ui)` keep theirs — px does not follow
  the root font). Breakpoints are one list, `BREAKPOINTS` in `tokens.ts` (360 · 390 · 768 · 900 · 1280 · 1920 ·
  2560 · 3840), shared by CSS, `useMinWidth()` and `PageSpec.checkedAt`. Every interactive control is at least
  `--h-ctl` tall.
- **Alternative rejected.** Per-surface bands (`.appshell { --ui }`, `.site { --ui }`…) — three copies of the same
  numbers that drift. Also rejected: CSS `zoom` on the root — it scales fixed-px art and the DeviceFrame maths too,
  and its `vh`/`getBoundingClientRect` behaviour still differs between engines.

### D-0008 — One icon set: lucide glyphs behind the `Icon` atom

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0030-icons.md`
- **Context.** Justin: the bottom-tray and other icons in the customer and teacher apps, the front-desk action icons
  and the settings icons "should be better". Nav, list rows, buttons and timelines used literal Unicode characters
  (⌂ ▦ ▤ ⋯ ◇ ✉ ☏ ⚙ $) that draw differently per platform font, carry no weight or active state, and in several places
  (front-desk quick actions, settings sections) there was no icon at all. The in-house `Icon` atom had 29 glyphs,
  used only by the hub.
- **Decision.** Adopt `lucide-react` (ISC, ~1.5k consistent 24 px rounded-cap glyphs) **behind** the existing `Icon`
  atom: `ICONS` maps 135 product names (`home`, `schedule`, `checkin`, `user-plus`, `promote`, `policies`, …) to lucide
  components, imported by name so only those glyphs ship. The `name` prop API and the 29 existing names are kept, so
  hub call sites did not change; `RouteDef.nav.icon` is typed `IconName`; the `icon` slots of Button, ListRow, Card,
  EmptyState, Notice and NavBar accept a name. Stroke and sizes are D-01 tokens (`--icon-*`).
- **Alternative rejected.** Extending the hand-drawn set to ~130 glyphs — weeks of drawing and review to reach the
  consistency lucide already has, and every new screen would wait on a new drawing. Also rejected: an icon font
  (Material Symbols) — a font download, a FOUT on first paint and ligature names that fail silently; and importing
  lucide directly in pages — it would scatter the seam and make a later swap a repo-wide edit.


### D-0009 — Who reads what is data, and the manual has a lens

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0031-manual-lms.md`
- **Context.** Justin wants the operations manual to behave like a staff LMS: each person sees their own filtered
  version and what applies to them. The "Quién lee qué" matrix existed only as a markdown table in 00-index §4.
- **Decision.** The matrix is `src/modules/ops-manual/audience.ts`, keyed by chapter number (the stable slug prefix),
  with the owner as `admin`, `super_admin` as the union of the owner and "Admin" columns, and columns for the two new
  roles. The manual reads through a **lens** — the signed-in role by default, `?as=<role>|all` in the hash query (the
  hub map's embed key) — that orders required before recommended and dims, never hides, what does not apply.
  `{{audience}}` renders the same data as the table, so the chapter and the filter cannot disagree.
- **Alternative rejected.** Audience in each chapter's front matter — 28 files to keep in step and no single matrix.

### D-0010 — Studio edits to the manual live beside the markdown, not in it

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0031-manual-lms.md`
- **Context.** The owner and the operations manager must adapt policies and procedures without a developer; the
  markdown in the repo is also being rewritten by a content pass.
- **Decision.** A `##` section marked `{{editable:owner|coordinator}}` is edited in the app into `manual_overrides`
  (versioned, live / reverted / suggested / dismissed) and rendered in place with "Editado por … · Ver original",
  history and "Restaurar original"; text rules are `studio_policies` values (`{{studio:<key>}}`); numeric rules stay in
  M-08. Agents propose through the actions registry (`manual.suggestEdit`) and an owner accepts. Folding an accepted
  override back into the markdown is a content pass, recorded in the changelog like any other.
- **Alternative rejected.** Committing edits to git from the browser — a token in the client, a commit per edit and
  conflicts with the content pass.

### D-0011 — Source documents are files served from `public/`, indexed in `docs/source/`

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0031-manual-lms.md`
- **Context.** Three owner PDFs (value model, website copy, brand manual) must be available in the hub and embedded in
  the manual; one arrived at 27.8 MB.
- **Decision.** `public/source/<id>.pdf` (+ a first-page cover) is served as a file; `docs/source/index.json` is the
  index (title, kind, pages, date, summary, chapters). K-05 lists them and `{{source:<id>}}` embeds one; the viewer loads
  only on request. Heavy PDFs are republished with ghostscript (`/printer`, 300 dpi) after checking the logo pages.
- **Alternative rejected.** Importing them through the docs glob — megabytes of binaries in the JS graph.

### D-0012 — Spacing is tokens plus a lint, not utility classes

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0037-spacing-standard.md`
- **Context.** Justin asked for "picture perfect" spacing and sizing everywhere and pointed at Client-First
  (Finsweet), while disliking its complexity. The code had a numeric 4-pt scale with off-grid steps (20, 40, 80 px),
  774 raw px/rem spacing values in module CSS and inline styles, px column widths that did not grow on a 4K screen,
  and hub controls multiplied by `--ui` on top of rem (scaled twice).
- **Decision.** One 4 px scale in rem (`--sp-2xs … --sp-5xl`) plus a small semantic layer in D-01 (`--gap-inline`,
  `--gap-control`, `--stack-tight/--stack/--stack-loose`, `--block`, `--card-pad(-lg)`, `--section(-hero)`,
  `--gutter`, `--grid-gap`, `--row-pad`, `--btn-pad-x`, `--measure`), the responsive ones stepping up at 768 / 1280.
  CSS keeps writing semantic classes; values come from tokens only. `scripts/spacing-lint.mjs` runs in every build
  and fails when raw spacing grows above `scripts/spacing-baseline.json`. The how-to is the `ui-spacing` skill.
- **Alternative rejected.** Client-First utility classes (`padding-global`, `margin-bottom margin-large`, …) —
  a second vocabulary in the markup, hard for a person to read, and it bypasses the component meta. Tailwind —
  CLAUDE.md already rejects it (plain CSS with tokens), and it would put spacing in JSX where the lint and the
  component library cannot see a relationship, only a number.

### D-0013 — The four movements are retired; classes carry a neutral colour tone

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0039-retire-movements.md` · supersedes the "internal label" position recorded in ROADMAP §E 22 / changelog 0032, and the D-01 `movements` token set from 0006
- **Context.** The owner found Enraíza / Fluye / Arde / Libera in the club rules ("Sobre HOY") and in the booking flow and wants them gone everywhere. The source documents transcribed in `src/tenant/brand.ts` and in the manual never named them: the vocabulary was an invention of the canvas that leaked into customer copy.
- **Decision.** No movements, public or internal, and no data keys: D-01 `movements` becomes `classTones` with seven hue-named tones (moss, river, clay, sun, sage, slate, plum, CSS `--tone-*`), `modalities.movement` and `media_assets.movement` become `tone` (one tone per modality, chosen in M-02), the `intentions` table is dropped and the M-08f `publicNaming` setting is removed. Classes are always named by modality, and schedule filters and legends (C-02, C-02b, W-04 with `?modality=<slug>`) are the visible modalities.
- **Alternative rejected.** Keeping the movements as internal-only labels — 0032 tried it and they still leaked into customer copy. Naming the tones after elements or feelings — that would re-create the concept under new names.

### D-0014 — Practice metrics derive from the raw tables; `activity_events` records moments, never truth

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0040-practice-analytics.md`
- **Context.** Justin: "Classes this month is not clear if that's how many they've taken … somewhere we can store those
  types of analytics for both admin and customer usefulness." The old home tile counted check-ins by the booking's
  `created_at`, C-22 counted "booked and attended" under the same label, and the "streak" was a formula over the month
  count. Five screens (C-01, C-27, C-22, M-06, M-12, S-03) now need the same numbers, and the research's event model
  suggested storing immutable events and materialising weekly aggregates.
- **Decision.** No metric is stored. `src/data/analytics.ts` is one pure module (no React, no provider) whose
  `practiceStats()`, `studioStats()` and `teacherStats()` derive everything from `bookings` × `class_sessions` (a visit
  is a `checked_in` booking dated by the **session's** start), `memberships`, `credits` and `practice_goals`; the hooks
  in `useAnalytics.ts` memoise them over `useTable()`. `activity_events` is an **append-only record of moments** the raw
  tables do not hold — a goal set, a milestone reached, a rest week that saved the streak — written by the app
  (`usePracticeGoal`, `useMilestoneRecorder`, idempotent) and read by timelines and future automations, **never by a
  metric**. A Supabase materialisation later is a cache of the same functions, not a second definition.
- **Alternative rejected.** A `member_stats` (or `member_week`) table written on check-in — two definitions of the same
  number to keep in sync, a migration every time a rule changes, and a wrong row that no recomputation fixes. Also
  rejected: deriving from `activity_events` (the research's pure event-sourcing model) — bookings, check-ins and payments
  already have their tables and their access contracts; duplicating them as events would make `bookings` and the event
  stream disagree the first time a booking is edited.

### D-0015 — The streak is weekly, goal-based, with one rest week per four, and a goal change never rewrites past weeks

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0040-practice-analytics.md`
- **Context.** Justin: "The streak can be cooler, and maybe we figure out smartly or by asking them what their goal is
  for tracking." Studio attendance is 2–4 events a week, not a daily behaviour; daily streaks with no rest days are the
  widely criticised counter-example, broken streaks demotivate (66 % vs 58 % continuation) and repair mechanics work
  (Duolingo's freeze). Members who reach twice a week early are the ones who stay.
- **Decision.** The unit is the **week**, Monday–Sunday in the studio's time zone. The member **chooses** a weekly goal
  (1 · 2 · 3 · 4+ or none; the history's median is marked "Sugerido", default 2) — it is never inferred silently. A week
  is met when visits ≥ the goal; the current week never breaks the run and counts once met; **one missed week per
  rolling four is forgiven** when the run is alive and there was practice in the four weeks before; a week with the
  membership paused neither counts nor breaks; two misses in a row (or a miss with no rest week left) reset the run
  while **`best` is kept forever** and a broken run shows the best one, never a red zero. Goals are history:
  `practice_goals` keeps one active row per person and a change ends the previous row instead of editing it, so each
  past week is judged against the goal that was active during it — **raising a goal never rewrites past weeks**.
  Implemented as `analytics.ts` rule 8: `usePracticeStats` passes every `practice_goals` row of the person and each
  week takes the target of the latest row whose `starts_on` ≤ that week's Sunday (weeks before the earliest goal use
  the earliest goal's target); `npm run test:analytics` proves the raise, the lower and the same-day double change.
- **Alternative rejected.** A daily streak (punishes rest); a streak with no slack (the research's "convenient exit
  point"); one freeze per calendar month (month-boundary effects; "the first miss in any four weeks" is easier to say);
  inferring the goal from history without asking (the research says do not, and a silently changing goal makes the
  streak unexplainable); editing the goal row in place (past weeks would be re-judged against the new target).

### D-0016 — Saved hours are the source of truth; dated overrides live in a table

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0041-hours-google-keys.md`
- **Context.** M-08a saved the weekly hours into `tenants.settings.openingHours`, but every screen quoted a constant
  sentence in `tenant.ts`, so a change reached nobody. Justin asked for the hours to reach Google Business and for
  holiday hours and special overrides.
- **Decision.** The weekly hours stay a settings section (M-08a). Dated exceptions are rows in `hours_overrides`
  (start/end inclusive, closed or other times, label ES/EN, kind, source, `google_synced_at`); an override wins for the
  dates it covers, the narrowest range on overlap. Pure readers in `src/tenant/hours.ts`, one hook
  (`useOpeningHours()`) for every surface, `tenant.ts` as the fallback. Colombian holidays are computed per year
  (`src/tenant/holidays.co.ts`) and imported as closed rows the studio can edit.
- **Alternative rejected.** A table for the weekly hours too (the week is one small object already saved and audited);
  a recurring per-holiday rule (Emiliani and Easter move the dates every year; a yearly import is explicit and
  auditable); an overrides array inside `tenants.settings` (no ids, no `updated_at`, no realtime per row).

### D-0017 — Google Business Profile: HoyOS pushes, a server holds the tokens, one way with drift read-back

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0041-hours-google-keys.md`
- **Context.** Each studio on HoyOS has its own Business Profile; the Business Profile API needs a Google Cloud project
  with approved access, OAuth with `business.manage`, and a refresh token per location. The browser DB is localStorage.
- **Decision.** HoyOS is the source of truth. A server (not built yet) pushes `locations.patch` with
  `updateMask=regularHours,specialHours` — the body `toGoogleBusinessHours()` builds and M-10a previews — on save and
  nightly, reads the location back nightly to flag drift, and never writes Google's values into HoyOS. The platform
  sets Google up once (project, APIs, access request, consent screen, client id/secret in server env); each studio only
  connects its own location. The `integrations` row keeps public identifiers (location name, account email, place id);
  tokens live in server env, named per tenant.
- **Alternative rejected.** Two-way sync (two sources of truth, silent overwrites); tokens in the browser or in
  `integrations.config` (a plaintext secret in localStorage — already rejected for Wompi in 0007 / 0018); one Google
  project per studio (every studio would repeat the access request and the consent-screen review).

### D-0018 — Developer API keys: hashed at rest, shown once, scoped, rotated with a grace period

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0041-hours-google-keys.md`
- **Context.** Justin asked for "a secret key system for our apps for developers". HoyOS has no server; secrets it
  uses to call others (Wompi, WhatsApp, Google) already live in server env. Keys it gives to others are the reverse.
- **Decision.** D-07 issues `hoy_<live|test>_<24 base62>` from the CSPRNG; `api_keys` stores the 13-character prefix
  and the SHA-256 hash, never the key, which is shown once. Keys carry scopes, an environment and an optional expiry;
  rotation creates a replacement (`replaces_id`) and gives the old key 24 hours; revocation stamps `revoked_at`, rows are
  never deleted; every step is audited with the prefix. Verification (hash the bearer token, match, check scope /
  expiry / revocation, stamp `last_used_at`) is the server's job.
- **Alternative rejected.** Storing the key (encrypted or not) so it can be shown again — anyone with the table could
  use it; keys without scopes or environments (a test integration could write live bookings); verifying in the
  browser (there is nothing to protect there).

### D-0019 — One multi-tenant MCP server over the actions vocabulary; WebMCP in the page; marketplaces are packaging

- **Date** 2026-09-29 · **Status** accepted · **Changelog** `docs/changelog/0043-ai-surfaces-distribution.md`
- **Context.** Justin asked whether MCP, CLI and API are organized, whether MCP and WebMCP differ, and for a plan to get
  HOY into ChatGPT, Claude, Cursor, Grok, Meta Muse and other AI marketplaces — for HOY and system-wide, multi-tenant.
  HoyOS has no server; the 40 declared actions were readable only inside the running page (`window.__hoyos`) until
  0043 published `actions.json`; their `permission` is advisory metadata that `run()` does not check. Research and
  plan: `docs/reference/ai-distribution.md`.
- **Decision.** One Cloudflare Worker (the server the 0041 card already plans for the Google push and key verification)
  serves `POST /mcp` — Streamable HTTP, 2026-07-28 shape with a 2025-11-25 compatibility path, never `/sse` — for every
  studio and every product: the tenant comes from the credential, a `POST /t/{studio-slug}/mcp` alias serves the public
  tools and per-studio directory URLs, and the Worker is a `{product}/{tenant}` gateway (hoy, aluzina, Between Gigs each
  publish an `actions.json`, as `hub-map.json` set the precedent). The tool list is generated from `actions.json`
  entries marked `surface: server | both` (new optional `ActionDef.surface`, default `page`; `params` become JSON
  Schema); permissions are enforced server-side and writes append the page's `audit_log` rows. Two auth doors:
  developer keys (D-0018) for staff, machines and IDEs; OAuth 2.1 (PRM, PKCE S256, CIMD first, DCR fallback,
  `resource`) on Supabase Auth for consumer clients. Phase 0 is a read-only demo over the seed, writes answer "not wired
  yet". In the page, `src/actions/webmcp.ts` registers the mounted actions as `document.modelContext` tools (Chrome
  origin trial), no server. Directory listings (Anthropic, OpenAI, the MCP Registry, Gemini CLI, Grok Build, Cursor,
  Muse) are packaging of that one server. Paying stays a person's click.
- **Alternative rejected.** One MCP server per marketplace or per studio (N copies of the same tools, N auth reviews); a
  hand-written tool list separate from the actions registry (two vocabularies drift; the voice controller and the
  agents would disagree); GPT Actions / custom GPTs (being retired); building the server inside the GitHub Pages app
  (static hosting has no process, and the page's `run()` needs a signed-in browser).

---
**Resumen (ES).** Este archivo es la lista corta y citable de las decisiones de ingeniería, una por
bloque, solo se añade: una decisión que deja de ser cierta se reemplaza con un bloque nuevo, nunca
borrando el viejo. Las decisiones que todavía tiene que tomar el estudio están en `/#/manual/decisions`.

