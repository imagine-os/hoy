date: 2026-10-25
codes: S-09
prompt: docs/prompts/0197-class-voucher-recipient-preview.md
intent: Show a protected recipient's explicitly unsent class-voucher email after fictional approval.

# 0197 — Class-voucher recipient preview

Successful fictional class-gift approval can show an inline, read-only recipient email preview after the existing review closes. It checks the exact purchase, payment, approval request, voucher, issuance and audit facts. Recipient contact comes from the protected intent and reviewed terms; an account and saved language are not assumed. The bilingual copy is a versioned built-in mock contract, separate from the scheduled monetary gift-card template.

Preview reads never issue a voucher, change a payment, add package classes or record sending. Loading, unavailable and read-error/retry states retain the completed approval. Actor, role, provider and route changes suppress obsolete copy. The existing same-browser redemption entry is displayed as an inert preview link, with no secure cross-device claim.

Alternative rejected: inferring the latest gift, treating a buyer receipt as recipient delivery, borrowing monetary gift timing, creating a send log, or changing financial/issuance commands. CMS source/entity/page mappings, synthetic fixtures, component-library states and targeted tests accompany this slice. Real email delivery, secure links, backend authorization and whole BO-02/NT-02 acceptance remain separate.


The inherited DEV-state QA workflow uses the already checked dependency-prepared server, fatal readiness checks and cleanup; its functional assertions remain unchanged. HTTP readiness alone permits late optimizer reloads. This is generic test scaffolding, with no held feature runtime or production Vite change.
