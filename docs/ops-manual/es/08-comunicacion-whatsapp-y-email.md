---
title: Comunicación — WhatsApp y correo
role: recepción, coordinación
version: 0.1
updated: 2026-09-17
---

# Comunicación: WhatsApp y correo

WhatsApp es el canal principal. Todo lo que el estudio envía, automático o a mano, queda en la cronología del socio en **M-06 CRM**.

## 1. Reglas del canal
| Regla | Detalle |
|---|---|
| Un número | El WhatsApp Business del estudio; nunca desde teléfonos personales |
| Opt-in | Solo reciben automatizaciones los números con opt-in (se toma en A-03 o S-04) |
| Opt-out | "Baja" o "no más mensajes" se respeta de inmediato y para siempre; se registra en M-06 |
| Horas silenciosas | 9pm–7am no se envía nada no urgente; lo automático hace cola hasta las 7am |
| Excepciones | Clase cancelada por el estudio y cupo liberado de lista de espera salen siempre |
| Respuesta | En horario de recepción, menos de 15 min; fuera de horario, a primera hora |
| Correo | Confirmaciones, recibos con referencia DIAN, cancelaciones; respaldo de WhatsApp, no reemplazo |

## 2. Plantillas automáticas (M-05 / M-04)
| Plantilla | Disparador | Momento |
|---|---|---|
| Reserva confirmada | reserva creada | inmediato |
| Recordatorio de clase | T−2 h | respeta horas silenciosas |
| Clase cancelada | cancelación del estudio | inmediato, siempre |
| Lista de espera liberada | cupo liberado | inmediato, siempre; 30 min para reclamar |
| Recibo / factura | pago liquidado | inmediato |
| Membresía por vencer / aviso de cobro | T−3 días | 8:00 AM |
| Pedir feedback | clase asistida | mismo día |
| Feliz cumpleaños | fecha | 8:00 AM |
| Invitación de invitado | socio invita | inmediato |
| Pago fallido | rechazo de pasarela | inmediato |

Cada plantilla necesita aprobación de Meta por idioma; su estado se ve en M-05.
**Pasos en HoyOS:** M-05 → automatización → vista previa → estado Meta → Registro de envíos. M-04 → plantilla → Enviar prueba.
[screenshot: M-05 — vista previa de burbuja de "Clase cancelada"]

## 3. Mensajes manuales (recepción)
1. Estructura: nombre + dato en la primera línea; acción en la segunda; máximo un 🌿.
2. Ejemplos:
   - "Hola, <nombre>. La de las 7:00 está llena; te dejo en lista de espera y te aviso si se libera un cupo 🌿"
   - "Hola, <nombre>. Recibimos tu transferencia, tu Paquete de 3 ya está activo. Te esperamos."
   - "Hola, <nombre>. Tu membresía se renueva el <fecha> por $520.000. Si quieres pausarla, dime y lo hacemos."
3. Nunca se envían fotos de comprobantes, datos de salud ni información de otra persona.
4. Toda conversación relevante se resume en una nota en M-06.

## 4. Tono
1. Humana, cercana, directa, presente (ver `01`). Tuteo siempre.
2. Las quejas se responden primero con lo que sí hacemos; la regla se explica después, sin culpar.

> DECISIÓN PENDIENTE: horario oficial de atención por WhatsApp y texto legal del opt-in.
