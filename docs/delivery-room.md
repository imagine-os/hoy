# Delivery Room public snapshot

The public delivery tracker lives at `/hoy/delivery-room/`, from `public/delivery-room/`. Vite copies the standalone HTML, CSS, JavaScript, JSON and relative assets into `dist/delivery-room/`; the normal Pages workflow publishes them. This migration preserves the existing tracker rather than introducing an application/router rewrite. Its existing English presentation and source criterion text are retained.

The spreadsheet remains the source of truth, with its existing access controls. The tracker bundles a reviewed snapshot: browser reload fetches only `data.json`. It has no authenticated Google Sheets request, writeback, backend integration, account access or production controls. Following source row links may require existing permission.

Sheet reread: **2026-10-25T01:44:06Z**, nine tabs. Feature Log124, Specs124 and MVP70 rows remain unchanged. Source ledger still ends October24,03:06 UTC through PR89; PR90/91 feature releases and tracker-only PR99 remain separate ledger gaps. GitHub refresh: **2026-10-25T01:44:40Z**. PR92–98 retain successful exact-head CI; PR100 `1a0bd0878806f082af8815d472d33adf7f9a53e6` has42/42 checks passed. PR101 current head `e6a5c0d97e88550e2766d5e1d277f3739f68f67f` has7/44 checks passed and37 active/queued with no failure at the cutoff. All app-feature PRs remain held drafts. PR101's explicitly UNSENT pending cash/transfer request preview adds no booking, spot hold, bank confirmation or expiry deadline. No held app code is included.

Nine questions were reported delivered to Jas; no answers are recorded. Their individual Sheet-row mapping is not established, so source statuses remain intact. No correspondence is reproduced.

All 124 feature IDs, literal acceptance criteria, feature/criterion source row links, phase labels and stage evidence are retained: 70 MVP / 40 November 30 / 12 later / 2 unresolved. **3** whole frontend criteria are ready; **48/70** indicates tested deployed portions, not completed features. Backend/services and client acceptance remain independent. All 46 human record IDs remain, with sanitized setup summaries. PC-10/11 later owner confirmations are separate from older source statuses; no contract details are inferred or published.

Private correspondence, email-derived setup provenance, conversation/task IDs, source-host identity/credentials/config and raw exports are excluded. The original private Site and spreadsheet are unchanged. Only the public bundle, tests and ordinary documentation are committed here.

Refresh by reviewing source data and exact-head GitHub evidence, updating explicit extraction/check timestamps, retaining gaps and re-running `npm run test:delivery-room` plus the actual build. Updates publish through reviewed repository changes; no automatic Sheet sync is promised. Keep new private source material out of `public/` and public docs.

Validation: inherited seven-view/124-detail/negative-evidence tests; public file/data audit; exact criterion/row/phase/stage comparison with the retained source; independent source/asset review; browser route at `/hoy/delivery-room/`, 390/768/1440 widths, image loading, search and Escape dialog handling. Build and CI results belong in the PR/release receipt. Revert this tracker PR to remove the public copy; existing application routes and private source remain separate.
