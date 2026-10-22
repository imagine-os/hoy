version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Preserve an occupied place when undoing fictional arrival

The existing staff undo action routed checked-in bookings through admission rules, preventing an undo after class start. The bounded mock command now changes only arrival status and its existing audit effect atomically, retaining identity, session, mat, purchased terms and financial history. Its immutable review, busy latch, context fences and current-state reconciliation distinguish confirmed outcomes from uncertain acknowledgement. Existing staff roles and original RC-02 phase remain; no new cutoff or subject-profile policy is introduced.

The provider admits only the exact checked_in-to-booked/null-arrival two-field patch through a scoped occupancy validator. Other admission and status changes retain original guards. It reports unverifiable legacy occupancy instead of reallocating a place. No real attendance/backend acceptance, entitlement or payment change.

Actual local evidence: original baseline4/domain7/typecheck/fullbuild pass; production eight EN/ES theme/device matrices and11 roles, all15 actual D02 states across eight combinations, and held-read/write/cancel/retry/actor/provider/unmount/lost-ack lifecycle pass. Explicit Router development warnings are recorded; unexpected console/network/mutation assertions remain strict. A mismatched offline font fixture caused the first console audit failure; original failure is preserved, exact source font URL fixed in the monitor, and the unchanged frozen artifact passed. Root independently verified runtime3ecd36ed and whole5050file/402667086byte artifact tree0142ddd7 after browsers closed. Final-head combined CI and ordinary deployment remain pending.

The independent React18 lowercase image-priority attribute representation also passes16 actual public-route cases each on production and development; original three image hashes and layout attributes remain. It activates no launch redirect, authentication, email or publication. All124 original requirements and questions remain; focused mock passes do not constitute full feature acceptance.
