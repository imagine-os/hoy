# RC-01 reception dashboard handoff

Base: fresh remote `main` `455843fda97c7a0c9979b3331d11690d9653f5e7`, 2026-10-23. Branch `fix/rc01-dashboard-recovery`. Draft-only source handoff; no merge or deployment.

RC-01 original MVP Oct30 / High / source Not verified remains unchanged. Criterion: “Shows arrivals, pending payments and next class; figures match Check-in and the pending payments list.” This batch verifies the bounded frontend criterion with existing fictional demo data, and retains the whole-row owner/backend acceptance gate.

- Arrival and expected counts cover every noncancelled studio-day session, including completed classes, matching Check-in. Next/open sessions remain scheduled only, ordered by start time. Date-sensitive figures refresh every30 seconds across class boundaries and studio midnight.
- Pending count reuses the existing queue's `projectQueue` / `entryMatches('pending')` semantics, including deduplication and receipt state. A named queue action uses the existing route and its exact allowed roles; no role expansion.
- Local dashboard reads use explicit tenant queries and defensive filtering, live subscriptions, one all-or-error snapshot, visible loading/error/retry and genuine empty results. Old provider/actor/role, superseded request and unmounted results cannot replace current state. Payments and messages are omitted from reads when their existing permissions are absent.
- Existing design, components, copy, demo rows, consent, publication, payment commands, providers/schema/auth/packages/workflows remain unchanged. Shared `useTable` is untouched; other pages' shared-hook failures are outside scope.

Verified locally:

- `npm run typecheck`; full `npm run build` (TypeScript, spacing/manual checks and Vite).
- `TZ=Asia/Tokyo node scripts/test-reception-home.mjs`: actual demo5 classes /16 arrivals /15 expected /0 pending; completion retains arrivals, cancellation exclusion, queue count parity, foreign tenant exclusion, every11-table failure/retry, restricted reads, empty, immutable projection, studio-midnight arrivals/payment reset.
- `node scripts/test-pending-payments.mjs`: existing queue/domain regression.
- `node scripts/test-reception-home-states.mjs`: actual-component/provider fault harness, EN/ES390; loading hides unconfirmed numbers; retry; late old-actor result cannot replace error; latest subscription read wins; empty; navigation/unmount with late callbacks; repeated return. Zero page errors. This harness deliberately writes fictional profile initials to trigger subscriptions; those writes are separate from the read-only dashboard.
- `node scripts/test-reception-home-ui.mjs`: production bundle in actual staff shell, EN/ES390/1280, light/dark, Tokyo browser/studio day; completed-class16 arrivals; all5 exact Check-in rosters; next-class exact session CTA;2 fictional pending payments match queue with foreign exclusion; repeated/back/forward; full DB unchanged by navigation; no horizontal overflow. Zero page errors.
- Captures/results: `docs/screenshots/RC-01/`. Mobile light and Spanish desktop dark, loading/error/empty visually reviewed. Earlier harness locator/type failures were corrected; only successful final runs constitute evidence.

Remaining: authenticated server/tenant/role enforcement, durable cross-device reads/realtime and operational/owner acceptance remain untested. No real authentication, payments, email, external messages or services. Integration owner should update shared S01 metadata (current useTable note is historical), shared D02 usedBy labels for existing EmptyState/Button use, tracker evidence and final integrated checks when accepting the PR. These shared files were deliberately left untouched under concurrent ownership.
