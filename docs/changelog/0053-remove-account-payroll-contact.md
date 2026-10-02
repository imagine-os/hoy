version: 0.22.2
date: 2026-10-02
prompt: docs/prompts/0053-remove-account-payroll-contact.md
intent: Remove the two highlighted contact items (W-14 and W-15), rather than reroute them.
decision: Remove the account data-controller card, dictionary strings and spec layout entry; retain account consent, export, legal links and deletion. The payroll button was already absent; simplify its residual paid-state message to Liquidada / Settled.
alternative rejected: Adding or rerouting WhatsApp contact channels for these items.
pages: C-26, S-03
validation: npm run build and git diff --check passed. Screenshots not regenerated because this session lacks the project’s Chromium executable.
