version: 0.25.0
date: 2026-10-23
codes: C-37 C-28 M-13
prompt: docs/prompts/0157-voucher-purchase-command.md
intent: Define a coherent mock purchased-voucher transaction without changing shared payment or provider behavior.
decision: Reuse payments, vouchers and append-only audit records, require explicit reviewed gift terms, and preserve existing canonical voucher booking semantics. A provider must supply a freshly validated published gift quote and serialize commit.
rejected: Using component memory as booking credit, generic writes around protected voucher commands, guessed expiry/cancellation rules, fake email delivery or real payment claims.
files: src/modules/voucher-gifts/purchaseCommand.ts; scripts/test-gift-purchase-command.mjs; frontend-completion/voucher-purchase-command.md.

This is a latent isolated command contract. Provider/UI/auth-return integration and combined review are still required before any release or feature acceptance claim. No new schema, package credit, invoice, outbox, permissions or backend configuration is introduced.
