version: 0.25.0
date: 2026-10-24
codes: A-02, A-03, C-04, C-08, C-08b
prompt: docs/prompts/0195-unsent-event-previews.md
intent: Bind verified frontend actions to explicitly unsent email previews.

# 0195 — Action-bound unsent previews

Five canonical producers use one read-only preview contract: committed account registration, the current fictional sign-in challenge, committed electronic checkout approval/rejection and a verified reschedule replacement. Welcome/reschedule handoffs contain only scoped IDs in memory; navigating away, changing context or reloading cannot replay them. Payment previews use exact committed facts and remain separate from immutable receipts. Preview failures never change the underlying action result.

Saved welcome, rejection and reschedule templates retain their actual version and active flag, including inactive previews. Demo sign-in and distinct payment confirmation use visibly labeled, versioned mock-copy contracts, not invented saved template versions. Existing receipt and studio-cancellation previews remain unchanged. Pending booking, released booking and voucher receipt have no new producer because event/timing/recipient semantics remain unresolved.

Alternative rejected: sending messages, guessing a latest payment or recipient, treating a countdown/navigation as a booking release, reusing a receipt as a second confirmation event, storing notification records or rewriting existing business commands. CMS entity mappings, per-page configurations, fictional fixtures and source/test bindings accompany the changed surfaces. Backend authorization and delivery remain separate.
