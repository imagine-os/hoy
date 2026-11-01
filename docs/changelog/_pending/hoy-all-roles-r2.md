# Hoy all roles, review round 2 fixes (Hoy frontend)

Prompt intent: fix what review round 2 found in the Hoy frontend on `hoy-all-roles` (M1, L1–L7), test first.

Decision:
- **M1, a deleted or moved holiday came back.** When an override changed the closed days, the reception panel re-read them but only ever added dates, and the updater compared against holidays it had already replaced. So a deleted or moved holiday stayed in the list, marked "not yet in bookings", and the next "Guardar horario" wrote it back into bookings. On a reload the panel now adds the new holiday dates and drops the dates that stopped being a holiday and are no longer in bookings. It reads the previous holidays before the update, and unsaved edits survive.
- **L1.** A holiday save or delete that was saved but not synced (`closed_dates_admin_only`, `closed_dates_not_synced`) now refreshes the reception panel too. The new day shows as pending without a page reload.
- **L2.** View-as no longer says "nobody holds this role" when the sample person could not be read. Examples are a refused or failed `GET /admin/users`, a network error, or a directory answer with no `users` array. `loadViewAsSample` returns `{ error }` for these, and the session shows "No pudimos cargar la persona de ejemplo" with the refusal's copy (or a connection line), **Reintentar** and **Volver al Hub**. "Nobody holds the role" stays for a role that really has no holder.
- **L3.** The dashboard's active-pack count dates "today" with `today()` from `src/data/companyos/dates`. `dateKey()` already used the studio's timezone, so the count was not wrong. The change makes it read the one helper the other Company OS screens use, and a check pins it to the Bogotá day for a browser in another timezone.
- **L4.** `server/README.md` now lists all eight public entities, including `setting`, `hours_override` and `booking`, with what the `public_site` policies allow for each. It also says the server strips the private settings from every `setting` answer (`stripPrivateSettings`, a 502 when the answer can't be read whole).
- **L5.** `docs/route-connectivity.md` inventory has been regenerated. `test-route-connectivity.mjs --write` now rewrites both inventory tables, and the check fails when the committed tables differ from the code, so the doc can't drift again. This costs about 20 s more per run, because the cut routes are traced on every run. The sink legend no longer lists `message_log`.
- **L6.** The move script's header and usage name the Node it needs: 22.18+ or 23.6+, or `--experimental-strip-types` on 22.6 to 22.17. A version check inside the script can't help, because an older Node fails to parse the file before any code runs.
- **L7.** The move script reads up to three `setting` rows. If either key appears more than once, it refuses with exit 1 and writes nothing, instead of acting on whichever row came first.

Alternative rejected:
- For L6, a `.mjs` wrapper that checks the version and then spawns the `.ts` file: another file for a one-off script, when the usage line does the job.
- For L5, a dated "generated on" note: the drift check makes the date unnecessary.

Files: `src/modules/admin/reception/ReceptionHoursPanel.tsx`, `src/modules/admin/HoursSettings.tsx`, `src/auth/viewAs.ts`, `src/auth/ProductionSession.tsx`, `src/modules/hub/strings.ts`, `src/modules/admin/DashboardPage.tsx`, `scripts/move-private-settings.ts`, `server/README.md`, `docs/route-connectivity.md`, `scripts/{test-r1-ui,test-view-as,test-view-as-ui,test-pack-reads,test-move-private-settings,test-route-connectivity}.mjs`.

Version: 0.25.0 (pending, merged with the hoy-all-roles release).
