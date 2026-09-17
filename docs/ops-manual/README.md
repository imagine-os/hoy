# Manual de operaciones — HOY Wellness Center

Cómo funciona el club en persona y en el software, por rol. Se muestra en la app en `/#/manual`
(capítulos en la barra lateral, sigue el idioma de la app) y `/#/manual/decisions` lista todo lo que
el estudio aún no ha definido.

- `es/` — la fuente (español primero). `en/` — espejo en inglés, mismo nombre de archivo por capítulo.
- Front matter por capítulo: `title`, `role`, `version`, `updated`. El título de la barra lateral sale de ahí.
- `> DECISIÓN PENDIENTE: …` (EN: `> DECISION NEEDED: …`) marca lo que el owner debe decidir; se extrae
  automáticamente a `/#/manual/decisions` y a `ROADMAP.md`.
- `[screenshot: S-02 — leyenda]` es un marcador de captura; se reemplaza por `![leyenda](../../screenshots/S-02/es-1280.png)`
  cuando `npm run screenshots` haya producido la imagen (ver `docs/rules/documentation.md`).
- Las políticas citadas (cancelación, lista de espera, tolerancia) se leen de **M-08**; la pantalla manda.

| # | Capítulo | Para |
|---|---|---|
| 00 | Índice | todos |
| 01 | Filosofía y voz | todos |
| 02 | Roles y organigrama | todos |
| 03 | Recepción | recepción |
| 04 | Profesores | profesores |
| 05 | Coordinación | coordinación |
| 06 | Administración y finanzas | owner, admin, finanzas |
| 07 | Mantenimiento y espacio | mantenimiento, recepción, profesores |
| 08 | Comunicación — WhatsApp y correo | recepción, coordinación |
| 09 | Emergencias y seguridad | todos |
| 10 | Checklists de entrenamiento | todos |

---
_English: the club's operations manual, Spanish first with an English mirror per chapter. Rendered at
`/#/manual`; pending owner decisions are auto-listed at `/#/manual/decisions`._
