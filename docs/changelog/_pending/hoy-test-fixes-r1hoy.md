# Hoy test-fixes: integrated review round 1, Hoy fixes (lane r1hoy)

Prompt intent: the first integrated review of `hoy-test-fixes` (Hoy side) found 2 medium and 8 low findings: a read-only preview frame offered "Join as a customer" (a sign-up that can only fail), the timetable's Published toggle could publish a row with no class type, preview frames were interactive (a Sign out inside signed the parent out), plus smaller save, copy and wording gaps. In the same pass the owner answered `y6-public-documents` with "Retire it": the `PUBLIC_DOCUMENTS` switch must go, so nothing pretends to open the manual or docs to visitors.

Decision:
- M1: `joinsAsCustomer` returns false in a read-only document (`readOnlyDocument()`: framed, or `viewAsActive()`, which also covers a stored view-as the session hasn't checked). A planted frame falls through to no-access again.
- M2 (M-02): `saveTimetableRow` refuses, before anything is sent, an update that leaves a row published without a known class type (`timetable_class_type_required`, es/en copy). It applies only when the patch touches `active` or `modality_id`, so other edits to an older row and switching any row off still work. The table's and the drawer's Published toggles are disabled for a draft without one, with the hint `admin.content.classTypeToPublish`.
- L1 (HUB-01): `DeviceFrame` takes `inert` (default on in the production build): the `inert` attribute on the stage, `pointer-events: none`, `tabindex=-1` and `aria-hidden` on the iframe. The review build's simulator stays clickable. D-02 meta updated (prop, state, usage, a11y line).
- L3: the editor sends nothing when nothing changed (`draftPatch` / `nothingToSave`), and Save is disabled then.
- L4: `saveTimetableRow` remembers, per provider, the version its own last save of a row started from and produced. A second quick save from an editor whose basis hasn't refreshed goes through, and anyone else's save in between is still `content_conflict`. Y5's stale-basis pin now uses a second provider (another tab), which is the case it meant.
- L5: a real super admin without the customer role is offered "Join as a customer" on customer pages (asked before the role's own pass), instead of a checkout Company OS would refuse. View-as is unchanged.
- L6: `invalid_answers`, `answer_too_long`, `invalid_email` and `write_forbidden` have neutral es/en lines in the code→copy table. The Hub's report keeps its staff wording.
- L7 (W-04, C-02): `templateActiveOf` reads a class whose timetable row isn't among the rows the reader got as switched off. Visitors only read published rows, so they now see "No publicada", not "Aún no abre reservas". A reader who got no rows knows nothing (unchanged).
- L8: `joinSessionRows` (used by `useSessionsJoined`) joins nothing while sessions, class types or timetable rows are loading, so no class flashes "not open for booking".
- Public documents retired: `PUBLIC_DOCUMENTS` is out of `server/config.mjs`, `/app-config.json` (`launch` is `{ siteLive, siteLiveAt }`), `.railway/railway.ts`, `server/README.md` and the app (`LaunchConfig`, `sanitize`, `isPublicDocument`, `RequireRole`, `PrivateDocument`, the role-matrix note). A value left set in Railway is ignored. A `publicDocuments` list from an old server or a fixture is dropped. Making documents public later is its own change with its own gate rule (Company OS decision log, J8).

Alternative rejected:
- M1 test-only (assert by banner and sample instead of route): it leaves a dead-end write form inside a read-only frame.
- L1 no-op `signOut` inside frames: it covers one action, not the rest of the UI.
- L4 threading the saved row back through `writeContent` / recovery into the editor's basis: wider change across shared code for the same effect.
- L2 (`If-Match`) left as is: Company OS core doesn't honour it yet, and its tech-debt tracks it.
- Keeping `PUBLIC_DOCUMENTS` dormant: the owner chose to retire it.

Files: `src/auth/{purchaseEntry.ts,RequireRole.tsx,PrivateDocument.tsx}`, `src/components/organism/DeviceFrame/{DeviceFrame.tsx,DeviceFrame.css,DeviceFrame.meta.ts}`, `src/modules/admin/{timetableSave.ts,ContentPage.tsx,strings.ts}`, `src/data/companyos/refusals.ts`, `src/data/sessionAvailability.ts`, `src/modules/website/hooks.ts`, `src/modules/customer/{scopedSessionRows.ts,pages/SchedulePage.tsx}`, `src/config/{launch.ts,roleMatrix.ts}`, `server/{config.mjs,README.md}`, `.railway/railway.ts`, `docs/kanban.md`, `scripts/test-{auth-identity,timetable-save,session-availability,hub-production,view-as-ui,hoy-server,deploy-wiring,launch-config,launch-website-ui,class-type-room,class-management-ui}.mjs`.
Pages: M-02, HUB-01, W-04, C-02, C-xx (customer area guard), K-01…K-05 (no public path).
Version: pending (merged with the `hoy-test-fixes` release).
