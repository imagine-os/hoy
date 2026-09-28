# Responsive app shell — reserve and register as one experience

Source: Slack thread (HoyOS channel, started 2026-09-28 19:05 UTC) · 2026-09-28 · requester: owner

## Prompt

Four messages from Justin Massion in the same thread, verbatim and in order (Slack mention tokens removed).
Messages (b) to (d) do not change the scope of (a); they tell the build to carry on and publish, so they share
this file instead of taking numbers of their own.

**(a)** 2026-09-28 19:56 UTC

> Great. The next thing we need to do is make sure the app and registration experience is proper responsive. Right now on desktop, as we're working through the reserve and register proecess it switches from the desktop experience to mobile. It should all flow as one experience. Also, mobile is currently living in a mockup of a phone. now we need to start getting this stuff all production ready please.

**(b)** 2026-09-28 20:25 UTC. The second line is Justin quoting a line from Claude's status post.

> you are claude. You should be able to publish. Make it happen please
>
> ○ Build and push the fixes through your session once your Claude account is connected.

**(c)** 2026-09-28 20:27 UTC

> OK, start on the rest of the plan. I'll connect you to claude shortly, although you are claude.

**(d)** 2026-09-28 20:55 UTC

> try now

### Diagnosis (posted in the thread before the build)

The "phone mockup" and the "desktop switches to mobile" were one bug. Three layers:

1. **`PhoneShell` drew a 900 px+ phone frame around every app route.** `PhoneShell.css` turned the customer and
   teacher shell into a literal 430 px phone from `min-width: 900px` (34 px radius, frame gradient, sand ground,
   internal scroll, dock inside). `withShell()` mapped `surface: customer | teacher` to it, so all 33 `/app/*`
   routes and `/teach*` rendered inside it. `RouteDef.layout` existed on every route but nothing read it.
2. **A 480 px `AuthShell` in the middle.** The desktop path was `/site/schedule` (full-width website, 1120 or 1520 px)
   → a full-width **bottom-sheet `Drawer`** at 1280 px, a phone pattern mid-flow → `/auth/sign-in?next=…` in a
   centred 480 px column → `/app/checkout/:id` in the 430 px frame. So the page narrowed twice.
3. **Nothing scaled for large screens outside the hub.** At 3840 px the checkout was a 430 px strip with 16 px text
   (the `--ui` band was hub-only by D-0004).

Also found: the website's Sanctuary CSS loaded Google Fonts with `@import`, so the whole website rendered blank when
fonts were unreachable, and customer C-06 ignored the `?plan=` the website passes. Sign-in is still the demo-user
picker.

### Plan (as posted in the thread, dependency order)

1. Decisions and shared breakpoint tokens; define the app shell contract (bottom dock under 900 px, top or side nav above). Fable.
2. Back-fill docs for the Sept 26 website commits. Sonnet 5.
3. Extend the large-screen type scale from the hub to the whole app, with 44 px controls. Fable.
4. Rewrite the phone shell into a responsive app shell. Opus 5.
5. Desktop pass on checkout, plans, schedule, home, booked and sign-up intention. Opus 5.
6. Unify sign-in width, desktop variant of the schedule drawer, move fonts to a link tag. Opus 5.
7. Hub simulator and thumbnail regression check. Sonnet 5.
8. Screenshots of 10 screens, ES and EN, 360 to 3840. Sonnet 5.
9. Actions registry, page docs and surfaces doc. Opus 5.
10. Prompt and changelog 0025, kanban, version fix, green build, push. Fable.

Real auth isn't in this pass; it stays gated on Supabase.

**Model routing as run.** Plan, architecture and shared code (tasks 1, 3–6: tokens, `AppShell`, the customer
pages, auth and drawers): Fable 5.1. Docs back-fill 0024 (task 2): Sonnet 5.5. This docs pass (tasks 9–10: the
actions, page docs, surfaces, this prompt file, changelog 0025, kanban, the 0.10.0 release commit): Opus 5.5.

## Response

**Shipped (v0.10.0, branch `claude/responsive-app-shell`).** See [changelog 0025](../changelog/0025-responsive-app-shell.md)
and decisions [D-0006 and D-0007](../decisions.md).

- **No phone mockup on desktop.** `AppShell` replaces `PhoneShell` for the customer and teacher apps. Below 900 px
  it is the phone layout (a content column of at most 560 px and the sticky bottom dock). From 900 px it is a
  full-viewport page: the primary nav moves into the top bar, content sits in a centred `--w-app` container, and
  the document scrolls. The bezel exists only in the hub's `DeviceFrame` simulator (HUB-01 previews,
  `/#/dev/simulator`). `withShell()` now honours `RouteDef.layout` (D-0006).
- **One flow, site to app.** `AuthShell` (A-01…A-03, C-21, E-04) uses the same `TopBar`, and its column grows from
  480 to 576 px at 900 px. `Drawer side="bottom"` becomes a centred dialog from 900 px (W-04 reserve, C-04 success,
  C-06 confirm, C-08b change, C-02 filters).
- **Desktop pass on the reserve and register pages.** `SplitSections` gives two columns on C-01, C-04 (class and
  mat on the left, payment and confirm on the right) and C-08. C-06 shows both cycles side by side and reads
  `?plan=<id>` from the website (the plan is preselected and its confirmation opens). A-05 has four columns and the
  C-02 filter chips wrap.
- **Large screens and targets.** `--ui` is on `:root` and drives the root font size. Spacing and layout tokens are
  in rem. One `BREAKPOINTS` list (360 · 390 · 768 · 900 · 1280 · 1920 · 2560 · 3840) serves CSS, `useMinWidth()` and
  `PageSpec.checkedAt` (D-0007). Every interactive control is at least 44 px (`--h-ctl`).
- **Production fix.** The Sanctuary fonts load through a `<link>` in `index.html`, so a fonts outage can no longer
  blank the website.
- **Actions (WebMCP).** Seven new actions, declared in the specs and mounted by the pages: `app.reserve`,
  `app.pickMat`, `app.confirmReservation`, `app.choosePlan`, `app.openSchedule`, `app.goHome` and `auth.signIn`
  (see `docs/reference/surfaces.md`). Confirming and choosing a plan never charge: paying stays a person's click.
- **Docs.** This file, changelog 0025, D-0006/D-0007, page docs for C-01, C-02, C-04, C-06, C-08, A-02, A-03, A-05,
  W-04 and S-03, README, ROADMAP §A, the kanban and `docs/README.md` are all at 0.10.0. Build green at 390, 1280 and
  3840 px.

**Deferred (kanban Backlog, "0025 follow-up" cards).** A real tablet layout for 768–899 px, which still shows the
560 px column. Website controls still under 44 px (`.site .btn` 36, header links 34, version select 38). The
pre-existing 13 px `.site-actions` overflow on W-04 at 390 px. Actions beyond the hub and this flow (check-in,
selling, sending, waitlist, change booking, sign-up), plus a shell scope for navigation actions. Real auth, gated on
Supabase. The full 360…3840 screenshot matrix and `checkedAt` (this pass recorded `[390, 1280, 3840]`).

**Resumen (ES).** La app de clientes y profesores ya no vive dentro de un teléfono en escritorio: un solo
`AppShell` responsive (columna + barra inferior bajo 900 px, página completa con navegación arriba desde 900 px).
Reservar y registrarse se leen como una sola experiencia desde el sitio hasta la app. La escala `--ui` aplica a
todo, los controles miden 44 px o más y hay siete acciones WebMCP nuevas. Quedan pendientes la tableta
(768–899 px), los controles del sitio, las acciones restantes y la autenticación real (Supabase).
