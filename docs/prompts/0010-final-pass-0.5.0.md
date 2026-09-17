# 0010 — Final integration pass for v0.5.0

- **Source**: Justin in the Slack thread, relayed by the build coordinator to the integration worker
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0010-final-pass-0.5.0.md`

## Prompt (verbatim)

> continue building the HoyOS system better and deeper

and, in the same thread:

> let me know if there's more work after this pass

Coordinator brief (summarised): close v0.5.0 as the only writer on `main`. Pick up the follow-ups the two
parallel tracks left — switch `src/modules/customer/policy.ts` to the `usePolicy()` the admin module exports and
drop `<PolicySync/>` if that is what it replaces, keeping the customer module API stable; if the two 0.5.0
changelog entries collide on version, leave both at 0.5.0 (they shipped together) and say so. Then a full
screenshot pass so the new settings sub-pages (M-08a…M-08e), the rewired customer pages and (if the script
supports it) the collapsed sidebar have fresh captures, with `docs/pages/<code>.md` regenerated for the new codes
and `docs/screenshots` kept under ~70 MB. Update `ROADMAP.md`: "Where we are" → v0.5.0, the Data lane to done,
the 0007/0008 leftovers as P1 items, and a new section "What remains after this pass (for Justin)" as a plain
numbered list grouped into (a) product work still mocked, (b) UI depth still thin, (c) decisions for the owner,
(d) repo hygiene — whole file under ~300 lines. README to 0.5.0, changelog and prompt entries in K-01 format,
kanban in the same turn, then commit and push to `main` and check the Pages run.

## Response

**Policy, one source (step 1).** `src/modules/customer/policy.ts` had its own copy of the sync machinery:
`attachPolicy(data)` peeked `tenants`, fetched it, subscribed to changes and re-mapped the settings by hand — the
same job `usePolicy()` (exported by `src/modules/admin/settings.ts` in 0007) already does through `useTable()`.
`attachPolicy` is deleted; the module now reads `usePolicy()`, and a new `toPolicyValues(policies, tax)` is the
single mapper shared by the hook and by `policyFromSettings()`.

`<PolicySync/>` is **kept**, because `usePolicy()` does not replace it. It is a hook, and eighteen customer files
plus `cancelDeadline()` / `insideCancelWindow()` read `policy.*` as a plain value from callbacks and module scope
where a hook cannot run. `PolicySync` shrank to `current = usePolicyValues()` and, because it is mounted above the
router, that assignment happens before the routed pages render — so the first paint now shows stored values
instead of defaults, which the old effect-based sync could not promise. `usePolicyValues()` is exported as the
hook new components should use; nothing else in the customer module's API changed. `npm run build` is clean.

**Versions.** 0007 and 0008 were built in parallel and shipped together, so both changelog entries stay at
**0.5.0** and this is the third entry of the same release. ROADMAP §A states it, so nobody later reads the
duplicate version as a mistake.

**Screenshots and page docs (step 2).** Full pass: 80 routes, 69 codes, ES/EN × 390/1280 with dark for key pages,
no console errors — 308 captures retaken, 109 of them changed: the nine pages 0008 rewired (C-05, C-10, C-13,
C-14/C-15, C-16, C-19, C-23, C-24, S-03) and the pages the 0007 containment pass shifted. M-08a…M-08e came back
byte-identical to 0007's captures, which is the check that the settings split is stable. `docs/screenshots` is 39 MB (budget ~70 MB). `scripts/gen-page-doc.mjs --all`
wrote the five missing sub-page docs; `docs/pages/M-08.md` is now the family index, since its single-page captures
were retired with the layout they documented. The collapsed-sidebar state was **skipped**: `screenshots.mjs` takes
`--smoke`, `--only`, `--label` and `--quality`, but no state parameter (noted as a follow-up).

**ROADMAP (step 3).** §A rewritten for 0.5.0 (admin shell, settings family, 38 tables, every customer page on real
data, canvas look, the policy rewiring, 80 routes / 69 codes / 0 stubs). P1's scope now separates what 0.5.0 closed
from six numbered leftovers (M-02 editors + event publisher, server-side invite reward, staff-side notification
sending and retention, event waitlist, real Wompi tokenisation, hand-written page-doc notes). New **§F "What
remains after this pass (for Justin)"** — eighteen numbered items in four groups: six mocked integrations with
Supabase named as the gate, eight thin screens found by grepping `docs/pages` and the specs for "placeholder",
the owner decisions (`/#/manual/decisions` + canvas audit), and repo hygiene including the pending empty10 call.
File is 265 lines.

**Docs (step 4).** README at 0.5.0 with the settings family and the corrected capture extension; this entry, the
changelog and the kanban updated in the same turn.

**Answer to "is there more work after this pass":** yes, and it is all written down in ROADMAP §F. Nothing in it
is a surprise: the screens exist and the seams are in place, but six integrations have no vendor behind them yet,
eight screens are honest placeholders, twenty decisions need the owner, and `imagine-os/empty10` is waiting on a
reset-or-delete call.
