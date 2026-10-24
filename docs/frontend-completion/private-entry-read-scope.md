# Private entry and bounded customer read isolation

Feature Log row7 / source row8, PL-04. This batch covers visitor entry plus reproduced customer history/session-list, notification and saved-method leaks. It does not mark the whole criterion accepted.

Visitors opening private customer/staff/admin URLs go to sign-in. Only destinations accepted by the existing customer-return allowlist are retained. Authenticated forbidden roles keep NoAccess. Legacy visitor NoAccess URLs use the same sanitation. No roles, permissions, provider configuration or real authentication change.

Private reads send explicit tenant scope; owned rows additionally send current user scope. Results are filtered defensively, including all five joined session reference tables. Missing tenant, actor or public context yields no private rows. Provider, actor, real/effective role and tenant identity own each result; pending older reads cannot populate a replacement context. Booking and notification/saved-method writers are unchanged.

Regression commands:

- `node scripts/test-visitor-signin.mjs`
- `node scripts/test-private-denial-assertion.mjs`
- `node scripts/test-customer-read-scope.mjs`
- `QA_BASE=<local-origin> node scripts/test-visitor-signin-ui.mjs`
- `QA_BASE=<local-origin> node scripts/test-customer-read-scope-ui.mjs`
- `QA_BASE=<local-origin> node scripts/test-customer-inbox-cards-scope-ui.mjs`
- Development harness: `QA_BASE=<dev-origin> node scripts/test-customer-read-context-ui.mjs`

Actual UI suites use synthetic fixtures, EN/ES and390/1280 widths and assert unchanged persisted database. Context tests exercise delayed success/failure across actor, effective role, provider, missing tenant and unmount. Existing visitor-denial tests now require exact sign-in/next behavior; authenticated denial and privacy assertions remain.

Other customer read selectors and full record-ownership acceptance need separate evidence. Browser filtering does not implement server tenant authorization. Publication, combined current-main regression and independent review remain integration-owner gates.
