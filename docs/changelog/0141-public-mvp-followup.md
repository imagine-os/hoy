version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0141-public-mvp-followup.md
intent: Fix three independently reproduced public website frontend defects.
decision: Consume existing dated publication quotes on Home; validate direct WhatsApp destinations with reception/profile fallback and contact guidance; reuse EmptyState for no published teachers.
rejected: Copying edited draft prices onto public Home, restoring stale amounts after withdrawal, opening malformed wa.me links, and changing shared providers or unresolved publication/payment policies.
files: src/modules/website/{publicHomePricing.ts,publicWhatsapp.ts,hooks.ts,strings.ts,specs.ts,SiteShell.tsx,pages/*.tsx}; src/components/molecule/PublicWhatsappLink/*; src/components/molecule/EmptyState/EmptyState.meta.ts; scripts/test-public-mvp-*.mjs; scripts/test-public-agenda-ui.mjs; .github/workflows/public-content-qa.yml; docs/screenshots/public-mvp-followup; docs/frontend-completion/public-mvp-followup.md; docs/kanban.md

W-01, W-05, W-06, W-10 and P-01 use the named presentation changes; D-02 registers direct/fallback/unavailable contact states and identifies existing EmptyState usages. No new CSS values or dependency were added. Existing Archive remains a historical preview; Classic uses current trial pricing and safe sales links.

See [receipt](../frontend-completion/public-mvp-followup.md) for exact test scope, screenshots and remaining source-row gates. Q-14/Q-15 and production/backend acceptance remain separate.
