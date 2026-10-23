# RS-02 package-booking confirmation

Source mapping: stable ID **RS-02**, Feature Log row **40**, source acceptance row **41**. Literal criterion: “Confirms the booking, deducts 1 class and the booking appears in upcoming classes.” Original source status and owner acceptance are unchanged.

Normal package checkout already atomically saves a booking and one linked class debit. C-04 now recovers an uncertain acknowledgement through fresh scoped reads. The exact command receipt locates a candidate; it cannot itself establish success. The owned booking, session, debit and original grant must all verify. No cached transaction replay, additional booking, payment, debit, invoice or email is performed by this read.

A failed read remains unconfirmed and blocks another submit until read-only verification succeeds. Checked absence offers a booking retry. A separately verified existing booking is offered for viewing without claiming this command created it. Missing or foreign confirmation facts fail closed. Last-class consumption, later withdrawal/start and historical expiry/freeze do not erase a recorded booking. Current status remains available on booking detail.

Confirmation state carries the initiating provider, actor/effective-role and route context. Context changes synchronously hide old actions and invalidate late reads. Existing full-class/waitlist, mat, withdrawal and daily-conflict feedback remain distinct.

## Verification commands

- `node scripts/test-package-booking-confirmation.mjs` — read-only proof, absent/foreign/missing/staged-only facts, last class, historical validity and read/context failures.
- `QA_BASE=<prepared-dev-server> node scripts/test-package-booking-recovery-ui.mjs` — actual C-04 EN/ES390/1280 lost-ack recovery, staged rollback/retry, failed/missing/foreign confirmation reads, legitimate existing-booking view, historical confirmation, original business errors and actor/role/provider/route/unmount fences. The dev-only harness is not imported by application routes.
- `QA_BASE=<production-preview> node scripts/test-package-booking-flow-ui.mjs` — normal and last-class checkout, one debit, upcoming display, reload persistence and repeated-submit protection in EN/ES at 390/1280.
- Existing session-admission, package-lot, mat and launch-receipt regressions; full build. The whole-criterion package audit additionally checks confirmation, exactly one class debit, upcoming display and reload persistence at both supported widths/locales.

Local verification passed: 30 confirmation-domain groups, 59 recovery/browser groups, eight production whole-flow matrices and the preserved domain regressions. Both browser suites reported zero page errors; the full build passed.

Synthetic evidence is kept outside public source or in ignored CI artifact output. This is browser-local frontend evidence for **existing-package, zero-new-charge checkout**. Real authenticated authorization, authoritative server transactions/cross-device durability, paid-pass/transfer reconciliation and final owner acceptance remain separate gates.
