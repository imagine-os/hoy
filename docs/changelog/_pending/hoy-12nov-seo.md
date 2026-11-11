# Hoy 12 Nov, lane H-SEO: the public site on real Spanish paths

Prompt intent: decision D11 and reading R5: the signed-out website is found by search engines.
Decision: the public pages live on real Spanish paths (`/planes`, `/clases`, ...) instead of hash routes, each with its own page title, description and tags (Open Graph, JSON-LD), served by the Hoy server with a generated `sitemap.xml` and `robots.txt`. The signed-in app keeps its hash routes. Links the app builds itself (sign-out return, Google return, invitation and teacher-code share links) use the site's origin in production, so a site path never ends up inside them.
Alternative rejected: pre-rendering every page at build time (the server tags the shell per request instead).
Files: server/app.mjs, server/seo.mjs, src/config/appBase.ts, src/modules/website/**, scripts/test-seo.mjs, scripts/test-hoy-12nov-r1.mjs
