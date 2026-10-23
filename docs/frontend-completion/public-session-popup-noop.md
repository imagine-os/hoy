# Public session serialization and legal popup

CU-04 / CU-01 / CU-02 frontend compatibility. A real signout → signup → legal popup flow reproduced the issue without per-popup fixture injection: the public payload's JSON property order changed when the popup mounted. That event was incorrectly treated as an explicit logout, remounting signup and clearing entered fields. The later quota-save assertion then timed out because required-field validation prevented reaching the save command.

The bounded repair ignores semantically identical validated public-to-public rewrites. It retains private-to-public logout, key removal, malformed-input rejection, current persisted-value stale-event protection and pending consumer cleanup. No legal, consent, role, permission, provider or command policy changes.

- `QA_BASE=<origin> node scripts/test-signup-legal-popup-session-ui.mjs`: normal user signout, filled signup, checked consent, legal popup/reload/close, exact retained fields/consent and unchanged database; EN/ES390/1280.
- Original signup consent regression remains unchanged, including legal version rollover, quota rollback, no writes and duplicate-submit retry.
- Existing remote signout and pending-context scripts remain unchanged.

Integration owner performs the single combined full build, source review and exact-head CI. Real authentication, delivery and server authorization remain separate.
