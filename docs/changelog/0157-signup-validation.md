version: 0.25.0
date: 2026-10-23
codes: A-03
prompt: docs/prompts/0157-signup-validation.md
intent: Prevent oversized signup fields and impossible birthdays from being saved by the browser demo.
decision: Share form and registration-command validation. Bound trimmed first/last names to100 code units each, emergency name200, email254, phone text40 and digits15. Retain existing minimums and reuse validBirthday calendar semantics. The memory-only demo password is bounded at128 in the form and still never enters registration arguments or persistence.
rejected: Truncating saved text, stripping Unicode/symbols, changing consent records, or presenting these local safeguards as identity-provider policy.
files: customer/auth/signupValidation.ts; SignUpPage.tsx; mockRegistration.ts; customer/strings.ts; customer/specs.ts; signup validation tests.

Exact-boundary Unicode names, literal HTML/script strings, optional or leap-day birthdays and valid request replay remain supported. Oversized or impossible inputs fail before transaction writes. Existing records are not rewritten. These are engineering size safeguards, not a new legal or customer eligibility policy; production identity validation remains separate. Validation and final integration evidence are recorded in the handoff, not claimed as deployed here.

Local validation: full build passed (TypeScript, spacing baseline60, manual0).22 direct validation groups, existing signup consent/immutability/rollback/replay suites, and actual form EN/ES390/1280 on prepared development and production builds passed. Oversized and impossible-date form injections caused no writes; valid literal script/Unicode text remained escaped and both bilingual consent snapshots were retained. Broader platform form and production identity acceptance remain separate.
