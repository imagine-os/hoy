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

PR94 sensitive UI fixture repair: the unchanged pending-package test still expected a definitive no-commit message after storage failure. It now waits for the actual storage fault and settled operation, checks truthful retained uncertainty, retries the same saved intent, verifies one grant and unchanged prior history, then checks read-only reload and explicit marker acknowledgement. All original assertions are preserved. The compiled fixture is bound in the classes CMS adapter inventory and retained-purchase CI. Runtime source and its reviewed digest are unchanged.

Retained DEV32 setup now loads the actual app and complete bound module/harness import graph before freezing source and transformed response bytes. Full strict before/after equality and all journey assertions remain; transformed texts are retained for diagnosis. The exact CI drift cause remains unproven: the preserved local cold/default-config matrix passed. No runtime behavior or reviewed source digest changed.

The later c105 retained CI run still changed transformed module hashes after browser warm-up, with all journeys and raw/source bindings intact. Retained QA now uses the unchanged existing pending-payments startup: await explicit Vite dependency optimization, verify every package/React entry, and disable later dependency discovery before listening. Strict source/raw/transformed comparisons and the browser warm-up remain. Product runtime and production Vite configuration are untouched.

The CMS source inventory now fingerprints that unchanged startup dependency. Its aggregate review digest and the six class fixture digest references are refreshed; fixture rows, other feature groups and every product runtime file remain unchanged.
