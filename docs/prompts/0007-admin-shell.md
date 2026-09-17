# 0007 — Admin shell: collapsible sidebar, top bar, settings sub-pages, design system in reach

- **Source**: Justin in the Slack thread, relayed by the build coordinator to the shell worker
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0007-admin-shell.md`

## Prompt (verbatim)

> Make sure that I can expand and collapse the column or the menu items from the side menu in the admin dashboard
> system. The feature switches don't go on the dashboard homepage; they go in settings I suppose, maybe as a
> subfeature from settings. The design system should also be available. … Also add a top bar on the Hoy admin system.

Follow-up in the same thread:

> some of the component cards in mobile view and even desktop view have text that is expanding beyond the width of
> the card. Make sure that can't happen.

Coordinator brief (summarised): collapsible `DesktopShell` sidebar (chevron in the footer, `[` shortcut, 56 px icon
rail with tooltips, state persisted per surface in localStorage), collapsible nav groups from `RouteDef.nav.group`
with the active route's group always open, off-canvas drawer below 900 px; a `TopBar` for staff/admin/dev with
sidebar toggle, wordmark, page name + code chip, global search (`/` focuses, routes by name/code and members by
name, Enter navigates), language, theme, notifications bell, role switcher, dev-mode toggle and the spec chip; move
the feature-flag editor off M-01 into a Settings sub-navigation (General, Features, Payments, Communications,
Branding) on new codes M-08a…M-08e with a `usePolicy()` hook; a "Sistema de diseño / Design system" nav group that
puts `/dev/tokens`, `/dev/components`, `/dev/specs`, `/dev/layout/C-01` and `/dev/knowledgebase` in the admin
sidebar for a super admin; every new string ES+EN, every new/changed component with an updated `.meta.ts`, tokens
only; then the containment pass on the card-like components, verified with Playwright at 390 and 1280 px.

## Response

Built in `feat/admin-shell` and pushed to `main` (v0.5.0).

**Sidebar (D-02 `DesktopShell`)** — 240 px cream lane ⇄ 56 px icon rail. The footer chevron and the `[` key toggle it
(the key is ignored while typing); `hoyos.shell.<surface>.collapsed` remembers it per surface, so admin can be
collapsed while staff stays open. In the rail every link keeps its accessible name through a tooltip. Nav groups come
from `RouteDef.nav.group` (now an i18n key when the dictionary has one, else literal text) and fold with a caret,
remembered in `hoyos.shell.<surface>.groups`; the active route's group is forced open, and in the rail the groups
become hairline separators. Below 900 px the column is an off-canvas drawer with a scrim, opened from the top bar,
and it always shows the full labels (never the rail). The canvas look is unchanged: cream lane with the inset edge,
lane texture, accent pill for the active item, no borders in the styled skin.

**Top bar (D-02 `TopBar`, new `GlobalSearch` and `NotificationBell` molecules)** — sticky cream `.9` with the blue
hairline. Left: sidebar toggle, wordmark, current page name from `bi(spec.name)` with the page code as a chip.
Middle: global search over every route the role may open (name + code) and, with `members.read`, every member by
name; `/` focuses it, ↑↓ move, Enter navigates. Right: ES/EN, theme, the unread bell (`message_log` rows for the
current user that are not read or failed), `RoleSwitcher`, the dev-mode toggle for a super admin and the spec chip
(opens the inspector, same as `Ctrl+.`). Narrow viewports drop the search, then the role switcher, then the dev-mode
label, in that order.

**Settings (M-08 → M-08a…M-08e)** — one sub-navigation, five routed pages: General (`/admin/settings`: profile,
opening hours, capacity, policies, integrations), Features (`/admin/settings/features`: the studio switches **and**
the per-page `feature_flags` editor that used to sit on the dashboard, audited writes unchanged), Payments
(`/admin/settings/payments`: payout account, NIT, IVA/DIAN, Wompi environment with an explicit
"keys are never stored here" notice), Communications (`/admin/settings/communications`: quiet hours and the WhatsApp
and email sender names) and Branding (`/admin/settings/branding`: display name, wordmark variant, default language,
live preview). The rail only offers the pages the role may open. `usePolicy()` in `src/modules/admin/settings.ts`
exposes the policy numbers, quiet hours, features and tax live — it reads `tenants` through `useTable()`, so a save
in M-08 re-renders consumers immediately (the kanban item is closed); `src/modules/customer/policy.ts` can switch to
it and drop `<PolicySync/>`, which this branch deliberately did not touch.

**M-01 dashboard** — KPI row and occupancy chart unchanged, the flag table replaced by "Hoy en un vistazo / Today at
a glance": today's classes with time, modality, teacher, occupancy meter, how many are already checked in and a
"full" badge, plus a link to check-in.

**Design system in reach** — the dev routes gained `nav.group = core.nav.group.design` (and `nav.to` so the layout
editor entry opens `/dev/layout/C-01`), and `DesktopShell` adds the dev surface to the staff/admin sidebars when the
user is a super admin. The dev surface keeps its own shell and now also lists the admin group, so there is a way
back.

**Containment** — long words, codes, emails and IDs can no longer push past a card at 390 or 1280 px. 17 real
overflows existed (the D-01 token rows and surface card, the D-02 PhoneBubble library card, and a sideways page
scroll at 390 on `/dev/tokens`); a Playwright pass over `/dev/components`, `/dev/tokens`, `/app`, `/app/schedule`,
`/admin`, the three settings pages and `/staff/checkin` now reports zero.
