# HOY OS — Plan

> **If you are an agent picking this repository up: start here.**
> Then read `ARCHITECTURE.md`, then `CLAUDE.md`. Then run
> `node tools/audit.mjs` to see the current state.

---

## Where this came from

The design phase produced a system canvas in Claude Design —
`canvas/Hoy Wellness System.dc.html` — containing 49 screens across six lanes,
each with a full spec panel, a bilingual dictionary, a design-token set, a
component library and a changelog. **That canvas is the design source of
truth.** This repository is that canvas turned into a running system.

Generated from it, never hand-edited:

| Generated | From | By |
|---|---|---|
| `src/i18n/{en,es}.js` — 876 strings | the canvas dictionary (`d`, `d2`) | `tools/extract-canvas.mjs` |
| `src/specs/specs.js` — 49 specs | `specs`, `specs2` | same |
| `src/data/canvas-model.js` — prices, capacity, movements | `plans`, `studio`, `movSets` | same |

Edit the canvas, re-run the tool. Do not hand-edit the generated modules.

---

## Phase 0 — Foundation ✅ DONE

| | |
|---|---|
| ✅ | Repo structure, no build step, GitHub Pages workflow with a syntax gate |
| ✅ | `src/design/tokens.css` — brand palette, dark theme, wireframe mode, material switches |
| ✅ | `src/core/dom.js` — the ~120-line renderer |
| ✅ | `src/core/store.js` — observable state, persisted, URL-hydrated, reflected onto `<html>` |
| ✅ | `src/core/roles.js` — 8 roles, inherited permission sets |
| ✅ | `src/core/session.js` — 10 demo users, preview-as, the Supabase seam |
| ✅ | `src/core/router.js` — hash routes with permission guards and spec metadata |
| ✅ | `src/i18n/` — 876 ES/EN strings + COP/Bogotá formatting |
| ✅ | `src/data/schema.js` — 52 tables, columns, relations, per-table RLS, PII flags |
| ✅ | `src/data/repo.js` — the data seam, with realtime and tenant scoping |
| ✅ | `src/data/seed.js` — demo data generated relative to today, so it never goes stale |
| ✅ | `src/components/` — the registry (D-02 enforced in code) + 18 atoms and molecules |
| ✅ | `src/inspector/` — the dev-mode spec panel, reading live registries |
| ✅ | `src/shell/` — the testing portal, sign-in, developer bar |
| ✅ | `tools/extract-canvas.mjs`, `tools/audit.mjs` |

---

## Phase 1 — The six deliverables (first pass) ✅ DONE

Built in parallel, each in its own directory. All six load, all routes render,
the audit is clean:

| Deliverable | Path | Notes |
|---|---|---|
| Public website | `src/apps/site/` | Home, philosophy, modalities, schedule, teachers, plans, contact, FAQ, legal |
| Customer app | `src/apps/customer/` | Intention check, schedule, booking, payment, membership, history |
| Staff apps | `src/apps/staff/` | Front desk, register & take payment, teacher app, coordinator |
| Admin system | `src/apps/admin/` | **Table Manager**, dashboard + flags, settings, CRM, messaging, finance, CMS, activity log, design system, component library |
| Operations manual | `ops-manual/` | Front desk, teachers, coordinator, finance, maintenance, owner, emergencies |
| Documentation | `docs/` | Changelog, prompt log, screenshot system, spec catalogue, contributor guide, decisions |

---

## Phase 2 — Next, in dependency order

These are ordered because the dependencies are real. Doing them out of order
means redoing work.

### 2.1 — Verification pass — PARTLY DONE

Done in this session:

- [x] `node tools/audit.mjs` clean — 55 modules, 0 errors, 0 warnings.
- [x] Every route driven in a real Chromium; 13 of 13 render real content.
- [x] The generated Postgres migration applied to a live PostgreSQL 16 server
      and its security properties asserted (see `supabase/README.md`).
- [x] Every page driven at 390px: 8 of 8 scroll-clean, no type below the
      9.5px floor.
