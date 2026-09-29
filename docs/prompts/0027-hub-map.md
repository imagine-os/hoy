# Hub map — hoy seen from aluzina, between-gigs and its own hub

Source: Slack thread (#hoy) · 2026-09-29 · requester: owner

## Prompt

Justin Massion, 2026-09-29, #hoy, verbatim (Slack mention tokens removed):

> Take a look at the hoy hub we built and each of the dashboards and website and tools and mobile and desktop experiences by user, arrange these on mats in aluzina dashboard brilliantly, to make it all feel physical and wow. Of note website can be a stack of multiple tall pages or condensed in size as needed. But lets see the hub laid out more physically and with the designated users like we did for aluzina. This is an aluzina client also. So it should fit in aluzina her way. Of note hiy will be in aluzina, in my between gigs company os system and in its own as it is now. The key being that each systems point of view can see into the hoy hub contents in its own way.

## Response

This entry covers hoy's half of the request (the aluzina desk that lays hoy out on mats is built in the aluzina
repo). The key sentence was the last one: three systems each looking into the same hoy hub in their own way.
So hoy now publishes **one machine-readable hub map** and every host, hoy's own hub included, draws from it.
Branch `feat/hub-map` from `main` at `8bd4e6b`, version **0.11.0** (new public surface). Full record in
`docs/changelog/0027-hub-map.md`.

1. **Contract `hoy.hub-map/1`** (`src/hub/hubMap.types.ts`, documented in `docs/reference/hub-map.md`): product,
   embed pattern, 9 roles (band, home, primary device, demo user, figure look, two desk props), 13 experiences
   (the hub cards: owning role, every role allowed in, device, route, url, page codes, shots), all 87 page codes,
   9 tools, and a lens hint each for aluzina (by role, one mat per client role), between-gigs (by experience, with
   tools) and standalone (by surface, hoy's own testing hub).
2. **One source of truth**: `src/hub/hubMap.data.ts` is pure data (plain node can load it). HUB-01 now renders
   its bands and tool row from it and derives its card strings from it; only icons and preview shapes stay in
   `HubPage.tsx`. The hub looks and behaves as before (pixel diff at 1280 and 390, ES and EN: only the actions
   count in the stat strip changed, 15 → 16, plus the version badge).
3. **`npm run hub-map`** (`scripts/gen-hub-map.mjs`, first step of `npm run build`): joins the data module with
   the live route registry through Vite's SSR loader (no browser), validates the result and writes
   `public/hub-map.json`; deterministic (two runs byte-identical). **`scripts/copy-shots.mjs`** (last build step)
   copies the 854 thumbs and captures the map points at into `dist/hub-map/shots/` (61.6 MB, under the 80 MB
   budget).
4. **Website as tall pages**: `npm run screenshots -- --full` writes `es-390-full.jpg` / `en-390-full.jpg`
   (390 wide, full page, capped at 6000 px, q70) for W-01…W-09; they are in the map's `shots.full`.
5. **Action `hub.map`** on HUB-01 ("Dame el mapa del hub" / "Give me the hub map") answers with the map's URL
   and loads it into `window.__hoyos.hubMap.data`; `docs/reference/surfaces.md` §4 lists the new file and URL.

Live: `https://imagine-os.github.io/hoy/hub-map.json`.
