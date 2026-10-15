# 0068 · Media navigation and cached demo clock
version: 0.24.4
date: 2026-10-15
prompt: docs/prompts/0068-media-navigation-demo-clock.md
intent: Repair four reproducible defects in the requested media library and photography QA.
decision: Keep authorization intact, route restricted media placements to clearly labelled public documented previews, search visible Spanish/English placement names, and refresh eligible synthetic full-session fixtures on cached load and sample navigation. Cover source and clock dependencies in Photography QA.
rejected: Expanding customer-route permissions, impersonating content users, English-only search, destructive seed-version resets, changing existing bookings or filling voucher-occupied/over-mat-capacity sessions.
files: MediaLibrary component, metadata, CSS and placement helper; media search model and strings; MockProvider, seed fixture helper and sample route; focused unit/browser checks; media/photography QA workflows; M-02d and C-20 documentation; generated manifests and package version.

## Verification

- Focused media access/search unit checks pass
- Cached version-10 and already-open provider regression: 37 checks pass across UTC/Bogota, exact-start, weekday/weekend and late-night cases
- Original fresh-seed clock test passes all 14 fixtures
- Existing local booking/CMS/profile rows, cancellations, voucher allocations and valid mat assignments are preserved
- TypeScript and media model pass; hosted full-build and browser evidence must pass before release

New browser regressions use genuine admin, coordinator and marketing identities and actual link navigation. The sample regression uses the real customer role, a cached morning DB and an already-open provider after advancing the clock. No production-provider synthetic writes are introduced.

**Resumen (ES).** Los enlaces respetan los permisos del rol y ofrecen vistas documentadas cuando hace falta. La búsqueda reconoce Inicio y Próximamente. Las muestras del navegador se mantienen válidas al avanzar el día sin borrar cambios locales.
