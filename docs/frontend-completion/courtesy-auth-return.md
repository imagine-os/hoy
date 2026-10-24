# Courtesy invitation auth return

C-28 `/app/vouchers/:id` already requires an allowed account role. A signed-out visitor was redirected to sign-in, but the shared return validator discarded this destination. The change accepts only one safe internal invitation ID (`A-Z`, `a-z`, digits, `_`, `-`) with no query, fragment, encoded characters, extra path segments, whitespace or backslashes. Existing checkout, waitlist, plan and purchased-gift allowlist entries retain their behavior. Link validation does not authorize access: C-28 role, account and voucher ownership checks still apply.

Both auth forms already consume the same validator. No sign-in/signup UI or provider changes are needed. Merely returning to the retained link does not activate, book, grant credits or send anything. Unknown IDs retain the missing invitation state without an activation action.

## Scope and evidence

CU-01 Feature Log25/source26 says an account with name, WhatsApp and email is required and there is no guest booking. This bounded repair does not settle the distinction between an account holder and their named companions, enforce account contact completeness or change the explicit existing invitation companion behavior. Those remain separately coordinated. BO-04's purchased-gift return was already supported; this fixes the native courtesy route without broadening the general app allowlist.

`node scripts/test-courtesy-voucher-return.mjs` verifies strict IDs, both auth links, unsafe values and existing supported destinations. `QA_BASE=http://127.0.0.1:5674 QA_OUTPUT=/tmp/hoy-courtesy-return node scripts/test-courtesy-voucher-return-ui.mjs` exercises public direct invitation → sign-in↔signup → exact invitation, both authentication modes, EN/ES at390/1280, unchanged vouchers/bookings/financial records, same-day reload and unknown-ID denial. Synthetic screenshots/results stay outside the repository. Full build and independent source review are required before integration; no real auth, server tokens or delivery is claimed.

## Checked local result

- Strict navigation domain: 44 cases pass. Typecheck and full build: terminal pass.
- Actual development auth routes: 8 journeys pass, EN/ES at390/1280 across sign-in/signup, zero page errors.
- Compiled production routes: 8 journeys pass with the final explicit unknown-ID no-write assertion, zero page errors. Both auth links and same-day reload preserve the exact invitation. Vouchers, events, bookings, class sessions, credits, payments, invoices and messages remain unchanged; signup creates only its separately authorized account/consent records.
- Independent source review accepts the narrow validator and domain44; final source/test hashes, commit binding, verified bundle and captures are retained privately for integration.

The initial Spanish missing-state assertion used paraphrased text and was corrected to the existing application string; the product copy was unchanged. No public release, real authentication or server claim guarantee is implied.
