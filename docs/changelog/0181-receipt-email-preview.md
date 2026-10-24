version: 0.25.0
date: 2026-10-24
codes: C-11, C-37, S-04, S-09
prompt: docs/prompts/0181-receipt-email-preview.md
intent: Save addressed, explicitly unsent receipt copy and collector identity for new simulated confirmations.

# 0181 — Immutable receipt-email previews

Decision: add paired optional emailPreview/recordedBySnapshot fields to newly captured receipt JSON. Save exact bilingual subject/body, payment/reference/customer/tenant binding, observed destination/locale and recorder name. Resolve only scoped payment-owner records; a gift recipient is not the buyer's receipt destination. Missing, malformed, generated or ambiguous addresses remain explicitly unavailable; read failures roll back the existing transaction.

Legacy receipts and committed purchase/review/cache results remain byte-identical; reads never reconstruct missing snapshots from today's contact or templates. The shared receipt shows saved literal copy, an unsent status, unavailable/legacy explanations and recorded collector. Existing customer-label fallback is retained. Register always previews receipt email for confirmed demo payments; optional WhatsApp preview does not imply marketing consent, and only newly created profiles default to no marketing opt-in. No existing profile preference is rewritten.

Alternative rejected: actual send claims, guessed recipients/current-viewer identity, legal invoice or VAT assumptions, historical backfill and hidden coupling of preview controls to marketing consent. The adapter's immutable JSON boundary is a frontend simulation, not server authorization or tamper-proof storage.

Files: receipt model/shared builder, gift capture, shared receipt and component inventory, Register, EN/ES strings, focused source-mapped domain/component/native browser tests, CI and completion notes. Existing recorded amounts/tax, consent, admission and replay assertions remain in place. Actual sending, service ownership and unresolved document/tax policy remain separate.

Visual regression: scope the existing fixed-light email paper ink tokens to the entire paper, keeping dark preview headings/footer readable across receipt, M-04 and M-14 examples. Existing tokens and outer dark surfaces are retained.
