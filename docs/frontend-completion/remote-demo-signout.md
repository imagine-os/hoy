# Remote demo signout

CU-04 — Feature Log28 / source29. Literal source criterion: “The session closes completely; an email change sends a notice to the previous address.” This batch repairs the browser-tab part. Previous-address notice remains an explicit persisted preview; actual email delivery and real session/token revocation are not implemented here.

Before repair, signing out closed the active tab and persisted the public session, but a second mounted profile retained private email-change controls until reload. The SessionProvider now reacts only to validated session storage events: explicit public session or removal of that key, matching current persisted state. Other keys/storage areas, malformed input, nonpublic persona/view-as switches and stale logout events after a newer sign-in do not replace the current identity.

The accepted remote logout synchronously resets to the public demo session and remounts its consumer subtree. This cancels pending consumer work even if signup was already public. Explicit logout clears mounted memory drafts. The outer data provider remains mounted; historical rows and already-committed transactions remain intact. Existing commands, roles, permissions and default demo configuration are unchanged.

Focused checks:

- `QA_BASE=<origin> node scripts/test-remote-signout-ui.mjs`: actual two-tab EN/ES390/1280 signout, key removal, ordinary persona/view-as independence, new sign-in, queued old events and malformed/wrong-key/wrong-area events; unchanged database.
- Development-only actual-page fixture: `QA_BASE=<dev-origin> node scripts/test-remote-signout-context-ui.mjs`: signup and zero-charge package checkout, precommit/postcommit and explicit-public/key-removal boundaries. Before commit no writes; after commit retain records without old login/navigation/confirmation. Payments remain unchanged.

Combined integration, final checked source review and exact-head CI/release remain integration-owner gates. No real authentication, OAuth, delivery, credentials or server authorization changes.
