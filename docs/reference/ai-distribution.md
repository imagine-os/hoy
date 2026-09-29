# AI distribution — one MCP server, WebMCP in the page, marketplace listings as packaging

**Checked 2026-09-29** (v0.18.0, 0043). Platform rules change monthly; re-check the table's *Source date* column before
acting on a row. What a machine can drive in HoyOS **today** is in [`surfaces.md`](./surfaces.md); this file is the plan
for what comes next. Decision: [D-0019](../decisions.md). Model routing for this pass: Fable 5.1 (audit judgment, the MCP
vs WebMCP answer, architecture and this plan), Opus 5.5 (build: `actions.json`, the surfaces fixes, writing the docs),
research by a Fable 5.1 worker.

---

## 1. MCP vs WebMCP (the plain answer)

- **MCP (Model Context Protocol) is a wire protocol.** A server exposes tools, resources and prompts to AI clients
  (Claude, ChatGPT, Cursor, the Grok API, Gemini Enterprise, Copilot…) over stdio or **Streamable HTTP**. The current
  spec is **2026-07-28**: a stateless core, POST-only Streamable HTTP, OAuth 2.1 with Protected Resource Metadata
  required, CIMD preferred, DCR deprecated, and the old HTTP+SSE transport formally deprecated. It needs a server
  process. HoyOS has none today ([surfaces.md §3](./surfaces.md)).
- **WebMCP is a browser API** (W3C Web Machine Learning Community Group, Draft Community Group Report of 29 Sep 2026;
  Chrome origin trial M149–M156, ship target Chrome 157). A web page registers tools in client-side script with
  `document.modelContext.registerTool()` (older spelling `navigator.modelContext`) or with declarative `<form>` tools,
  so an agent driving the browser can call them. Same vocabulary as MCP (tools, JSON Schema), not wire-compatible with
  it, no server.
- **How HoyOS uses each.** The actions registry (`window.__hoyos.actions` / `run()`, now also published as
  `actions.json`) **is** our WebMCP surface: one adapter registers the mounted actions as `document.modelContext`
  tools. The same vocabulary becomes the MCP server's tool list when the server exists. Developer keys (D-0018) and,
  later, OAuth are the auth story for MCP; WebMCP runs under the signed-in session in the page and needs no keys.

**In one sentence:** they are different (a protocol over the network vs an API inside the page), they share the
vocabulary, and HoyOS feeds both from one registry.

---

## 2. Landscape (verified 2026-09-29)

"Source date" is the page's own date where shown, otherwise the fetch date. Anything not confirmed from a primary
source is marked UNVERIFIED.

