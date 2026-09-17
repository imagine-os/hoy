# HOY OS — Architecture

> Read this before writing any code in this repository. It is also the brief
> that parallel agents work from.

---

## 1. What this is

**HOY OS** is the operating system for HOY Human Club, a wellness studio in
Colombia — and, by construction, for any wellness studio after it. It contains
five deliverables that share one design system and one data model:

| # | Deliverable | Path | Audience |
|---|---|---|---|
| 1 | **Public website** | `src/apps/site/` | Everyone, logged out |
| 2 | **Customer app** | `src/apps/customer/` | Students — mobile first |
| 3 | **Staff apps** | `src/apps/staff/` | Front desk, teachers, coordinator — desktop first |
| 4 | **Admin system** | `src/apps/admin/` | Admin, finance, super admin |
| 5 | **Operations manual** | `ops-manual/` | Everyone who works at the club |

Plus two systems that serve the build itself:

| | System | Path |
|---|---|---|
| 6 | **Documentation system** — every prompt, change and screenshot | `docs/` |
| 7 | **The system canvas** — the design source of truth | `canvas/` |

---

## 2. Non-negotiable rules

These come from `CLAUDE.md` and the canvas. Breaking one is a bug, not a
style preference.

1. **Every user-facing string exists in Spanish and English.** Spanish is
   required; English falls back to Spanish. Use `t('key')` or `tt({es, en})`.
2. **Every component is registered** in `src/components/registry.js`, in the
   same turn it is created, at its atomic tier, with its states.
3. **No value is invented off-canvas.** Colours, radii, shadows, type sizes
   come from `src/design/tokens.css`. If you need one that is absent, add it
   *there* first.
4. **No price or capacity is hardcoded in a screen.** They live in
   `src/data/canvas-model.js` and the `plans` / `rooms` / `studio_settings`
   tables.
5. **Every change is logged** in `docs/changelog/` with prompt intent,
   decision, alternative rejected, files touched, and screenshots.
6. **Touch targets never below 44px. Type never below 9.5px.**
   Focus rings visible in both themes.

---

## 3. Stack, and why

**Vanilla ES modules. No build step. No dependencies.**

This is a deliberate choice, not a shortcut:

- The repo has to open from a GitHub Pages link for a club owner in Medellín
  with no toolchain and no `npm install`.
- Another agent, in another session, has to be able to continue it without
  first repairing a broken build.
- Every file is readable as itself. `h()` maps 1:1 onto JSX when a bundler is
  eventually introduced, so the migration is mechanical rather than a rewrite.

**When to introduce a build step:** when Supabase lands and secrets need
injecting, or when the bundle exceeds roughly 400KB of JS. Vite, `h()` →
Preact, same component signatures. Not before.

---

## 4. Module map

```
src/
├── core/
│   ├── dom.js        h() hyperscript renderer (~120 lines)
│   ├── store.js      observable UI state, persisted; reflects onto <html>
│   ├── roles.js      THE role + permission model
│   ├── session.js    demo auth — the Supabase seam
│   └── router.js     hash router with permission guards
├── design/
│   ├── tokens.css    THE tokens. Nothing invents a value off-canvas.
│   └── base.css      reset + layout primitives
├── i18n/
│   ├── index.js      t(), tt(), money(), date(), time()
│   ├── es.js         876 keys, extracted from the canvas
│   └── en.js
├── data/
│   ├── schema.js     THE data contract — tables, columns, relations, RLS
│   ├── canvas-model.js  prices, capacity, movements (from the canvas)
│   ├── seed.js       demo data, generated relative to today
│   └── repo.js       THE data seam — swap for Supabase here and nowhere else
├── specs/
│   └── specs.js      49 page specs extracted from the canvas
├── components/
│   ├── registry.js   the living inventory (D-02), enforced in code
│   ├── ui.js         atoms + molecules, each self-registering
│   └── components.css
├── inspector/
│   ├── inspector.js  the dev-mode spec panel
│   └── inspector.css
└── apps/
    ├── site/  customer/  staff/  admin/
```

---

## 5. The core APIs

### Rendering

```js
import { h, when, each, frag, cx } from '../../core/dom.js';

h('div.card', { onclick: fn }, 'text', h('span', 'child'))
when(cond, () => h('p', 'only if true'))
each(items, (item) => h('li', item.name))
```

### State

```js
import { get, setState, subscribe } from '../../core/store.js';

get('lang')                   // 'es' | 'en'
setState({ theme: 'dark' })
subscribe((state, changed) => { /* changed is an array of keys */ })
```

State keys: `lang, theme, wire, texture, depth, photos, dev, inspector, role,
userId, tenant`. They are mirrored onto `<html data-*>` so CSS responds
without a re-render.

### Language

```js
import { t, tt, money, date, time } from '../../i18n/index.js';

t('n_home')                        // canvas dictionary key
tt({ es: 'Guardar', en: 'Save' })  // inline pair — for new copy
money(520000)                      // "$ 520.000" in es-CO
```

### Data

```js
import repo from '../../data/repo.js';

await repo.list('classes', { where: { status: 'scheduled' }, order: 'starts_at', limit: 10 })
await repo.getRow('profiles', id)
await repo.insert('bookings', { class_id, profile_id, status: 'confirmed' })
await repo.update('bookings', id, { status: 'cancelled' })
repo.subscribe('bookings', (rows) => { /* realtime */ })

// Domain helpers — use these rather than re-spelling the query:
await repo.upcomingClasses({ limit: 6 })
await repo.bookingsFor(profileId)
await repo.rosterFor(classId)
await repo.settingValue('cancellation_window_hours', 4)
```

