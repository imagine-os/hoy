# Hoy 12 Nov, lane CIFIX: the CI checks follow the programme's decisions

Prompt intent: after the Hoy 12 Nov lanes merged, the CI checks still asserted the earlier behaviour (mat picker, one class a day, hash links, root home) and one review-build regression showed up.
Decision: `MockProvider` saves the expanded demo calendar at start again (the persist that went with `assignLegacyMats` before the mats were removed), so a later before/after comparison does not read the expansion as a change. The checks follow the decisions: no mat in the booking, sign-in and return flows (D1), no daily limit and only the held class hidden for promotions (D9), hash links under the page's base tag, the website launch tests read the home at the root with the go-live setting the production boot reads (D11), the route-connectivity inventory regenerated, the provider mapping test expects `status_reason`, and the held-contact read test waits for the swapped provider before releasing the read.
Alternative rejected: loosening the checks instead of updating what they assert.
Files: src/data/MockProvider.ts, scripts/test-*.mjs (the UI and provider checks named above), docs/route-connectivity.md
Version: pending (merged with the Hoy 12 Nov release; review build and tests only, no production behaviour change).
