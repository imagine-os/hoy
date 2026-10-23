# AD-07 / PL-11 — CRM recovery and localized member history

Source baseline: fresh remote main `455843fda97c7a0c9979b3331d11690d9653f5e7` (2026-10-23). Scope: M-06 list and member detail; draft review only. Original feature criteria, phases and owner acceptance remain unchanged. Neither entire row is declared complete.

AD-07 criterion: “Customer list with search, package, remaining classes, expiry and vouchers.” The local CRM read boundary waits for the tables used by the existing joins, then exposes a complete snapshot. Rejected and timed-out reads hide the balance surface and offer an explicit retry, rather than showing zero classes, no plan or no customers. Retry supersedes outstanding reads; late results and results after unmount are ignored. Existing source provider mutations, permissions, consent and audit behavior are preserved. Search/filter state survives a failed refresh. No schema/provider/package/workflow changes.

PL-11 criterion: “All launch text is in Spanish, with no mixed phrases.” This bounded slice translates CRM membership status, booking status and payment source, payment status/method/provider in tables and timeline events. Product names use the active language. Unknown string values show a translated unconfirmed label. Authored conversation text, customer identity, class titles and voucher titles remain source content. This is not an audit or acceptance of all launch screens.

Responsive changes: page-local containment for long names/emails, flexible search header, internal table scrolling. No shared design changes. Existing EmptyState loading/error/action variants supply the recovery UI; no new visual component or component variant.

Verified locally:

- `npm run build` (TypeScript, spacing/manual checks, production bundle).
- `node scripts/test-package-lots.mjs` and `node scripts/test-contact-mask.mjs`.
- `node scripts/test-crm-balances-ui.mjs`: admin/front desk, EN/ES390/1280, matching package balance/expiry/catalog title, claimed voucher identity, list/detail, empty search, missing person, frozen/expired package, customer route denial; development and production bundle.
- `node scripts/test-crm-recovery-ui.mjs`: fictional provider faults in development; repeated rejection/retry, delayed/superseded reads, late results, timeout, navigation while pending, live refresh failure with search retained, long identity, all four detail tabs in EN/ES at320/390/768/1280. No runtime exceptions. No production fault switch added.

[Recovery results](../screenshots/M-06/crm-recovery/results.json). [ES phone list](../screenshots/M-06/crm-recovery/es-390-list.jpg), [EN desktop list](../screenshots/M-06/crm-recovery/en-1280-list.jpg), [ES phone identity](../screenshots/M-06/crm-recovery/es-390-identity.jpg), [EN desktop identity](../screenshots/M-06/crm-recovery/en-1280-identity.jpg), [ES dark phone](../screenshots/M-06/crm-recovery/es-390-identity-dark.jpg), [ES bookings](../screenshots/M-06/crm-recovery/es-390-reservas.jpg), [ES payments](../screenshots/M-06/crm-recovery/es-1280-pagos.jpg).

Limits: browser-local fictional data only. Server consistency, authenticated tenant authorization, cross-device persistence, operational communications, global Spanish launch acceptance and owner acceptance remain unverified. No credentials, real customer data, external messages, deployment or merge. Integration owner owns final integration and releases.
