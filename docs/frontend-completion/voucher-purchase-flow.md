# Purchased class-gift frontend flow

Base: frozen booking candidate `450923dc47a7f6bc3dd2942faf30da78b30d2506`, followed by the preserved isolated engine checkpoint `4adb3b00c528881cc01cf33c4a7a0d2ccf08d2fb`. This supersedes that checkpoint's latent storage proposal. No original saved branch is overwritten.

C-37 now saves a local pending transfer intent with a validated image proof and accepted published gift quotation. Administration opens it in S-09, compares the fictional proof, records the exact amount and reason, and explicitly selects existing voucher terms. Approval creates one purchased class voucher and an immutable fictional payment receipt. It never calls regular package activation. Rejection activates nothing.

The buyer can reopen the retained same-browser recipient link and see ready/used email previews. Public access preserves only the narrow safe gift target through the existing demo sign-in or sign-up flow. The current recipient account email must match before activation, including native C-28 claim requests and cached replays. C-28 distinguishes purchased gifts from courtesy invitations and uses its existing voucher balance and booking command. No regular package classes are added.

## Feature Log scope

| ID | Feature Log / source row | Frontend result | Separate requirement |
| --- | --- | --- | --- |
| BO-01 | 70 / 71 | Published class-gift quote, recipient, image proof and persistent pending simulated transfer | Real transfer and private storage |
| BO-02 | 71 / 72 | Approved recipient link and email preview retained in this browser | Secure cross-device links and actual email delivery |
| BO-03 | 72 / 73 | Existing courtesy invitation command and terms retained | Full courtesy criterion audit and real delivery |
| BO-04 | 73 / 74 | Demo sign-in/sign-up return, recipient-bound activation, usable voucher balance and one booking deduction | Real authentication, verified recipient ownership and server grant uniqueness |
| BO-05 | 74 / 75 | Existing expiry/revocation/exhaustion guards plus single-claim feedback and checked replay | Server clock and cross-device enforcement |
| BO-06 | 75 / 76 | Buyer ready/used previews reflect saved issuance and booking | Notification dispatch and delivery acknowledgement |

These are frontend simulations. The delivery-dependent rows are not wholly complete. Gift expiry, participant cap, credit unit and cancellation treatment are explicit reviewer choices in the demo; no studio-wide policy is inferred. Production gift policy remains an owner decision.

## Protected local state

The optional `DataProvider.purchasedGift` method exists only on MockProvider. It runs the pure command in the serialized atomic queue, validates a fresh quote for a new purchase, checks the live caller context after asynchronous work, and persists before acknowledgement. It deliberately uses no outer cached-transaction shortcut. Compatible old browser snapshots gain empty `gift_purchase_intents` and `gift_purchase_requests` arrays without reseeding existing purchases, bookings, consent evidence or content. Generic writes to both tables remain forbidden. No SQL/server migration or security configuration changes.

The intent/proof table retains the fictional recipient, image, original quote, approved terms and voucher link. The protected request table holds fingerprints/results. General audit records contain IDs and simulation facts only. Original purchase and approval requests, payment receipt, exact voucher identity and immutable terms must agree on replay; legitimate voucher balance/status/owner progression is allowed. Current actor status/role and recipient identity are rechecked. Existing courtesy commands and historical records retain their behavior.

S-09 reads gift intents as a fifth scoped queue source. A gift purpose is never sent through class-package fulfillment. Front desk can inspect the gift proof but cannot issue a voucher by being elevated to admin. Unsupported/missing gift purposes stay read-only. Existing transfer receipt expiry fields and package settlement remain unchanged.

## Verification

- `node scripts/test-gift-purchase-command.mjs`: original contract groups retained and extended with static-term, receipt and linkage tampering.
- `node scripts/test-gift-purchase-provider.mjs`: additive cache preservation, protected mutations, quote/context checks, storage rollback, concurrent replay, gift queue purpose, current native claim/replay identity, minimal audit facts and narrow return targets.
- `node scripts/test-gift-purchase-flow-ui.mjs`: eight actual EN/ES at 390/1280 journeys, each with purchase, reload, administrative review, buyer preview, public return through sign-in or sign-up, activation, C-28 booking exactly once, voucher deduction, preview readback and light/dark captures. No package, invoice or delivery records are created.
- `node scripts/test-gift-purchase-context-ui.mjs`: 28 actual page groups for read failure/retry, lost acknowledgement with failed result reads, and queued actor/role/provider/route/unmount changes. No stale success/error or extra records.
- Existing transfer receipt, pending queue and voucher domain suites passed. The queue failure loop now asserts all original four sources plus the new gift source and tests failure of each; no original scope, deduplication or frozen-quote assertion was removed.

Initial browser setup failures reset the fixture on reload and changed the hash before reloading the selected demo user. Both test setup defects were corrected while retaining persistence and role assertions; earlier failure evidence remains outside the public repository. Final build and independent review are recorded by the integration owner. No hosted deployment is claimed by this handoff.

The previous `VoucherGiftDemo` memory-only component and domain model remain as historical component evidence. Its old operational C-37 no-write/tab-local-link assertions are explicitly superseded by the persisted whole-flow suite; the integration owner must wire the new checks before release. No old evidence is deleted or described as proof of the new flow.
