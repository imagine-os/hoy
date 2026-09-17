# 0015 — The studio city is Medellín (2026-09-17)

- **Source**: Justin in the Slack thread, answering the question raised while applying Jas's review (0014)
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0015-tenant-city-medellin.md`

## Context

While applying Jas's review (0014), her annotated screenshot of C-05 "Métodos de pago" showed the
subtitle reading **"Medellín · COP"**, but `src/tenant/tenant.ts` said `city: 'Bogotá'` — so the app
as built rendered "Bogotá · COP". The mismatch was raised with Justin rather than guessed at, since
the city is a tenant fact and the multi-tenant rule keeps exactly one source for it.

## Prompt (verbatim)

> It's medellin. please continue doing things,

## Response

The studio is in Medellín. `tenant.city` is now `'Medellín'`, which is the only place the city is
written, so C-05's subtitle, the customer auth shell footer and the M-04 email footer all follow
from the one edit. `tenant.timezone` stays `'America/Bogota'` — that is Colombia's IANA zone name
and has nothing to do with where the studio is; wording such as "hora de Bogotá" / "America/Bogota
display" in the ops manual, `canvasSpecs.ts` and `docs/pages/M-03.md` is about timestamps and is
correct as written, so it was left alone.

Two places still spelled the city out by hand and were fixed: `README.md` line 3 ("a wellness club
in Medellín, Colombia") and the `EmailPreview` library usage, whose footer string hardcoded
"HOY Wellness Center · Bogotá · …". That usage now reads `tenant.legalName`, `tenant.city` and
`tenant.name` from the tenant config, like the real `EmailsPage` (M-04) already did — the component
library no longer disagrees with the screen it documents. The real screens needed no change: C-05,
`AuthShell` and `EmailsPage` were already reading `tenant.city`.

C-05 screenshots were regenerated (ES/EN at 390 and 1280); the subtitle now reads "Medellín · COP".
`npm run build` is clean.
