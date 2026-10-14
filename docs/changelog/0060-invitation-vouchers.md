version: 0.24.0
date: 2026-10-14
prompt: docs/prompts/0060-invitation-vouchers.md
intent: Free prelaunch invitations with independent class/COP benefits and group limits, recipient booking and traceable attendance.
decision: Keep the existing mock/provider boundary honest. Add atomic local voucher commands, default-deny SQL tables and a bilingual sandbox interface at M-13/C-28. Explicitly review credit unit, cap scope, cancellation and expiry rather than publishing assumed rules.
rejected: Claiming provider delivery from a preview; creating revenue for a complimentary invitation; equating class credits with money; shipping unauthenticated production redemption; copying private correspondence into a public repository.
files: src/modules/vouchers; src/data/{vouchers,types,MockProvider,schema}; src/modules/customer/pages/{GiftPage,MorePage}; src/tenant/pricing; shared component usage inventory; scripts/{test-vouchers,gen-sql}; supabase/schema.sql; docs/data-model.md; docs/voucher-backend-readiness.md

M-13 is `/admin/vouchers`; C-28 is `/app/vouchers` and `/app/vouchers/:id`. Both prominently identify the browser-local sandbox and require fictional recipient/guest details. Previewing a message records only a preview event. Links are browser-local demo references, not production claim tokens.

Issue, claim, book, cancel, attendance and revoke use one copy-on-write transaction, preserving the existing database on errors. Booking atomically checks entitlement and actual seats/mats; repeated requests are idempotent. The admin history retains participant snapshots and every domain event. Real authentication, persistence across devices, delivery webhooks, signed claim links and paid-gift settlement remain explicitly blocked on backend integration.

The existing gift-card purchase screen now identifies its simulator and links to activation; its purchase behavior remains separate. Discount coupon calculations are not changed. No product pricing, campaign publication or live financial behavior is introduced.

## Verification boundary

The cloud command executor blocks Chromium process sockets; its browser is on a separate host and cannot reach the local dev server. A documented exception permits a draft-only CI commit before the aggregate build: the unchanged hub generator needs real screenshots first. The dedicated CI job generates real ES/EN 390/1280 and dark-mode screenshots, runs the end-to-end lifecycle and then the full build. This is not a merge or completion waiver: all checks and screenshot review must pass before merging.
