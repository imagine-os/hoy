version: 0.25.0
date: 2026-10-25
codes: Delivery Room (standalone)
prompt: docs/prompts/0196-public-delivery-room.md
intent: Publish the sanitized delivery tracker with the HOY repository.

# 0196 · Public Delivery Room

- Version: 0.25.0 (standalone tracker migration)
- Date: 2026-10-25
- Intent: share the existing delivery tracker from the HOY repository.
- Decision: use Vite's existing `public/` copy convention and normal Pages deployment at `/hoy/delivery-room/`; retain the tracker UI and bundled read-only snapshot. Sanitize private context while preserving 124 criteria, source links, phase/status boundaries and 46 record IDs. Refresh PR96–98 exact-head evidence without releasing those drafts.
- Alternative rejected: a major React/router rewrite or client-side authenticated Sheet integration would enlarge the migration and change access boundaries.
- Files: `public/delivery-room/`, `scripts/test-delivery-room.cjs`, `package.json`, `.github/workflows/delivery-room-qa.yml`, `docs/delivery-room.md`, prompt/changelog entries.
- Validation: inherited seven-view/124-drilldown tests, public-data audit, private-source fidelity comparison, independent review, responsive browser subpath checks; actual build and final CI recorded in PR.
