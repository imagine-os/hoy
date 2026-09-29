---
title: Facturación y DIAN
role: finanzas, admin, owner
part: IV
version: 0.13.2
updated: 2026-09-29
summary: Qué se necesita antes de encender la factura electrónica, cómo se aplica el IVA, facturas a empresas y qué falta.
---

# Facturación y DIAN

La factura electrónica todavía no está encendida. Este capítulo dice qué falta, cómo funciona el IVA y qué hacer
hoy cuando alguien pide factura.

{{audience:15-facturacion-y-dian}}

## 1. Antes de encender
En Ajustes → Pagos tienen que estar el NIT, la resolución de la DIAN y el rango de numeración. Sin eso, el
interruptor de facturación no se enciende.

![NIT, resolución y rango](../../screenshots/M-08c/es-1280.jpg "M-08c · /admin/settings/payments")

> DECISIÓN PENDIENTE: el proveedor tecnológico de facturación electrónica y quién es el emisor legal de las facturas.

> EN HOYOS: M-08c Ajustes → Pagos → Impuestos y facturación.

## 2. El IVA
El porcentaje del IVA y si los precios publicados ya lo incluyen son valores de Ajustes. Al cobrar, el resumen
separa el IVA del total con estos valores:

{{policy:iva_pct}}

{{policy:prices_include_iva}}

Si el IVA va incluido o se suma aparte todavía está por decidir: ver [Ventas y planes](10-ventas-y-planes.md).

## 3. Cada recibo
1. Cada recibo llevará la referencia de su factura electrónica.
2. Si la persona pide la factura a nombre de una empresa, pide el **NIT y la razón social antes de completar
   la venta**. Después no se puede cambiar: hay que anular y emitir otra, y eso cuesta tiempo.

**Qué decir:** "¿La factura va a tu nombre o al de una empresa? Si es empresa, dame el NIT y la razón social."

Las horas del recibo se muestran en la hora del estudio:

{{tenant:hours}}

## 4. Facturas de alquiler
Un alquiler del espacio casi siempre necesita factura a empresa (ver [Espacio](12-espacio-b2b.md)). Pide los
datos fiscales junto con la cotización, no el día del evento.

## 5. Cómo se guardan las facturas
{{table:invoices}}

## 6. Qué falta hoy
1. Las facturas se guardan con la forma correcta, pero **todavía no se emiten ante la DIAN**: falta el proveedor
   y el emisor legal.
2. En Finanzas, una factura sin referencia de la DIAN se muestra así, sin referencia.
3. El recibo por correo se diseña y se ve en la vista previa, pero todavía no se envía (ver
   [Integraciones](26-integraciones.md)).

![Facturas y pagos en Finanzas](../../screenshots/M-09/es-1280.jpg "M-09 · /admin/finance")
