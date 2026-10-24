version: 0.25.0
date: 2026-10-24
codes: C-06, C-07b, D-02
prompt: docs/prompts/0186-retained-class-purchases.md
intent: Prevent a lost acknowledgement and reload from repeating a simulated class purchase.

# 0186 — Retain uncertain class purchases

Decision: retain the scoped attempt ID and frozen class quote before payment work. Plans and Classes reconcile the existing exact transaction receipt and fresh owned payment/grant before any retry. The same-key atomic callback includes simulated checkout, receipt capture and activation. An unknown outcome keeps its marker; an explicit acknowledgement clears a validated recorded result, while cancellation requires proof that nothing was committed.

Alternative rejected: a fresh nonce after reload/error, inferring an outcome from amounts or timestamps, repricing a committed purchase, silently replacing a stale displayed attempt, or rewriting existing history. Legitimate freeze/resume, consumption and canonical cancellation-return history are distinguished from a duplicate purchase grant. Actor, effective role, provider, route/query and mount changes invalidate ongoing work.

The shared recovery notice and saved receipt are represented in the component inventory. English/Spanish copy distinguishes uncertainty from a known decline and labels receipts as unsent previews. A successful result describes the recorded purchase rather than claiming today's remaining balance or email delivery.

Files: retained class-purchase helper and context hook, Plans/Classes, recovery notice/inventory, existing receipt usages, bilingual copy, focused domain/native/context regressions and related quotation regression selectors. This fixes the reproduced Plans/Classes workflow; it does not automatically certify every PG-09 entry point. One browser/current mock dataset only; no real payments, server idempotency, cross-device guarantee, auth service, email, new tax rule or historical rewrite. Exact combined build, browser, CI and release gates remain separate.
