# RC-03 reception search repair

Source: fresh remote main455843fda97c7a0c9979b3331d11690d9653f5e7 (PR81), 2026-10-23. Focused branch `fix/rc03-search-scope`. Earlier verification-only evidence is retained separately at `/workspace/rc03-evidence/`. This is a frontend repair; no live/backend authorization or owner acceptance claim.

Row mapping: RC-03 / REC-03, MVP Oct30, High, Recepción. Exact criterion: “Finds a person by name, WhatsApp or email even if they did not book that class.” Source Not verified remains unchanged. S-02 and S-04 are the only application pages touched; no RC-01/Home or shared CRM/inbox/provider/payment/schema/role/integration changes.

## Changes

- Reception-only people reader queries every users/profile/role/membership/plan table with tenant scope, then filters every side of the join defensively. Foreign rows, including colliding user/plan IDs, cannot become candidates or override local data. Missing tenant returns no people and makes no reads. Missing scoped role never defaults to customer. Existing reception role gates remain.
- People results are tied to provider, tenant, actor and role; old/subsequent-request/unmounted completions are ignored. A failed read clears candidates without exposing a partial join. Existing scoped snapshots keep the normal demo's synchronous behavior. No backend enforcement is inferred.
- Both pages use one accent-insensitive name matcher and one punctuation/space/country-code phone matcher. Mixed text is never converted into a phone query. Email remains case-insensitive. Original names, phones and stored data are not rewritten.
- Check-in's selected roster/waitlist requests include tenant scope, and roster/on-roster projection rejects foreign bookings. A missing-person roster row remains visible only on an empty search instead of incorrectly matching every typed query.

## Verification

- `npm run typecheck`, full `npm run build`, `node scripts/test-reception-search.mjs`.
- Domain: cross-tenant colliding identities and all join sides, missing tenant no reads, missing scoped role, immutable input, exact/partial accented/unaccented/decomposed/case matches, punctuation/spaces/country codes, null phones, text disambiguation, all five read failures.
- `node scripts/test-reception-search-states.mjs`: development-only actual-hook harness; missing tenant and late old-scope read; latest subscription read wins; role switch clears candidates and suppresses old read; failed read clears results and next refresh recovers; unmount ignores late reads without storage writes. Zero page errors. Earlier harness setup incorrectly intercepted its own mock list through peek; corrected to capture the original snapshot before the final successful run.
- `node scripts/test-reception-search-ui.mjs`: final local production staff shell, EN/ES320/390. Existing demo plus fictional local/foreign/roster/non-roster/staff/missing-person fixtures; normalized names and phones; exact/partial/email, empty/no-match, foreign exclusion, class changes, rapid interrupted searches, keyboard selection, leave/return, unchanged full DB and existing eleven-role gates (22 route checks). Captures/results in `docs/screenshots/RC-03-search/`. No real customer data, messages, sale, check-in or external access.

## Boundaries and handoff

No PR attempt is permitted under the existing API restriction; no merge/deploy or alternate publishing path. Commit/push and recoverable patch are separate from a final integrated release. Shared people.ts remains unchanged because CRM/inbox and Home have other owners. Integration should reconcile shared tracker/kanban/source metadata and any documentation numbering after accepting this focused branch; no whole-row owner/backend acceptance or new access policy is authorized by this repair. Existing mobile no-match copy says Walk-in is “on the right” although it is below on narrow screens; that pre-existing copy was not changed.

Final local result:168 actual-UI observations and22 role checks; normalized and original positive matches, negative tenant/staff/no-match cases and class-change observations were also independently asserted from saved JSON across every language/width. Zero page errors.32 full-page captures. Visually reviewed ES320 foreign exclusion in Check-in and EN390 unaccented positive match in Register. All final application source was built and typechecked before commit. Failed people reads clear candidates; an explicit search-error/retry control is not added in this bounded repair. This is distinct from backend or owner acceptance.
