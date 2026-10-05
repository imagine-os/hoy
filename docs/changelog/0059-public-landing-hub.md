version: 0.23.2
date: 2026-10-05
prompt: docs/prompts/0059-public-landing-hub.md
intent: Put Coming Soon at the public root, keep a public testing hub at /hub, and replace Login with a Coming Soon popup.
decision: Keep HashRouter and relative assets; add a same-deployment clean /hub entry, update semantic hub links/manifests, and reuse the accessible Drawer with history-aware dismissal.
rejected: Changing DNS or a custom-domain setting before ownership/account verification; inventing Clerk authentication; replacing the full test website; switching the whole application to BrowserRouter.
files: src/modules/{coming-soon,hub,website/SiteShell,customer/auth/AuthShell,dev/CanvasPage}; src/components/{template,organism/Drawer}; src/app/{cleanHubEntry,RouteTitle,shells}; src/main.tsx; src/hub/hubMap.data.ts; public/hub/index.html; scripts/{gen-hub-map,test-website-preview,test-clean-hub,test-public-entry}; .github/workflows/website-preview-qa.yml

W-11 is the public landing at `/` and `/coming-soon`. HUB-01 is public at `/#/hub`; the clean `/hub`, `/hub/` and `/hub/index.html` entries replace only the same-origin document location, preserving the deployment root (`/hoy/` on the current GitHub Pages host). This avoids nested asset, hub-map and preview-iframe paths. No custom-domain redirect is configured.

The public Login button opens a “Coming soon” dialog. It has an accessible title, keyboard focus trap, Close/overlay/Escape dismissal, browser Back/Forward behavior and return focus to Login. Direct modal links close without leaving the landing page. It collects no credentials and makes no authentication request. Existing demo-auth routes remain available inside the testing experience.

The focused QA job includes both development and production browser tests, plus true static-host checks at root and `/hoy/` mounts without SPA fallback. Current Latest/archive behavior remains in the regression suite. Existing security, publishing, DNS and authentication settings are unchanged.

## Checked preview receipt

At source `0a20bb1ba516dd6fb26debe5e11fecd4d2810e90`, [Website preview QA](https://github.com/imagine-os/hoy/actions/runs/37363797838) passed TypeScript, clean-entry unit checks, the full production build, development and production browser regression suites, and true static-host entry checks at `/` and `/hoy/`. The first attempt could not acquire a GitHub-hosted runner; the targeted second attempt passed without changing code or gates.

The four `docs/screenshots/W-11/*-login-coming-soon.jpg` captures are settled, actual Chromium renders from that successful production run, visually checked in ES/EN at 390 and 1280 pixels. Dialog checks also cover the 344-pixel layout, accessible naming, initial/repeated Tab and Shift+Tab trapping, Escape, Close, overlay, Back/Forward, focus return, and direct modal URL dismissal. This receipt is build evidence, not a custom-domain activation claim.
