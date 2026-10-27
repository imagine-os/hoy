# Public website sharing

Share the Coming Soon page at `https://hoyhumanclub.com/` and the full website at `https://hoyhumanclub.com/website/`. The latter is a static crawler-readable entry that opens the existing default Latest website for visitors. Hash fragments are not sent in HTTP requests, so `/#/site` cannot provide separate server-readable social metadata.

Both previews use the existing HOY wordmark, public studio photograph and approved website copy. Their versioned 1200×630 PNGs are in `public/social`. Metadata configuration lives in `scripts/lib/social-sharing.mjs`; regenerate HTML with `node scripts/generate-social-sharing.mjs` and cards with `node scripts/render-social-cards.mjs` (Chromium required). Run `node scripts/test-social-sharing.mjs` to catch configuration/output drift.

The shared Sanctuary page-heading texture uses a radial alpha mask to fade its opaque rectangular edges. Its artwork, dimensions, text and pointer behavior are retained. Other full-background texture uses are unchanged.

The dedicated workflow checks the full build, static crawler responses, preview assets, redirect and shared Plans/Teachers/About headings. Social platforms may cache old previews; deployment does not prove their caches have refreshed. Homepage bottom-photo selection is outside this change.
