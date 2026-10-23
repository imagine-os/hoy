# Customer read isolation followup

PL-04, Feature Log row7 / source row8. Separate bounded followup to the visitor/private-list checkpoint; whole-criterion acceptance remains with the integration owner.

Read-only synthetic fixtures reproduced foreign-tenant data in account display, direct class detail and sent invitations. Further probes reproduced a foreign membership/plan and package ledger quantity on account/classes, a foreign queue row affecting position and a foreign review suppressing an unrated booking's rating form.

Only READ selectors changed: `useSessionJoined`, `useMyProfile`, `useMyInvites`, `useEntitlements`, `useWaitlistFor` and `useMyReviews`. They reuse the private context-owned scoped reader. Inviter/user/session identifiers are additionally checked at each selection boundary; same-tenant queue entries from other customers still contribute to position. All five session reference tables are tenant-filtered before joins. Command/write function bodies and historical rows remain unchanged.

Checks:

- `node scripts/test-customer-read-scope.mjs`
- `QA_BASE=<origin> node scripts/test-customer-remaining-read-scope-ui.mjs`
- `QA_BASE=<origin> node scripts/test-customer-derived-read-scope-ui.mjs`
- Development actual-hook harness: `QA_BASE=<dev-origin> node scripts/test-customer-read-context-ui.mjs`

UI tests cover EN/ES390/1280, valid current records, foreign same-user/colliding references, direct foreign class denial, valid queue position and rating availability. They perform no product write actions and assert unchanged persisted database. Context tests retain delayed success/failure, provider/actor/effective-role/missing-tenant/unmount checks.

The unused legacy event hook, public content references and teacher review aggregate were not changed. Backend tenant authorization, real identity and all other acceptance scopes remain separate. Combined current-main review/build and integration-owner deployment checks are required before release.