**Every screen reads and writes through `repo`. Nothing imports `seed.js`
directly.** That is the whole point of the seam.

### Roles and permissions

```js
import { hasPermission, currentUser, currentRole } from '../../core/session.js';
import { can, ROLES } from '../../core/roles.js';

if (hasPermission('payment:take')) { /* … */ }
```

Guards go on the route, not inside the view:

```js
route('/admin/tables', {
  view: TablesPage,
  permission: 'tables:read',   // → redirects to the role's home if absent
  spec: 'tables',
  app: 'admin',
  title: { es: 'Tablas', en: 'Tables' },
});
```

### The Inspector

Every page does two things:

```js
import { InspectorButton, declareSpec } from '../../inspector/inspector.js';

declareSpec('home');                       // so ⌥I knows which spec this is
// …and place the chip in the page header:
InspectorButton({ spec: 'home' })          // renders null when dev mode is off
```

Spec keys are the keys of `src/specs/specs.js` (e.g. `home`, `sched`, `reg`,
`tables`). `SPEC_BY_CODE` maps canvas codes (`C-01`, `M-03`) to the same
entries.

### Components

```js
import { Button, Card, Field, ListRow, Badge, Chip, Icon,
         EmptyState, Banner, Stat, Tabs, Sheet, toast,
         CapacityMeter, MovementDot, Avatar, Placeholder } from '../../components/ui.js';
```

**Creating a new component?** Put it in `src/components/` and call
`register({...})` in the same file. It then appears in the library page
automatically. A component that is not registered is reported by
`tools/audit-components.mjs`.

---

## 6. Multi-tenancy

The system is single-studio today and multi-tenant by construction:

- `tenants` is a real table with a row for HOY, present from day one.
- Every tenant-scoped table carries `tenant_id`, declared in `schema.js` via
  `tenantKey: true`.
- `repo.list()` filters by the active tenant **client-side today**, exactly
  where Supabase Row Level Security will enforce it **server-side tomorrow**.
- Brand values are tokens, so a second studio is a token override in
  `tenants.brand_tokens`, not a fork.
- Copy is in `i18n`, so a different vertical is a dictionary, not a rewrite.

**What is deliberately not built yet:** tenant onboarding, per-tenant
subdomains, billing for tenants. Those belong after the first studio is live.

---

## 7. Migration path to Supabase

| Concern | Today | Tomorrow |
|---|---|---|
| Schema | `src/data/schema.js` | `tools/gen-supabase.mjs` emits DDL from it |
| RLS | `read`/`write` permissions per table in `schema.js` | generated policies |
| Auth | `src/core/session.js` demo users | Supabase Auth; role from `profiles.role` |
| Queries | `repo.list/getRow/insert/update/remove` | same signatures, `supabase.from()` |
| Realtime | `repo.subscribe` (local bus + cross-tab) | `supabase.channel()` |
| Files | placeholders | Supabase Storage |

**The rule that makes this cheap:** nothing outside `repo.js` and
`session.js` knows how data or auth work. Keep it that way.

### Presence / live cursors

Deferred, behind the `presence_cursors` flag. When it lands: Supabase
Realtime presence or Liveblocks, on staff pages only. It is genuinely a
nice-to-have and must not block anything.

---

## 8. Integrations

| Provider | Purpose | State |
|---|---|---|
| **Wompi** | Card, Nequi, PSE, Bancolombia transfer. Colombia. | Not configured — UI built against it |
| **WhatsApp Cloud API** | The studio's real channel: reminders, cancellations, CRM | Not configured — templates need Meta approval |
| **Email** | Transactional email from the Email Designer | Not configured |
| **DIAN** | Colombian electronic invoicing | Not configured |
| **Supabase** | Postgres, Auth, Realtime, Storage | Not configured |

Manual payment methods (cash, bank transfer) are **first-class, not a
fallback** — the front desk takes cash every day.

All credentials go through `integrations.secret_ref` — a reference, never the
secret. No key is ever committed.

---

## 9. Conventions

- **Files**: kebab-case. **Components**: PascalCase. **Tokens**: kebab-case.
  **Tables and columns**: snake_case.
- **Comments** explain *why*, never *what*. If a decision has a rejected
  alternative, name it.
- **Spanish is the product's voice.** Brand words (`Arde`, `Fluye`,
  `Enraíza`, `Libera`, `¿Cómo quieres sentirte hoy?`) stay in Spanish in both
  locales — they are brand, not UI text.
- **Accessibility is not a phase.** Semantic elements, labelled inputs, focus
  visible, `aria-live` for async results, 44px targets.

---

## 10. Definition of done (from canvas K-01)

A screen is finished when:

- [ ] Screen built and reachable from a route
- [ ] Spec complete — intent, story, data, roles, layers, rules, endpoints, states
- [ ] Spanish **and** English
- [ ] Empty, loading and error states resolved
- [ ] Toggles wired to the feature-flag table
- [ ] New components registered in `registry.js`
- [ ] Changelog entry in `docs/changelog/` with screenshots
- [ ] Works at 360px and at 1440px
