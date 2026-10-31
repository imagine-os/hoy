# Hoy all roles: shared session field for view-as

Prompt intent: the owner reversed the reduced launch scope (every one of the 11 roles at launch, the Hub with read-only view-as for super admins; Company OS decision log P-03b, R-02).
Decision: the session interface gains `viewAsPerson` (the sample person a viewed role's data belongs to), set to `null` everywhere for now, so the role-plumbing and Hub lanes build on one shape.
Alternative rejected: each lane adding its own field and reconciling at merge (IN-062).
Files: `src/auth/sessionContext.ts`, `src/auth/SessionProvider.tsx`, `src/auth/ProductionSession.tsx`, `src/app/frameSession.ts`.
