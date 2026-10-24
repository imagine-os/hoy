# Conditional buyer sent-event preview

BO-06, Feature Log 75 / source 76, requires buyer notification when a voucher is sent and used. C-37 already previews ready and used events; ready does not establish sending. This change adds the missing conditional sent-event text, visibly marked **UNSENT TEMPLATE** in EN/ES. The text explains that it would apply only after a confirmed send event. The demo neither records that event nor confirms delivery.

The existing approved-buyer proof/read boundary controls rendering. Pending payments, draft purchases, missing links, failed reads, recipients and other roles do not display the template. Retry restores it only from a verified buyer read. Rendering performs no commands and changes no payment, gift, voucher, receipt, audit or message records. Existing ready/used copy and native links remain intact. No sending control, provider, address, sender identity, dispatch timing or refund/expiry policy is introduced.

The existing Notice component is reused; C-37 metadata documents the new preview state. The isolated harness supplies the same providers plus receipt theme context; it never calls a send operation. Its fixture uses existing pure gift approval/claim/booking commands with fictional data and retains both approved/used and pending purchases.

## Verification

Run `npm run typecheck` and `QA_BASE=http://127.0.0.1:5674 QA_OUTPUT=/tmp/hoy-buyer-preview node scripts/test-gift-notification-previews-ui.mjs` against a development server from this source. The focused test checks EN/ES at 390/1280, exact conditional/unsent copy, ready/used retention, no overflow, pending/draft/missing suppression, read failure/retry, recipient/role changes, and byte-for-byte unchanged local database. Screenshots and results remain outside the public repository.

Final build and exact source/test receipt are integration gates. The scoped preview is not proof of real notification delivery, a server send event or whole BO-06 backend readiness.

### Checked local candidate

- Typecheck and full production build: terminal pass.
- Focused actual C-37 component/browser: 24 groups pass, EN/ES 390/1280, zero page errors.
- Compiled production routes: 4 journeys pass, EN/ES 390/1280; verified approved buyer text, retained used preview, same-day reload, pending and recipient suppression, unchanged database and no overflow.
- Independent source/copy review: no blocker in the frozen page, strings and C-37 metadata. The first isolated harness attempt lacked the receipt theme provider; the corrected separate harness supplies it. No product code change was needed for that test failure.

The build starts from base `02d6d3b8371ee805022fe83be18b2a4e2dc55086` with the reviewed local delta. Final commit binding, asset hashes and synthetic captures are retained privately for integration; there is no hosted deployment or real-send evidence.
