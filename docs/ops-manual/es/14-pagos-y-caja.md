---
title: Pagos y caja
role: finanzas, recepción, owner
part: IV
version: 0.6.0
updated: 2026-09-17
summary: Medios de pago, cierre de caja, conciliación diaria, Wompi, reembolsos y los reportes del mes.
---

# Pagos y caja

El dinero entra por cuatro caminos y sale por dos. Este capítulo es el circuito completo, del mostrador
al banco.

## 1. Los medios de pago
| Medio | Cuándo liquida | Quién confirma |
|---|---|---|
| Efectivo | inmediato | recepción, al recibir |
| Datáfono | cuando la pasarela confirma | finanzas, contra el panel de Wompi |
| Link de Wompi | cuando la pasarela confirma | automático; finanzas revisa |
| Transferencia / Nequi | cuando finanzas ve el abono | finanzas, en M-06 → Pagos |
| Bono de regalo | inmediato (descuenta saldo) | sistema |

Una orden pendiente **no es una venta**. Hasta que liquida no cuenta en los ingresos del mes.

{{table:payments}}

## 2. Cierre de caja (recepción, cada día)
1. Tras la última clase, cuenta efectivo; compara con "Registró pago en efectivo" del día en **M-07**
   filtrado por tu nombre.
2. Lista transferencias pendientes con comprobante y envíalas a finanzas.
3. Guarda el efectivo en la caja fuerte, firma la planilla, apaga equipos y cierra con la checklist de `07`.

**Pasos en HoyOS:** M-07 Registro de actividad → filtro fecha hoy + origen recepción → Exportar CSV.

![El registro del día, filtrado](../../screenshots/M-07/es-1280.jpg "M-07 · /admin/activity")

## 3. Conciliación diaria (finanzas)
1. Finanzas recibe de recepción la planilla de cierre y las transferencias pendientes.
2. Cruza tres fuentes: efectivo contado, **M-07** filtrado por "Registró pago en efectivo", y el panel
   de Wompi para links y datáfono.
3. Confirma transferencias con comprobante en **M-06 → Pagos** (la orden pasa de pendiente a liquidada).
4. Diferencia > $10.000: nota en M-07 exportado y aviso al owner el mismo día.

**Pasos en HoyOS:** M-07 → filtro fecha + acción "pago" → Exportar CSV. M-06 → socio → Pagos → confirmar.

## 4. Wompi
1. Los abonos (payouts) llegan según el ciclo del contrato con Wompi; regístralos contra las ventas por
   fecha de transacción, no de abono.
2. Comisiones y retenciones se contabilizan como gasto separado.
3. La cuenta de destino y el ambiente (sandbox / producción) están en **M-08c Pagos**. Las llaves nunca
   se guardan ahí: la pantalla lo dice.

![La cuenta de payout y el ambiente de Wompi](../../screenshots/M-08c/es-1280.jpg "M-08c · /admin/settings/payments")

> DECISIÓN PENDIENTE: ciclo de abonos contratado con Wompi y cuenta bancaria destino.

## 5. Reembolsos
| Caso | Qué se hace | Aprueba |
|---|---|---|
| Clase cancelada por el estudio | Crédito vuelve automático (E-03) | nadie, es automático |
| Cobro duplicado o error | Reembolso al mismo medio desde Wompi; registro en M-06 Pagos | Finanzas |
| Cortesía por queja | Crédito, no dinero | Coordinación |
| Membresía anual, retiro | Prorrateo según términos (A-06) | Owner |

Todo reembolso queda en M-07 con actor y valores antes/después.

## 6. Panel y KPIs
**M-01 Panel admin** abre con los KPIs y la gráfica de ocupación. Lo que miramos cada semana:

| KPI | Cómo se lee | Alerta |
|---|---|---|
| Ocupación | asistentes / (mats × clases dictadas) | < 60 % sostenido |
| Ingresos del mes | ventas liquidadas, COP | vs. mismo mes anterior |
| Socios activos y en riesgo | segmentos de M-06 | "En riesgo" crece 2 semanas seguidas |
| No-show y cancelación tardía | por clase y por franja | > 10 % |

{{kpi:occupancy}}

{{kpi:noshow}}

![KPIs y ocupación](../../screenshots/M-01/es-1280.jpg "M-01 · /admin")

Los switches de features (M-08b) guardan cada cambio con actor, valor anterior y hora. Las páginas
legales y de emergencia no se pueden apagar.

![Switches de features, auditados](../../screenshots/M-08b/es-1280.jpg "M-08b · /admin/settings/features")

## 7. Reportes
1. Semanal (lunes): ocupación por clase y franja, ventas por producto, no-shows.
2. Mensual (día 5): ingresos, nómina, abonos Wompi conciliados, segmento "En riesgo", motivos de
   cancelación de membresía.

**Pasos en HoyOS:** M-01 KPIs → M-07 exportar CSV → M-06 segmentos → M-09 Finanzas.

{{stats}}
