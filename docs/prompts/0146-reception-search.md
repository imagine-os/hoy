# 0146 — Reception search repair

Source: direct authorized delegated task, 2026-10-23.

## Prompt

Repair the reproduced RC03 frontend defects now in a separate focused branch from current main: prevent foreign-tenant fictional customers appearing in Check-in/Register search, normalize accent-insensitive names and formatted phone searches consistently. Keep authorization fail-closed for missing tenant context and preserve role gates; do not claim this replaces backend enforcement. Own only narrow search UI/selectors/tests for Check-in/Register. Do not edit shared payment/provider/schema, reception Home branch or integration files without reporting a handoff. Add regression tests with cross-tenant fixtures, accented/unaccented names, hyphen/spaces/country-code phone queries, class/role switches and interrupted searches. Verify responsive EN/ES existing flows. Commit/push scoped code if permitted, preserve patch and evidence. Existing API restriction remains, no forbidden PR creation retry or alternate route. This is authorized overnight MVP frontend repair, no real account/security setting changes or real data.

## Response

Repaired the bounded RC-03 search slice with local scoped reads/joins, accent and phone normalization, stale-read guards and focused Check-in roster filtering. Retained all role gates and shared-provider/schema/payment/Home boundaries. Domain, fault/context and production browser evidence is recorded in frontend-completion/reception-search-repair.md. No PR attempt, merge, deployment, real-data mutation or backend-authorization claim.
