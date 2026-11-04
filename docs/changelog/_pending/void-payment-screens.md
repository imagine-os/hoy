# The payment void's screens

Date: 2026-11-04. Codes: M-09, M-06, C-41, C-42.

Intent: a Super Admin voids an approved payment with a required reason, from Finance, the member's payments tab and the staff receipt, for the 6 Nov public launch.
Decision: the action is gated by `/me`'s Super Admin flag (`meSuperAdmin`), not the session's `isSuperAdmin`, which is false for an AD-04 Administration login. The write is one `/batch` with `ifMatch` on the status and the action's key; Company OS decides everything else and the screens put its refusals into words. A voided receipt keeps its number and reads voided: staff also see the reason, the customer's does not (owner, 4 Nov). A voided trial's lot no longer counts as the trial used. Alternative rejected: gating on `isSuperAdmin`, which would hide the action from the Administration logins meant to hold it.

Files: `src/modules/transfers/launch/voidPayment.ts`, `VoidPaymentAction.tsx`, `strings.ts`, `payments.ts`; `src/modules/launch-receipts/launch/ReceiptPages.tsx`, `specs.ts`; `src/modules/admin/FinancePage.tsx`, `MemberPage.tsx`, `strings.ts`; `src/auth/companyOsIdentity.ts`, `sessionContext.ts`, `ProductionSession.tsx`, `RequireRole.tsx`; `src/data/companyos/refusals.ts`; `src/data/trialEligibility.ts`; `scripts/test-void-payment.mjs`, `test-void-payment-ui.mjs`, `lib/fake-cos.mjs`; `.github/workflows/auth-checks.yml`.

Review build unchanged: it has no Company OS connection, so it never gets the action.
