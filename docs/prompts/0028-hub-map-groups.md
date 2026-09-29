# Hub map page groups — one split of the customer app for every host

Source: Slack thread (#hoy) · 2026-09-29 · requester: owner

## Prompt

Follow-up from the coordinator: publish page nav groups in the hub map so every host splits the customer app the same way; tick the aluzina consumer card.

## Response

The aluzina client hub desk (W-05) had to guess how to split the customer app's pages into sub-mats, so hoy now
says it at the source. Branch `docs/hub-map-groups` from `main` at `c8efba3`, version **0.11.1**. Full record in
`docs/changelog/0028-hub-map-groups.md`.

1. **`pages[].group`** — optional `{ id, label: { es, en }, order }` on `HubPage` (`src/hub/hubMap.types.ts`,
   `docs/reference/hub-map.md`). Additive: the schema id stays `hoy.hub-map/1`.
2. **Mapping as data** — `HUB_GROUPS` and `HUB_GROUP_RULES` (route prefix → group, longest prefix wins) plus the
   pure `hubGroupOf(path)` in `src/hub/hubMap.data.ts`, so the hub page can use the same table; the generator
   only looks it up and fails the build when a page matches no rule.
3. **Groups (87 pages, 17 ids)** — customer app: `book` 10, `pay` 9, `account` 13, `auth` 5; `site` 10; `teach` 1;
   `desk` 3, `inbox` 1, `pos` 1; `admin` 9, `content` 7, `crm` 2, `finance` 4, `tables` 1; `dev` 8, `docs` 1,
   `manual` 2.
4. **Regenerated** `public/hub-map.json` (two runs byte-identical), build green, kanban: the aluzina consumer card
   is Done (https://imagine-os.github.io/aluzina/#/founder/clients/hoy/hub); the between-gigs card stays in
   Backlog, noting aluzina's `docs/tenant/hub-map-consumer.md` as the consumer guide.
