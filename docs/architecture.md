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
spec of the current route. New pages add a spec next to their route.

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

## Layout editor
`useLayout(spec)` returns the section order stored in `page_layouts` (or the spec default). The
editor at `/#/dev/layout/:code` reorders with dnd-kit and persists through the provider.

## Shells
`PhoneShell` (bottom nav, mobile-first) and `DesktopShell` (sidebar, desktop-first). Both responsive.

## Deployment
GitHub Actions → GitHub Pages from `dist/`. HashRouter avoids server routing.
