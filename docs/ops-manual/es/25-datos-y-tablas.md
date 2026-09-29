---
title: Datos y tablas
role: admin, owner, desarrollo
part: VII
version: 0.13.1
updated: 2026-09-29
summary: Para qué sirve conocer los datos, el modelo completo, cómo se lee quién puede ver cada tabla y las reglas para tocar datos.
---

# Datos y tablas

Dónde vive lo que el estudio sabe y quién puede verlo.

{{audience:25-datos-y-tablas}}

## Para qué te sirve esto
Todo lo que el estudio sabe —socios, reservas, pagos, mensajes— está guardado en tablas. Casi nunca las vas a
tocar: para eso están las pantallas. Este capítulo sirve para tres cosas:

1. Saber **dónde está** un dato cuando una pantalla no lo muestra.
2. Entender **quién puede verlo** y quién puede cambiarlo.
3. Saber **qué no hacer**: arreglar a mano en una tabla algo que tiene su pantalla.

Si eres de recepción, maestros o mantenimiento, con la sección 4 te basta.

## 1. El modelo completo
Cada tabla tiene un identificador, el estudio al que pertenece y las fechas de creación y de último cambio. Así
está preparada para varios estudios y para cuando se conecte la base de datos real.

{{tables}}

![El administrador de tablas](../../screenshots/M-03/es-1280.jpg "M-03 · /admin/tables")

> EN HOYOS: M-03 Tablas → elegir tabla → ver columnas, filas y contrato de acceso.

## 2. Cómo se lee una tabla
Cada tabla dice **quién puede leerla y quién puede escribir en ella**. Esa regla es la que protegerá los datos
en la base real, así que no es solo documentación: es la seguridad.

Por ejemplo, las reservas:

{{table:bookings}}

## 3. Las que más se consultan
### Reservas y lista de espera
{{table:waitlist}}

### Membresías
{{table:memberships}}

### Mensajes
{{table:message_log}}

## 4. Reglas para tocar datos
1. Si algo tiene pantalla, se hace en la pantalla. La pantalla deja registro de quién lo hizo; la tabla sola, no.
2. Tablas es una herramienta para admin y desarrollo. Aun así, cada cambio ahí queda en el registro de actividad.
3. Nunca saques una lista de personas del sistema sin permiso del owner (ver [Datos personales](23-habeas-data.md)).
4. El dinero se guarda en pesos, sin decimales. Las horas se guardan en hora universal y se muestran en la hora
   del estudio.

## 5. El estudio ahora mismo
{{stats}}

## 6. Todas las pantallas
Las pantallas de la app del socio y de la documentación:

{{routes:customer}}

{{routes:docs}}
