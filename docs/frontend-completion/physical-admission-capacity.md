# Physical capacity at final admission

Separate branch based on checked settlement commit `5782a1eda37a89c7a9dd6f37b2b8bc95822c00b5`. The checked gift and settlement refs/bundles remain preserved. No customer hook, Checkout, schema, SQL, real service or historical row is edited.

RS-06 is Feature Log row44 (original source45): “Room capacity (16 / 8 mats) is never exceeded, from the app or the front desk.” Independent reproduction showed a raw app insertion and desk package command accepting a ninth booking and mat9 when an imported session said16 but its room held8. Normal CMS edits already prevented creating this mismatch; final admission still needed to defend against imported/legacy rows.

`effectiveAdmissionCapacity` validates the session and room tenant/id and positive safe integer capacities. The limit is the smaller of session and room capacity; yoga also honors the existing tenant mat ceiling. The optional browser-only room publication field now governs [prospective room references](room-publication-contract.md); this physical-capacity helper retains existing class admission behavior and does not infer a room-withdrawal cancellation or booking policy. `requireSessionAdmission` freshly reads the room with context checks after every await and returns an effective-capacity clone, without persisting that clone over stored history.

The raw regular booking guard and native voucher party command reuse this limit for final seat and mat availability. Regular seat count follows existing non-cancelled/non-late-cancelled capacity semantics; mat collisions still use the existing occupied-mat states. Voucher seats share the physical ceiling. Exact requested mats beyond the room are rejected without substitution. Rescheduling, package/trial purchases and offered claims reach these shared final guards. Existing historical attendance and valid cached voucher replay remain outside fresh admission.

## Verification commands

- `node scripts/test-physical-admission-capacity.mjs`:22 focused groups for imported8/16, aligned8/8 and16/16, exactmat9 denial/mat8 success, effective clone immutability, missing/foreign/invalid rooms, yoga mat ceiling, regular-plus-voucher parties, same-provider last-seat concurrency, full/valid rescheduling, context changes and after-start historical attendance.
- `node scripts/test-physical-admission-capacity-ui.mjs`: actual package/trial/single checkout, offered auto-claim, rejected mat9 and valid last mat8, EN/ES390/1280. Invalid final admissions preserve stored payment, ledger, booking and offer records. Trial positive fixtures omit the unrelated synthetic compensation grant to preserve the existing trial-clarification safeguard.
- `node scripts/test-physical-admission-desk-ui.mjs`: actual reception package booking against a full imported8/16 target, EN/ES390/1280; clear full-state feedback and byte-identical database.
- Existing session-admission context suite covers actor/role/provider/unmount interruption; existing session, daily admission, native voucher, purchased-gift provider and retained-desk settlement domains are retained.

Positive pure voucher/promotion fixtures now declare synthetic room IDs/capacity; their original contract assertions remain unchanged. This makes the new required physical-room precondition explicit rather than weakening it. Final build/browser/review results and exact tested hashes are recorded in the integration handoff.

The separately reproduced RC-02 no-show-to-arrived mat restoration conflict is not repaired here. No cancellation/refund, attendance cutoff, autoassignment or real backend policy is introduced. Same-provider browser simulation is not cross-device/server locking.
