# Delivery Room public snapshot

The public delivery tracker lives at `/hoy/delivery-room/`, from `public/delivery-room/`. Vite copies the standalone HTML, CSS, JavaScript, JSON and relative assets into `dist/delivery-room/`; the normal Pages workflow publishes them. This migration preserves the existing tracker rather than introducing an application/router rewrite. Its existing English presentation and source criterion text are retained.

The spreadsheet remains the source of truth, with its existing access controls. The tracker bundles a reviewed snapshot: browser reload fetches only `data.json`. It has no authenticated Google Sheets request, writeback, backend integration, account access or production controls. Following source row links may require existing permission.

Sheet extraction: **2026-10-24T23:35:25Z**, nine tabs. Ledger cutoff: October 24, 03:06 UTC, through PR89. PR90/91 release evidence is separate. GitHub check refresh: **2026-10-25T00:15:01Z**: PR96 `d9475d15` 44/44, PR97 `81d7a9b3` 48/48, PR98 `9d39b1db` 21/21 checks succeeded. All remain held drafts. The same fresh read verifies PR92 39/39, PR93 39/39, PR94 46/46 and PR95 41/41 successful checks; their exact heads are in the bundled evidence. No feature changes from PR92–98 are included.

All 124 feature IDs, literal acceptance criteria, feature/criterion source row links, phase labels and stage evidence are retained: 70 MVP / 40 November 30 / 12 later / 2 unresolved. **3** whole frontend criteria are ready; **48/70** indicates tested deployed portions, not completed features. Backend/services and client acceptance remain independent. All 46 human record IDs remain, with sanitized setup summaries. PC-10/11 later owner confirmations are separate from older source statuses; no contract details are inferred or published.

Private correspondence, email-derived setup provenance, conversation/task IDs, source-host identity/credentials/config and raw exports are excluded. The original private Site and spreadsheet are unchanged. Only the public bundle, tests and ordinary documentation are committed here.

Refresh by reviewing source data and exact-head GitHub evidence, updating explicit extraction/check timestamps, retaining gaps and re-running `npm run test:delivery-room` plus the actual build. Updates publish through reviewed repository changes; no automatic Sheet sync is promised. Keep new private source material out of `public/` and public docs.

Validation: inherited seven-view/124-detail/negative-evidence tests; public file/data audit; exact criterion/row/phase/stage comparison with the retained source; independent source/asset review; browser route at `/hoy/delivery-room/`, 390/768/1440 widths, image loading, search and Escape dialog handling. Build and CI results belong in the PR/release receipt. Revert this tracker PR to remove the public copy; existing application routes and private source remain separate.
