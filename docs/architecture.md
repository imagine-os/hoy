# Architecture

## One app, six surfaces
`public` (website), `customer`, `teacher`, `staff`, `admin`, `dev`, plus `docs`. Every route
declares its `surface`, `roles` and `layout` (mobile | desktop | auto). The hub at `/#/` is the
entry point for testers.

## Module registry
`src/modules/<name>/index.ts` exports `{ routes: RouteDef[], strings: StringTable }`.
`src/app/registry.ts` collects all modules with `import.meta.glob('../modules/*/index.ts', { eager: true })`
and exposes them through **lazy getters** `getRoutes()` / `getStrings()`. They are lazy
because modules (dev tools, shells) import the registry too; reading `m.routes` at module-evaluation time
would hit an ESM cycle (TDZ). Call the getters inside functions or components, never at a module's top
level. Adding a page never touches a shared file.

```ts
type RouteDef = {
  path: string;                 // hash path, e.g. '/app/schedule'
  element: React.ReactNode;
  spec: PageSpec;               // inspector content; required
  roles: Role[];                // who may enter; 'public' = anyone
  surface: 'public' | 'customer' | 'teacher' | 'staff' | 'admin' | 'dev' | 'docs';
  layout?: 'mobile' | 'desktop' | 'auto';
  nav?: { labelKey: string; icon: string; order: number; group?: string }; // shows in the shell nav
};
```

### Code splitting (0.7.1)
A module's `index.ts` still exports `{ routes, strings }` synchronously, but its page components live in a
`pages.ts` barrel that `src/app/lazyPage.ts` imports on first visit (`React.lazy`; the single `<Suspense>` sits
around `<Routes>` in `App.tsx` and renders `.lazy-fallback`). Rollup dedupes the dynamic import, so each surface
is one chunk. The markdown under `docs/` follows the same idea: `scripts/lib/docmeta.mjs` is a Vite plugin that
serves `*.md?docmeta` (title, header meta, headings, decisions) at build time, and each body is fetched as its own
`?raw` chunk when a page opens it (`docsIndex.ts` `useDocSource`, `manualIndex.ts` `useChapterBody`). Main chunk:
796 kB (2 549 kB before).

## Page specs
`src/specs/canvasSpecs.ts` holds every canvas code as a `PageSpec` (purpose, layout order, data
tables, roles, logic, integrations, states, toggles, notes, canvasRef). The inspector panel reads the
spec of the current route. New pages add a spec next to their route. Two optional fields carry the
newer contracts: `actions` (below) and `checkedAt`, the viewport widths the page has been checked at.

## Design system
`src/design/tokens.ts` → `tokens.css` (CSS custom properties). Themes via `[data-theme=light|dark]`,
skins via `[data-skin=wireframe]`. Components use only tokens.

## Components
`src/components/<tier>/<Name>/<Name>.tsx` + `.meta.ts`. `src/design/library.ts` collects metas with
`import.meta.glob`, and `/#/dev/components` renders every meta with its states.

## Data
`DataProvider` interface (`list/get/insert/update/remove/subscribe`). `MockProvider` seeds from
`src/data/seed/*` into localStorage and emits change events (simulated realtime). `SupabaseProvider`
is a stub with the same interface. `tableRegistry` describes every table's columns for the table manager.

