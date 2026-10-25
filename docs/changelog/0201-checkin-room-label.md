version: 0.25.0
date: 2026-10-25
codes: S-02
intent: Show the assigned room in the existing reception selected-class summary.

# 0201 · Check-in room label

Decision: add a tenant-scoped, read-only room label to S-02. Existing unpublished and legacy room references remain readable. Loading, unavailable and failed reads have bilingual feedback and retry; selection, actor, role, provider, unmount and superseded requests cannot expose a previous label. The reader uses the existing adapter contract and local room events without depending on the separately held global table-hook repair.

Alternative rejected: a new reception FAQ screen, changes to admission policy or a global hook rewrite would broaden this display repair. Existing D-02 Button and text/status styles are reused; no component variant or design token is added.

Affected: S-02 selected-class summary and strings, its bounded room reader/selector, page specification, CMS mappings/fixtures/source drift contracts, synthetic domain/lifecycle/native tests and workflow.

Limits: mock frontend display only, dependent on the held room-publication stack. No room, booking, financial or historical writes; no backend connection, authentication, route permission, payment, email or tracker changes. Whole AD-01 remains incomplete. Merge and deployment remain held.
