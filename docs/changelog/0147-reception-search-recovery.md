version: 0.25.0
date: 2026-10-23
codes: S-02 S-04

# 0147 — Explicit reception search read recovery

- Intent: close RC-03's remaining initial/refresh read-error and retry UI gap after independent review.
- Decision: clear unconfirmed results, show existing bilingual loading/error/Retry variants, contain false no-match states and keyboard actions, preserve scope/latest-request guards. Keep query/class editable and current during read completion.
- Alternative rejected: silently empty results or unlabeled stale identities, changing shared providers/payment/schema/Home, or directly editing shared CI/workflow/package files.
- Files: useReceptionPeople.ts, CheckinPage.tsx, RegisterPage.tsx, two staff.search translations; actual-page recovery harness/test, browser CHROMIUM_PATH compatibility; recovery captures/results, existing repair receipt, prompt/changelog and unapplied CI workflow patch.
- Verification: domain/typecheck/build; hook stale-context suite; EN/ES320 actual-page initial/refresh failure/retry/query/class/actor/unmount matrix; EN/ES320/390 production regression. See frontend-completion/reception-search-repair.md. CI patch application check passes; hosted CI remains integration-owned/unverified. No PR retry, merge, deployment or backend acceptance claim.
