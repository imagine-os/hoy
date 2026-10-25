version: 0.25.0
date: 2026-10-25
codes: W-10, W-01 (shared reader), D-02
intent: Keep generated public FAQ price tables, search and structured data aligned with published products.

# 0198 · Published FAQ price projection

Decision: reuse the saved FAQ projector and optional rendering adapters, sharing the checked Home pricing reader and contract. Generated prices follow confirmed tenant-scoped publications on the studio date; missing, withdrawn and failed reads show unavailable. Public FAQ rows are tenant-scoped and published-only. Authored answers and financial history remain unchanged. Unavailable price copy wraps within its column so mobile option labels remain readable.

Alternative rejected: a second pricing reader would duplicate lifecycle guards, and rewriting authored numeric paragraphs would invent unapproved content or price policy.

Affected: FAQ projection and search/JSON-LD, shared pricing contracts/reader, W-10 data spec, existing FaqAnswer/PriceTable variants and D-02 inventory, synthetic tests and CI. This slice depends on the Home pricing batch; it does not include unrelated contact or launch changes.

Limits: authored price/term guidance still needs content-owner review. Customer FAQ rendering is a separate consumer. No real backend, authentication, payments, email, final price policy or automatic content publication changes.
