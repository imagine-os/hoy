# Existing staff accounts: sign-in help instead of another invitation

- **Intent:** resolve confusion when staff expects an invitation but the backend confirms an existing signed-up account.
- **Decision:** show a copyable ordinary, role-targeted sign-in URL after `added`, `signed_up`, or `has_account`. Label it as sign-in, explain that no new email was sent and no password changed. Next action clears it.
- **Rejected:** re-send automatically, change credentials, or substitute teacher addresses into voucher emails. Teacher referral-code sharing is a different flow.
- **Files:** TeamUsersPanel.tsx, accountHelp.ts, team/strings.ts, test-existing-account-help.mjs, test-auth-identity.mjs (existing CI/release gate).
- **Version:** pending release; no backend contract changes.
- **Checks:** new regression RED (missing helper) then GREEN; production build PASS; typecheck PASS; auth identity PASS; two independent review rounds approved. Existing h7 suite fails identically on baseline at fixture expectation `invited` vs `added`, outside this change. No customer data in tests.
- **Remaining verification:** rendered copy/reset interaction not yet exercised; static/source regression checks are not browser coverage.
- **Components:** existing Field/Input/Button; no new visual primitive.
- **Playbook impact:** none.
