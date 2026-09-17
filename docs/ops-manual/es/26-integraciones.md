---
title: Integraciones y qué está simulado
role: admin, owner, finanzas
part: VII
version: 0.6.0
updated: 2026-09-17
summary: Qué sistemas externos usa HOY, en qué estado está cada uno y qué se puede prometer hoy.
---

# Integraciones y qué está simulado

Este capítulo existe para que nadie prometa algo que el sistema todavía no hace. El diseño está hecho
para cada integración; el proveedor no siempre está conectado.

![Estado de las integraciones](../../screenshots/M-08a/es-1280.jpg "M-08a · /admin/settings")

## 1. Estado
| Integración | Para qué | Estado hoy | Qué falta |
|---|---|---|---|
| Supabase (auth + datos) | inicio de sesión real y base de datos | **simulado**: los datos viven en el navegador y el acceso es un selector de demo | credenciales, migración del esquema y reglas RLS |
| Wompi pagos | link de pago, datáfono, tarjeta guardada | **simulado**: escribe pagos y facturas reales, muestra el rechazo, pero no mueve dinero | credenciales de comercio, sandbox y webhooks del lado servidor |
| Wompi payroll | pagar a los maestros | **simulado**: la corrida calcula y se detiene (`16`) | rieles de payout y extracto por maestro |
| WhatsApp Business | automatizaciones, CRM, OTP | **simulado**: todo queda en el registro de mensajes | remitente aprobado por Meta y plantillas por idioma |
| Correo | recibos, reportes, avisos | **simulado**: se diseña y se previsualiza, no se envía | proveedor de envío |
| Facturación DIAN | factura electrónica | **simulado**: la fila tiene la forma, no hay CUFE (`15`) | proveedor tecnológico y emisor legal |
| Mapas | mapa en contacto | **pendiente** | proveedor y dirección definitiva |

## 2. Qué se puede decir hoy
1. "Te mando el link de pago" → **sí**, el link existe; el cobro no se confirma solo, finanzas lo revisa (`14`).
2. "Te llega el recibo por WhatsApp" → **todavía no**: se entrega en pantalla y por escrito a mano.
3. "Te llega la factura electrónica" → **todavía no**: se avisa que llegará cuando la facturación esté encendida.
4. "Te aviso si se libera un cupo" → **sí**, pero hoy lo escribe una persona, no una automatización.
5. "Tu pago quedó guardado" → el medio de pago se guarda como referencia; el número de la tarjeta nunca
   pasa por HoyOS.

## 3. El orden en que se conectan
Supabase primero, porque todo lo demás necesita un usuario autenticado de verdad: pagos, nómina,
WhatsApp y multi-tenant dependen de eso. Después Wompi pagos, luego DIAN y payroll, y en paralelo
WhatsApp (su aprobación tarda, así que la solicitud se inicia temprano).

## 4. Dónde se configuran
| Ajuste | Pantalla |
|---|---|
| Cuenta de payout, NIT, IVA, ambiente de Wompi | M-08c Pagos |
| Remitente de WhatsApp y de correo | M-08d Comunicaciones |
| Estado de integraciones | M-08a General |
| Encender o apagar un flujo | M-08b Features |

![Comunicaciones: remitentes](../../screenshots/M-08d/es-1280.jpg "M-08d · /admin/settings/communications")

## 5. Lo que registra un envío simulado
{{table:message_log}}
