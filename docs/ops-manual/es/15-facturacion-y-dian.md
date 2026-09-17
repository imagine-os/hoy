---
title: Facturación y DIAN
role: finanzas, admin, owner
part: IV
version: 0.6.0
updated: 2026-09-17
summary: Requisitos antes de encender la facturación electrónica, el IVA, facturas a empresa y qué está simulado.
---

# Facturación y DIAN

## 1. Antes de encender
En **M-08c → Impuestos y facturación** deben estar el NIT, la resolución DIAN y el rango antes de
encender facturación electrónica. Sin eso el switch no se activa.

![NIT, resolución y rango](../../screenshots/M-08c/es-1280.jpg "M-08c · /admin/settings/payments")

## 2. El IVA
El porcentaje y si los precios publicados lo incluyen son valores de M-08, y el riel de S-04 los usa
para partir el total:

{{policy:iva_pct}}

{{policy:prices_include_iva}}

> DECISIÓN PENDIENTE: proveedor tecnológico de facturación electrónica y si el IVA (19 %) está incluido en el precio publicado.

## 3. Cada recibo
1. Cada recibo (M-04) lleva la referencia de la factura electrónica.
2. Si la persona pide factura a nombre de empresa, se toma **NIT y razón social en M-06 antes de
   completar la venta**. Después no se rehace: se anula y se emite de nuevo, y eso cuesta tiempo.
3. Todo el dinero se guarda en COP; los tiempos en UTC y se muestran en hora local del estudio.

{{tenant:hours}}

## 4. Facturas de alquiler de espacio
Un alquiler B2B casi siempre necesita factura a empresa (`12`): el dato fiscal se pide junto con la
cotización, no el día del evento.

## 5. La tabla
{{table:invoices}}

## 6. Qué está simulado hoy
1. Las filas de `invoices` tienen la forma correcta, pero **no se emite ningún CUFE**: falta el
   proveedor y el emisor legal.
2. M-09 muestra la factura sin referencia DIAN cuando no existe.
3. El recibo por correo se diseña y se previsualiza en M-04, pero el envío todavía no tiene proveedor (`26`).

![Facturas y payouts en finanzas](../../screenshots/M-09/es-1280.jpg "M-09 · /admin/finance")
