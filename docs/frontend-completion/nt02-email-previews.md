# NT-02 isolated launch email previews

Scope: M-04 `/#/admin/emails`, “Simulate the 10 launch emails”. Based on fetched remote main `455843fda97c7a0c9979b3331d11690d9653f5e7` (2026-10-23). Repository has no AGENTS.md or .agents skills; CLAUDE.md and `.claude/skills/ui-spacing/SKILL.md` were read. Feature audit: `features.json` NT-02 and `next-gap-audit.md`; unresolved decisions: `owner-queues.md`. No source acceptance fields or shared readiness files changed.

NT-02 remains **partial**. This delivers ten read-only fictional previews, not the criterion “sent on the right trigger”. No real trigger, authentication, payment, booking, voucher entitlement, outbox, email service or delivery is exercised. No database writes, local-storage writes, provider imports, template editing or preference changes occur in this module. Existing M-04 route permissions and editor/test controls remain in place.

| Source event, in exact NT-02 order | Preview ID | Existing catalog reference / integration gap |
| --- | --- | --- |
| welcome | welcome | `welcome` / `user.created`; no real identity or delivery |
| sign-in code | sign-in-code | Missing exact template/trigger contract. Neither `verify_email` nor password `reset_code` is sign-in. No usable code, expiry or lockout chosen. |
| booking pending payment | booking-pending-payment | Missing exact contract. `payment_pending` is payment-level; PC-01/PC-02 hold conditions/timing remain unresolved. |
| payment confirmed | payment-confirmed | Separate confirmation preview; existing `payment.approved` catalogs a receipt, not a dedicated confirmation. |
| payment rejected | payment-rejected | `payment_failed` / `payment.declined`; no automatic release/retry policy inferred. |
| booking released | booking-released | Missing exact release contract; PC-01/PC-02 remain unresolved. No timer or capacity mutation. |
| rescheduled | rescheduled | `booking_changed` / `booking.moved`; no capacity or entitlement mutation. |
| class cancelled | class-cancelled | `class_cancelled` / `session.cancelled`; restoration, recipient coverage and preferences remain integration work. |
| voucher received | voucher-received | `gift_card_delivered` / `gift_card.deliver`; old scheduled-delivery wording differs from BO-02 payment-confirmed requirement. Sample `.invalid` link is text only. |
| receipt | receipt | `receipt` / `payment.approved`; PG-08 requires no invoice. Old DIAN/invoice copy is deliberately unused, not silently rewritten. |

Preview IDs are local navigation identifiers, never proposed production emitter names. The ten fictional bodies are local examples, not settled or published email templates. No actual sending, domain readiness or consent enforcement claim is made.

Reusable component: `LaunchEmailPreviews` accepts a readonly event list. It supports collapsed/open state, event selection, search with no-match recovery, bounded previous/next controls, independent ES/EN sample locale, explicit missing-sample/error scenarios, retry/reset, and safe initial state after reload. Collapse/reopen retains the scenario without pretending success. D-02 includes the component and an empty-list usage. All controls use existing components/design tokens.

Verification commands:

- `node --experimental-strip-types scripts/test-launch-email-previews.mjs`
- `npm run typecheck`
- `npm run build`
- `node scripts/test-launch-email-previews-ui.mjs` (dev server, `QA_BASE` override supported)

Browser receipt and ES/EN light/dark 390/1280 screenshots: [results](../screenshots/M-04/nt02/results.json). The full interaction matrix uses 390/768/1280/3840, both app locales, both sample locales, ten events, bounds, no-match/missing/error/retry, interrupted collapse/reopen, repeated clicks and reload. Database bytes are checked unchanged. External network requests are blocked by the test. Final matrix passed against the local production build at port 5233, including keyboard Home/End selection and ≥4.5:1 email text contrast. D-02 populated and empty-list instances were also opened and rendered independently in the production browser. Full build and standalone typecheck passed; spacing baseline remains 60, manual lint has zero violations. Existing Vite large-chunk warnings remain. Actual email rendering in mail clients, live trigger-to-outbox binding, server authorization, preference enforcement and deliverability are untested and outside scope.

Integration handoff / kanban entry (integration owner owns shared readiness): NT-02 ten-event isolated bilingual preview slice implemented and locally verified; criterion remains partial pending idempotent authenticated trigger/outbox/provider delivery and unresolved policies. Only existing runtime integration is the import and mount in `EmailsPage.tsx`. No schema/provider/package/workflow file changed. Draft PR only; no merge or deployment.