- [x] **Nine real bugs found and fixed this way**, none of which any amount of
      reading would have caught:
      the operations manual rendering nothing at all (two component signature
      bugs dropped all nine chapter bodies); three horizontal-scroll bugs from
      `min-width: auto` on grid and flex items, one of them self-sustaining;
      `h()` mis-parsing `tag#id.class`; `Icon()` corrupting relative moveto
      commands; seed times built in the viewer's timezone but formatted in
      Bogotá; review links not carrying an identity; and four in the generated
      SQL.

Still outstanding:

- [ ] **Capture the rest of the screenshot matrix — 72 of 1,056 are done.**
      All 72 are the documentation screens (`K-01`); every product screen is
      missing. `#/docs/screenshots` lists exactly which, and
      `tools/capture-screenshots.mjs` captures them.
      Two things to know before running it: Google Fonts is blocked by this
      sandbox's TLS proxy, so capture from an unproxied machine or the type
      will render in fallback faces; and process the output before committing
      (see `docs/screenshots/README.md`) — the raw full-page retina captures
      were 119MB for 72 images.
- [ ] **Walk each app by eye at 360px and 1440px.** The automated check proves
      routes render and do not throw; it does not prove they look right.
- [ ] **Confirm ES and EN on every screen.** The audit cannot detect copy that
      was never written in one language.
- [ ] The customer `#/app/classes` list takes over 2.5s to populate against
      local seed data in memory. That is slow enough to notice and there is no
      network involved, so it is worth a look before Supabase adds real latency
      on top.
- [ ] Two component names are registered twice — `PlanCard` and `Accordion`,
      once by the site app and once by the customer app. Two components are
      competing for one identity, which is the exact drift D-02 exists to
      prevent. Rename or promote one to `src/components/ui.js`.

### 2.2 — Supabase
**Blocks:** real auth, real data, realtime, multi-device, presence.

- [x] `tools/gen-supabase.mjs` — **built and verified.** Emits DDL + RLS from
      `src/data/schema.js` and `src/core/roles.js`: 53 tables, 188 policies,
      109 foreign keys, RLS on everything, append-only tables with no UPDATE or
      DELETE policy at all. Applied to a live PostgreSQL 16 and asserted; it is
      idempotent. See `supabase/README.md`.
- [ ] Create the Supabase project and apply it (`supabase db push`).
- [ ] Swap `src/data/repo.js` internals. **Keep every signature.**
- [ ] Swap `src/core/session.js` internals for Supabase Auth; role from `profiles.role`.
- [ ] Seed the real studio data: actual timetable, actual teachers, actual photos.
- [ ] Introduce a build step at this point (Vite), because keys need injecting.

### 2.3 — Wompi
**Depends on:** Supabase (orders and payments must persist).

- [ ] Wompi checkout: card, Nequi, PSE, Bancolombia transfer.
- [ ] Webhook receiver → `webhooks` table (raw first, then processed, so a
      failure can be replayed) → `payments.status`.
