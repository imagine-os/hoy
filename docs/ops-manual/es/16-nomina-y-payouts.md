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
   → corrida en borrador — M-09a /admin/finance/payouts (finanzas)
      → revisión del detalle por maestro — M-09b /admin/finance/payouts/:id (coordinación)
         → aprobación — M-09b (owner)
            → pago por maestro (Wompi / transferencia / efectivo) — M-09b
               → extracto del maestro — S-03 /teach/payroll
```

Una sola aritmética sostiene toda la cadena: `src/data/payrollCalc.ts`. La corrida que genera finanzas
y el estimado que ve el maestro salen de la misma función, así que las dos pantallas no pueden
contradecirse.

## 2. Generar la corrida
1. Finanzas entra a **M-09a · Finanzas → Payouts** (`/admin/finance/payouts`): la lista de corridas,
   con el periodo, el número de maestros, el total y el estado de cada una.
2. El botón genera el **borrador** del periodo: una línea por maestro con clases dictadas × tarifa,
   tomada de las sesiones completadas y de `teachers.rate_per_class`.
3. Generar es **idempotente**: si ya existe un borrador para ese periodo, sus líneas se borran y se
   recalculan, así que pulsar dos veces no puede pagar dos veces. Una corrida ya aprobada o pagada se
   rechaza con el motivo en pantalla.
4. Nada se paga en borrador.

En **M-09 Finanzas** el rango de **15 días** vive junto a 7 / 30 / 90 y todo: los estudios en Colombia
liquidan quincenalmente, y ese rango mueve tanto los indicadores como la tabla de facturas.

![Payouts en M-09a](../../screenshots/M-09a/es-1280.jpg "M-09a · /admin/finance/payouts")

## 3. Revisar
1. Abrir la corrida lleva a **M-09b** (`/admin/finance/payouts/:id`): el extracto por maestro, con las
   clases que dictó, la tarifa, los ajustes y el total. Se puede exportar a **CSV** o imprimir.
2. Coordinación cruza el detalle contra **M-02 Horario**: cada clase pagada existió y la dictó quien dice.
3. Diferencias que reporta un maestro (`06`) se resuelven antes de aprobar, con la clase y la fecha.
4. Sustituciones: se pagan a quien dictó, no a quien estaba programado.

![Extracto de la corrida en M-09b](../../screenshots/M-09b/es-1280.jpg "M-09b · /admin/finance/payouts/:id")

## 4. Aprobar y pagar
1. **El owner aprueba** en M-09b. La aprobación congela la corrida: a partir de ahí las líneas no se
   editan, se ajustan en la corrida siguiente.
2. Aprobada, la corrida se paga por el medio que el estudio haya definido: **enviar por Wompi**
   (simulado hoy, con su camino de rechazo), **marcar pagada por transferencia** o **por efectivo**.
3. El pago también se puede marcar **maestro por maestro**, que es como funciona en la práctica cuando
   uno cobra por transferencia y otro pasa por caja. La corrida **se cierra sola como pagada** en el
   momento en que el último maestro queda liquidado: nadie tiene que acordarse de cerrarla.
4. Todo —generar, aprobar, enviar, marcar pagado— queda en **M-07** con actor y hora.

> DECISIÓN PENDIENTE: medio de pago de la nómina de maestros (payout de Wompi, transferencia o efectivo), si el estudio practica retención y quién firma el soporte de pago.

## 5. El extracto del maestro
1. El maestro abre **S-03 · Nómina** (`/teach/payroll`). Antes de que finanzas genere la corrida, la
   página calcula el periodo en vivo (sesiones completadas × su tarifa) y lo rotula como
   **estimado**.
2. En cuanto existe una corrida que cubre el periodo, la página deja de estimar y lee las
   `payroll_lines`: el maestro ve exactamente lo que finanzas va a pagar, con bonos y ajustes
   incluidos, y el estado de la corrida (borrador · aprobada · pagada).
3. Además muestra el desglose clase por clase, el historial de corridas anteriores, el medio de pago
   registrado, una vista de impresión y un enlace de WhatsApp a finanzas con el periodo y el total ya
   escritos.
4. El extracto es el documento que resuelve una discusión: si no está ahí, no se pagó.

[screenshot: S-03 — extracto de nómina del maestro con clases, tarifa y ajustes]

## 6. Las tarifas
La tarifa por clase vive en el perfil del maestro, no en una hoja aparte:

{{table:teachers}}

> DECISIÓN PENDIENTE: la periodicidad de la nómina (mensual con corte el 15, o quincenal como sugiere el rango de 15 días de M-09), la fecha de pago, las tarifas por clase (la semilla usa 80.000–110.000 COP) y el tipo de contrato.

## 7. Qué está simulado hoy
1. Las corridas, las líneas, las aprobaciones y las marcas de pago son **filas reales** en
   `payroll_runs` y `payroll_lines`, con su registro en M-07. Lo que no es real es la plata:
   `wompiPayout()` es la costura de dispersión y ambas pantallas llevan la etiqueta
   **"Wompi simulado"** (`26`).
2. Un payout **no es una fila de `payments`**. `payments` es plata que entra (miembros) y alimenta los
   ingresos de M-09; la plata que sale vive en la corrida y en sus líneas. Por eso pagar la nómina no
   mueve los indicadores de ingresos.
3. `/teach/payroll` es de solo lectura: el maestro ve lo que finanzas va a pagar, no un botón para
   cobrar.
4. Cuando exista Wompi payroll, la corrida aprobada será la que dispare el pago; el flujo de este
   capítulo no cambia, solo deja de ser manual.
