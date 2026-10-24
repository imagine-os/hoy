# Purchased voucher command handoff

Base: `f1c7fcde0d64463a705067ce0b0afa14d381a081`. This isolated module is not called by an application route or provider yet. No release or whole-row acceptance is claimed.

## Literal criteria and current gap

- BO-01 Feature Log70/source71: current C-37 prepares an in-memory transfer rehearsal, not a persisted purchase.
- BO-02 Feature Log71/source72: current link/email are tab-local previews. Actual email delivery remains external.
- BO-03 Feature Log72/source73: admin courtesy vouchers already use existing provider-backed commands; unchanged here.
- BO-04 Feature Log73/source74: rehearsal credits never reach a usable booking balance; this contract issues a canonical class voucher and binds its claim to the fictional recipient account.
- BO-05 Feature Log74/source75: existing voucher availability and expiry rules apply to claim and booking. Explicitly approved expiry is respected; no expiry is derived from package validity.
- BO-06 Feature Log75/source76: delivery/use notifications remain previews and separate delivery integration; this command sends nothing.

## Serialized integration contract

`executeGiftPurchaseCommand(database, command, context)` returns a detached `{db,result}`. A dedicated mock provider seam must commit the returned database atomically, enforce the live actor/effective-role/provider/route lifecycle around asynchronous reads, persist before acknowledging, and reject non-mock providers. Generic inserts into protected voucher tables must remain forbidden.

Purchase requires an active tenant customer with persisted role, a reserved `.test` recipient, quantity one, and an exact `context.currentQuote` obtained by `checkSaleQuote` immediately before commit. It creates one manual pending transfer payment and an append-only `gift.mock.intent` audit record. No voucher, grant, booking or charge is created.

Approval requires an active tenant admin/super-admin, exact received amount, a reason and `reviewed:true`. All existing `VoucherTerms` are supplied explicitly by the reviewer. Class count must match the accepted gift quote; recipient contact must match the purchase intent. Participant limits, credit unit, expiry and cancellation rules are neither inferred nor invented. Front desk is not elevated to admin. Rejection creates no entitlement.

Approval issues one canonical `purchased_gift` voucher and preserves the accepted quote on the approved payment. It retains a fictional payment receipt with `delivery: preview-only`; no invoice or email outbox is created. Claim requires an active customer account with matching fictional recipient email. Existing voucher commands provide the usable class balance and booking deduction. No regular package ledger conversion occurs.

Request identities are actor-scoped and fingerprinted. Replays check current actor/role and authoritative payment/voucher facts, reject changed payloads or tampering, and return current purchase state. A second approval cannot issue another voucher. A lost acknowledgement can reconcile using the same request ID; the provider must preserve it across retries. Real production settlement, authenticated ownership, secure links, server time, cross-device uniqueness and delivery remain backend requirements.

## Root-owned glue still required

1. Add a small dedicated mock provider command seam and DataProvider interface method; run the pure engine against the live staged database and persist atomically. Do not weaken protected generic voucher-write guards.
2. Connect the C-37 persisted demo purchase UI to the pending transfer/receipt queue with explicit simulation labels. Preserve original receipt upload/approval semantics and immutable snapshots.
3. Add a validated recipient claim route and preserve only its narrow safe target through sign-in/sign-up. The command must recheck matching account identity after return; a navigation parameter is never proof of ownership.
4. Show provider-backed voucher balance and link to existing C-28 booking; add bilingual responsive end-to-end, failure/retry and actor/role/provider/route interruption tests.
5. Reconcile notification previews with the saved NT-02 candidate; do not duplicate or claim actual delivery.

`node scripts/test-gift-purchase-command.mjs` covers purchase scope, pending isolation, explicit approval, rollback, repeat/change rejection, recipient claim, current replay identity, immutable receipt tampering, canonical voucher booking and exact expiry. The source and full build must pass before the checked commit is handed off.

## Required claim-path fence before activation

Current `src/data/vouchers.ts` native `claim` validates actor/self ownership but does not bind a purchased gift to recipient email or its approved payment. Once purchased gifts can be persisted, opening C-28 directly could otherwise bypass the new command's identity check. Before activating the provider seam, the integration must either deny native `claim` for `source: purchased_gift` and route to the dedicated command, or perform the same approved-payment/recipient checks in the shared native command. Test the direct C-28 URL, direct provider voucher command, wrong-account and changed-email attempts, as well as the valid claim and exact replay. This is a frontend integration requirement, in addition to production backend authorization.

C-28 currently describes all vouchers as free/courtesy. Its purchased-gift presentation must distinguish paid simulated gifts without rewriting historical courtesy vouchers. Retain expiry, exhaustion, revocation, tenant and daily-admission guards. The isolated command must remain latent until these paths and transfer dispatch are checked together.

Validation checkpoint: all11 synthetic command contract groups and the full build passed on the frozen source. TypeScript, spacing baseline60 and manual lint passed; existing Rollup warnings remain. No UI changed, so no new responsive acceptance or hosted verification is claimed. The initial build/typecheck narrowing failure is preserved in private evidence; the final build succeeded after the typed quote accessor correction.
