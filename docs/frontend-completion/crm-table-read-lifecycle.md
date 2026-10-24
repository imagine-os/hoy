# AD-07 — CRM read lifecycle

Feature Log row 93; stable ID AD-07; source row 94. The literal list criterion is customer search, package, remaining classes, expiry and vouchers. This batch repairs loading/error/retry and long-name readability on M-06; it does not certify every related CRM workflow or backend service.

The shared useTable hook keeps provider/query reads separate, rejects superseded responses, catches read failure, retries explicitly and unsubscribes safely. Synchronous initial snapshots remain available for demo session startup. The CRM list waits for all people and financial read dependencies before showing rows or segment counts. Failed reads offer localized Retry instead of unconfirmed zero balances.

Regression tests mount the actual hook, session provider and CRM under a controlled read-only provider. They cover 13 hook groups and 32 CRM groups, including EN/ES at 390/1280, delayed/rejected/reversed reads, provider/query/context changes, retry, unmount, unchanged financial history and long names. Baseline source reproduces the missing lifecycle behavior. The integrated test suite retains every original assertion and additionally rejects any unhandled read rejection.

One CMS descriptor records the real list route, fixed computed columns, entity dependencies, fictional input shapes and source/test hashes. It uses the current DataTable, with no invented persisted preferences or backend mapping. The shared detail spec dependencies are recorded without claiming detail-page lifecycle acceptance. Contract checks fail on stale covered sources, fixtures or regression bindings.

The independent local component regression is separate from compiled full-application routing and authorization. The normal CRM production regression and signup/consent compatibility checks remain release validation gates. No real authentication, payment, email, backend storage, tenant authorization or cross-device consistency is introduced.

## Local verification

The integrated full build passed TypeScript, spacing and manual checks. Both installed lifecycle suites passed all 13/32 groups. Existing compiled CRM checks passed for admin/front-desk EN/ES at 390/1280 with customer route denial. All eight compiled signup/consent combinations passed, including unchanged accepted audit snapshots. The existing desk-package UI regression and package-lot/consent domain regressions also passed. CMS inventory validates one feature/page, and all 20 retained plus four CSS/HTML negative checks pass. Private evidence records exact hashes and captures. This reports local verification; remote CI and deployment are separate.
