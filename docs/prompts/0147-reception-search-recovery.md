# 0147 — Reception search recovery follow-up

Source: direct authorized delegated task, 2026-10-23.

## Prompt

Independent RC03 review passed source/domain and combined RC01/PG08 regressions, but remaining frontend acceptance gap is explicit search read-error/retry UI. Complete that within your existing RC03 owned scope, preserve tenant and stale-read guards and existing results only with explicit stale/error labeling or clear replacement as appropriate. Cover initial failure, refresh failure, retry, changing query/class/role during read and unmount, in EN/ES narrow UI. Prepare test CI wiring as separate patch for integration owner, without editing shared workflow/package files directly. Push scoped fix and report exact head plus tests; no PR attempt through blocked route or merge. This continues the approved overnight frontend work.

## Response

Added explicit localized loading/read-error/Retry to S-02/S-04 with clear replacement of unconfirmed results. Preserved scoped joins and late-read suppression; tested actual pages in narrow EN/ES provider-fault flows and retained production regressions. CI wiring is an unapplied patch for integration. No shared workflow/package/provider/schema/payment/Home modification or PR attempt.
