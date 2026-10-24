# Monetary gift retry safety

Repair the monetary gift draft so double pressing, interrupted acknowledgement, reload and retry do not duplicate a simulated payment or draft. Retain the exact scoped intent, recover only verified existing evidence and require an explicit acknowledgement before another purchase. Preserve quote guards and browser-only draft behavior; introduce no delivery or real services.

## Response

The gift page retains a tenant/account/role-scoped recipient, delivery date and frozen quote before checkout. Exact transaction, payment and draft-gift evidence controls recovery, retry and acknowledgement. Existing draft records remain intact. Synthetic domain and actual-page regressions cover interruptions, conflicts and context changes.
