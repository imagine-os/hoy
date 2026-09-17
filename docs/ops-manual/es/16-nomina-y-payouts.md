---
title: Nómina de maestros y payouts
role: finanzas, owner, coordinación
part: IV
version: 0.6.0
updated: 2026-09-17
summary: Del cierre de asistencia al pago del maestro: corrida en borrador, aprobación, pago y extracto.
---

# Nómina de maestros y payouts

El maestro cobra por lo que dictó, y lo que dictó lo dice la asistencia que él mismo cerró. Esa es toda
la cadena: sin asistencia cerrada no hay línea de nómina.

## 1. La cadena
```
Asistencia cerrada en S-03 (maestro)
   → corrida de nómina en borrador (finanzas, corte del 15)
      → revisión contra el horario de M-02 (coordinación)
         → aprobación (owner)
            → pago (Wompi / transferencia / efectivo)
               → extracto por maestro (visible en S-03)
```

## 2. Generar la corrida
1. Corte el **15 de cada mes**. Fuente: asistencia cerrada en S-03 (clases dictadas, sustituciones,
   ajustes).
2. Finanzas genera la corrida en **M-09 Finanzas → Payouts**: queda en estado **borrador**, con una
   línea por maestro y el detalle de clases × tarifa.
3. Nada se paga en borrador. El borrador se puede regenerar tantas veces como haga falta.

![Payouts en M-09](../../screenshots/M-09/es-1280.jpg "M-09 · /admin/finance")

## 3. Revisar
1. Coordinación cruza el detalle contra **M-02 Horario**: cada clase pagada existió y la dictó quien dice.
2. Diferencias que reporta un maestro (`06`) se resuelven antes de aprobar, con la clase y la fecha.
3. Sustituciones: se pagan a quien dictó, no a quien estaba programado.

## 4. Aprobar y pagar
1. **El owner aprueba.** La aprobación congela la corrida: a partir de ahí las líneas no se editan, se
   ajustan en la corrida siguiente.
2. El pago sale por el medio que el estudio haya definido: payout de Wompi, transferencia bancaria o
   efectivo contra recibo.
3. Cada pago se marca en la corrida; la corrida queda **pagada** cuando no falta ninguna línea.
4. Todo —generar, aprobar, marcar pagado— queda en **M-07** con actor y hora.

> DECISIÓN PENDIENTE: medio de pago de la nómina de maestros (payout de Wompi, transferencia o efectivo), si el estudio practica retención y quién firma el soporte de pago.

## 5. El extracto del maestro
1. El maestro ve su corrida en **S-03 → Historial de nómina**: clases dictadas, tarifa, sustituciones,
   ajustes y total. Es de solo lectura.
2. El extracto es el documento que resuelve una discusión: si no está ahí, no se pagó.

[screenshot: S-03 — extracto de nómina del maestro con clases, tarifa y ajustes]

## 6. Las tarifas
La tarifa por clase vive en el perfil del maestro, no en una hoja aparte:

{{table:teachers}}

> DECISIÓN PENDIENTE: fecha de pago, tarifas por clase y tipo de contrato.

## 7. Qué está simulado hoy
1. La corrida calcula clases × tarifa y se queda ahí: **no mueve dinero**. El payout de Wompi no está
   conectado (`26`).
2. `/teach/payroll` es de solo lectura y su total es el cálculo, no un pago confirmado.
3. Cuando Wompi payroll exista, la corrida aprobada será la que dispare el pago; el flujo de este
   capítulo no cambia, solo deja de ser manual.
