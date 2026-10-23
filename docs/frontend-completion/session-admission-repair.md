# Shared session admission — bounded frontend repair

AD-01 publication and launch booking correctness remain partial overall. Page-only withdrawal controls allowed four reproduced actions: reception Enter admitted a customer, direct checkout booked/debited, waitlist joining inserted an entry, and offered auto-claim booked a withdrawn class.

## Preserved integration base

Current integration branch `fix/session-admission-current-20261023` starts from released PR85 main `90fcfe14a0552db46114c91495d156efcdc90902`. It replays only the shared admission repair from saved commits `71acdf94`, `532c8044` and `f9210fd4`; unrelated website, RC03, AD01 display and other saved candidates remain preserved and excluded. This preserves deployed receipt customer labels, PG10 reporting and content recovery. The previous combined-base evidence is historical; current integration is checked again before publication.

## Behavior

`sessionAdmission.ts` reads the target session, modality and optional template inside the calling mock transaction. Missing/foreign references, inactive publication, cancelled/completed/started/invalid targets fail before new admission; full-class capacity keeps its existing separate check. A valid ad-hoc session may omit a template. No timing or refund policy is chosen.

Customer book/join/claim and reschedule, desk package admissions, Register auto-check-in and mock insertion/reactivation use current eligibility. Voucher booking applies the same pure rule. Claims validate the current owned offered entry and commit claim plus booking/debit together. Checkout rechecks eligibility before payment and after awaited simulated payment results, including pending/declined returns. Captured actor/effective-role/provider/mount context fences prevent an interrupted action from committing under the old context.

Existing booking navigation, attendance and historical reads remain available after withdrawal. Existing cancellation/return and reschedule behavior retain their policy; withdrawn originals do not receive new waitlist offers. Leaving a queue remains available. Transient waitlist admission failures offer an explicit retry and reset with route/persona/provider changes, without automatic retry loops.

PG08 receipt previews, historical invoices, consent evidence, RC03 tenant/search/stale guards and actual demo labels are preserved. There is no schema/cache-version migration, real payment/authentication/email service or backend authorization claim.

## Verification contract

- `test-session-admission.mjs`: scoped references/publication/status, raw adapter/desk/join/offer, contextual reads, republish, retained attendance and reschedule debit preservation.
- `test-session-admission-ui.mjs`: actual production EN/ES390/1280 screens, all four withdrawal paths, Register target rejection and valid checkout/claim/receipt/check-in behavior.
- `test-session-admission-context.mjs` with a dev-only actual hook/component harness: paused operations during actor/role/provider/unmount changes, plus pending/declined checkout rollback.
- Retained desk, mat, reschedule, attendance, cancellation, voucher, receipt, consent and scoped-search regressions run as applicable. Existing reschedule expiry fixtures now update both timestamps to represent a valid later session; desk/voucher fixtures include explicit active synthetic modalities. Their original assertions remain.

`session-admission-qa.yml` wires read-only exact-head CI and artifacts. Local evidence is separate from hosted CI; publication/release require terminal checks and independent exact-head review. No unfinished review or CI is treated as passed.

## Current-main reconciliation

The production regression first caught reception controls lacking the old combined branch's withdrawn-state display guard. The new branch applies the shared admission predicate directly at those controls, while final commands still reread the target. The transfer-review fixture now supplies its intended active synthetic modality; its capacity and rollback assertions are retained, with an added withdrawn-target approval/grant rollback assertion.
