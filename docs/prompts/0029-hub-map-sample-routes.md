# Hub map sample routes — every template page opens a real record

Source: Slack thread (#hoy) · 2026-09-29 · requester: owner

## Prompt

Follow-up from the coordinator after Justin approved the next pass: publish a working sample route per template page in the hub map so hosts can open detail pages live.

## Response

Hosts that embed a hoy page live (aluzina's W-05 drawer) opened template routes such as `/app/class/:id` literally
and got an empty page. Branch `feat/hub-map-sample-routes` from `main` at `2c1ae12`, version **0.11.2**. Full record
in `docs/changelog/0029-hub-map-sample-routes.md`.

1. **`pages[].sampleRoute`** — optional, only on the 9 template pages (`src/hub/hubMap.types.ts`,
   `docs/reference/hub-map.md`). Additive: the schema id stays `hoy.hub-map/1`. Hosts embed `sampleRoute ?? route`.
2. **Mapping as data** — `HUB_SAMPLE_ROUTES` in `src/hub/hubMap.data.ts`; the generator fails the build when a
   template page has no sample.
3. **Live ids** — the demo seed rebuilds daily with date-based ids, so seven samples use the reserved `sample`
   segment, which the app resolves on load (`src/app/SampleRoute.tsx`, picks in `src/hub/sampleIds.ts`):
   `/app/class/sample` and `/app/checkout/sample` (the next class with bookings), `/app/booking/sample` and
   `/app/booking/sample/change` (Juliana's next booking), `/app/rate/sample` (a class she attended),
   `/app/waitlist/sample` (the next full class), `/admin/finance/payouts/sample` (the approved payout run).
   Literal: `/app/legal/terms`, `/site/classes/hot-yoga`. `checkHubMapData()` checks every one against the seed.
4. **`npm run hub-map:check`** (`scripts/check-sample-routes.mjs`) opens all nine as a host would; 9 / 9 open real
   pages. Build green, `hub-map.json` regenerated (two runs byte-identical), kanban updated.
