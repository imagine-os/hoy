version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# 0131 · RC-02 attendance undo contract audit

Intent: inspect the existing S02 checked_in→booked Undo and its provider/admission/audit interaction, without implementing runtime changes.

Decision: save exact original source fixtures and a read-only bounded proposal. Undo is displayed on noncancelled future/in-progress/past/completed occurrences but invokes new-admission validation and fails after start; status and audit are independent writes. Recommend only an occupancy-neutral same-booking/session/mat Undo command with fresh scoped actor/target, atomic booking.undo audit, once-only replay and honest lifecycle, subject to root review and batch42 provider reconciliation. Preserve MVP Oct30/Urgent/source Not verified and all existing roles.

Alternatives rejected: inventing a past-class cutoff, globally relaxing new-booking admission, adding no-show direct Undo or choosing its unresolved capacity/mat policy, altering subject eligibility/roles, payment/refund/ledger/history repair, teacher attendance writes, or claiming source-derived predictions as executed tests.

Files: docs/frontend-completion/batch-45.md; evidence/batch-45-checkin-undo-source.json; scripts/fixtures/checkin-undo-original/* (six exact full sources and one exact setStatus substring). No runtime src, global metadata, Git, compiler/esbuild/build/browser/runtime tests or real provider/data/payment/security/external-message actions.

Verification: source inspection and exact file-byte/hash assertions only. All written baseline/domain/rendered recipes remain NOT RUN. Root alone owns contract authorization, execution lanes, Git, integration/global metadata and release. Eventual45 depends on checked main70 and42's provider changes; no production or full RC02 acceptance.
