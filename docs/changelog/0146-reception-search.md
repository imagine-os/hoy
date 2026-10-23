version: 0.25.0
date: 2026-10-23
codes: S-02 S-04

# 0146 — Reception search scope and normalization

- Prompt intent: repair RC-03's reproduced tenant leak, accent matching and phone formatting gaps in a separate branch without shared payment/provider/schema/Home edits.
- Decision: reception-only scoped reader/join and normalized matcher; both page searches reuse it; selected roster tenant filtering and missing-person query exclusion; latest-request/context guards.
- Alternative rejected: changing shared usePeople or providers, relaxing roles, rewriting stored names/phones, treating frontend scope as backend enforcement.
- Files: staff/CheckinPage.tsx, RegisterPage.tsx, receptionSearch.ts, useReceptionPeople.ts; dedicated domain/browser/state tests and harness; RC-03-search screenshots and scoped handoff/prompt/changelog.
- Verification: domain, typecheck/full build, actual-hook delayed read/role/context harness and EN/ES320/390 production UI/role matrix. See frontend-completion/reception-search-repair.md. Shared kanban/row evidence remains integration-owner handoff under explicit file ownership. No owner/backend acceptance or deployment claim.
