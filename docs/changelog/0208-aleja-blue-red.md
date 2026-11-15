---
date: 2026-11-14
version: pending (based on 1.2.4)
prompt: docs/prompts/0208-aleja-blue-red.md
intent: Follow Aleja’s supplied predominantly blue/navy direction with selected red gradients and use her acroyoga photo for private classes.
decision: Current-public-edition tokens, restrained hero/card/footer accents, complete-photo private-class presentation on Home and Plans; preserve ready CMS overrides.
rejected: Rebuilding the site, changing copy/prices/packages from the screenshot, global/admin palette replacement, or cropping the acroyoga pose into a wide background.
files: tokens.ts/css, website/blue-red.css, SiteShell.tsx, HomePage.tsx, PlansPage.tsx, studioPhotography.ts, PrivateClassPhoto component/meta, private-acroyoga WebP assets, generated media inventory, dedicated QA workflow/script.
---

# Public blue/navy direction · W-01, P-01 and current public shell

The attached five-screen reference supplies palette and gradient direction only. Cream typography/controls sit on blue surfaces in light state and deeper navy in dark state; red gradients are reserved for the hero, plan surfaces, finale card and footer. Classic/Archive, customer/admin surfaces, all content/pricing/booking handlers and current frame CSS remain separate.

The attached acroyoga photo appears in the Home private-class card and the Plans private-class block, with natural proportions so both people stay visible. Existing ready `site.plans.private` Content selections remain authoritative. Alt text exists in ES and EN. The living D-02 inventory includes the supplied-photo/CMS-override/natural-size states; D-01 holds the scoped palette and gradients.

Preflight: clean checkout; latest remote main and actual production `release.json`/`health` match cc6c8e6, v1.2.4, including PR146 frames. Open held PR141 and older feature work excluded. No concurrent blue/red branch or PR found. Existing test deployment predates current main and is not presented as this preview.

Validation pending: review/production builds, baseline copy/price/link equality, public route/locale/viewport/theme captures, retained frame checks and two independent review rounds. Local Chromium is blocked by socket permissions; actual browser checks run on GitHub Actions. No production deployment or customer-data mutation is claimed.
