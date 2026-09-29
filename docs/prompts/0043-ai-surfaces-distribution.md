# Machine surfaces audit, actions.json and the AI distribution plan

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (via the coordinator)

## Prompt

do we have mcp cli, api stuff all organized proper. Not sure if mcp and web mcp are different?

Then start planning for plugins and stuff to get in chatgpt, claude, cursor, grok, meta muse and other ai marketplaces as needed.

Consider that topic for Hoy as well as how those abilities are system wide multiteantn.

## Response

Branch `feat/surfaces-actions-manifest` from `main` at `8b8faac` (0041, v0.17.0), rebased on `main` at `cbd9d00`
(0042 site cursor, v0.17.1, landed during the pass — so this is **0043**), version **0.18.0**. Full record in
`docs/changelog/0043-ai-surfaces-distribution.md`; decision D-0019; plan `docs/reference/ai-distribution.md`. Model
routing: Fable 5.1 (audit judgment, the MCP vs WebMCP answer, architecture and the plan), Opus 5.5 (build:
`actions.json`, the surfaces fixes, writing the docs), research by a Fable 5.1 worker.

1. **Is MCP / CLI / API organized? Yes, now audited and published.** `docs/reference/surfaces.md` was checked against
   the code (106 routes, 92 codes, 40 action ids on 16 page codes): every id, intent, param and permission matched; the
   fixes were the page column of `app.goHome` / `app.openSchedule` (also C-27), the route roles of
   `settings.hours.update` and `dev.apiKeys.create`, an actions table split in two, the missing `npm run capture-dates`
   row and the hub-map page count (89 → 92). New: `public/actions.json` (schema `hoy.actions/1`) — the whole actions
   vocabulary as a file, written by `npm run actions` on every build (`scripts/gen-actions.mjs`), served at
   `https://imagine-os.github.io/hoy/actions.json`, pointed to by `window.__hoyos.actionsUrl`. The HTTP API is still
   none (no server); that is the plan below.
2. **MCP vs WebMCP.** They are different (a protocol over the network vs an API inside the page), they share the
   vocabulary, and HoyOS feeds both from one registry. MCP needs a server (none yet); WebMCP is
   `document.modelContext.registerTool()` in the page, and our actions registry already is that surface.
3. **The plan.** `docs/reference/ai-distribution.md` §5: twelve dependency-bound steps — machine-grade action schemas,
   a read-only demo MCP server on a Cloudflare Worker, the WebMCP adapter, zero-cost listings (MCP Registry, Claude
   plugin marketplace, Gemini CLI, Cursor deeplink), key verification, the OAuth 2.1 door, write tools with server-side
   permissions, directory submissions (Anthropic, OpenAI, Grok Build, Meta Muse, Cursor), in-chat UI and the
   system-wide `{product}/{tenant}` gateway for aluzina and Between Gigs. Items 2–11 are cards at the top of the
   kanban's Backlog › Product. Multi-tenant answer: one server, the studio comes from the credential, one tool set per
   product (D-0019).

Owner decisions for Justin (ROADMAP §E 44–47): 44 where the server lives (`server/` here or `imagine-os/mcp`) and its
hostname; 45 open-source the MCP server (Cursor Marketplace requires it); 46 which accounts to open (paid Claude plan,
OpenAI org verification, muse.ai/platform application, a DNS namespace); 47 may an agent book on a member's behalf when
the pass would be charged, or does paying stay a person's click (today it does).