- [ ] Keep cash and manual transfer first-class. The desk takes cash every day.
- [ ] Reconciliation view in `#/admin/finance`.
- [ ] Payroll disbursement — confirm what Wompi actually supports in Colombia
      before designing it. **[POR CONFIRMAR with the club's accountant.]**

### 2.4 — WhatsApp Cloud API
**Depends on:** Supabase (message log), a Meta Business account.

- [ ] Template submission and approval tracking (`templates.meta_approval`).
- [ ] Inbound webhook → `messages` → the CRM timeline.
- [ ] Outbound automations from the `automations` table, respecting quiet hours.
- [ ] 24-hour session window rules — outside it, only approved templates send.

### 2.5 — Email
- [ ] Wire the Email Designer output to a real sender.
- [ ] Render the block document to MJML-safe HTML.
- [ ] Deliverability: SPF, DKIM, DMARC on the studio's domain.

### 2.6 — Drag-and-drop page composition
**Depends on:** the component registry being complete and every page being
assembled from registered blocks rather than bespoke markup.

- [ ] Give each page a block document (`pages.blocks` already exists in the schema).
- [ ] A composer in `#/admin` that reorders blocks by drag, using the native
      HTML drag-and-drop API — no dependency.
- [ ] Persist per tenant, so a studio can rearrange its own site.
- **Do not start this before 2.1.** It requires pages to be data, and some are
  still code.

### 2.7 — Live cursors *(explicitly a nice-to-have)*
Behind the `presence_cursors` flag, staff pages only. Supabase Realtime
presence or Liveblocks. **Must not block anything.**

### 2.8 — Multi-tenant activation
The groundwork is done — `tenants` table, `tenant_id` everywhere, tokens as
brand, copy in i18n. What remains:

- [ ] Tenant onboarding flow.
- [ ] Per-tenant brand token overrides applied at boot.
- [ ] Subdomain or path routing.
- [ ] Billing for tenants.
- [ ] A vertical beyond wellness: the `tenants.vertical` column exists; the
      dictionary and the class/schedule vocabulary are what change.

### 2.9 — Later, explicitly not now
Marketing tools, social scheduling, content creation, an app store of
integrations. The brief says these are not needed yet. Do not build them
before the studio is live on the system.

---

## What can be done in parallel

Independent — different directories, no shared files:

```
┌─ Public website ──┐
├─ Customer app ────┤
├─ Staff apps ──────┤   all six were built in parallel in phase 1
├─ Admin system ────┤
├─ Operations manual┤
└─ Documentation ───┘
```

**Strictly sequential** — each genuinely blocks the next:

```
Verification (2.1)
      ↓
  Supabase (2.2)
      ↓
  ┌───┴────┬──────────┐
Wompi   WhatsApp    Email      ← these three are parallel once Supabase lands
(2.3)     (2.4)     (2.5)
```

Drag-and-drop (2.6) needs 2.1 but not 2.2. Multi-tenant activation (2.8) needs
2.2. Live cursors (2.7) needs 2.2 and blocks nothing.

---

## Open decisions — need a human

| # | Decision | Why it matters |
|---|---|---|
| 1 | **Second location** | The `locations` table exists and is referenced, but nothing yet chooses between locations. Building the picker before the club commits would be speculative; building the data model afterwards would be a migration. The model is in; the UI is not. |
| 2 | **Mat selection** | Does a student choose a specific mat position when booking? It changes the booking record, the capacity calculation and the check-in flow. Currently: no. |
| 3 | **Payroll mechanism** | Whether Wompi handles disbursement or payroll stays manual changes `payroll_runs` materially. |
| 4 | **Legal text** | `legal_documents` carries placeholder bodies. Counsel must supply Terms and a Privacy Policy with the sections Ley 1581 de 2012 and Decreto 1377 de 2013 require. |
| 5 | **Real photography** | Every image slot is a labelled placeholder naming the shot it wants. The studio supplies the photography. |
| 6 | **Actual studio facts** | Address, phone, opening hours, the real timetable, the real teacher roster. Marked `[POR CONFIRMAR]` in the operations manual. |

---

## Known gaps in the first pass

Honest list. These are not hidden.

- **No real authentication.** `session.js` is a role switcher wearing a login
  screen. Anyone with the link can be anyone. That is correct for a private
  review build and wrong for anything else.
- **No persistence beyond the browser.** `repo.js` writes to `localStorage`.
  Two reviewers on two machines see two different worlds.
- **Integrations are designed against, not connected.** Wompi, WhatsApp, email,
  DIAN and Supabase all show "not configured".
- **Screenshots are not captured yet.** The system, the naming convention and
  the capture script exist; the images do not. `#/docs/screenshots` reports
  exactly which are missing.
- **The drag-and-drop composer is not built.** See 2.6 for why it is sequenced
  where it is.
- **Live cursors are not built.** Deliberate — see 2.7.

---

## Definition of done (from canvas K-01)

- [ ] Screen built and reachable from a route
- [ ] Spec complete — intent, story, data, roles, layers, rules, endpoints, states
- [ ] Spanish **and** English
- [ ] Empty, loading and error states resolved
- [ ] Toggles wired to the feature-flag table
- [ ] New components registered
- [ ] Changelog entry with screenshots
- [ ] Works at 360px and 1440px
- [ ] `node tools/audit.mjs` passes
