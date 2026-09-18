---
title: Integraciones y qué está simulado
role: admin, owner, finanzas
part: VII
version: 0.8.0
updated: 2026-09-18
summary: Qué sistemas externos usa HOY, en qué estado está cada uno, qué puede llenar el owner desde ya en M-10 y qué termina el dev.
---

# Integraciones y qué está simulado

Este capítulo existe para que nadie prometa algo que el sistema todavía no hace. El diseño está hecho
para cada integración; el proveedor no siempre está conectado. Desde la versión 0.7.0 todo eso vive en
una pantalla propia: **M-10 · Integraciones** (`/admin/integrations`).

![Integraciones: una tarjeta por sistema](../../screenshots/M-10/es-1280.jpg "M-10 · /admin/integrations")

## 1. Cómo se lee M-10
Cada sistema externo es **una tarjeta** con cinco partes:

1. **Qué hace y qué está simulado hoy** — la frase que se puede decir en recepción sin mentir.
2. **Los campos que no son secretos**, listos para llenar antes de que llegue el dev: el id de comercio y
   la llave pública de Wompi, el número emisor y el *namespace* de plantillas de WhatsApp, el proveedor y el
   dominio de correo, el proveedor tecnológico y el emisor legal para la DIAN, el enlace del mapa, la URL del
   proyecto de Supabase.
3. **Un estado** que mueve una persona, no el sistema: **simulado** (existe la costura, no se llama a nadie)
   → **configurado** (los ids están, el dev no ha conectado) → **conectado** (en producción).
4. **La lista de lo que el dev debe terminar**, en orden, y los **secretos que existen** — nombrados, nunca
   escritos: la llave privada de Wompi, el token de Meta, la *API key* del correo y la *service role* de
   Supabase viven en variables de entorno del servidor. Esta tabla no tiene una columna para ellos a propósito.
5. **Notas** para el dev (qué cuenta ya existe, quién tiene el acceso) y un enlace a este capítulo.

Cada guardado queda en el registro de actividad (`integration.update`, M-07) con el antes y el después.

## 2. Estado
| Integración | Para qué | Estado hoy | Qué falta |
|---|---|---|---|
| Supabase (auth + datos) | inicio de sesión real y base de datos | **simulado**: los datos viven en el navegador y el acceso es un selector de demo | crear el proyecto, aplicar `supabase/schema.sql` y las reglas RLS, `SupabaseProvider` |
| Wompi pagos | link de pago, datáfono, tarjeta guardada | **simulado**: escribe pagos y facturas reales, muestra el rechazo, pero no mueve dinero | credenciales de comercio, sandbox y webhooks del lado servidor |
| Wompi payroll | pagar a los maestros | **simulado**: la corrida calcula, se aprueba y se marca pagada; la dispersión resuelve con una referencia ficticia (`16`) | credenciales de dispersión y el webhook que confirma |
| WhatsApp Business | automatizaciones, conversación CRM y bandeja (`13`), OTP | **simulado**: entradas y salidas quedan en `message_log` con dirección y estado; el webhook real escribe en la misma tabla | remitente aprobado por Meta y plantillas por idioma; el webhook de la Cloud API (mensajes entrantes y estados) — **la aprobación tarda: se pide antes que Supabase** |
| Correo | recibos, reportes, newsletters, correspondencia en la conversación (`13`) | **simulado**: entradas y salidas quedan en `message_log` con dirección y estado; el envío y el correo entrante reales escriben en la misma tabla | proveedor de envío y dominio verificado; correo entrante (IMAP o SES) al `message_log` |
| Facturación DIAN | factura electrónica | **simulado**: la fila tiene la forma, no hay CUFE (`15`) | proveedor tecnológico y emisor legal |
| Mapas | mapa en contacto | **pendiente de elegir**: el proveedor es un ajuste en M-08f, las coordenadas en M-08a | la decisión (OSM sin llave o Google) |

{{table:integrations}}

## 3. Qué se puede decir hoy
1. "Te mando el link de pago" → **sí**, el link existe; el cobro no se confirma solo, finanzas lo revisa (`14`).
2. "Te llega el recibo por WhatsApp" → **todavía no**: se entrega en pantalla y por escrito a mano.
3. "Te llega la factura electrónica" → **todavía no**: se avisa que llegará cuando la facturación esté encendida.
4. "Te aviso si se libera un cupo" → **sí**, pero hoy lo escribe una persona, no una automatización.
5. "Tu pago quedó guardado" → el medio de pago se guarda como referencia; el número de la tarjeta nunca
   pasa por HoyOS.

La regla: si la tarjeta de M-10 dice **simulado**, la frase se dice en futuro.

## 4. El orden en que se conectan
Supabase primero, porque todo lo demás necesita un usuario autenticado de verdad: pagos, nómina,
WhatsApp y multi-tenant dependen de eso. Después Wompi pagos, luego DIAN y payroll, y en paralelo
WhatsApp (su aprobación tarda, así que la solicitud a Meta se inicia temprano). Correo y mapas cuando
haya proveedor. M-10 repite este orden al pie de la página.

## 5. Dónde se configura lo que ya se puede llenar
| Ajuste | Pantalla |
|---|---|
| Ids públicos, estado y notas de cada integración | **M-10 Integraciones** |
| Dirección, ciudad, WhatsApp, correo, Instagram, coordenadas del mapa y el interruptor "datos confirmados" | M-08a General (`01`) |
| Cuenta de payout, NIT, IVA incluido o no, resolución DIAN, ambiente de Wompi, **periodicidad de la nómina y tarjeta de tarifas** | M-08c Pagos (`16`) |
| Remitente de WhatsApp y de correo, horas de silencio | M-08d Comunicaciones |
| Proveedor del mapa, nombre público de las clases, Respiración como clase propia, versiones legales publicadas | M-08f Contenido (`02`, `22`) |
| Encender o apagar un flujo | M-08b Funciones |

![Ajustes · General: contacto con estado pendiente](../../screenshots/M-08a/es-1280.jpg "M-08a · /admin/settings")

![Ajustes · Pagos: periodicidad y tarjeta de tarifas](../../screenshots/M-08c/es-1280.jpg "M-08c · /admin/settings/payments")

## 6. Lo que registra un envío simulado
Cada fila es un mensaje de la conversación de una persona (`13`): canal, dirección (entrante, saliente, interna), origen (manual, automatización, newsletter, sistema), estado y el id del proveedor que llenará el webhook.

{{table:message_log}}
