version: 0.25.0
date: 2026-10-24
codes: C-04, S-09
prompt: docs/prompts/0185-transfer-review-evidence.md
intent: Prevent a new transfer approval while its retained receipt is missing or uninspectable.
decision: Share structural/image/proof validation between current review readiness, handler and staged approval. Browser commands additionally decode the raster. Keep rejection and completed review replay independent of fresh evidence availability.
rejected: Trusting a comparison checkbox without the receipt; accepting a caller-provided inspection boolean; adding a server decoder or rewriting legacy proofs.
files: Transfer receipt command, retained-proof helper, queue review UI, focused regressions and mechanical positive image fixtures.

The queue previously displayed Receipt unavailable yet allowed approval and class activation. Fresh approval now fails before financial or admission writes. No upload proof is created for legacy receipts, and no real bank notification or backend authorization is implied. Full combined build, compiled regressions and independent review remain integration gates.

The existing sensitive-audit success fixture now uses the same genuine synthetic-image helper, preserving all 25 original privacy/financial assertions. The full audit browser regression is included in the receipt-evidence workflow and CMS test inventory.

CI evidence output uses the runner temporary directory. Writing new captures under `docs/screenshots` invalidates the eagerly imported documentation image glob and sends a Vite full reload, which can destroy the next browser evaluation. The focused browser matrix records navigation/reload diagnostics and rejects reloads; receipt and context assertions remain unchanged.
