# Upcoming dates XLSX export

## Scope

Production `/admin/class-schedule` → Próximas fechas → Exportar vista (.xlsx). Exports the same currently loaded next-14-studio-day occurrence list, including cancellations, in its visible order. No longer date range, new query, backend write, schedule generation or booking change. Existing administrator/super-admin route guard and backend read permissions remain authoritative.

Reference inspected read-only: https://docs.google.com/spreadsheets/d/1WAKGQ1_ldd9n1fnME4hWEyyLjwvWus_xMCl9_NPrgLY/edit . One tab `Clases`. Columns: Fecha, Hora, Clase, Instructor/a, Salón, Inscritos, Capacidad, % Llenado, Categoría, Estado. Exact widths 12/11/34/22/17/10/11/11/17/12; Arial11; blue/white bold header; frozen first row; borders, autofilter, typed date `dd/mm/yyyy`, `0%` and category formulas. Occupancy uses the occurrence snapshot, not its weekly template. Studio timezone comes from tenant configuration. Spanish export labels match the reference even when UI is English.

Reference category rules: cancelled overrides occupancy; ≥100% Llena, ≥75% Alta, ≥40% Media, >0% Baja, zero/zero-capacity Vacía. Cached formula values accompany formulas. Existing workbook manual whole-row occupancy colors are applied consistently; category cells retain their separate six conditional colors. Completed occurrences are explicitly Finalizada, not Activa. Unknown status, invalid date/count/capacity and the 5000-row query cap refuse export rather than inventing data/completeness.

No runtime dependency is added. A narrow ZIP32 stored-entry OOXML writer emits only six fixed workbook parts. User text is escaped inline-string content, never formulas or external links. The shared query hook adds a closure-bound result-source token and `current` flag, without changing existing retained-row semantics. The export passes actor, role, view-as, view-as person and session state as query dependencies. Provider, query/date window, reload or session changes immediately invalidate export, even if an old promise resolves before passive-effect cleanup. Download uses a local Blob/object URL, removes its temporary anchor, and revokes its URL. No persistent browser storage or upload.

## Verification and review plan

1. Tests first: missing writer RED; writer plus UI contracts GREEN.
2. Fictional fixture workbook: ZIP CRC, all XML parts, typed dates, Spanish Unicode, formulas/caches, frozen panes, widths, styles and inline-string injection protection verified with Python zipfile/ElementTree/openpyxl (read only).
3. Artifact-tool imported and rendered the real generated workbook; recalculation changed 0/0 Vacía to 4/4 Llena correctly.
4. Initial independent lane review approved the workbook writer. A provenance issue found by root was corrected with a new shared-hook source token. Context contracts RED→GREEN. Actual-component ES/EN390/1280 download/context/error/retry/race harness compiled; local Chromium is blocked by socket() Operation not permitted, so actual UI assertions still require hosted CI. No browser pass claimed.
5. Two independent integrated review rounds, exact-head CI and release remain required. No publication/deployment performed by this lane.

D-02: reuses existing Button secondary/disabled/focus and status/error paragraph states. No new component/variant or route. No new Company OS dependency/API requirement. Existing M-14 route connectivity inventory remains applicable; regenerate inventory on integration if callgraph output changes.
