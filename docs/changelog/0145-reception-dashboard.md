version: 0.25.0
date: 2026-10-23
codes: S-01

# 0145 — Reception counts and read recovery

- Prompt intent: implement RC-01 dashboard counts and read recovery, keeping demo data/design and concurrent ownership.
- Decision: local tenant-scoped all-or-error read snapshot with loading/retry and stale-result guards; whole-day noncancelled arrivals; reuse pending queue projection and existing permitted route;30-second date refresh.
- Alternative rejected: altering shared useTable/providers/schema/roles or rewriting seeds, inventing new payment status or accepting partial reads as zero.
- Files: staff/HomePage.tsx, local homeData/useHomeData, dedicated domain/fault/production browser scripts and test-only harness, RC-01 captures/results, frontend completion receipt, prompt and kanban.
- Verification: full build/typecheck, focused home and existing pending-queue domain checks, EN/ES390/1280 actual-shell light/dark browser matrix and EN/ES390 fault harness. See frontend-completion/reception-dashboard.md for exact assertions and remaining gates. No full-row owner/backend acceptance or deployment claim.
