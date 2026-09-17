# Documentation rules

These rules are mandatory and are executed **in the same turn as the work**, never later.

## 1. Prompt log (`docs/prompts/`)
- Every prompt that changes the system is stored verbatim as `NNNN-slug.md`, with:
  - **Source** (Slack thread link or "direct"), date, requester role (never personal contact data).
  - **Prompt** — exact text, with Slack `<@U…>` mention tokens removed.
  - **Response** — what was actually built, what was deferred, and links to the changelog entry.
- Follow-up messages in the same thread that change scope get their own numbered file.

## 2. Changelog (`docs/changelog/`, K-01 format)
Each change: `NNNN-slug.md` with front-matter-like header lines:
```
version: 0.x.y
date: YYYY-MM-DD
prompt: docs/prompts/NNNN-slug.md
intent: one line
decision: what was done and why
rejected: the alternative considered and why not
files: list of paths or globs
```
`/#/dev/knowledgebase` renders these newest first.

## 3. Kanban (`docs/kanban.md`)
Three columns as markdown headings (Backlog / Doing / Done), one line per item with its page
code(s). Move items in the same turn as the work.

## 4. Screenshots (`docs/screenshots/<page-code>/`)
- Every routed page is captured in **ES and EN**, at **390 px (mobile)** and **1280 px (desktop)**.
- Key pages (hub, website home, customer home, table manager, component library) are also captured
  in **light and dark**.
- File name: `<code>.<lang>.<width>[.dark].png`, e.g. `C-01.es.390.png`, `M-03.en.1280.dark.png`.
- Generated with `npm run screenshots` (`scripts/screenshots.mjs`, Playwright, Chromium preinstalled
  at `/opt/pw-browsers`; never run `playwright install` in this environment).
- Each page's doc (and the ops manual) references screenshots with relative image links so they
  render in-app. Use many screenshots: a doc that describes a screen without showing it is incomplete.
- Regenerate after any visual change and commit the PNGs with the change.

## 5. Component library and tokens
- New component → `.meta.ts` in the same commit (see `CLAUDE.md`).
- New token value → `src/design/tokens.ts` only; never a literal in a component.

## 6. Language
Docs for the software: English with a Spanish summary. Ops manual: Spanish first, English second.
