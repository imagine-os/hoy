---
title: <CODE> — <Page name>
code: <CODE>
route: /#/<route>
roles: <roles>
status: stub | built | live
---

# <CODE> — <Page name>

**Route** `/#/<route>` · **Roles** <roles> · **Surface** <customer|teacher|staff|admin|public|dev|docs> · **Spec** `src/specs/canvasSpecs.ts['<CODE>']` (or `src/modules/<module>/specs.ts`)

## Purpose
<One paragraph from the spec purpose, in English. Spanish summary at the bottom.>

## Screenshots
| ES · mobile | EN · mobile |
| --- | --- |
| ![<CODE> es 390](../screenshots/<CODE>/es-390.png) | ![<CODE> en 390](../screenshots/<CODE>/en-390.png) |

| ES · desktop | EN · desktop |
| --- | --- |
| ![<CODE> es 1280](../screenshots/<CODE>/es-1280.png) | ![<CODE> en 1280](../screenshots/<CODE>/en-1280.png) |

<!-- key pages only -->
| ES · dark | EN · dark |
| --- | --- |
| ![<CODE> es 1280 dark](../screenshots/<CODE>/es-1280-dark.png) | ![<CODE> en 1280 dark](../screenshots/<CODE>/en-1280-dark.png) |

Until `npm run screenshots` has produced a capture, use a placeholder line instead of the image:

[screenshot: <CODE> — what the capture should show]

## Sections (layout order — `useLayout(spec)`)
1. `<Section A>` — what it shows, which component renders it
2. `<Section B>` — …

## Data
| Table | Read / write | Notes |
| --- | --- | --- |
| `<table>` | read | via `useTable('<table>', …)` |

## Logic and integrations
- <rule from the spec, and where it lives in code>
- Integrations: <Wompi | WhatsApp | Email | Supabase Auth | Supabase Realtime | none> — real or mocked?

## Real vs mock
- Real: …
- Mock / pending: …

## Changelog
- `docs/changelog/NNNN-slug.md` — first version
- `docs/changelog/NNNN-slug.md` — <visual change> ([before](../screenshots/<CODE>/es-1280-before.png) → [after](../screenshots/<CODE>/es-1280.png))

---
**Resumen (ES).** <Dos o tres líneas para el equipo del estudio.>
