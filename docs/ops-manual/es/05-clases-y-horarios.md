---
title: Clases y horarios
role: coordinación
part: II
version: 0.6.0
updated: 2026-09-17
summary: Construir el horario, programar maestros, cancelar una clase y publicar eventos.
---

# Clases y horarios

Tu centro es **M-02 Contenido (CMS)**: clases, maestros, horario y contenido, todo con campos ES/EN y
flujo borrador → revisión → publicado.

![El CMS: clases, maestros, modalidades y salas](../../screenshots/M-02/es-1280.jpg "M-02 · /admin/content")

## 1. Construir el horario
1. Regla fija, la misma todos los días:

{{tenant:capacity}}

2. Reparte los cuatro movimientos (Enraíza, Fluye, Arde, Libera) a lo largo del día para que la
   pregunta "¿Cómo quieres sentirte hoy?" siempre tenga respuesta. Qué es cada movimiento: capítulo `02`.
3. Crea la clase como recurrente en **M-02 → Horario** (tipo de clase, maestro, sala, hora,
   recurrencia). Aparece en C-02, S-02 y S-03 al publicar.
4. Publica siempre en español; el inglés cae al español si falta.
5. Cambios de horario con al menos 7 días de aviso; los cambios de política no afectan reservas ya hechas.

**Pasos en HoyOS:** M-02 → pestaña Horario → Nueva clase recurrente → Publicar. Verifica en C-02
Horario (vista día y semana).

![El horario semanal publicado](../../screenshots/C-02b/es-1280.jpg "C-02b · /app/schedule/week")

![El horario en el sitio público](../../screenshots/W-04/es-1280.jpg "W-04 · /site/schedule")

> DECISIÓN PENDIENTE: horas exactas de las 4 clases y días de operación (¿6 o 7 días?).

## 2. Programar maestros
1. Cada maestro tiene disponibilidad registrada en su perfil (M-02 → Maestros). Asigna sin superponer
   clases del mismo maestro.
2. Sustituciones: confirma el cambio en M-02 → Horario el mismo día en que se acuerda; el alumno ve el
   nombre correcto en C-02 y C-18.
3. Asistencia fuera de ventana: la editas tú en S-03 con razón. La ventana del maestro está en `06`.

![Los maestros como los ve el socio](../../screenshots/C-18/es-390.jpg "C-18 · /app/teachers")

## 3. Cancelar una clase del estudio
1. M-02 → Horario → ocurrencia → Cancelar (razón). El sistema devuelve los créditos, envía WhatsApp y
   correo de inmediato (ignora horas silenciosas) y propone alternativas del mismo día (E-03).
2. Avisa al owner en el grupo interno. No cuenta contra ninguna persona.

**Pasos en HoyOS:** M-02 Horario → Cancelar ocurrencia → confirmar. Revisar envío en M-05 → Registro.

![Clase cancelada: lo que ve el socio y las alternativas](../../screenshots/E-03/es-390.jpg "E-03 · /app/state/cancelled")

## 4. La clase, en la pantalla del socio
Lo que el cliente ve antes de reservar sale de M-02: nombre, descripción, maestro, intensidad,
duración y si la sala es caliente.

![Detalle de la clase](../../screenshots/C-03/es-390.jpg "C-03 · /app/class/:id")

La tabla que guarda cada sesión del horario:

{{table:class_sessions}}

## 5. Eventos y talleres
1. Se crean como eventos con precio, cupo y regla de invitados propios (C-23). Los precios de Espacio
   (talleres, sesiones privadas, foto/video, rodajes, pop-ups) son "desde" y terminan en conversación
   por WhatsApp, no en checkout: capítulo `12`.
2. Un evento no reemplaza las clases del día salvo aprobación del owner.

**Pasos en HoyOS:** M-02 → Contenido → Evento → publicar; ver C-23 Evento y RSVP.

![Evento y RSVP](../../screenshots/C-23/es-390.jpg "C-23 · /app/events")

## 6. Semana de coordinación
| Día | Tarea |
|---|---|
| Lunes | Ocupación de la semana pasada (M-01), sustituciones pendientes |
| Miércoles | Revisión de contenido en cola, CRM segmento "En riesgo" (M-06) |
| Viernes | Horario de la semana siguiente confirmado con maestros; automatizaciones sin errores en M-05 |
