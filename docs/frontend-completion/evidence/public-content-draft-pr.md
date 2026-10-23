## Public website launch and contact consistency

From October 30, 2026 at midnight in the studio timezone, `/` and `/coming-soon` replace the current route with `/site`, including tabs left open across launch. Prelaunch controls and the component-library preview remain intact. Contact cards and footer labels now match the configured front-desk WhatsApp destination, and home agenda dates/times use the studio timezone.

Based on latest main `c2c0f37` with PR77 consent preserved. No auth, providers, shared schema, account/profile, notification or image-loading implementation changes. All focused browser fixtures are fictional and external HTTP is blocked. No real messages, backend, domain or Cloud configuration changed.

Validation: full build, contact routing domain checks, launch ±1ms boundary tests, ES/EN production browser checks at 390/1280, selected-class checkout/waitlist sign-in handoff, empty agenda light/dark, FAQ no-match, form blank/Unicode and static root/project-subpath regression passed. Exact-head CI and deployment remain pending.

Receipt: `docs/frontend-completion/public-content-launch.md`. SW-01/03/04 are bounded slices; no full-row or production acceptance claim. SW-08 uses explicit 2026-10-30 from current launch context. SW-02/PC-08/Q-14/Q-15 and backend/owner acceptance remain separate.

Integration action: image/readiness owner should review the unapplied `docs/frontend-completion/evidence/public-prelaunch-test-contract.patch` to pin historical W-11 tests before launch. Account owner retains signup/sign-in return verification. Parent coordinates integration and merge; keep this PR draft.
