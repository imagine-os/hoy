version: 0.25.0
date: 2026-10-24
codes: C-06, C-07b
prompt: docs/prompts/0191-retained-class-active-owner.md

# 0191 — Retained class purchase active-owner checks

Intent: preserve a retained simulated class purchase when its owner becomes inactive during asynchronous recovery or acknowledgement.

Decision: recheck the existing active-owner invariant using the mock provider's current synchronous snapshot immediately before returning a saved result, releasing its exact marker, or proceeding with financial writes after checkout. Missing, ambiguous, foreign or unavailable snapshots fail closed. Existing caller-context checks and role policy remain unchanged.

Alternative rejected: relying only on the initial asynchronous owner lookup, which can become stale before later proof reads finish.

Files: the retained class-purchase helper, existing domain suite, compiled active-owner regression, retained-purchase CI wiring, kanban and matching 0191 prompt/contract notes.

Scope: fictional browser data only. This does not add backend authorization, real charging or delivery.

Isolation on live PR91 preserves its directly paid cancellation and persisted role checks. The retained-purchase domain fixture calls that current module and explicitly verifies its package ledger proof identifiers and digests before recovery/acknowledgement. Fresh build/browser/domain validation remains a coordinated gate.
