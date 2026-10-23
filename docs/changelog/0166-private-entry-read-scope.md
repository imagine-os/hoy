version: 0.25.0
date: 2026-10-23
codes: E-05, C-09, C-24, C-05
prompt: docs/prompts/0166-private-entry-read-scope.md
intent: Send visitors to sign-in and prevent private customer lists from displaying another tenant's rows.
decision: Reuse the existing customer return allowlist for visitor redirects; preserve authenticated role denials. Scope history/session-list, inbox and saved-method reads by tenant and actor, defensively filter joined references, and discard results across provider, actor, effective-role and tenant changes.
rejected: Broadening permissions, changing write commands or claiming browser filtering replaces server authorization.
files: RequireRole; NoAccessPage; visitorSignIn; customer read helpers and selectors; scoped regression tests; mechanical visitor-entry assertions.

Visitor assertions now distinguish exact sign-in destinations and allowlisted returns from authenticated NoAccess. Existing forbidden-role, foreign-record and database assertions remain. Booking commands and notification/payment-method write functions are unchanged. Backend authorization and a full audit of other customer read selectors remain separate gates.