### Communications seam (0.8.0)
`message_log` is the **single record of every conversation** with a person: WhatsApp and email in both directions
(`direction` inbound · outbound · internal; `source` manual · automation · newsletter · system), the staff's internal
notes (`channel note`), the team's read receipt (`read_at` / `read_by`) and the provider's message id
(`external_id`). No page inserts into it directly: `src/data/comms.ts` is the seam — `useMessaging()` writes
(WhatsApp, email, note, mark read; WhatsApp is `queued` during M-08 quiet hours), `useConversations()` /
`useUnreadInbound()` read (one thread per `user_id`, unread first; test sends excluded by `payload.test`). The M-06
Conversación tab, the S-06 inbox, the shell's bell (`InboxPopover`) and the S-01 card all sit on those hooks and
share `MessageThread` / `ChatBubble` / `MessageComposer` / `ConversationList`. A real adapter plugs in at two
points and changes no page: `SupabaseProvider` carries the same inserts / updates, and the WhatsApp Cloud API /
email webhooks insert `direction = inbound` rows and update `status` / `external_id` on the outbound ones. Rows with
`user_id` null (a teacher's substitution request) belong to the team and stay out of every customer thread.
`MockProvider.SEED_VERSION` is bumped whenever a column is added, so a stored demo db is reseeded instead of
missing it.

### Analytics seam (0040)
Every practice number — a member's weekly streak, "clases tomadas este mes", the studio's fill and attendance rates,
a teacher's new faces — is **derived** from the raw tables, never stored: `src/data/analytics.ts` is the pure
module (no React, no provider) and `src/data/useAnalytics.ts` its hooks (`usePracticeStats` / `useMemberPractice`
for C-01, C-27 and M-06, `usePracticeStats` also for C-22; `usePracticeGoal` to set or clear the goal; `useMilestoneRecorder` to write the record;
`useStudioStats` / `useTeacherStats` for M-12 and S-03). Inputs: `bookings` × `class_sessions` (a visit is a
`checked_in` booking dated by the **session's** start, never the booking's `created_at`), `memberships` (pauses,
who is entitled), `class_ledger` (the classes left in each package; `credits` until 0051) and `practice_goals` (the target, one active row per person; a new
goal ends the old one so history survives). `activity_events` is an append-only record the app writes for the
member's timeline (goal set, milestone reached, rest week that saved the streak…); no metric reads it. The streak,
in three lines: weeks run Monday–Sunday in local time and a week is met when visits ≥ the member's target (target 0
= no streak, counts still shown); the current week never breaks the streak and counts once met; one missed week per
rolling four is forgiven when there was practice in the four before it, a paused membership week is skipped, and two
misses (or a miss with no grace) reset the run while `best` stays. Rules and edge cases are proven by
`npm run test:analytics`. Goals are history — a change ends the active `practice_goals` row rather than editing it — and
`practiceStats()` receives every row of the person, so each past week is judged by the goal that was in force when it
closed (the latest row with `starts_on` ≤ that week's Sunday; rule 8, D-0015): raising a goal never rewrites past
weeks. Research, glossary and the thresholds M-12 uses: `docs/reference/analytics.md`;
decisions D-0014 / D-0015.

## Actions registry (0.9.0)
`src/actions/` is the one way a page says what it can be asked to do. A page **declares** its actions
in its `PageSpec.actions` — `{ id, label{es,en}, intent{es,en}, params?, permission? }`, id shaped
`<page>.<verb>` — and **mounts** handlers for the same ids with `useActions(spec, handlers)`.
`listActions()` walks every routed spec, so the whole vocabulary is readable from any page (each
entry carries its page code, route and a live `mounted`), and `run(id, params)` invokes a mounted
handler and resolves `{ ok, message }` without ever throwing. `src/app/manifest.ts` publishes both on
`window.__hoyos` — that is the WebMCP surface, and the vocabulary the voice controller will speak.
The inspector renders a page's actions as its own section. `permission` is declared, not enforced:
the control it drives is already role-gated, and enforcement belongs to the server that will proxy
these. Contract and current inventory: `docs/reference/surfaces.md`.

## Frame session (0.9.0)
A page can be embedded in a same-origin iframe and told which session to run under, through the hash
query: `#/app?as=customer&lang=en&theme=dark&dev=0&live=0`. `src/app/frameSession.ts` runs before
`createRoot().render()` (the providers read their key in a `useState` initialiser) and, only when the
document is framed and the query asks for it, patches `Storage.prototype.getItem/setItem/removeItem`
for exactly three keys — `hoyos.session`, `hoyos.lang`, `hoyos.theme`. Reads answer from the frame's
values, writes are swallowed, every other key passes through. So a preview runs as Juliana while the
tester stays super admin, and nothing a framed page does can reach the tester's own session. The same
module owns `liveFramesAllowed()`: no frames inside a frame, none with `live=0`, and none under
`navigator.webdriver`, which is what makes a screenshot of HUB-01 deterministic. Consumers:
`DeviceFrame` and `PagePreview` (HUB-01, D-05, D-06).

## Layout editor
`useLayout(spec)` returns the section order stored in `page_layouts` (or the spec default). The
editor at `/#/dev/layout/:code` reorders with dnd-kit and persists through the provider.

## Shells
`AppShell` (customer, teacher: content column + bottom dock below 900 px, full-viewport page with top-bar nav from 900 px — no phone bezel, D-0006) and `DesktopShell` (staff, admin, dev, docs: sidebar). `withShell()` honours `RouteDef.layout`.

## Deployment
GitHub Actions → GitHub Pages from `dist/`. HashRouter avoids server routing.
