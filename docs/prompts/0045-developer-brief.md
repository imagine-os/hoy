# Developer brief: the machine surfaces, MCP vs WebMCP, actions.json, the AI distribution plan and the integrations

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion

## Prompt

Give me a report of these topics and anyother key topics for our developer. please. Include links and screenshots of the related pages, including integration stuff

## Response

"These topics" are the 0043 work that landed today (v0.18.0, PR #20, D-0019): the machine surfaces audit, MCP vs
WebMCP, `actions.json` and the AI distribution plan. Shipped as **v0.19.1** (docs only) on branch
`docs/developer-brief` from `main` at `41e992b` (0044 tables views, v0.19.0, landed before this pass started, so this
entry is **0045**).

- **`docs/reference/developer-brief.md`** — the brief for a developer joining, in 13 sections, each linked to its
  source file on GitHub and to the live page: what HoyOS is and how it deploys; the repo map and the extension points
  that must not be bypassed; roles, the 30 permissions, dev mode and the demo users; the 57-table data model and the
  `DataProvider` seam; the multi-tenant rule; the machine surfaces (`window.__hoyos`, the 51 actions, `actions.json`,
  `hub-map.json`, the CLI grouped, no HTTP API); MCP vs WebMCP; the integrations (Google Business Profile with the exact
  `locations.patch` body, developer keys, hours and holidays, Supabase, Wompi, WhatsApp and email, the M-10 catalogue);
  the AI distribution plan (architecture, abilities, the twelve steps, the landscape, the owner decisions); how we
  document; the quality bar; what is next; and a screenshots table.
- **A report page** built from the same content, with screenshots of HUB-01, D-07, M-10, M-10a, M-08g, M-08a, M-03,
  D-03, D-05, K-01, D-02, C-02 and W-01, published as a private Artifact for Justin to share.
- **Found while writing:** three developer-key scopes (`customers.read`, `hours.read`, `webhooks.receive`) are not
  `Permission` ids, although the AI distribution plan says scopes are permissions 1:1 — carded, to fold into plan step 2;
  `docs/screenshots/D-02/{es,en}-1280[-dark].jpg` are empty files and the HUB-01 capture still shows v0.14.0 — carded.
- Facts that moved since 0043 are stated as they are now: 57 tables (not 54), 51 actions (40 at 0043, plus eleven
  `tables.*` in 0044).

Changelog: `docs/changelog/0045-developer-brief.md`. Model routing: Opus 5.5 (reading the sources, the brief, the
report page, the captures).
