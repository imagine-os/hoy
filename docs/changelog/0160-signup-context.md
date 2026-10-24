version: 0.25.0
date: 2026-10-23
codes: A-03
prompt: docs/prompts/0160-signup-context.md
intent: Prevent a pending fictional signup from replacing a newer session or route after context changes.
decision: Capture provider, actor, effective role and path/search as an immutable attempt scope. Invalidate synchronously on context change and reuse the registration command's existing cancellation checks. Fence legal reads, reviewed consent and photo callbacks to their scope; retain entered fields for explicit current-context retry.
rejected: Deleting committed accounts, silently submitting a retained draft, changing consent evidence or enabling real authentication.
files: SignUpPage.tsx; signup context harness/tests; customer specs; documentation.

Reproduction before repair: delaying the actual command before its transaction then changing actor, provider or query route created a customer and replaced the new session/navigation. Existing unmount cancellation worked. Scope loss now cancels before writes and suppresses old errors or acknowledgements. If a transaction already committed, cancellation does not erase historical records or imply rollback. No document versions, acceptance rows, audit snapshot formats or real identity-provider policy change.

Local scoped checks:40 actual EN/ES390/1280 precommit context cases passed (actor/effective-role/provider/query/unmount, delayed success and error, explicit fresh retry exactly once).20 additional postcommit cases passed without erasing saved account/consent or overriding the newer session. Typecheck and existing signup validation, consent, immutable legal evidence, rollback and replay domain suites passed. The serialized full build passed (TypeScript, spacing baseline60, manual0 and Vite). Independent exact-commit review and combined release remain final gates.

Integration wiring retains the existing signup/consent suites and adds validation plus pre/postcommit context matrices. Development dependencies are prepared before browser tests; workflow permissions remain read-only.
