version: 0.25.0
date: 2026-10-24
codes: A-02, A-03, C-04, C-08, C-08b
prompt: docs/prompts/0195-unsent-event-previews.md
intent: Bind verified frontend actions to explicitly unsent email previews.

# 0195 — Action-bound unsent previews

Five canonical producers use one read-only preview contract: committed account registration, the current fictional sign-in challenge, committed electronic checkout approval/rejection and a verified reschedule replacement. Welcome/reschedule handoffs contain only scoped IDs in memory; navigating away, changing context or reloading cannot replay them. Payment previews use exact committed facts and remain separate from immutable receipts. Preview failures never change the underlying action result.

Saved welcome, rejection and reschedule templates retain their actual version and active flag, including inactive previews. Demo sign-in and distinct payment confirmation use visibly labeled, versioned mock-copy contracts, not invented saved template versions. Existing receipt and studio-cancellation previews remain unchanged. Pending booking, released booking and voucher receipt have no new producer because event/timing/recipient semantics remain unresolved.

Alternative rejected: sending messages, guessing a latest payment or recipient, treating a countdown/navigation as a booking release, reusing a receipt as a second confirmation event, storing notification records or rewriting existing business commands. CMS entity mappings, per-page configurations, fictional fixtures and source/test bindings accompany the changed surfaces. Backend authorization and delivery remain separate.


Retained booking-detail tests wait for the actual destination before checking payment facts. Trial-state diagnostics retain every assertion and save React error stacks, module requests and navigation traces on failure; CI also retains the DEV log. This improves evidence for an unreproduced startup error and does not claim a diagnosed runtime fix.


The shared DEV-state workflow now uses the existing dependency-prepared QA server before accepting harness requests, with fatal readiness checks and process cleanup. This closes the HTTP-only startup gap that permits late optimization/reload; it does not establish the cause of the earlier React dispatcher error. Production Vite settings and all functional assertions remain unchanged.
