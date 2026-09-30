version: 0.21.1
date: 2026-09-30
prompt: docs/prompts/0048-hub-transactional-messages.md
intent: Justin: "Lets add an item in the hub to get straight to the Transactional Messages, this is where people edit the email reports and transational emails and automated whatsapp automated messages." — the emails (M-04) and WhatsApp automations (M-05) had no hub card; a tester reached them only through the admin sidebar.
decision: One card, `messages` (code M-04), in the team band right after CRM: it enters as the coordinator's demo user (Valentina; the role that "runs … communications" and can open both pages) at `/admin/emails`, with a secondary link that enters as the same user at `/admin/whatsapp` (M-05). Mail icon, the inbox card's hue family through a page-only `hue` override in `CARD_UI` (no new D-01 token). In the hub map M-04 and M-05 leave the `admin` experience for `messages`, grouped as "Mensajes / Messages". `hub.enterAs` gains `messages`.
rejected: A card per page (two cards, emails and WhatsApp) — rejected, the ask is one place to edit every automatic message and the band would grow by two for one job; one card with a secondary link keeps it one entry. Putting it in the build band — rejected, editing the studio's messages is studio work, not building the product. `marketing` as the owning role — rejected, marketing's card is the coming-soon kit and its home is Contenido; the coordinator owns communications. A new `--hue-messages` token — rejected, the card reuses the inbox hue so the two messaging cards read as a pair. Mentioning "reports" in the card's purpose — rejected until report emails exist (none are seeded or built).
files: src/hub/hubMap.data.ts; src/modules/hub/specs.ts; src/modules/hub/HubPage.tsx; src/app/captureDates.ts; scripts/gen-hub-map.mjs; public/hub-map.json; public/actions.json; package.json; package-lock.json; docs/reference/hub-map.md; docs/reference/surfaces.md; docs/pages/HUB-01.md; docs/kanban.md; docs/README.md; ROADMAP.md; docs/screenshots/HUB-01/*; docs/screenshots/routes.json; docs/prompts/0048-hub-transactional-messages.md; docs/changelog/0048-hub-transactional-messages.md
codes: HUB-01, M-04, M-05

Model routing: Opus 5.5 (build), Fable 5.1 (direction).

Checks: build green · tsc 0 errors · lint:spacing 61 / 61 (baseline unchanged) · manual-lint 0 · hub-map 16 experiences, 92 pages (v0.21.1) · `npm run hub-map:check` 9 sample routes open · actions.json 59 actions (count unchanged; `hub.enterAs` enum gains `messages`). Alignment measured in the built app: at 1280 (ES and EN) and 768 the new card's preview starts at the same y as CRM's and Admin's; at 390 one column. HUB-01 captures re-shot (ES / EN × 390 / 1280, light and dark) and thumbnails.

## What changed

- **Data.** `HUB_EXPERIENCES` gets `exp('messages', 'M-04', 'team', 'desktop', '/admin/emails', 'coordinator', true, …)` with
  `secondary: { label: 'WhatsApp →', route: '/admin/whatsapp' }` (short so it sits beside the button at 1280 and the card's preview lines up with CRM's and Admin's); `HUB_SURFACES` follows (16).
  `HUB_GROUPS` gains `messages` and `HUB_GROUP_RULES` sends `/admin/emails` and `/admin/whatsapp` to it.
- **Generator.** `experienceOf()` in `scripts/gen-hub-map.mjs` assigns the two admin routes to `messages`.
- **Page.** `CARD_UI.messages = { icon: 'mail', hue: 'inbox', secondaryAsRole: true }`. `hue` picks the card's hue family
  (default: its own key). `secondaryAsRole` makes the secondary link switch to the card's demo user before navigating,
  like the button; the customer app's "Entrar o crear cuenta" link is unchanged (no switch).
- **Docs.** HUB-01 page doc (Band B list, 0048 note), hub-map reference (counts, device table, summary), surfaces.md
  (`hub.enterAs` enum), kanban, README, ROADMAP §A. HUB-01 captures re-shot (ES / EN × 390 / 1280, light and dark) and its
  thumbnails; this also closes the 0045 card "Stale HUB-01 capture".
