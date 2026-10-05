version: 0.23.1
date: 2026-10-05
prompt: docs/prompts/0058-coming-soon-login.md
intent: Show the English Coming Soon preview and add Login at the top right.
decision: Link to the application's existing /auth/sign-in entry and keep bilingual switching; main CTA still opens Instagram in a new tab.
rejected: Inventing a popup, new authentication backend or changed default language without a request.
files: src/components/template/ComingSoonLanding/*; src/modules/coming-soon/{strings,specs}; scripts/test-website-preview.mjs; docs/pages/W-11.md

W-11: the Login / Entrar control joins the language control in the top-right header. On narrow phones Login stays above the language toggle so both targets fit. Existing demo sign-in remains clearly labelled on its destination. No new account or persistent access is created.

## Verification

Exact-head CI [37349804964](https://github.com/imagine-os/hoy/actions/runs/37349804964) passed TypeScript, both development and production browser suites, and the complete build at 74b942e. The browser checks cover the Login destination, main Instagram link, both languages, 344/390/768/1280 layouts, motion/pause and reduced-motion behavior. Updated W-11 captures include the Login control.
