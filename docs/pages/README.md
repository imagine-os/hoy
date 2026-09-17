# Page docs

One file per page code (`C-02.md`, `S-02.md`, …), created from `_TEMPLATE.md` or generated with
`node scripts/gen-page-doc.mjs <code>` (fills purpose, route, roles, layout, data and the screenshot
links from the spec and the module routes). Rules: `docs/rules/documentation.md` §5.

Images resolve relative to this folder: `../screenshots/<code>/<lang>-<width>[-dark].png`.
The viewer at `/#/docs` renders `[screenshot: CODE — caption]` lines as dashed placeholders until the
PNG exists.
