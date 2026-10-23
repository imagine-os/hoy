# Pending desk booking intent integration

The customer checkout retains an optional `frontend_desk_intent` with the exact accepted quote fingerprint, scoped tenant/customer/session/plan/mat and deterministic request identity. `pendingDeskIntent.ts` owns the format and pure reconciliation. Missing metadata preserves historical product-only requests. Present malformed metadata, conflicting selections and duplicate pending records fail closed; there is no automatic repair, replacement or repricing.

Checkout rereads pending payments before charging and again inside the serialized mock transaction. It shows the existing request's stored amount, name, classes and expiry after reload or catalog withdrawal. Read failure hides unconfirmed results, disables charging and offers Retry and payment history. Actor/role/provider/query-route/selection changes fence in-flight writes. A pending request holds no place and activates no classes. Claim-linked manual requests are explicitly unsupported; no offer is extended.

## Required integration seam

The sole shared-model owner must wire the optional metadata and immutability guards, then dispatch booking-linked desk settlement through a single atomic approval/grant/admission operation. Re-read active customer and current class/method/template/time/capacity/mat/daily-admission rules before fulfillment. If unavailable, reject and roll back approval, grant, booking, debit, receipt and audit together. Retain booking/debit identity in immutable settlement fulfillment and verify it on committed retries. Existing product-only payment histories keep their original path. Do not invent hold durations, expiry anchors or refund policy.

No shared schema, provider, settlement, transfer-review, customer string catalog or real service is changed by this customer-side batch.

## Focused checks

- `node scripts/test-pending-desk-intent.mjs`: strict optional metadata, canonical quote identity, tenant/customer/session/mat/product boundaries and duplicate/conflict detection.
- `QA_BASE=<local frontend> node scripts/test-pending-desk-intent-ui.mjs`: actual EN/ES390/1280 checkout, same-mount double click, stored mat, reload recovery, product withdrawal, duplicate conflicts and unsupported claim requests.
- Development-only: `QA_BASE=<local dev frontend> node scripts/test-pending-desk-intent-context.mjs`: actual paused payment insert across actor/role/provider/unmount, plus scoped read failure and Retry without writes.

D-02: existing C-04 Notice info/warn, read-failure/Retry and pending no-hold states; existing Drawer. No new component variant. This batch is incomplete until combined settlement glue and its regressions pass; no whole-feature or backend acceptance is implied.

Local source verification: full build passed;32 pure metadata/reconciliation cases,4 EN/ES390/1280 production workflows,12 actual component context/read-Retry groups and2 lost-ack groups passed. The unchanged package-booking whole-flow suite also passed8 production groups (regular/last class, saved confirmation, one debit, upcoming/reload/repeat). Combined settlement tests and independent review are still required. Test development retained financial assertions when correcting a dialog-portal selector and explicit return-to-checkout navigation after double-click.
