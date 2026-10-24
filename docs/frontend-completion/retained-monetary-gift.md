# Monetary gift retry safety

C-17 stores only a fictional monetary draft in the current browser. Its retained attempt contains the original tenant, buyer, effective role, recipient, selected date and frozen quote. The simulated checkout starts only after the marker is saved and read back.

Recovery reads the exact mock transaction locator and its saved outcome, then validates the corresponding owned payment and draft gift. It neither matches amounts/dates nor rebuilds history from current prices or contacts. Missing, conflicting or corrupt evidence pauses another purchase. A proven uncommitted attempt can retry the same intent or be explicitly cancelled. A saved outcome must be checked and acknowledged before preparing another gift.

The final mock owner and persisted-role checks are synchronous after the asynchronous proof reads. Page tickets separately fence actor, effective role, provider, URL and unmount changes. Existing historical drafts and explicit companion behavior elsewhere are unaffected.

Focused regressions:

- `node scripts/test-retained-monetary-gift.mjs`: journal identity, reload/lost acknowledgement, concurrent replay, rollback, partial proofs, scoped owner checks and explicit next purchase.
- `node scripts/test-retained-monetary-gift-ui.mjs`: actual gift page in EN/ES at 390/1280, native recovery and development-only held context checks. `QA_PRODUCTION_ONLY=1` explicitly excludes only the development harness.
- `node scripts/test-retained-monetary-gift-native.mjs`: compiled application recovery, acknowledgement, intentional next purchase and corrupt-marker actor privacy. It uses the existing compiled provider instance and rejects browser source/test imports; source, output and served asset bytes are bound separately.
- `node scripts/test-operational-quotes.mjs`: retained quote and existing monetary-gift price guards.

`.github/workflows/retained-monetary-gift-qa.yml` runs the full gift domain, build, development and compiled gates against the exact PR head. It has separate gift artifacts and does not depend on the class-recovery workflow.

Real payment-provider idempotency, cross-device locking, issuance, redemption and delivery remain backend work. This bounded repair does not certify the whole PG-09 criterion or define new gift, tax or cancellation policy.
