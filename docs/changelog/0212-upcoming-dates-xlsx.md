---
date: 2026-11-16
version: 1.4.0 (unreleased)
intent: Download the upcoming-class occupancy view as a real XLSX matching Jas's reference workbook.
---

Add Exportar vista (.xlsx) to production Próximas fechas, reusing only the current authorized 14-day reads. Retain occurrence-specific capacity, enrollment, teacher and room. Match the reference Clases headers, widths, frozen header, colors and formulas. Reject stale provider contexts, loading/error/busy states, query caps and invalid records. No schedule/booking/CMS changes or new dependencies.

Alternative rejected: a new general spreadsheet library for this narrow single-sheet export. A dependency-free OOXML ZIP writer preserves numeric/formula types and hardens all user content as escaped inline strings. UI labels are bilingual; workbook columns remain Spanish to match the supplied template.

Additive shared useCosQueries result provenance fences account, role, view-as, provider, query and reload changes; existing consumers retain their prior rows semantics. Export uses the current source only and a non-submit button.

Files: classSchedule/live/LiveSchedulePage.tsx, strings.ts, scheduleExport.ts; scripts/test-schedule-export.mjs, test-schedule-export-context.mjs, test-schedule-export-ui.mjs; staff/desk/useCos.ts; docs/frontend-completion/upcoming-dates-xlsx.md. Integrated release candidate; not deployed. Exact-head browser QA and normal release gates remain required.
