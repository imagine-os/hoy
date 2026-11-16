---
date: 2026-11-16
version: 1.4.1 (unreleased)
intent: Sample current Plans decoration atomically without relaxing visual release assertions.
---

# Plans decoration verification uses a fresh DOM snapshot

- Version: 1.4.1 (pending release)
- Date: 2026-11-16
- Intent: investigate repeated hosted Plans mask assertions without relaxing release checks.
- Decision: select the current connected page heading and read its pseudo-element styles and overflow in one browser task. Wait only for required DOM readiness. Wrong mask, pointer behavior or overflow still fails immediately. Save the raw variant-specific sample in failure.json.
- Alternative rejected: repeatedly rerunning a deployment or waiting until incorrect styles happen to pass. A retained detached node is reproduced by isolated fixtures; it is a possible failure mechanism, not an established production cause.
- Files: scripts/test-website-live.mjs; scripts/lib/plans-decoration-snapshot.mjs; scripts/test-plans-decoration-snapshot.mjs; .github/workflows/release-verifiers-qa.yml.
- Validation: four fictional DOM/contract tests and Node syntax checks pass. Public read-only hosted verification remains required against the exact deployed source.
- Product impact: none; no UI, business rules, schedules, bookings or data writes changed.
