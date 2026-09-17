# Manual de operaciones — HOY Wellness Center

Cómo funciona el club en persona y en el software, por rol. Se muestra en la app en `/#/manual`
(portada con la rejilla de capítulos por parte; cada capítulo en `/#/manual/<slug>`, siguiendo el
idioma de la app) y `/#/manual/decisions` lista todo lo que el estudio aún no ha definido.

- `es/` — la fuente (español primero). `en/` — espejo en inglés, **mismo nombre de archivo** por capítulo.
- Front matter obligatorio por capítulo: `title`, `role`, `part`, `version`, `updated`, `summary`.
  `part` es la clave romana (`I`…`VII`) con la que la portada y la barra lateral agrupan; `summary` es
  la línea de la tarjeta y entra en la búsqueda.
- El prefijo `NN-` del nombre de archivo ordena el manual y es el número que se muestra. Los slugs de
  la estructura anterior (`03-recepcion`, `10-checklists-…`) siguen resolviendo por `LEGACY_SLUGS` en
  `src/modules/ops-manual/manualIndex.ts`.

## Convenciones dentro de un capítulo

| Escribes | Sale |
|---|---|
| `> DECISIÓN PENDIENTE: …` (EN: `> DECISION NEEDED: …`) | callout resaltado + una entrada en `/#/manual/decisions` y en `ROADMAP.md` |
| `> NOTA:` / `> ADVERTENCIA:` (EN: `> NOTE:` / `> WARNING:`) | callout de tono nota / advertencia |
| `![leyenda](../../screenshots/S-02/es-1280.jpg "S-02 · /staff/checkin")` | figura enmarcada con leyenda, chip del código y enlace a la pantalla viva |
| `[screenshot: S-02 — leyenda]` | caja punteada, para pantallas que aún no tienen captura |
| `{{pricing}}`, `{{pricing:membresia}}` | tabla de precios desde `src/tenant/pricing.ts`, con el rol de la familia |
| `{{tenant:hours}}` · `{{tenant:contact}}` · `{{tenant:capacity}}` | datos del estudio desde `src/tenant/tenant.ts` |
| `{{policy}}`, `{{policy:cancellation_window_hours}}` | valores vigentes de M-08 vía `usePolicy()`, con la fuente enlazada |
| `{{tables}}`, `{{table:bookings}}` | el esquema agrupado / una tabla con columnas y contrato de acceso |
| `{{roles}}` | la matriz de roles desde `src/auth/roles.ts` |
| `{{routes:customer}}` | las pantallas de una superficie, con su código, desde el manifiesto de rutas |
| `{{stats}}`, `{{kpi:occupancy}}` | conteos y KPIs en vivo de la capa de datos |

Un bloque `{{…}}` se escribe **solo en su línea**. Toda directiva lleva la leyenda bilingüe
«Datos en vivo del sistema · Live from the system»; una directiva desconocida se explica en pantalla en
lugar de romper el capítulo. Ningún precio, horario ni política se escribe a mano en un capítulo: la
pantalla manda y el manual la lee.

## Las siete partes

| Parte | Capítulos |
|---|---|
| I · HOY | 00 índice · 01 quiénes somos y filosofía · 02 nuestras clases · 03 modelo de valor |
| II · Operación diaria | 04 recepción y check-in · 05 clases y horarios · 06 maestros · 07 sala, calor y mantenimiento · 08 incidencias y emergencias · 09 checklists de entrenamiento |
| III · Clientes y planes | 10 ventas y planes · 11 pausas y regalos · 12 espacio (alquiler B2B) · 13 CRM y WhatsApp |
| IV · Dinero | 14 pagos y caja · 15 facturación y DIAN · 16 nómina y payouts |
| V · Contenido y marca | 17 contenido en el CMS · 18 web y redes · 19 medios y artwork · 20 voz y tono |
| VI · Legal y políticas | 21 políticas · 22 documentos legales · 23 habeas data |
| VII · Sistema | 24 roles y permisos · 25 datos y tablas · 26 integraciones · 27 glosario |

28 capítulos por idioma, 61 figuras por idioma, 27 decisiones pendientes, 2 marcadores de captura
(pantallas sin foto propia).

---
_English: the club's operations manual, Spanish first with an English mirror per chapter (same file
names). Front matter carries `part` and `summary`; a chapter may embed live system data with a
`{{directive}}` line and real captures with a titled markdown image. Rendered at `/#/manual`; pending
owner decisions are auto-listed at `/#/manual/decisions`._
