version: 0.23.1
date: 2026-10-05
prompt: docs/prompts/0057-coming-soon.md
intent: Add a standalone Coming Soon page and hub card, separate from the current website.
decision: Register W-11 at /coming-soon with existing branded motion, ES/EN and a real Instagram destination.
rejected: Replacing /site or introducing an unconnected email waitlist.
files: src/modules/coming-soon/*; src/components/template/ComingSoonLanding/*; src/hub/hubMap.data.ts; src/modules/hub/{HubPage,specs,strings}; scripts/gen-hub-map.mjs; docs/pages/W-11.md

# 0057 · Standalone Coming Soon page

- Version: 0.23.1 (combined release with 0056)
- Date: 2026-10-05
- Prompt intent: add a Coming Soon page in the hub, separate from the full HOY website
- Decision: register W-11 at `/coming-soon` as a separate public module and hub experience, with a real preview and normal Open button
- Alternative rejected: replacing `/site`, adding Coming Soon to the website edition picker, or presenting an unconnected email waitlist
- Brand: reuse the existing wordmark, sanctuary concept artwork/local ambient loop, tenant identity and brand tagline; the image is labelled as concept artwork for accessibility
- Behavior: ES/EN, visible motion pause, existing AmbientScene reduced-motion/save-data/image fallback; one external CTA to the confirmed studio Instagram profile
- Scope: no DNS, domain, account, lead-collection, pricing, opening date or website-edition changes
- Files touched: `src/modules/coming-soon/*`, `src/components/template/ComingSoonLanding/*`, `src/hub/hubMap.data.ts`, `src/modules/hub/HubPage.tsx`, `src/modules/hub/specs.ts`, `scripts/gen-hub-map.mjs`, the W-11 page/capture docs and this prompt/changelog/kanban entry
- Verification: spacing lint passes at its unchanged 60-value baseline. Integrated release owner runs the final full build, browser interaction matrix and captures before merging
