---
title: Incidencias y emergencias
role: todos
part: II
version: 0.6.0
updated: 2026-09-17
summary: Emergencia médica, golpe de calor, evacuación, contactos y cómo se registra un incidente.
---

# Incidencias y emergencias

La secuencia es siempre la misma: **primero la persona, después el registro**. Nunca al contrario.

## 1. Emergencia médica
1. Detén la clase si es en sala. Quien está más cerca se queda con la persona; recepción llama a la
   línea de emergencias <número local> y avisa a coordinación.
2. Abre **M-06 CRM** → socio → cabecera: contacto de emergencia (se toma en A-03 Crear cuenta o S-04
   al registrar) y marcador de salud.
3. Llama al contacto de emergencia solo si la persona no puede hacerlo.
4. Botiquín en <ubicación>; no des medicamentos.
5. Después: nota en M-06 con categoría "Lesión / salud", hora, qué pasó y qué se hizo. Coordinación
   informa al owner el mismo día.

**Pasos en HoyOS:** S-02 → Perfil del socio (abre M-06) → contacto de emergencia. Nota: M-06 → Notas
→ Añadir nota.

![La cabecera del socio: contacto de emergencia y marcador de salud](../../screenshots/M-06/es-1280.jpg "M-06 · /admin/crm")

## 2. Calor: mareo, náusea, golpe de calor
En sala caliente esta es la incidencia más probable y casi siempre se resuelve temprano.

1. Señales: palidez, mareo, náusea, deja de sudar, habla raro. El maestro lo ve desde el frente.
2. Sacar de la sala, sentar, no acostar de golpe; agua a sorbos, no de un trago.
3. Si no mejora en pocos minutos, o si hay confusión o vómito: es emergencia médica, punto 1.
4. La persona no vuelve a la sala esa sesión, aunque diga que ya está bien.
5. Registra siempre, incluso si se resolvió sola: nota en M-06 con categoría, hora y la clase.
   Tres notas de calor en la misma franja es un problema de sala, no de personas (`07`).

## 3. Evacuación
1. Señal: voz del maestro o de recepción. Salidas por <ruta>; punto de encuentro <lugar>.
2. Recepción sale con la lista del día (S-02 en el teléfono) y confirma que todos los registrados
   están fuera.
3. Nadie vuelve por objetos. Recepción llama a emergencias y a coordinación.

## 4. Contactos
| Contacto | Dónde está |
|---|---|
| Emergencias | <número local> |
| Coordinación | <número> |
| Owner | <número> |
| Contacto de emergencia del socio | M-06 → cabecera |
| Clínica más cercana | <nombre y dirección> |

{{tenant:contact}}

> DECISIÓN PENDIENTE: números, rutas de evacuación y clínica de referencia.

## 5. Incidentes que no son médicos
Robo, daño, conflicto entre personas, alguien que no respeta un límite, un maestro que no llega.

1. Cortar la situación; si hay riesgo, sacar a la persona del espacio.
2. Nota en M-06 con categoría, hora, quiénes estaban y qué se hizo.
3. Aviso a coordinación el mismo día; al owner si hubo daño, dinero o un tercero involucrado.
4. Nunca se publica nada, ni se comenta con otros socios.

![Todo lo que pasó, con actor y hora](../../screenshots/M-07/es-1280.jpg "M-07 · /admin/activity")

## 6. Qué queda registrado
Cada acción en HoyOS —incluida la lectura de un registro de socio— queda en **M-07 Registro de
actividad** con tu nombre. Esa es la garantía de la persona y también la tuya.

{{table:audit_log}}
