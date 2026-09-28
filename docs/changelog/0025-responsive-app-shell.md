version: 0.10.0
date: 2026-09-28
prompt: docs/prompts/0025-responsive-app-shell.md
intent: Justin: "make sure the app and registration experience is proper responsive. Right now on desktop, as we're working through the reserve and register proecess it switches from the desktop experience to mobile. It should all flow as one experience. Also, mobile is currently living in a mockup of a phone. now we need to start getting this stuff all production ready please."
decision: One responsive AppShell for the customer and teacher apps, full-viewport at every width with no phone bezel (D-0006). Below 900 px it is a content column with the bottom dock. From 900 px it is a top-bar nav over a centred --w-app container, and the bezel survives only in the hub's DeviceFrame simulator. The --ui large-screen band moves to :root, with rem spacing, one BREAKPOINTS list and a 44 px control floor (D-0007, supersedes D-0004's deferral). The reserve and register pages get a desktop pass (two columns, plan grid, ?plan= preselect), AuthShell shares the top bar, bottom sheets become centred dialogs from 900 px and the website fonts load through a <link>. Seven WebMCP actions cover the flow. **Minor bump to 0.10.0 because the change is visually breaking**: every /app and /teach page looks different on desktop, and every 1280 capture of those pages is out of date.
rejected: (1) Keeping the phone frame behind a toggle or a "desktop mode" switch. The mockup would stay the default, and the flow would still jump widths at each hand-off. (2) A separate desktop route tree (/app vs /desktop/app, or DesktopShell above 900 px). That doubles the routes and specs, and the sidebar shell is staff tooling, not a member experience. The nav items already come from RouteDef.nav, so one shell can draw them two ways. (3) CSS container queries only, with no shell change. Queries can collapse grids inside the column, but they cannot remove the frame, move the nav out of the dock or widen the column past 430 px. The 0019 `phone` container was retargeted to `app` and kept for grid collapse. (4) CSS zoom for the 4K band (engine differences in vh and getBoundingClientRect, and it breaks the DeviceFrame maths), and per-surface --ui copies (they drift).
files: CLAUDE.md; README.md; ROADMAP.md; index.html; package.json; package-lock.json; scripts/screenshots.mjs; docs/{architecture.md,decisions.md,design-system.md,kanban.md,README.md}; docs/reference/surfaces.md; docs/prompts/0025-responsive-app-shell.md; docs/changelog/0025-responsive-app-shell.md; docs/pages/{C-01,C-02,C-04,C-06,C-08,A-02,A-03,A-05,W-04,S-03}.md; src/app/shells.tsx; src/design/{tokens.ts,tokens.css}; src/layout/useMinWidth.ts (new); src/styles/global.css; src/components/atom/{Button,Chip,Input,Toggle}/*.css; src/components/molecule/{ClassRow,LangToggle,SegmentedControl}/*.css; src/components/molecule/RoleSwitcher/RoleSwitcher.{css,meta.ts}; src/components/organism/{Drawer,NavBar,TopBar}/*; src/components/organism/{MatPicker,SessionCalendar}/*.css; src/components/template/AppShell/* (new); src/components/template/PhoneShell/* (deleted); src/components/template/DesktopShell/DesktopShell.css; src/modules/hub/{hub.css,useUiScale.ts}; src/modules/customer/{actions.ts (new),split.tsx (new),specs.ts,HomePage.tsx,customer.css}; src/modules/customer/auth/{AuthShell,SignInPage}.tsx; src/modules/customer/pages/{BookedPage,CheckoutPage,IntentionPage,PlansPage,SchedulePage}.tsx; src/modules/teacher/specs.ts; src/modules/website/sanctuary.css
codes: C-01 C-02 C-04 C-06 C-08 C-08b C-21 A-01 A-02 A-03 A-05 E-04 W-04 W-05 S-03 HUB-01 D-01 D-02 D-06

The branch is `claude/responsive-app-shell`, from `main` at `d4c567e`. It also merges `claude/docs-0024-backfill`
(prompt and changelog 0024, docs only; see `docs/changelog/0024-website-v2-backfill.md`). `npm run build` passed
before every commit that touches `src/`. Model routing: Fable 5.1 built the first five commits (architecture, shared
code and pages). Opus 5.5 wrote the actions, the release commit and the docs.

**History note (append-only files are not edited).** `docs/changelog/0006-visual-fidelity.md` (the canvas phone
frame from 900 px) and `docs/changelog/0019-app-store-readiness.md` (the phone frame as a CSS container) describe
the desktop phone frame as intended behaviour. That was true when they were written. **It is superseded by this
entry and D-0006**: from 0.10.0 there is no phone frame outside the hub's `DeviceFrame` simulator, and the 0019
container is now the `AppShell` column (`container: app`). The live docs (kanban, ROADMAP, README, CLAUDE.md,
architecture, design-system) were re-worded instead.

## Breakpoint tokens, global `--ui` band, `RouteDef.layout`-aware shells (`f7f3c93`)

prompt intent: large screens and the shell contract (plan tasks 1 and 3).
decision: `BREAKPOINTS` (360 · 390 · 768 · 900 · 1280 · 1920 · 2560 · 3840), `CHECK_WIDTHS` and `UI_SCALE` in
`tokens.ts`. `--ui` (1 · 1.125 ≥ 1920 · 1.375 ≥ 2560 · 1.75 ≥ 3840) moves from `.hub` to `:root` and drives
`html { font-size: calc(100% * var(--ui)) }`. Spacing, control-height and layout-width tokens become rem, so type,
spacing and containers scale together. New tokens: `--w-app` 75rem, `--w-auth`, `--w-auth-wide`, `--h-ctl`. The hub
drops its rem-token multipliers and keeps its px ones. `useMinWidth(name | px)` is a new matchMedia hook, initialised
synchronously so there is no first-paint flash. `withShell()` honours `RouteDef.layout`: `mobile` → app shell,
`desktop` → DesktopShell, `auto` → the surface default. D-0006 and D-0007 are recorded, and the CLAUDE.md Shells
bullet is corrected.
rejected: CSS `zoom` on the root; root-font scaling without rem spacing (type grows, gaps do not); per-surface bands.
files: CLAUDE.md; docs/decisions.md; src/app/shells.tsx; src/design/tokens.{ts,css}; src/layout/useMinWidth.ts; src/modules/hub/{hub.css,useUiScale.ts}
codes: HUB-01, D-01, D-06 (verified unchanged at 1280, scaled at 3840); every C-*, S-03 and A-* page through the shell selector.

## 44 px control floor (`ce62a61`)

prompt intent: production-ready targets on every input (touch, pen, TV remote next).
decision: `--h-ctl` (2.75rem) plus a global `button` / `input` / `select` floor. The floor is applied to Button (all
sizes), Input, select, clickable Chip, SegmentedControl, the top-bar and drawer icon buttons, LangToggle, Toggle,
ClassRow, the nav items, the DesktopShell sidebar links and rail, and the SessionCalendar toolbar. The inline
text-buttons `.cust-linkbtn` and `.cust-plainbtn` are exempt. The grid container query is renamed `phone` → `app`.
This closes the 0022 kanban card "Lift design-system control heights to 44 px system-wide". The hub's own
"pointer targets" override is now redundant but has not been deleted yet (kanban).
rejected: not recorded for this commit beyond D-0007. 0022 had deferred the system-wide bump because it moves every route and capture at once, and this pass accepts that cost.
files: src/components/atom/{Button,Chip,Input,Toggle}/*.css; src/components/molecule/{ClassRow,LangToggle,RoleSwitcher,SegmentedControl}/*.css; src/components/organism/{Drawer,NavBar,SessionCalendar,TopBar}/*.css; src/components/template/DesktopShell/DesktopShell.css; src/modules/customer/customer.css; src/styles/global.css
codes: C-*, S-*, M-*, D-*, W-04 (shared atoms).

## `PhoneShell` → responsive `AppShell` (`5eec767`)

prompt intent: "mobile is currently living in a mockup of a phone".
decision: `template/AppShell` (new, with meta) replaces `template/PhoneShell` (deleted; D-02 count unchanged at 73).
Below 900 px it keeps the brand top bar, the column of at most 560 px and the sticky dock. From 900 px it is
full-viewport: `TopBar` gains a `nav` slot, `NavBar` gains `variant="top"`, and content sits in the `--w-app`
container with document scroll. The dock and the top nav are never rendered at the same time (one `<nav>` in the
accessibility tree). The DeviceFrame iframe (390 × 844 with `chrome`) keeps showing a true phone in HUB-01 and D-06.
The design-system frame-token rows now say "simulator only".
rejected: rendering both navs and hiding one with CSS; choosing PhoneShell or DesktopShell per viewport.
files: docs/{architecture.md,design-system.md}; scripts/screenshots.mjs (comments); src/app/shells.tsx; src/components/molecule/RoleSwitcher/RoleSwitcher.{css,meta.ts}; src/components/organism/{NavBar,TopBar}/*; src/components/template/AppShell/*; src/components/template/PhoneShell/* (deleted); src/modules/customer/customer.css; src/modules/teacher/specs.ts
codes: C-01…C-26, A-05, A-06, E-01…E-03, S-03; HUB-01 and D-06 verified.

## Desktop pass on the reserve and register pages (`f5025d4`)

prompt intent: "it switches from the desktop experience to mobile. It should all flow as one experience."
decision: `SplitSections` (new, `src/modules/customer/split.tsx`) renders flat below 900 px, exactly the phone order.
From 900 px it groups sections into a main column and a side column by a name rule and keeps the layout editor's
order inside each column. The rules: C-04 has `ClassSummary` (and the MatPicker) on the left and payment plus the
confirm button on the right. C-01 has the greeting across the top, then next class and today on the left, and
membership, notice, quick actions, stats and feedback on the right. C-08 has the countdown and the class on the left.
C-06 shows both cycles side by side, hides the cycle toggle and reads `?plan=<id>` (the plan is preselected and its
confirmation opens), which closes the dropped hand-off from W-05. A-05 is one row of four, and the C-02 filter chips
wrap instead of being clipped. MatPicker `.mat-teacher` is set to 15rem.
rejected: CSS grid with a per-section `grid-column` (rows would align across the columns and leave gaps).
files: src/components/organism/MatPicker/MatPicker.css; src/modules/customer/{HomePage.tsx,customer.css,split.tsx}; src/modules/customer/pages/{BookedPage,CheckoutPage,IntentionPage,PlansPage}.tsx
codes: C-01, C-02, C-04, C-06, C-08, A-05.

## AuthShell on the top bar, bottom sheets as dialogs, fonts via `<link>` (`c152238`)

prompt intent: the width jumps between the website, sign-in and the app, plus "production ready".
decision: `AuthShell` renders `TopBar` (wordmark, language, 44 px theme button) over a 480 px column that grows to
576 px at 900 px. `Drawer side="bottom"` is a centred dialog from 900 px by default, and `desktop="sheet"` opts out.
The meta gains the prop, its states and a usage. This covers the W-04 reserve sheet, C-04 success, C-06 confirm,
C-08b change and C-02 filters. The Sanctuary edition's Cormorant Garamond moved from `@import` in `sanctuary.css` to
a `<link>` in `index.html`. The `@import` made Vite's CSS preload fail, which blanked the whole website chunk whenever
Google Fonts was unreachable.
rejected: not recorded for this commit beyond D-0006, which rejects keeping the frame and choosing shells per
viewport. Self-hosting the fonts stays on the existing kanban card for vendoring Inter and DM Sans.
files: index.html; src/components/organism/Drawer/{Drawer.tsx,Drawer.css,Drawer.meta.ts}; src/modules/customer/auth/AuthShell.tsx; src/modules/customer/customer.css; src/modules/website/sanctuary.css
codes: A-01, A-02, A-03, C-21, E-04, W-04, W-05, C-02, C-04, C-06, C-08b.

## WebMCP actions for the reserve and register flow (`2f56f54`)

prompt intent: the org standard is that every page declares its actions (id, intent phrase, permission), and the
actions registry is the WebMCP and voice vocabulary.
decision: seven actions in `src/modules/customer/actions.ts` (`CUSTOMER_ACTIONS`), merged into the page specs in
`specs.ts` and mounted by each page with `useActions()` through the existing registry, with no change to `src/actions/`:
`app.reserve` (C-02), `app.pickMat` and `app.confirmReservation` (C-04), `app.choosePlan` (C-06), `app.goHome` and
`app.openSchedule` (C-01, C-02, C-04, C-06, C-08) and `auth.signIn` (A-02). Every intent is `{es, en}`. `permission`
is advisory, as on HUB-01, and the route roles decide whether a handler is mounted. `app.confirmReservation` refuses
when a pass would be charged, and `app.choosePlan` only opens the confirmation, so paying stays a person's click.
`CheckoutPage.confirm` now resolves its outcome, so the action can say `booked boo_…` or give the reason. Checked in
Chromium: sign in → open the schedule → reserve → pick a mat → confirm → a booking row and the success dialog;
choosing a plan opens its dialog. There were no registry warnings. `PageSpec.checkedAt` is `[390, 1280, 3840]` on
C-01, C-02, C-04, C-06, C-08, A-02 and A-05.
rejected: a shell scope in the registry so the navigation actions are declared once. That is a registry refactor
(`listActions()` only reads route specs), so they are declared on five specs instead and the gap is a kanban card.
files: src/modules/customer/{actions.ts,specs.ts,HomePage.tsx}; src/modules/customer/auth/SignInPage.tsx; src/modules/customer/pages/{BookedPage,CheckoutPage,PlansPage,SchedulePage}.tsx
codes: C-01, C-02, C-04, C-06, C-08, A-02, A-05.

## Release 0.10.0 and docs (`3f3f00c`, `c3e14c8`, `ef2f417`, this entry)

decision: package.json and package-lock.json go from 0.9.4 to 0.10.0. The in-app version is the HUB-01 brand-band
badge and footer line, which read `package.json` (`pkg.version`), so nothing else in `src/` carries a version. README
(version line and perspective table), ROADMAP §A, the kanban header and `docs/README.md` all say 0.10.0. The kanban
gets a 2026-09-28 Done section and "0025 follow-up" cards. The 0006 PhoneShell card and the 0022 `--ui` / 44 px /
actions cards are struck through with a pointer here. Page docs for C-01, C-02, C-04, C-06, C-08, A-02, A-03, A-05,
W-04 and S-03 gain a "Responsive layout (0025)" section, and the pages with actions gain an "Actions (WebMCP)"
table. `docs/reference/surfaces.md` is re-dated 2026-09-28. `docs/README.md` has a start-here block covering
D-0006/D-0007, 0024/0025 and the 360–3840 / 44 px standard.
files: package.json; package-lock.json; README.md; ROADMAP.md; docs/kanban.md; docs/README.md; docs/reference/surfaces.md; docs/pages/*.md (10); docs/prompts/0025-responsive-app-shell.md; docs/changelog/0025-responsive-app-shell.md

## Screenshots

No captures were committed in this pass. The build's before/after PNGs (390 · 1280 · 3840 for C-04 and C-06, plus
step captures of C-01, C-02, C-08, A-05, A-02, S-03, W-04, HUB-01 and D-06) were review material. The committed 1280
JPEGs of the /app and /teach pages still show the phone frame until the screenshot pass regenerates them (kanban:
"Screenshot matrix 360 → 3840").

[screenshot: C-04 — checkout at 1280, two columns, no phone frame]

[screenshot: C-06 — plans at 1280, both cycles side by side, ?plan=annual preselected with its dialog open]

## Review and QA fixes (`c62033e`, `87df53e`, `6c4f7d3`, `d6c36c5`, `9772100`)
intent: the code review of the branch (one blocker, five should-fix, nits) and the 360–3840 QA matrix
(`docs/qa/responsive-2026-09-28.md`) before the PR leaves draft.
decision:
- **Chip** (`c62033e`, blocker): the four `.chip-X .chip-dot` colours are scoped again; the 44 px pass had left
  unscoped `.chip-dot` rules (every dot grey) and `.chip-X button.chip` selectors that matched nothing.
- **D-01** (`87df53e`): `m-deep` exists (light `28,46,66`, dark `20,34,50`), so the dark top bar and site
  header are opaque. `fs-floor` (0 px up to 1919 px, 16 px in every `--ui` band, via `UI_SCALE.minText`) is folded
  into `fs-2xs` / `fs-xs` with `max()`: eyebrows and captions never compute under 16 px on a large screen (G3),
  phones and desktops keep 11 / 12 px. `w-phone` is gone (DeviceFrame has its presets). `TopBar` brand link and
  `LangToggle` buttons are 44 px targets (G1); dead `calc(--h-ctl - n)` floors removed. `SessionCalendar` week
  and month text uses the tokens instead of 10–12 px, grid minimum widths in rem (I-03).
- **Drawer** (`6c4f7d3`): focus trap (Tab / Shift+Tab cycle inside), `body { overflow: hidden }` while open,
  `onClose` in a ref so inline callbacks do not re-run the effect (the effect re-captured the dialog as the opener
  and re-focused it on every parent render, e.g. while paying), focus returns to the trigger, Escape closes only
  the innermost dialog. States and a11y in the meta.
- **Customer** (`d6c36c5`): C-04's confirm bar is static in the right column from 900 px (I-08) and an opaque
  theme-correct sticky bar below (I-07); `MatPicker` mats are 44 px targets and a room row of 8 wraps to two rows
  of 4 under ~380 px (container query, `--mat-cols` / `--mat-cols-narrow`) (I-06); picker width in rem (I-09);
  C-02 renders one calendar (the `WeekGrid` block only renders on the week route) (I-02); `SplitSections` decides
  the columns from what rendered, so an all-null side renders no empty column, and `.cust-split-side` is its own
  `app` container so `StatsRow` collapses to its width.
- **Website** (`9772100`, `b431757`): header heights and controls in rem / `--h-ctl` (44 px targets, scale with `--ui` from
  1920 px: G4 header); below 600 px the edition select and motion toggle move into the open menu
  (`.site-nav-tools`) so the header fits at 360 / 390 with no overflow (I-14, I-15); the W-05 teacher grid is
  `minmax(15rem, 1fr)` with whole-word wrapping (I-16).
rejected: a `position: fixed` confirm bar with reserved page padding (its height varies with the notices it carries,
so the reserved space would be wrong whenever one shows); `<dialog>.showModal()` for the trap (would change the
portal/animation model of every Drawer caller); a fluid `clamp()` for the caption sizes (would move the 1280 layout;
the floor only acts from 1920 px); `zoom` or per-page px multipliers for the site header (the rem route is D-0007).
files: src/components/atom/Chip/Chip.css; src/components/molecule/{LangToggle,SegmentedControl}/*.css;
src/components/organism/{Drawer,MatPicker,SessionCalendar,TopBar}/*; src/design/tokens.{ts,css};
src/modules/customer/{customer.css,split.tsx,pages/SchedulePage.tsx}; src/modules/website/{site.css,sanctuary.css,SiteShell.tsx};
docs/qa/responsive-2026-09-28.md; docs/screenshots/{C-01,C-02,C-04,W-04,W-05,P-01}/* (re-captured at 360–3840);
docs/kanban.md; this entry; docs/prompts/0025-responsive-app-shell.md.
codes: C-01 C-02 C-02b C-04 C-06 C-08 C-08b A-02 W-01…W-05 P-01 D-01 D-02 M-03.
verification: `npm run build` green, `npm run test:dates` and `scripts/test-mat-bookings.mjs` pass; re-captures at
360 / 1280 / 3840 inspected for C-04, C-02, W-04, W-05.

## Deferred

- The tablet band (768–899 px) still uses the 560 px column.
- Website controls outside the header (`.site .btn` in the body, P-01's `a.btn` links) are under 44 px; the header
  controls and the W-04 `.site-actions` overflow were fixed in the review round above.
- QA matrix items deferred with kanban cards: inline text links under 44 px (G2), Sanctuary body copy in px and the
  1360 px column at 4K (G4 body), C-02 chip row and week/month grids as scroll regions on phones (I-04, I-05), ES
  copy nits (I-05b), C-01 empty lower half at 4K (I-10), C-08 countdown ring in px (I-11), avatar initials and the
  A-03 checkbox hit area (I-12, I-13).
- Actions beyond the hub and this flow, and a shell scope for the navigation actions.
- Real auth is gated on Supabase.
- DesktopShell `useNarrow()` should become `useMinWidth`.
- `AppShell bare` hides the desktop nav.
- MatPicker heights should be rem.
- The full 360…3840 capture matrix and `checkedAt`.

All of these are on the kanban Backlog as "0025 follow-up" cards.

**Resumen (ES).** 0.10.0: la app de clientes y profesores deja el marco de teléfono en escritorio (D-0006), la escala
`--ui` y los controles de 44 px aplican a todo (D-0007). Reservar y registrarse fluye igual del sitio a la app, y
hay siete acciones WebMCP para ese flujo. Las entradas 0006 y 0019 describen el marco como intención, y esta entrada
las reemplaza sin editarlas.
