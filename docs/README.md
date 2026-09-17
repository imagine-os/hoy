# HoyOS documentation

Everything about the software lives here and is rendered in-app at `/#/docs` (sidebar tree =
this folder). The club's **operations manual** (how HOY runs, in person and in software) lives in
`ops-manual/` and is rendered at `/#/manual`.

## Map
| Path | What |
| --- | --- |
| `rules/documentation.md` | The documentation rules: prompt log, changelog, kanban, screenshots. |
| `prompts/NNNN-slug.md` | Every prompt verbatim + the response summary. |
| `changelog/NNNN-slug.md` | K-01 entries: version, date, intent, decision, alternative rejected, files. |
| `kanban.md` | Live board: backlog / doing / done, updated every turn. |
| `architecture.md` | Folder map, extension points, providers, shells. |
| `roles.md` | Role matrix, demo users, dev mode and "view as". |
| `i18n.md` | String tables, `useT`, fallback rules. |
| `design-system.md` | Tokens (D-01), themes, skins, component library rule (D-02). |
| `data-model.md` | Tables, Supabase mapping, RLS notes, `supabase/schema.sql`. |
| `screenshots/<code>/` | PNGs produced by `npm run screenshots`. |
| `ops-manual/` | The club operations manual (another track writes it). |

## Conventions
- Markdown, English first with a Spanish summary at the end of each document where it matters
  for the studio team; the operations manual is Spanish first.
- Page codes (`C-01`, `S-02`, …) are the shared vocabulary between canvas, specs, screenshots and docs.
- Numbered files (`0001-…`) are append-only; never renumber.
