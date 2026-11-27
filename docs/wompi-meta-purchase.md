# HOY: Wompi purchase measurement (synthetic evidence only)

**Do not send this queue to Meta.** This independently reviewable draft sits on the Wompi sandbox checkout branch and leaves the separately reviewed checkout artifact untouched. The harness does not wire measurement consent, so hosted startup is off for measurement. There is no SDK, network sender, external webhook or Meta credential in this change.

| Signal | Source and destination |
| --- | --- |
| PageView | Separately consented public homepage browser pilot, HOY #175. No checkout or booking URL tracking. |
| Purchase | Single future server-side Conversions API event; stage synthetic candidate only after the authoritative Wompi sandbox API confirms the matching id, reference, amount and COP currency. No browser Purchase. |
| Signups and class bookings/attendance | Separate Company OS/HOY read-only aggregate report (#112/#174), not a feed of personal, booking or attendance information to Meta. |
| Pending, declined, voided, error or mismatched payment | Never counts as a Purchase. A later legitimate approval after pending must reconcile on the matched order. |

The fixture stores one random, opaque event ID at the same time it records the matched approval, so reconciliation replay does not stage duplicates. The test cases require a server-verified measurement opt-in at quote creation and at reconciliation; absent, revoked, later opt-in, and unavailable consent all suppress measurement without stopping the normal payment path. No payer fields, product/class labels or processor IDs enter the candidate event. COP amount is in whole pesos, not cents. This is in-memory demonstration persistence; it does not survive restart and is not a production outbox. It is not a compliant Meta request on its own. Fixture event time represents local confirmation, not an assertion of the production transaction timestamp.

## Before any real Test Events request

1. Separately finish the isolated Wompi hosted approval/decline and verify test notifications/receipts are isolated. No real payer or production order may be used. Keep the existing homepage PageView pilot separate.
2. Confirm the HOY data source permits generic Purchase measurement and review approved consent and data field scope. Meta requires website event context and customer information parameters; do not send real user identifiers, hashed or otherwise, or even stage actual CAPI credentials until the sender and policy are reviewed. No class type, account path, attendance, medical context, private URLs, customer or payment identifiers in tracking.
3. A test-only sender must be reviewed separately: same HOY Meta dataset with its approved server test code at the request root, scoped secure credential server-side, test identity/context only and an outbound allowlist. Verify accepted event in Events Manager and no duplicate. If the endpoint rejects or the category limits Purchase, report that; do not bypass restrictions.
4. Production will need stable persisted idempotency at confirmed payment, verified payment time, revocation before dispatch, audit and guarded retry. Provider callbacks (if added) may initiate authoritative verification but never count raw or browser-returned claims as payments. A production release and event authorization are separate from this sandbox draft.