| Platform | Program | MCP-based? | Auth / transport | Open to all? | Source date | URL |
|---|---|---|---|---|---|---|
| OpenAI ChatGPT + Codex | **Plugins** (skills + MCP server + optional UI); Plugin Directory replaced App Directory 2026-07-09 (secondary source, UNVERIFIED) | Yes (remote MCP; Apps SDK docs now titled "ChatGPT Plugins") | Streamable HTTP at a stable HTTPS URL; OAuth 2.1 per the MCP auth spec: PRM at `/.well-known/oauth-protected-resource`, PKCE S256, CIMD preferred, DCR or pre-registered client; `noauth` allowed; domain challenge at `/.well-known/openai-apps-challenge` | Yes: any org with verified identity; ZIP upload at platform.openai.com/plugins; 5 positive + 3 negative test cases, video, test account; country codes | fetched 2026-09-29 | https://developers.openai.com/apps-sdk/deploy/submission , https://developers.openai.com/apps-sdk/build/auth |
| Anthropic Claude (claude.ai / Desktop / mobile / Cowork / Code) | **Anthropic directory**: *MCP connector* (remote server URL) and *plugin bundle* (GitHub repo); portal claude.ai/directory/manage | Yes | Streamable HTTP (legacy SSE accepted, deprecated). Auth types `oauth_dcr`, `oauth_cimd` (default), `oauth_anthropic_creds`, `custom_connection`, `static_headers` (beta), `none`. Callback `https://claude.ai/api/mcp/auth_callback` + loopback for Claude Code. Follows the 2025-03-26 / 06-18 / 11-25 auth specs | Yes: any paid plan, no partner program. Connectors auto-scanned, listed **Community** by default; **Verified** by Anthropic escalation only. Custom connectors by URL work on Free (1) and every plan without review | fetched 2026-09-29 | https://claude.com/docs/directory/publish , https://claude.com/docs/connectors/building/authentication |
| Anthropic — desktop extensions (.mcpb) | MCPB (formerly DXT), repo moved to modelcontextprotocol/mcpb | Local MCP in a zip + manifest.json | Local stdio; drag the .mcpb into Settings > Extensions | Directory **no longer accepts** MCPB listings; ship local servers inside a plugin bundle | fetched 2026-09-29 | https://github.com/modelcontextprotocol/mcpb , https://claude.com/docs/directory/publish |
| Anthropic — Claude Code plugins | Own marketplace = `.claude-plugin/marketplace.json` in any git repo (no submission); Anthropic directory via the portal; `claude-plugins-official` is partner-only | Plugins bundle MCP servers, skills, hooks, agents | n/a (git host access controls) | Yes for an own marketplace; the directory needs a paid plan + a public GitHub repo | fetched 2026-09-29 | https://code.claude.com/docs/en/plugins/publish |
| Agent Skills | Open SKILL.md format (agentskills.io, originated by Anthropic); adopted by Claude, ChatGPT / Codex, Cursor, Gemini CLI, Copilot… | No (complementary; "Skills over MCP" is an official MCP extension) | n/a | Yes (open spec; no central store — skills ship inside plugins) | fetched 2026-09-29 | https://agentskills.io/ , https://modelcontextprotocol.io/docs/extensions/overview |
| Cursor | **Cursor Marketplace** (plugins: MCP servers, skills, rules, agents, commands, hooks); team private marketplaces; deeplinks | Yes (MCP servers inside plugins; `mcp.json`) | Deeplink `cursor://anysphere.cursor-deeplink/mcp/install?name=$NAME&config=$BASE64_JSON` (config = the `mcp.json` entry) | **Curated**: open source only, every submission and update reviewed. Submission form reportedly cursor.com/marketplace/publish (forum; UNVERIFIED) | fetched 2026-09-29 | https://cursor.com/docs/mcp/install-links , https://cursor.com/docs/plugins , https://cursor.com/help/security-and-privacy/marketplace-security |
| xAI Grok (consumer app) | **Grok Connectors**: 7 built-in (OAuth), a third-party catalog, custom MCP servers | Yes (custom MCP servers) | OAuth for built-in / catalog; a custom MCP server must be publicly reachable; Business / Enterprise need admin provisioning | Built-in: all users. Custom MCP: yes (org-provisioned). **No developer submission or marketplace documented** | fetched 2026-09-29 | https://docs.x.ai/grok/connectors |
| xAI Grok API | Remote MCP Tools in the xAI SDK, OpenAI-compatible Responses API | Yes | "Only Streaming HTTP and SSE transports"; `authorization` + custom `headers`; no `require_approval` / `connector_id` | Yes (API key) | fetched 2026-09-29 | https://docs.x.ai/docs/guides/tools/remote-mcp-tools |
| xAI Grok Build (CLI) | **Grok Build Plugin Marketplace** (2026-06-11), index = GitHub `xai-org/plugin-marketplace` | Plugins bundle skills, commands, agents, hooks, MCP servers, LSPs | n/a (open PR-based index) | Yes: "open catalog", submit a PR | 2026-06-11 | https://x.ai/news/grok-plugin-marketplace |
| Meta **Muse** (Meta's personal AI agent, launched ~2026-09-08) | Curated Connectors + **Custom Connectors** (the user asks Muse to build one; Meta does not review). **Muse connector platform**: partners apply at muse.ai/platform | Custom connectors reportedly MCP over Streamable HTTP inside Muse's VM (secondary source, UNVERIFIED; Meta's help page does not mention MCP) | Credentials in a Secure Credentials Store; approvals via Sentinel (secondary) | Partner program = **application**, not an open store. Muse for Small Business: US + Canada only | 2026-09-29 (Meta newsroom) | https://about.fb.com/news/2026/09/introducing-muse-small-business/ , https://www.meta.com/help/artificial-intelligence/1687253048996149/ |
| Google Gemini CLI | **Extensions** (`gemini-extension.json` bundles MCP servers, skills, commands, hooks); gallery auto-indexes public GitHub repos tagged `gemini-cli-extension` | Yes | n/a (installs from GitHub) | Yes, self-serve, unvetted daily crawl. Docs say Antigravity CLI replaced Gemini CLI on 2026-06-18 for free / Google One tiers | fetched 2026-09-29 | https://geminicli.com/docs/extensions/ , https://geminicli.com/docs/extensions/releasing/ |
| Google Gemini Enterprise | **Custom MCP server data store** (GA) | Yes | **Streamable HTTP only, no SSE**; auth none, OAuth 2.0 (PKCE), Cloud Run IAM; TLS; admin role `discoveryengine.editor` | Added by the customer's admin; no public marketplace for MCP servers found (A2A agent registration also exists — UNVERIFIED) | page updated 2026-09-29 | https://docs.cloud.google.com/gemini/enterprise/docs/connectors/custom-mcp-server/set-up-custom-mcp-server |
| Microsoft Copilot Studio / M365 Copilot | Copilot Studio **MCP tools** (tools + resources); cross-tenant via connector certification; **Agent Store** via Partner Center | Yes | Copilot Studio wizard connects an existing MCP server; Partner Center: marketplace certification + M365 store validation + Responsible AI checks | Yes via Partner Center for Agents Toolkit / custom-engine agents; Agent Builder and Copilot Studio declarative agents are org-catalog only | ms.date 2026-08-26 (MCP), 2026-08-05 (publish) | https://learn.microsoft.com/en-us/microsoft-copilot-studio/agent-extend-action-mcp , https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/publish |
| Perplexity | **Custom remote connectors** (Account settings > Connectors > + Custom connector > Remote) | Yes | HTTPS URL; Streamable HTTP or SSE; None / API key / OAuth 2.0 (uses DCR; servers without DCR reportedly fail) | Paid plans (Enterprise admin-gated). **No public developer directory found** | UNVERIFIED date (help page 403; search snippet) | https://www.perplexity.ai/help-center/en/articles/13915507-adding-custom-remote-connectors |
| Official MCP Registry | registry.modelcontextprotocol.io (preview since 2025-09-08; API v0.1 frozen Oct 2025; GA "planned") | Yes | `server.json` via the `mcp-publisher` CLI; namespace by GitHub login (`io.github.*`) or DNS / HTTP domain proof; remotes streamable-http, sse | Yes, self-serve | fetched 2026-09-29 | https://github.com/modelcontextprotocol/registry , https://registry.modelcontextprotocol.io/docs |
| Third-party directories | Glama, Smithery, mcp.so, PulseMCP (registry co-maintainer) | Yes | Mostly crawl / ingest from GitHub + the official registry | Yes; listing counts are secondary-source and UNVERIFIED | 2026-03..05 blogs | https://glama.ai/mcp , https://smithery.ai , https://mcp.so , https://www.pulsemcp.com |
| MCP spec | **2026-07-28** (previous 2025-11-25) | — | Stateless core; Streamable HTTP POST-only, no sessions / GET; OAuth 2.1 with PRM (RFC 9728) MUST, CIMD SHOULD, DCR deprecated; HTTP+SSE formally Deprecated | — | 2026-07-28 | https://modelcontextprotocol.io/specification/2026-07-28/changelog |
| WebMCP | W3C WebML CG **Draft Community Group Report** (29 Sep 2026); Chrome **origin trial M149–M156**, ship target M157 | Inspired by MCP; pages "can be thought of as MCP servers that implement tools in client-side script" | `document.modelContext.registerTool()` (`navigator.modelContext` deprecated in Chrome 150 — secondary, partially UNVERIFIED); declarative `<form>` tools | Chrome origin trial open to any registered origin; flag `chrome://flags/#enable-webmcp-testing` | 2026-09-29 (spec), 2026-05-15 (I2E), 2026-08-07 (Chrome docs) | https://github.com/webmachinelearning/webmcp , https://webmachinelearning.github.io/webmcp/ , https://developer.chrome.com/docs/ai/webmcp |

**What this means**

- **(a)** MCP over Streamable HTTP + OAuth 2.1 is the common denominator: one server reaches every row above.
- **(b) Open, self-serve today:** Anthropic directory (Community tier, paid plan), OpenAI Plugin Directory (verified
  org, review, test cases), the official MCP Registry, the Gemini CLI gallery (GitHub topic), the Grok Build
  marketplace (PR), a Cursor deeplink (no review).
- **(c) Gated:** Meta Muse partner platform (apply at muse.ai/platform; users can still attach HOY as a Custom
  Connector), the Cursor Marketplace (curated, open source only), the Microsoft Agent Store (Partner Center), the
  Anthropic Verified badge.
- **(d) GPT Actions / custom GPTs are a dead end:** no new GPTs after 2026-09-25, retirement 2026-12-11, and "GPT custom
  actions do not transfer" (dates from a search snippet, UNVERIFIED).
- **(e) In-chat UI:** MCP Apps (`io.modelcontextprotocol/ui`) render in Claude, VS Code and M365 Copilot; OpenAI
  plugins use their own iframe UI resource. One widget bundle, two adapters.

---

## 3. What HOY exposes (abilities by audience)

Scopes are the `Permission` ids from `src/auth/permissions.ts`, 1:1, so the same word gates the page, the WebMCP tool
and the MCP tool.

| Tool | Audience | Source action / data | Permission (scope) | Phase |
| --- | --- | --- | --- | --- |
| `classes.list` | Members · public | C-02 schedule (`class_sessions`) | `classes.read` (public) | 0 (read-only demo) |
| `hours.get` | Members · public | Weekly hours + overrides, the same data as `useOpeningHours()` | none (public) | 0 (read-only demo) |
| `bookings.list` | Members | The member's own bookings | `bookings.read` | 8 |
| `bookings.create` | Members | = `app.reserve` + `app.confirmReservation`; books only what costs nothing now — a pass that would be charged answers `ok: false` (the 0025 limit) | `bookings.write` | 8 |
| `bookings.cancel` | Members | The member's own booking | `bookings.write` | 8 |
| `plan.balance` | Members | Credits / membership | `payments.read` | 8 |
| `practice.stats` | Members | C-27 numbers (`src/data/analytics.ts`) | `bookings.read` | 8 |
| `practice.setGoal` | Members | = `app.setGoal` | `bookings.write` | 8 |
| `checkin.mark` | Staff | Front-desk check-in | `checkin.write` | 8 |
| `members.search` | Staff | CRM | `members.read` | 8 |
| `hours.override.add` / `hours.override.remove` | Staff | = `settings.hours.override.add` / `.remove` | `hours.write` | 8 |
| `hours.holidays.import` | Staff | = `settings.hours.holidays.import` | `hours.write` | 8 |
| `analytics.summary` | Staff | M-12 | `members.read` | 8 |
| `manual.listRequests` / `manual.answerRequest` | Staff | = the K-04 actions | `manual.edit` | 8 |

Members sign in with OAuth (or need nothing, for the public rows); staff use a developer key or OAuth with their role.
Phase numbers are the §5 items.

**Never over MCP:** paying (it stays a person's click), raw API keys, anything gated by `dev.tools`.

---

## 4. Architecture (D-0019, summarised; full text in `decisions.md`)

- **One server, many studios, many products.** A Cloudflare Worker (the same server the 0041 kanban card plans for the
  Google push and key verification) serves `POST /mcp` — Streamable HTTP in the 2026-07-28 shape, with a compatibility
  path for 2025-11-25 clients because Claude's OAuth client still follows the 2025 auth specs; never `/sse`. The tenant
  comes from the credential (a developer key → its `tenant_id`; an OAuth token → the user's memberships). A per-tenant
  alias `POST /t/{studio-slug}/mcp` serves the no-auth public tools (schedule, hours) and directories that want one URL
  per studio (Anthropic's "URL pattern" option).
- **Tool list = the actions vocabulary.** Tools are generated from the `actions.json` entries marked
  `surface: server | both` (a new optional `ActionDef.surface`, default `page`). `params` must become JSON Schema for
  MCP; today they are description strings. `permission` is enforced server-side — closing the "advisory metadata" gap
  in [surfaces.md §1](./surfaces.md) — and every write appends the same `audit_log` row the page does.
- **Auth, two doors.** Developer keys (D-0018, `Authorization: Bearer hoy_live_…`, scopes = permissions) for staff,
  machine and IDE clients (Cursor, the Grok API, Perplexity, Gemini Enterprise). OAuth 2.1 (PRM at
  `/.well-known/oauth-protected-resource`, PKCE S256, CIMD first, DCR fallback, the `resource` indicator) for consumer
  clients (Claude, ChatGPT, Muse), backed by Supabase Auth once it exists (ROADMAP P2).
- **Phase 0 works without Supabase.** A read-only demo server over the seed modules (`src/data/seed`) and
  `actions.json` for the demo tenant, so a URL can be pasted into Claude's custom connectors and Cursor today; writes
  answer `ok: false, "not wired yet"`, exactly like the page's Placeholders.
- **System-wide.** The Worker is a gateway: `{product}/{tenant}`. hoy publishes `actions.json` (schema `hoy.actions/1`)
  the way it publishes `hub-map.json`; aluzina and Between Gigs publish their own with the same generator, and the
  gateway mounts one tool set per product with the product's own permissions. `hub-map.json` is the precedent
  ([hub-map.md](./hub-map.md)).
- **WebMCP in the page.** `src/actions/webmcp.ts`: when `document.modelContext` exists (or the dev flag is on), register
  every mounted action as a tool whose `execute` calls `run(id, params)`; enroll the `imagine-os.github.io` origin in the
  Chrome origin trial. No server involved.

---

## 5. Order of operations (dependency-bound, model per task)

Tasks are bound by dependencies, not dates. Each item: **title** · depends on · model · deliverable · done when.

1. **0043 (this pass): `actions.json` + the surfaces audit + this plan** · — · Fable 5.1 / Opus 5.5 · `public/actions.json`,
   the audited `surfaces.md`, this file and D-0019 · **done.**
2. **Action schema for machines** · depends 1 · Opus 5.5 · `ActionDef.surface`, JSON-Schema `params` (keeping the human
   description), the §3 server tools marked · done when `actions.json` validates every param schema and `npm run actions`
   fails on a bad one.
3. **Demo MCP server (phase 0)** · depends 2 · Opus 5.5 · a Cloudflare Worker in `server/mcp/` (or a sibling repo — owner
   decision §6 44), Streamable HTTP 2026-07-28 + 2025-11-25 compat, read-only tools over the seed for tenant `hoy`,
   `npm run mcp:dev`, `npm run test:mcp` (initialize-less discover, `tools/list`, `tools/call`, Origin check) · done when
   one URL works as a Claude custom connector and as a Cursor deeplink.
4. **WebMCP adapter in the page** · depends 1 (parallel with 3) · Opus 5.5 · `src/actions/webmcp.ts` + the origin-trial
   token in `index.html` · done when, in Chrome with the flag, `document.modelContext.getTools()` lists the mounted actions.
5. **Zero-cost listings** · depends 3 · Sonnet 5.5 · `server.json` in the official MCP Registry (namespace by DNS proof or
   `io.github.imagine-os`), `.claude-plugin/marketplace.json` + a plugin bundle with skills ("book a class", "check
   today's hours"), `gemini-extension.json`, an "Add to Cursor" deeplink and "Add to Claude" instructions on D-07 · done
   when each install path has been exercised once and screenshotted into `docs/screenshots/D-07/`.
6. **Key verification on the Worker** (shared with the 0041 Google-push card) · depends 3 + Supabase (ROADMAP P2) ·
   Opus 5.5 · hash the bearer, match `api_keys.key_hash`, scope / expiry / revocation, stamp `last_used_at`; needs the
   `api_keys` table on Supabase · done when D-07 "Try a request" is unwrapped.
7. **OAuth 2.1 door** · depends Supabase Auth · Fable 5.1 design, Opus 5.5 build · PRM, CIMD + DCR fallback, PKCE,
   `resource`, Supabase Auth as the identity, a thin authorization server on the Worker · done when a Claude custom
   connector completes sign-in as a demo member.
8. **Member and staff write tools** · depends 6 and 7 · Opus 5.5 · the §3 write tools with server-side permission
   enforcement and `audit_log` · done when `bookings.create` books a free-now class from Claude and a charged pass
   answers `ok: false`.
9. **Directory submissions** · depends 7 (consumer listings) / 3 (registry-style listings) · Sonnet 5.5 packaging, Justin
   for accounts and verification · Anthropic directory (connector + plugin bundle; paid plan, Justin's account), OpenAI
   Plugin Directory (verified org, ZIP, 5 + 3 test cases, video), Grok Build marketplace PR, Meta Muse partner
   application (US + Canada today), Cursor Marketplace only if the server is open source (§6 45) · done when each is
   listed or its application filed, tracked in the kanban.
10. **In-chat UI** · depends 8 · Opus 5.5 · one HTML widget bundle (schedule + booking card) as an MCP App
    (`io.modelcontextprotocol/ui`) plus the OpenAI UI adapter · done when the widget renders in Claude and ChatGPT.
11. **System-wide gateway** · depends 3 · Fable 5.1 design, Opus 5.5 build · `gen-actions.mjs` moved to a shared package,
    aluzina and Between Gigs publish `actions.json`, the Worker mounts `{product}/{tenant}` · done when three products
    share one server with one directory listing per product.
12. **Repeat passes** · — · Sonnet 5.5 · re-check the §2 table monthly; re-date `surfaces.md` every pass.

Parallel lanes: 3 and 4 run side by side after 2 (4 only needs 1); 5 and 11 both hang off 3; 6 and 7 wait on Supabase
(ROADMAP P2); 8, 9 (consumer) and 10 follow the auth doors.

---

## 6. Owner decisions (Justin) — also ROADMAP §E 44–47

44. **Server hostname and home**: a `server/` folder in this repo, or a sibling repo `imagine-os/mcp`?
45. **Open-source the MCP server?** The Cursor Marketplace requires it; the official registry and Claude do not.
46. **Which accounts**: a paid Claude plan for the directory, OpenAI organization verification, the muse.ai/platform
    application, a GitHub-verified DNS namespace for the registry.
47. **May an agent book on a member's behalf when the pass would be charged**, or does paying stay a person's click (the
    0025 limit, kept today)?

---
**Resumen (ES).** MCP y WebMCP son cosas distintas: MCP es un protocolo de red (un servidor expone herramientas a
Claude, ChatGPT, Cursor, Grok, Gemini, Copilot… por Streamable HTTP, especificación 2026-07-28, OAuth 2.1) y HoyOS
todavía no tiene servidor; WebMCP es una API del navegador (`document.modelContext.registerTool()`, borrador del W3C y
origin trial de Chrome M149–M156) con la que la página misma registra herramientas, sin servidor. Comparten el
vocabulario y HoyOS alimenta ambos desde un solo registro de acciones, publicado ahora como `actions.json`. El plan
(D-0019): un solo servidor MCP multiestudio y multiproducto en un Cloudflare Worker (`POST /mcp`, el estudio sale de la
credencial, alias `/t/{estudio}/mcp` para lo público), herramientas generadas desde `actions.json`, permisos aplicados
en el servidor, dos puertas de acceso (llaves de desarrollador para personal y máquinas, OAuth 2.1 para Claude, ChatGPT
y Muse), una fase 0 de solo lectura sobre los datos demo, y el adaptador WebMCP en la página. Los directorios (Anthropic,
OpenAI, registro oficial MCP, Gemini CLI, Grok Build, Cursor, Meta Muse) son empaque del mismo servidor; los GPT
personalizados se retiran. Cobrar sigue siendo el clic de una persona. Quedan cuatro decisiones para Justin (ROADMAP §E
44–47): dónde vive el servidor, si es de código abierto, qué cuentas abrir y si un agente puede reservar algo que cobra.
