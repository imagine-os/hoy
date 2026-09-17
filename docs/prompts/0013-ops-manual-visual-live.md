version: 0.6.0
date: 2026-09-17
slug: ops-manual-visual-live
codes: K-03 K-04 D-02

# Prompt

_Third track of the same owner prompt as `0011` and `0012` — see
[`docs/prompts/0011-website-brand-content.md`](./0011-website-brand-content.md) for the verbatim Slack
message and its two attachments. **Reconstructed** in the 0020 polish pass: 0013 shipped with a changelog
entry that referenced this file without creating it. The manual paragraph of Justin's message, quoted from
0011, and the track brief the coordinator derived from it (from the changelog's `intent:` line):_

> Also, you can make the operations manual more visual, maybe pull in screenshots from the app and
> anything else you need to do to make it feel more like a beautiful experience for whoever is reading
> it. Think if there's anything missing or can be categorized any better as needed or whatever. Also it
> can dynamically pull key data from the backend system itself too, such as price models, and more.

> _Track brief (reconstructed from the changelog intent — original wording not preserved):_ make the
> operations manual (K-03) something the owner and a new hire would actually read — show the real
> screens instead of dashed placeholders, re-categorise the eleven flat chapters into parts that match
> how the business is run, fill the gaps with the owner's brand copy and the value model, and stop
> copying numbers the system already owns into prose.

## Response

Three changes, in order: **live data instead of copied numbers** (`{{pricing:…}}`, `{{tenant:…}}`,
`{{policy:…}}`, `{{table:…}}`, `{{roles}}`, `{{routes:…}}`, `{{stats}}`, `{{kpi:…}}` rendered by the new
`LiveBlock` organism from the app's own sources), **real screenshots** through the new `Figure` organism
(every `[screenshot: …]` placeholder replaced), and **seven parts, 28 chapters** with front matter `part`
+ `summary`, a cover at `/manual` with search, reading paths by role and `ChapterCard`s, a per-chapter
`Toc`, and `LEGACY_SLUGS` so old links keep resolving. One unplanned fix: pipe tables render everywhere
through a fenced-block transform because the repo has no `remark-gfm`. Full decision record and the
alternatives rejected: `docs/changelog/0013-ops-manual-visual-live.md`.
