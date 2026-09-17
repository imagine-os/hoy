---
title: Administración y finanzas
role: owner, admin, finanzas
version: 0.1
updated: 2026-09-17
---

# Administración y finanzas

## 1. Panel y KPIs
1. **M-01 Panel admin** abre con 4 KPIs y la gráfica de ocupación. Lo que miramos cada semana:

| KPI | Cómo se lee | Alerta |
|---|---|---|
| Ocupación | asistentes / (15 × clases dictadas) | < 60 % sostenido |
| Ingresos del mes | ventas liquidadas, COP | vs. mismo mes anterior |
| Socios activos y en riesgo | segmentos de M-06 | "En riesgo" crece 2 semanas seguidas |
| No-show y cancelación tardía | por clase y por franja | > 10 % |

2. Switches de features (M-01): cada cambio queda con actor, valor anterior y hora. Las páginas legales y de emergencia no se pueden apagar.
**Pasos en HoyOS:** M-01 → fila de KPIs → Ocupación; M-01 → Features y páginas.
[screenshot: M-01 — KPIs y gráfica de ocupación]

## 2. Conciliación diaria
1. Finanzas recibe de recepción la planilla de cierre y las transferencias pendientes.
2. Cruza tres fuentes: efectivo contado, **M-07** filtrado por "Registró pago en efectivo", y el panel de Wompi para links y datáfono.
3. Confirma transferencias con comprobante en **M-06 → Pagos** (la orden pasa de pendiente a liquidada).
4. Diferencia > $10.000: nota en M-07 exportado y aviso al owner el mismo día.
**Pasos en HoyOS:** M-07 → filtro fecha + acción "pago" → Exportar CSV. M-06 → socio → Pagos → confirmar.

## 3. Wompi
1. Los abonos (payouts) llegan según el ciclo del contrato con Wompi; regístralos contra las ventas por fecha de transacción, no de abono.
2. Comisiones y retenciones se contabilizan como gasto separado.
> DECISIÓN PENDIENTE: ciclo de abonos contratado con Wompi y cuenta bancaria destino.

## 4. Facturación electrónica DIAN
1. En **M-08 → Impuestos y facturación** deben estar NIT, resolución DIAN y rango antes de encender facturación electrónica. Sin eso el switch no se activa.
2. Cada recibo (M-04) lleva la referencia de la factura electrónica. Si la persona pide factura a nombre de empresa, se toma NIT y razón social en M-06 antes de completar la venta.
3. Todo el dinero se guarda en COP; los tiempos en UTC y se muestran en hora de Bogotá.
> DECISIÓN PENDIENTE: proveedor tecnológico de facturación electrónica y si el IVA (19 %) está incluido en el precio publicado.

## 5. Nómina de profesores
1. Corte el 15 de cada mes. Fuente: asistencia cerrada en S-03 (clases dictadas, sustituciones, ajustes).
2. Exporta el detalle, revisa contra M-02 Horario, aprueba el owner, paga y confirma en S-03 (el profesor lo ve en Historial de nómina).
> DECISIÓN PENDIENTE: fecha de pago, tarifas por clase y tipo de contrato.

## 6. Reembolsos
| Caso | Qué se hace | Aprueba |
|---|---|---|
| Clase cancelada por el estudio | Crédito vuelve automático (E-03) | nadie, es automático |
| Cobro duplicado o error | Reembolso al mismo medio desde Wompi; registro en M-06 Pagos | Finanzas |
| Cortesía por queja | Crédito, no dinero | Coordinación |
| Membresía anual, retiro | Prorrateo según términos (A-06) | Owner |
Todo reembolso queda en M-07 con actor y valores antes/después.

## 7. Reportes
1. Semanal (lunes): ocupación por clase y franja, ventas por producto, no-shows.
2. Mensual (día 5): ingresos, nómina, abonos Wompi conciliados, segmento "En riesgo", motivos de cancelación de membresía.
**Pasos en HoyOS:** M-01 KPIs → M-07 exportar CSV → M-06 segmentos.
