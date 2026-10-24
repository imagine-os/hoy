version: 0.25.0
date: 2026-10-23
codes: C-04 C-20 C-28 S-04
prompt: docs/prompts/0169-physical-admission-capacity.md
intent: Prevent imported class capacity from exceeding its actual room on final admission.
decision: Compute a scoped positive session/room ceiling, plus existing yoga mat limit. Return an effective fresh-read session clone and apply the same bound to raw regular insertion and voucher party occupancy/mats. Preserve stored capacity and historical admission/replay behavior.
rejected: Trusting an imported session snapshot above room capacity, implicit exact-mat replacement, rewriting historical sessions, future-admission rules for after-start attendance and invented room availability policy.
files: data/sessionAdmission.ts; data/MockProvider.ts; data/vouchers.ts; synthetic capacity domain/browser tests; explicit positive voucher/promotion room fixtures.

RS-06 Feature Log44/source45 requires app and desk never exceed room capacity (16/8 mats). This bounded final-admission repair is frontend mock behavior; real server authorization/locking and owner acceptance remain separate. RC-02 released-mat restoration is a separate finding and is not silently included.
