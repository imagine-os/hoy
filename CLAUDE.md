# Project rules — HOY Wellness Center

## Component library is a living inventory
The component library (D-02 in `Hoy Wellness System.dc.html`) must stay current at all times.
Whenever a new UI element, variant, or state is introduced anywhere in the system:

1. Add it to D-02 under the correct atomic tier (atom / molecule / organism / template / page).
2. Show its states: default, hover, active, focus, disabled, loading, empty, error — whichever apply.
3. Never leave a component in a screen that is absent from the library, and never leave a library
   entry that no screen uses; if a component is retired, remove it and note it in the changelog.
4. Do this in the same turn as the work, not afterwards.

## Documentation rules
- Every change is logged in the knowledgebase changelog (K-01) with: prompt intent, decision taken,
  alternative rejected, files touched, version.
- The kanban board is updated in the same turn as the work.
- Design tokens, materials, shadows and radii live in D-01; nothing invents a new value off-canvas.

## Language
Every user-facing string exists in Spanish and English. Spanish is required, English falls back to Spanish.

---

# HoyOS — engineering rules (extends the rules above)

In this repo, D-01 = `src/design/tokens.ts` (rendered at `/#/dev/tokens`), D-02 = the `*.meta.ts`
files collected by `src/design/library.ts` (rendered at `/#/dev/components`), K-01 = `docs/kanban.md`
+ `docs/changelog/` (rendered at `/#/dev/knowledgebase`). The canvas file in `reference/canvas/` is
frozen reference material; the code is the source of truth from now on.

## Stack (decided)
Vite 5 + React 18 + TypeScript (strict), `react-router-dom` v6 with **HashRouter** (GitHub Pages),
plain CSS with design tokens as CSS custom properties (no Tailwind, no CSS-in-JS),
`@dnd-kit/core` + `@dnd-kit/sortable` (layout editor), `react-markdown` (in-app docs).
`vite.config.ts` uses `base: './'`. App lives at the repo root. Keep dependencies minimal; adding
one needs a changelog entry with the alternative rejected.

## Folder map
```
src/
  app/          App.tsx, router, registry.ts (collects modules), providers
  auth/         roles.ts, permissions, demoUsers.ts, SessionProvider, RequireRole
  components/   <tier>/<Name>/<Name>.tsx + <Name>.meta.ts (+ optional <Name>.css)
                tiers: atom | molecule | organism | template
  data/         schema.ts (tables + tableRegistry), DataProvider, MockProvider, SupabaseProvider, seed/
  design/       tokens.ts (D-01 source of truth), tokens.css (generated), library.ts, ThemeProvider
  dev/          InspectorPanel, SpecChip, dev-only tooling
  i18n/         core strings, useT, LangToggle wiring
  layout/       useLayout(spec) — stored page section order
  modules/      <module>/index.ts exporting { routes, strings } — one folder per surface/feature
  specs/        types.ts (PageSpec, RouteDef), canvasSpecs.ts (every canvas code)
  tenant/       tenant.ts — the ONLY place the studio name, address, capacity, hours are written
  styles/       global.css, reset
docs/           human docs, prompt log, changelog, kanban, screenshots (rendered in-app at /#/docs)
reference/      frozen source material (canvas, brand manual pages, pricing deck, sketches)
public/brand/   wordmarks used by the app
supabase/       schema.sql draft mirroring src/data/schema.ts
scripts/        screenshots.mjs and other tooling
```

## Extension points (do not bypass)
- **Routes**: a module is `src/modules/<name>/index.ts` exporting `{ routes: RouteDef[], strings: StringTable }`.
  `src/app/registry.ts` picks it up with `import.meta.glob`. Nobody edits a central route file.
- **Specs**: every `RouteDef` carries a `PageSpec` (`spec: canvasSpecs['C-01']` or a new one). No route without a spec —
  the inspector panel (`Ctrl+.` in dev mode) reads it. New pages get a new code in their family
  (C-xx customer, S-xx staff, M-xx admin, D-xx dev, P-xx public, E-xx edge states, K-xx knowledge).
