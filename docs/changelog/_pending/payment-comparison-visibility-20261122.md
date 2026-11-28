# Make the required payment comparison easier to find

Version: unreleased, based on HOY web v1.6.5. Date: 2026-11-23 UTC. Screen: S-09, `/staff/transfers` in the production build.

Prompt intent: Make the existing manual bank comparison checkbox harder to miss and explain why payment confirmation is disabled.

Decision: Give the existing checkbox a numbered required step, a larger checkbox and full-width tap label, and an explanation immediately above the confirmation controls. Spanish and English are included. The checkbox is never preselected. Payment approval conditions, actions, requests, receipt handling, timers, and eligibility are unchanged.

Alternative rejected: Automatically checking the comparison box or bypassing the existing approval guard.

Files: `src/modules/transfers/launch/ReviewDrawer.tsx`, `ReviewDrawer.css`, `strings.ts`, and `scripts/test-h5-launch-ui.mjs`.

Evidence: Production build, TypeScript, spacing check, and isolated ES/EN H5 component DOM checks passed with fictional data. The unchecked confirmation made no payment request; tapping the label enabled it, and unchecking disabled it again. Local Chromium could not create its browser process socket, so native keyboard and 390/1280 rendered layout checks and screenshots still need a browser-capable test environment. Not pushed or deployed.
