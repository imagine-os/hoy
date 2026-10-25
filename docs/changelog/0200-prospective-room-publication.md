version: 0.25.0
date: 2026-10-25
codes: M-02, M-14, S-04, S-05
intent: Add the missing room publication controls and apply their state to prospective room assignments.

# 0200 · Prospective room publication

Decision: follow the existing teacher-style catalog convention. New rooms start unpublished; existing rows without the optional browser active field remain published without backfilling or reseeding. Malformed or foreign publication data is unavailable for new assignments. Existing room references remain readable; class admission, cancellations, refunds and historical records retain their current behavior.

M-02 uses the existing publish controls, required room fields and audited atomic content commands. New template/session assignments, recurrence generation and space bookings verify current room publication in the mock adapter. The existing Register atomic boundary rolls back a stale-room sale; no financial command logic or amounts change. Interrupted provider/actor/role contexts cannot finish detached content writes. Legacy bulk Undo restores the prior published meaning with an explicit boolean.

Alternative rejected: hiding or cancelling existing classes on room withdrawal would invent policy. A second publication subsystem or backend migration is unnecessary for this bounded frontend state.

Affected: client room type/helper, existing CMS commands and prospective selectors, page specs, CMS entity mappings/shapes/fingerprints, synthetic domain/browser regressions and CI. Existing D-02 Toggle, Badge, Select and feedback states are reused. This draft depends on PR103's room-name propagation repair; other held feature work is excluded.

Limits: optional browser-only extension with backend mapping pending. No SQL, backend, authentication, permission, payment service, email or automatic content publication changes. Whole AD-01 acceptance and any policy for already scheduled classes remain separate.
