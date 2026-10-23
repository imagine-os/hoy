version: 0.25.0
date: 2026-10-23
codes: C-04
prompt: docs/prompts/0162-pending-desk-intent.md
intent: Retain selected session and mat and recover pending desk requests without duplicate creation.
decision: Reconcile one scoped saved request and retain accepted terms; block conflicts and unconfirmed reads.
rejected: New request identities on reload, silent repricing, inferred holds or offer extensions.
files: pendingDeskIntent; CheckoutPage; focused tests; bounded integration handoff.

# 0162 — Retain pending demo desk booking intent

- Intent: preserve the selected class/mat when requesting front-desk payment and prevent another pending request after reload.
- Decision: retain optional booking-intent metadata alongside the accepted quote. Reconcile one scoped existing pending request; show stored facts and block a new charge when reads fail or records conflict. Claim-linked desk requests remain explicitly unsupported.
- Alternative rejected: generating another request key on reload, silently repricing an accepted request, inferring a booking hold or extending a waitlist offer.
- Files: pendingDeskIntent helper, CheckoutPage, focused domain/component/browser tests and handoff documentation. Existing Notice/Drawer variants and C-04 usage cover the new states; no component or token added.
- Version: frontend demo only. Shared immutable metadata and atomic settlement/admission integration require the integration owner's follow-up. No bank services, deadlines, invoices, messages or backend permissions changed.

Validation: full build;32 metadata cases;4 production request workflows;12 context/read-Retry plus2 lost-ack groups;8 unchanged package-booking whole-flow groups passed. Combined settlement integration and independent review remain pending.

Review follow-up: cash scope/method fencing now also suppresses stale failure feedback after the selection changes. Quote fingerprints represent JSON-persisted values, including omission of optional undefined properties. Actual paused method/product/mat regressions require rollback, no stale alert and a successful fresh action; the earlier transaction assertions remain unchanged.

Follow-up validation: full build and TypeScript pass;34 pure cases and12 paused selection regressions pass. Original checked commit/bundle retained separately. Combined shared-model/settlement review remains pending.
