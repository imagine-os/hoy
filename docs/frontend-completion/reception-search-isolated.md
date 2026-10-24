# RC-03 — Reception search

Feature Log row 79; source row 80. Literal criterion: “Finds a person by name, WhatsApp or email even if they did not book that class.”

The existing saved repair is selectively integrated over the current released frontend. Check-in and Register use a reception-only confirmed people reader. Names match without accents, WhatsApp search normalizes formatting, and email matches ignore case. Tenant-scoped joins reject foreign or malformed identities. Search changes do not rewrite stored contact values, bookings or financial history.

Loading and failed reads clear unconfirmed results. Both surfaces offer bilingual recovery. Provider, tenant, actor, role and latest-request fences suppress obsolete responses. One narrowly reproduced fix prevents a subscription callback already queued at cleanup from starting old-context reads or loading updates. Existing attendance, admission, cancellation, consent and receipt commands remain unchanged.

The page inventory records actual search entities and page dependencies, fixed presentation configurations and fictional fixtures. It introduces no saved-view controls, backend table mapping, real authentication, email or payment connection. Existing search and new keyboard tests are bound to the reviewed source through the CMS drift checks.

## Verification scope

Fresh local validation covers the existing domain/hook/recovery regressions, production search at EN/ES 320/390/1280, and separate ready-state Enter scenarios. The original search matrix retains its no-database-write assertions; action tests use isolated fictional contexts. Saved evidence is not substituted for current checks. Final exact-head remote CI and draft/release status are reported separately from local acceptance. Backend tenant authorization, durable server consistency, real customer information and owner acceptance remain separate.

## Local result

Full build, TypeScript, spacing and manual checks passed. Fresh production search passed 252 observations and 22 role checks across EN/ES at 320/390/1280; independent result validation checked all 192 positive matches, 36 negative observations and every recorded overflow flag. The position-independent no-match guidance is asserted in each locale/size. Twenty separate Enter groups passed on final source: intended roster target, eligible walk-in, repeated/busy input, changed actor and failed/loading reads. Existing scoped-hook/recovery tests, search/attendance domain checks and the retained atomic desk-sale regression also passed.

The CMS check validates one feature/two pages and 24 negative cases. All original assertions remain. Tests block external font requests and record zero non-GET traffic; no real backend/payment/email action occurs. These are checked frontend candidate results, not a deployed or server-authorized feature. Exact-head remote CI is a separate gate.
