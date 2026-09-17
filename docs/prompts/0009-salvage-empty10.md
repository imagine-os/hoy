version: 0.5.0
date: 2026-09-17
slug: salvage-empty10
codes: (none — docs and frozen reference material only)

# Prompt

_From Justin Massion, Slack, 2026-09-17. **Reconstructed** in the 0020 polish pass from
`docs/changelog/0009-salvage-empty10.md` — the original wording was not preserved when 0009 shipped
with a changelog entry only; this file exists so every changelog `prompt:` line resolves._

> _Reconstructed from the changelog entry — original wording not preserved._
>
> Justin found a second HoyOS repository (`imagine-os/empty10`) holding a parallel vanilla-JS "HOY OS"
> build pushed by another Claude session the same day, and asked for it to be **cleared unless
> something in it is important** — decide what, if anything, is worth keeping before the repo is
> reset or deleted.

## Response

Kept only the migration and the plans as frozen reference: `supabase/migrations/0001_init.sql`
(53 tables, RLS on all of them, 188 policies), its generator `tools/gen-supabase.mjs`, `ARCHITECTURE.md`
and `PLAN.md` were copied into `reference/alt-build-empty10/` with a README recording the provenance and
why each file matters for the P2 Supabase phase (RLS policy shape, per-role coverage, mechanical policy
generation). Nothing was merged into `src/`; the other canvas and manual were deliberately not copied.
The repo itself was left untouched pending Justin's decision (reset or delete), tracked under "Repo
hygiene" in `docs/kanban.md`. Details, alternatives rejected and the secret scan: `docs/changelog/0009-salvage-empty10.md`.
