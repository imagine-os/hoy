version: 0.25.0
date: 2026-10-23
codes: S-04
prompt: docs/prompts/0176-desk-booking-contact.md
intent: Require supplied contact details before a desk class-booking sale.

# 0176 — Desk class-booking contact validation

Version: frontend repair checkpoint · Date: 2026-10-23 · Surface: S-04 · CU-01, Feature Log25/source26.

Intent: booking requires an account with name, WhatsApp and email. A reproduced Register sale created a class booking despite blank email by substituting a generated address.

Decision: when a standard class is selected, Register requires supplied name, WhatsApp and syntactically valid email, rejects the existing no-email placeholder domain, and re-reads existing customer/profile rows inside the transaction before staged account or financial writes. The final handler repeats the guard; Enter cannot bypass it. Incomplete existing customers get bilingual guidance and remain unchanged. This validates contact presence/format, not real identity, deliverability or WhatsApp ownership. Existing phone digit conventions are retained.

Alternative rejected: silently treating a generated email as supplied contact or rewriting legacy records. Non-class Especial sales remain separate unresolved scope. Shared admission guards outside Register remain required before any whole CU-01 readiness claim.

Files: RegisterPage, bookingContact helper, staff strings, focused domain/UI tests, valid-contact update to the existing desk-sale fixture, scoped completion documentation. Reuses existing EmptyState/Field/Button; no new component or design token. No held reception branch, provider/schema, backend/auth or real service changes.

Validation and remaining shared-guard contract are recorded in frontend-completion/desk-booking-contact.md. Local checkpoint only; no release claim.
