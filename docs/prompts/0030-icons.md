# Icons that read at a glance + retire the daily intention

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (owner) · two messages in the same thread

## Prompt

**Message 1 (12:01 local):**

in the customer and teacher app, the icons in the bottom tray, and other icons should probably be better. Also in front desk like the add, invite, etc icons can be better.

In settings, there should be clear icons for each setting.

**Message 2 (12:05 local):**

erase the "How do you want to feel today" component from the experience.

## Response

Branch `feat/icons` from `main` at `f4b9197` (v0.11.2), version **0.12.0** (new dependency, new component surface,
one page retired). Full record in `docs/changelog/0030-icons.md`; decision D-0008.

### Message 1: icons

1. **One icon set, one seam.** `lucide-react` behind the existing `Icon` atom (`src/components/atom/Icon/Icon.tsx`):
   29 hand-drawn glyphs became **135 named glyphs** in five groups (navigation, actions, settings, things/status,
   hub tools), all 24 px rounded-cap, stroke `--icon-stroke` 1.75 (2.25 when active), sizes `--icon-xs…xl` in D-01
   (rem, so they grow with the `--ui` band). Nothing imports lucide directly; named imports keep the bundle to the
   glyphs used.
2. **Customer and teacher dock + top bar.** `RouteDef.nav.icon` is now typed `IconName` (a missing glyph fails the
   build instead of drawing a box): Home `home`, Schedule `schedule`, History `history`, More `more`; teacher Classes
   `classes`, Payroll `payroll`, Profile `profile`. The active item gets a tinted pill behind a heavier glyph and a
   semibold label (shape + weight + colour); labels stay; targets stay 44 px. C-01 quick actions, More (C-25),
   Profile (C-19), account, membership, notifications, invite, payments and booking rows all carry a distinct glyph.
3. **Front desk and admin.** Every sidebar entry (staff, admin, dev, docs, manual) has a real glyph; S-01 quick actions
   (check-in, register, rooms, inbox, CRM, tables), S-02 check-in / no-show / undo / promote / add walk-in / register
   new, S-04 charge and payment link, S-05 room actions, S-06 channel glyphs, M-06 member inbox link, the teacher
   class actions, the bell, search, theme toggle, collapse chevrons and table sort arrows. Icons always sit next to a
   visible label; the few icon-only controls (month arrows, remove card, inbox back) have `aria-label` + `title`.
4. **Settings.** The M-08 rail shows one glyph per group (Studio, Features, Payments, Communications, Branding,
   Content) and every section card has its own glyph tile (identity, hours, capacity, policies, integrations, feature
   switches, payments, fiscal, tax, payroll, quiet hours, senders, content decisions, legal, branding) through a new
   `Card icon` prop.
5. **Library and tokens.** D-02 Icon lists all 135 names by group; Button, Card, ListRow, NavBar, EmptyState and
   Notice document the `IconName` slot with a usage each; D-01 shows the icon tokens. An unknown icon string warns in
   dev.

### Message 2: the daily intention is gone

6. **A-05 retired end to end.** No `/app/intention` route (the module's new `redirects` export sends it to `/app`),
   the C-01 "¿Cómo quieres sentirte hoy?" card and its sort are removed (today's list is in start-time order), sign-up
   (A-03) lands on Home, the C-02 "Elegir mi intención" link is gone and its filter now reads "Movimiento", the two
   A-05 feature switches are no longer seeded (`src/specs/retired.ts`), the hub map no longer lists it, and every
   now-unused string is deleted. The `intentions` table stays as deprecated history (`schema.ts`, `supabase/schema.sql`,
   `docs/data-model.md`); `docs/pages/A-05.md` and `C-01.md` note the retirement.

Screenshots regenerated for C-01, C-02, C-19, C-25, S-01, S-02, S-03, S-04, S-06, M-08a…f, D-01, D-02 (ES/EN ×
390/1280; dark for C-01, S-03, M-08a) and read back; `npm run flow-map` regenerated; build green; hub map
deterministic; hub-map sample routes 9 / 9.