- **Components**: `src/components/<tier>/<Name>/<Name>.tsx` + `<Name>.meta.ts`. **No component without a meta,
  no meta without a usage.** The meta lists props, states and at least one usage render function;
  `/#/dev/components` renders it. Reuse before you create; improve the shared one rather than forking.
- **Strings**: every user-facing string is `{ es, en }` in the module's `strings` export and read with `useT()`.
  Spanish is required; English falls back to Spanish; a missing key renders `⟨key⟩` and warns in dev.
  Keys are namespaced `module.section.key`.
- **Data**: pages read/write through `useData()` (the `DataProvider` interface), never through the seed directly.
  Every table has `id, tenant_id, created_at, updated_at`. New tables go in `src/data/schema.ts`
  AND `supabase/schema.sql` AND `docs/data-model.md`, in the same turn.
- **Layout order**: sectioned pages render through `useLayout(spec)` so the layout editor (`/#/dev/layout/:code`)
  can reorder them.
- **Shells**: mobile-first `PhoneShell` (customer, teacher) and desktop-first `DesktopShell` (staff, admin, dev).
  Both are responsive; pick by `RouteDef.layout`.

## Multi-tenant rule
`tenant_id` on every table and every seed row. No hardcoded studio name, address, capacity, hours or
prices outside `src/tenant/tenant.ts` and `src/modules/website/pricing.ts`. Copy that says "HOY"
in a user-facing string reads the tenant name from config.

## Roles
`super_admin, admin, coordinator, front_desk, finance, teacher, maintenance, customer, public`
(`src/auth/roles.ts`). Dev mode (inspector, spec chip, layout editor) is only available to `super_admin`.
A super admin can "view as" any role with dev tooling on or off.

## Documentation and prompt log (mandatory, same turn as the work)
1. Every prompt goes in `docs/prompts/NNNN-slug.md` verbatim (strip Slack `<@U…>` tokens), with a
   "Response" section summarising what was built.
2. Every change gets `docs/changelog/NNNN-slug.md` (K-01 format: version, date, prompt intent,
   decision, alternative rejected, files touched).
3. `docs/kanban.md` is updated in the same turn.
4. Screenshots: every page in ES and EN, mobile (390) and desktop (1280); light and dark for key pages.
   Stored under `docs/screenshots/<page-code>/…` and referenced from the page's doc. Regenerate with
   `npm run screenshots`. See `docs/rules/documentation.md`.

## Commit conventions
Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`). One logical change per commit.
Commit message body names the page codes touched. Never commit secrets or real personal data;
demo users and seed data are fictional.

## How to run
```
npm i
npm run dev          # http://localhost:5173/#/
npm run build        # tsc --noEmit + vite build → dist/
npm run screenshots  # Playwright, Chromium at /opt/pw-browsers (do not run playwright install here)
```
`npm run build` must pass with zero TypeScript errors before any commit that touches `src/`.

## GitHub Pages
`.github/workflows/pages.yml` deploys `dist/` on push to `main`. HashRouter means every route is
`/#/path`, so no 404 fallback is needed. `base: './'` keeps assets relative. Live URL:
`https://imagine-os.github.io/hoy/` (Pages must be enabled once in repo settings → Pages → GitHub Actions).

## Integrations roadmap (design for these, do not fake them)
- Supabase: auth, Postgres, realtime (`SupabaseProvider` replaces `MockProvider`; same interface).
- Wompi: payments and payroll (Colombia). Manual cash/transfer always remain an option.
- WhatsApp: CRM threads, OTP, automations (`wa_templates`, `automations`, `message_log`).
- Email designer: `email_templates` with versions; receipts, reports, push.
- Later: marketing, social, content tools; multi-tenant sale to other studios.
