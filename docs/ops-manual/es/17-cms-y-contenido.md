---
title: Contenido en el CMS
role: coordinación, admin
part: V
version: 0.6.0
updated: 2026-09-17
summary: Qué se edita en M-02, el flujo borrador → revisión → publicado, y las reglas del club y el FAQ.
---

# Contenido en el CMS

Nada se escribe dos veces. Si un texto lo ve un cliente, vive en **M-02 Contenido** y sale de ahí
hacia el sitio, la app y el mostrador.

![El CMS](../../screenshots/M-02/es-1280.jpg "M-02 · /admin/content")

## 1. Qué vive en M-02
| Contenido | Dónde se ve |
|---|---|
| Tipos de clase y descripciones | C-02, C-03, W-03, W-04 |
| Perfiles de maestros (bio, foto, especialidades) | C-18, W-05, S-03 |
| Modalidades y movimientos | W-03, C-02 |
| Salas y capacidad | M-02, S-02 |
| Reglas del club | C-13 |
| Preguntas frecuentes | C-14 / C-15 |
| Textos "sobre HOY" | W-02 y el capítulo `01` de este manual |

Los precios **no** viven en el CMS: viven en el modelo de valor (`03`).

## 2. El flujo
1. Todo campo es ES/EN. **El español es obligatorio**; el inglés cae al español si falta.
2. Estado: borrador → revisión → publicado. Lo que un maestro envía desde S-03 entra en revisión.
3. Coordinación aprueba o devuelve con comentario **en la misma semana**. Una cola de revisión vieja
   es contenido desactualizado en el sitio.
4. Fotos: se marcan como placeholder hasta que llegue el material real (`19`).

## 3. Reglas del club y FAQ
1. Las reglas del club (C-13) son las que la persona acepta de hecho al entrar: puntualidad, mats,
   calor, higiene, cancelación. Cambiarlas cambia la experiencia, así que las aprueba el owner.
2. El FAQ (C-14 / C-15) se escribe con la pregunta tal como la hace la gente, no como la haría un
   abogado. Si recepción responde tres veces la misma cosa por WhatsApp, eso es un FAQ nuevo.

![Las reglas del club](../../screenshots/C-13/es-390.jpg "C-13 · /app/rules")

![El FAQ](../../screenshots/C-14/es-390.jpg "C-14 · /app/faq")

{{table:content_articles}}

{{table:faq_entries}}

## 4. Cambios de precio
Los propone finanzas, los aprueba el owner y se aplican en el modelo de valor
(`src/tenant/pricing.ts`). Nunca afectan suscripciones ya activas. El mostrador y el sitio cambian en
el mismo momento porque leen el mismo archivo.

## 5. Qué está simulado hoy
1. M-02 edita tipos de clase, maestros, modalidades y salas. Los artículos y el FAQ se editan por ahora
   en **M-03 Tablas** de forma genérica: falta el editor dedicado.
2. La biblioteca de medios no existe todavía; `photo_url` es un campo de texto (`19`).
3. No hay publicación programada: publicar es inmediato.
