# `reference/alt-build-empty10/` — salvage from the `imagine-os/empty10` repo

## What this is

A parallel, **vanilla-JS** build of "HOY OS" that another Claude session pushed to the
placeholder repository `imagine-os/empty10` on **2026-09-17** — commits
`2c27395` ("HOY OS — the operations system for HOY Human Club"),
`cf7afaf` ("Six deliverables complete; nine bugs found by driving the real system") and
`407fbe0` ("Record the verification results and the real screenshot count in the plan").

It is a second, independent attempt at the same product from the same source material:
no build step, ES modules in the browser, its own `src/design/tokens.css`, its own schema
module and its own generator tooling. It is **not** a fork of this repo and shares no code
with it.

Kept here:

| File | What it is |
| --- | --- |
| `supabase/migrations/0001_init.sql` | Generated Postgres migration — 53 tables, RLS enabled on all 53, **188 per-table policies**, 6 functions, 33 triggers, 109 indexes |
| `tools/gen-supabase.mjs` | The generator that emitted that SQL from its schema + roles modules (how the policy matrix is derived per role × table) |
| `ARCHITECTURE.md` | That build's architecture notes (folder map, tokens rule, multi-tenant via `tenants.brand_tokens`, `integrations.secret_ref` credential indirection) |
| `PLAN.md` | That build's phased plan and its verification results |

Not copied: its canvas file and its ops manual (we have our own, and ours are the ones the
app renders), plus `assets/`, `node_modules/`, screenshots and the rest of its `src/`.
Nothing secret-looking was found in the copied files — the only hits are schema column
names (`password_hash`, `push_token`, `integrations.secret_ref`) and comments saying those
columns are never selected in the client. No keys, tokens or credentials.

## Why it is kept

Its generated migration is the most useful artefact either session produced for the
**P2 Supabase phase** (see `ROADMAP.md` § P2). Our `supabase/schema.sql` has 29 tables and
a much thinner policy set; this one carries a complete, mechanically-generated
role × table × operation RLS matrix with `tenant_id` isolation, plus `updated_at` triggers
and an index per foreign key. When we write our own RLS, we **compare against it**:

- `supabase/schema.sql` (ours, generated from `src/data/schema.ts`) is the target;
- `reference/alt-build-empty10/supabase/migrations/0001_init.sql` is the reference for
  policy shape, naming and coverage;
- `tools/gen-supabase.mjs` is the reference for generating policies instead of writing
  them by hand.

Its table set is wider than ours in places (sessions, devices, notifications, webhooks,
audit_log) — useful as a checklist for the tables our kanban already lists as pending, but
**their shapes are not authoritative**; `src/data/schema.ts` is.

## Status

**Frozen reference material. Not code this app uses.**

Nothing here is imported, built, typechecked or deployed — `tsconfig.json` only includes
`src`, and `reference/` is, by the rules in `CLAUDE.md`, frozen source material. Do not
edit these files to "fix" them; if a decision changes, it changes in `src/data/schema.ts`
and `supabase/schema.sql`, and gets a changelog entry.

The `imagine-os/empty10` repository itself is untouched and awaiting a decision from Justin
(reset to a placeholder, or delete) — tracked under "Repo hygiene" in `docs/kanban.md`.
