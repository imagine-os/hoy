version: 0.25.0
date: 2026-10-23
codes: M-08c M-04 W-06 C-05
prompt: docs/prompts/0164-payment-instructions.md
intent: Configure and display fictional payment instructions consistently without activating real payment services.
decision: Add empty-compatible QR image and opaque Bre-B key fields to existing settings JSON, retain draft/save controls, and commit the mock payment-settings change with its audit. Confirm scoped reads before showing any saved destination. A shared component supplies website, app and explicitly unsent email previews.
rejected: Invented banking keys or QR payloads, real transfers, automatic messages, shared provider/schema edits and direct checkout edits.
files: admin settings/page/strings and scoped payment instruction helpers; PaymentInstructions component; opt-in EmailPreview slot; website Contact; customer Payment methods; scoped synthetic tests; unapplied checkout patch.

The existing image picker supplies the preview; the application does not decode or validate a bank QR. No real bank data is seeded. Legacy settings without the new fields remain readable and no payment, booking, ledger, consent or historical record is rewritten. Current Q15 concerns Sunday reception coverage and does not block these fields. Actual banking setup, delivery and the remaining contact/hours/holiday acceptance are separate.

Verification: full build/type/spacing/manual checks passed. Domain regressions cover role spoofing and replay after role loss, atomic rollback, unchanged historical/financial records and stable lost-ack retry. Actual Settings upload/save/remove/reload propagated to website, app and unsent previews in EN/ES at 390/1280, both themes; embedded email text contrast is asserted. Twenty EN/ES recovery/context groups cover failed/delayed reads, broken image display, actor/role/provider/tenant/unmount changes and staged save failures. This is local checked frontend work; checkout glue and publication are pending integration.
