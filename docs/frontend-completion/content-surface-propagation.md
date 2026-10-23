# AD-01 publication propagation — one fictional occurrence cycle

Saved source: `docs/frontend-completion/features.json`, stable row **AD-01**, related test **COO-10**, original **MVP Oct30 / Urgent / Admin / Not verified**. Literal criterion: “Administration creates, edits, publishes and unpublishes classes, schedules, teachers, rooms and FAQ; changes show on the website, app and front desk.” Source status and phase remain unchanged. This slice does not complete the whole row.

Fresh remote main: `455843fda97c7a0c9979b3331d11690d9653f5e7`. Checked PR82 comparison: `b6c4600d429e9a23562204c899e56d6f9b9a14e2`. PR82 worktree, branch and checked head are preserved. New work is isolated in `verify/ad01-surface-propagation` at `/workspace/hoy-propagation`. No AGENTS.md or .agents/skills is present; repository CLAUDE.md and spacing guidance apply.

## Reproductions before repair

The focused actual-page test completed its EN/ES cycle on main with 30 passing observations, four defect instances and no browser errors: both schedule calendars disabled a withdrawn class, but direct customer detail still enabled **Book / Reservar**, and reception still enabled **Book · 1 class / Reservar · 1 clase** for a customer with a valid fictional historical grant. Existing booking/history rows remained identical. The checked PR82 candidate reproduced both defects too.

A further explicit room-label check on the unchanged PR82 candidate reproduced a third defect in both languages: after administration renamed the assigned room to `FICTIONAL EDITED ROOM`, the website selected-class drawer still rendered `FICTIONAL EDITED TEACHER · Main studio` / `Sala principal`. That completed candidate run recorded 30 passing observations, six defect instances, zero browser errors. The consuming runtime files matched main before this branch's repairs; the main baseline did not independently include the added room-label assertion.

- Customer detail: `src/modules/customer/pages/ClassDetailPage.tsx` did not read template publication, and `useSessionJoined` omitted it. The page now reads the existing template table locally and disables new booking/waitlist CTA when its template or modality is unpublished. Existing-booking navigation retains precedence.
- Reception: `src/modules/staff/CheckinPage.tsx` already had live joined publication data but ignored it for new admissions. Its existing availability function now disables new booking/walk-in controls for unpublished sessions while retaining roster/attendance access.
- Website schedule: `src/modules/website/pages/SchedulePage.tsx` hardcoded the main-studio label. The selected-class drawer now reads its assigned room row and follows room edits.

No shared provider/schema/hook, package, workflow, authentication, contact page or Sheet is edited. No cancellation, refund, generation-policy or history migration was added.

## Focused verification and exact fixtures

`scripts/test-content-surface-propagation.mjs` bundles only the selected source's existing MockProvider to prepare an isolated fixture. Browser actions use real admin forms and real website/customer/reception pages. `QA_SOURCE_ROOT`, `QA_BASE`, `QA_OUTPUT` and `CHROMIUM_PATH` select the exact source/server/artifact paths. Default output is under `/tmp`, never a shared spreadsheet. Any defect or interrupted check exits nonzero after writing `results.json`.

At a fixed studio clock, each EN/ES run:

1. Opens a manual unpublished template and confirms no future occurrence exists.
2. Publishes it through M-02, previews/generates one dated session, repeats generation and checks there is still one occurrence.
3. Observes the same session on W-04 website schedule, C-02 customer schedule, C-03 detail and S-02 reception.
4. Adds one explicitly fictional existing-booking fixture, then edits template editorial defaults, teacher/room labels and dated capacity through actual admin forms.
5. Checks rendered capacity/occupancy meters, teacher/room labels and inherited editorial text on their consuming surfaces.
6. Unpublishes through M-02; checks website/customer calendars and direct detail/reception new-admission controls; follows the existing customer's booking and retains reception roster access.
7. At each mutation boundary compares all initial bookings/payments/ledger rows and historical session rows byte-for-byte, plus the explicitly added booking. No new customer/reception booking or payment action is executed.

Stable fictional IDs: `qa_prop_template`, `qa_prop_teacher`, `qa_prop_modality`, `qa_prop_room`, `qa_prop_customer`, `qa_prop_other`, `qa_prop_history`, `qa_prop_history_booking`, `qa_prop_existing_booking`, `qa_prop_historical_grant`. Generated occurrence IDs, source SHA256s, head/base and dirty runtime paths are recorded per run. Captures cover 390/1280 in both languages. Observations use persisted same-browser navigation/reload readback; continuously mounted cross-tab live updates are not accepted by this test.

## Remaining acceptance and ownership

**AD-01 remains partial.** This verifies one class occurrence cycle, not every entity's create/publish cycle, FAQ propagation, every empty/error state, true cross-device persistence or owner/backend acceptance. Template defaults and stored dated session snapshots remain distinct; the test does not reinterpret default edits as permission to rewrite historical occurrences. No source-row status/Sheet updates are made.

The integration owner must separately own fresh publication enforcement inside the shared admission paths (`src/data/deskBooking.ts`, `src/modules/customer/hooks.ts`, `src/data/MockProvider.ts`) and review direct checkout/waitlist deep links. Those command paths were inspected but are not repaired or certified here. This slice verifies the named page controls; it does not claim an authoritative booking/security guarantee. Shared CI/readiness wiring and any future merge/release belong to the integration owner. No ready/merge/deploy action is authorized by this receipt.

## Final result

The repaired production build completed **36 recorded passing observations, zero defects, zero browser errors** across EN/ES and 390/1280. Build (including TypeScript), unchanged spacing baseline 60/60, manual lint and script syntax passed. No unrelated completed suite was rerun. [Exact verification/source hashes](evidence/content-surface-propagation/verification.json), [main reproduction](evidence/content-surface-propagation/main-before.json), [checked PR82 reproduction](evidence/content-surface-propagation/pr82-before.json), [repaired built-bundle run](evidence/content-surface-propagation/repaired-production.json).

The final run was performed before committing the three local page repairs: its `head` therefore names the checked main base and its `runtimeUncommittedFiles` explicitly identifies the three changed runtime files. The source SHA256s identify the actual tested runtime; they are not represented as untouched-main evidence. Interrupted test-authoring/server runs are excluded from acceptance evidence.
