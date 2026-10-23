version: 0.25.0
date: 2026-10-23
codes: C-37 C-28 S-09 A-02 A-03
prompt: docs/prompts/0163-voucher-purchase-flow.md
intent: Make the simulated class-gift purchase usable through approval, account return and booking.
decision: Add protected mock-only intent/proof and request tables with additive empty-cache upgrade; keep audit facts minimal. Dispatch gifts separately from package grants, require explicit administrative voucher terms, and verify original payment/approval/recipient facts before first claim and replay. Reuse existing voucher booking and receipt previews.
rejected: Component-memory booking credit, generic protected-table writes, inferred expiry or cancellation terms, real settlement/email/auth claims, and cached replay that bypasses current identity.
files: voucher-gifts module; DataProvider/MockProvider/schema mock inventory; native voucher claim guard; transfer queue/dispatch; customerReturn; C-28 copy; GiftTermsReview and existing component usages; regression scripts.

BO-01/04 frontend journey is simulated only. BO-02/06 show retained email previews with no sent state or delivery. Courtesy invitations and historical data are preserved. The old memory-only VoucherGiftDemo/model tests remain historical component evidence; operational C-37 no-provider-write/tab-local-link assertions are superseded explicitly by stronger persisted-flow and safety regressions, pending integration-owner CI review. No SQL migration, server configuration, real authentication, actual charge or email is introduced.
