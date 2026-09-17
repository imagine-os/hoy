---
title: CRM, WhatsApp y correo
role: recepción, coordinación
part: III
version: 0.6.0
updated: 2026-09-17
summary: El socio 360, las reglas del canal, las plantillas automáticas y cómo se escribe un mensaje a mano.
---

# CRM, WhatsApp y correo

WhatsApp es el canal principal. Todo lo que el estudio envía, automático o a mano, queda en la
cronología del socio en **M-06 CRM**.

![El socio 360: cronología, pagos, notas y consentimientos](../../screenshots/M-06/es-1280.jpg "M-06 · /admin/crm")

## 1. El socio 360
1. **M-06** es el expediente: cabecera con contacto y contacto de emergencia, cronología de reservas y
   mensajes, pagos, notas y consentimientos.
2. Las notas son internas y se escriben en tono profesional: las puede leer el owner, un auditor y, si
   la persona lo pide, la persona misma.
3. Segmentos: "Activo", "En riesgo", "Nuevo". El segmento "En riesgo" se revisa los miércoles (`05`).
4. Recepción ve la cronología pero no edita pagos; finanzas ve pagos pero no notas de salud (`24`).

## 2. Reglas del canal
| Regla | Detalle |
|---|---|
| Un número | El WhatsApp Business del estudio; nunca desde teléfonos personales |
| Opt-in | Solo reciben automatizaciones los números con opt-in (se toma en A-03 o S-04) |
| Opt-out | "Baja" o "no más mensajes" se respeta de inmediato y para siempre; se registra en M-06 |
| Horas silenciosas | No se envía nada no urgente; lo automático hace cola hasta la mañana |
| Excepciones | Clase cancelada por el estudio y cupo liberado de lista de espera salen siempre |
| Respuesta | En horario de recepción, menos de 15 min; fuera de horario, a primera hora |
| Correo | Confirmaciones, recibos con referencia DIAN, cancelaciones; respaldo de WhatsApp, no reemplazo |

Las horas silenciosas vigentes:

{{policy:quiet_hours}}

> DECISIÓN PENDIENTE: horario oficial de atención por WhatsApp y texto legal del opt-in.

## 3. Plantillas automáticas (M-05 / M-04)
| Plantilla | Disparador | Momento |
|---|---|---|
| Reserva confirmada | reserva creada | inmediato |
| Recordatorio de clase | T−2 h | respeta horas silenciosas |
| Clase cancelada | cancelación del estudio | inmediato, siempre |
| Lista de espera liberada | cupo liberado | inmediato, siempre; ventana de reclamo para tomarlo |
| Recibo / factura | pago liquidado | inmediato |
| Membresía por vencer / aviso de cobro | según el aviso de cobro de M-08 | 8:00 AM |
| Pedir feedback | clase asistida | mismo día |
| Feliz cumpleaños | fecha | 8:00 AM |
| Invitación de invitado | socio invita | inmediato |
| Pago fallido | rechazo de pasarela | inmediato |

Cada plantilla necesita aprobación de Meta por idioma; su estado se ve en M-05.

**Pasos en HoyOS:** M-05 → automatización → vista previa → estado Meta → Registro de envíos. M-04 →
plantilla → Enviar prueba.

![Disparador, plantilla, retraso y estado Meta](../../screenshots/M-05/es-1280.jpg "M-05 · /admin/whatsapp")

![Los correos transaccionales, en ES y EN](../../screenshots/M-04/es-1280.jpg "M-04 · /admin/emails")

## 4. Mensajes manuales (recepción)
1. Estructura: nombre + dato en la primera línea; acción en la segunda; máximo un 🌿.
2. Ejemplos:
   - "Hola, <nombre>. La de las 7:00 está llena; te dejo en lista de espera y te aviso si se libera un cupo 🌿"
   - "Hola, <nombre>. Recibimos tu transferencia, tu Paquete de 3 ya está activo. Te esperamos."
   - "Hola, <nombre>. Tu membresía se renueva el <fecha>. Si quieres pausarla, dime y lo hacemos."
3. Nunca se envían fotos de comprobantes, datos de salud ni información de otra persona (`23`).
4. Toda conversación relevante se resume en una nota en M-06.

## 5. Tono
1. Humana, cercana, directa, presente. La tabla de sí y no está en `20`. Tuteo siempre.
2. Las quejas se responden primero con lo que sí hacemos; la regla se explica después, sin culpar.

## 6. Lo que el socio controla
El socio decide qué le llega y por dónde, en **C-24 Notificaciones** y **C-19 Perfil**. Si alguien
apagó un canal, no se rodea escribiéndole por otro.

![Preferencias de notificación del socio](../../screenshots/C-24/es-390.jpg "C-24 · /app/notifications")

{{table:notification_prefs}}
