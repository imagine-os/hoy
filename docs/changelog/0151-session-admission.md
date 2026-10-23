# 0151 — Enforce publication at new admission

date: 2026-10-23
version: 0.25.0
prompt: docs/prompts/0151-session-admission.md
files: src/data/sessionAdmission.ts; MockProvider/deskBooking/vouchers; customer booking/waitlist/reschedule/cancellation; checkout/reception/Register; scoped tests and read-only CI

Customer checkout, waitlist claims and reception keyboard actions could admit customers to withdrawn classes despite disabled calendar controls. New admission commands now read current scoped session/modality/template availability and retain actor context through awaited work. Desk sales and rescheduling use the same guard; voucher admission applies the same pure rule. Existing attendance/history remain accessible, and cancellation returns do not create offers for withdrawn classes.

The repair preserves saved receipt previews, existing invoice history and simulated payment boundaries. Tests cover rejection, valid paths, rollback, contextual changes and EN/ES mobile/desktop pages. Page-only gating was rejected because direct and delayed actions bypassed it. No real services, policy timings or historical migrations change. Scope and base: `docs/frontend-completion/session-admission-repair.md`.

Current-main integration starts from PR85 (`90fcfe14`), excluding the older combined branch's unrelated candidates. Reception display checks reuse the shared predicate; transfer-review tests retain financial/capacity assertions and add withdrawal rollback coverage.
