---
title: Roles y organigrama
role: todos
version: 0.1
updated: 2026-09-17
---

# Roles y organigrama

## 1. Organigrama
```
Owner
├─ Admin (super admin en HoyOS)
│  ├─ Coordinación
│  │  ├─ Recepción / front desk
│  │  └─ Profesores
│  └─ Finanzas
└─ Mantenimiento (reporta a coordinación en el día a día)
```
Hoy varias personas pueden cubrir más de un rol. Lo que no cambia es quién aprueba qué.

## 2. Responsabilidades y pantallas
| Rol | Responsable de | Pantallas principales |
|---|---|---|
| Owner | Visión, precios, políticas, contratos, decisiones marcadas como pendientes | M-01, M-08, M-07 |
| Admin | Configuración de HoyOS, switches de features, integraciones, usuarios del equipo | M-01, M-08, M-03 |
| Coordinación | Horario, profesores, sustituciones, eventos, contenido, automatizaciones, calidad del servicio | M-02, M-04, M-05, M-06, C-02 |
| Recepción | Puerta, check-in, ventas en mostrador, cobros, atención WhatsApp en horario | S-02, S-04, M-06 |
| Finanzas | Conciliación, nómina, facturación electrónica, reembolsos, reportes | M-01, M-07, M-06 (pestaña Pagos) |
| Profesores | La clase: antes, durante, después; asistencia; su perfil | S-03 |
| Mantenimiento | Limpieza, montaje de sala, insumos, equipos, seguridad física | Checklists en papel o `07` |

## 3. Quién aprueba qué
| Decisión | Propone | Aprueba | Dónde queda |
|---|---|---|---|
| Cambio de precio o plan | Admin / finanzas | Owner | M-02 Precios · M-07 |
| Cambio de política (cancelación, reclamo, tolerancia, cargo) | Coordinación | Owner | M-08 |
| Reembolso en dinero | Recepción / finanzas | Finanzas (≤ 1 clase) · Owner (mayor) | M-06 Pagos · M-07 |
| Devolver un crédito por cortesía | Recepción | Coordinación | M-06 nota + M-07 |
| Cancelar una clase del estudio | Coordinación | Coordinación (avisa a owner) | M-02 Horario · E-03 |
| Sustitución de profesor | Profesor | Coordinación | M-02 Horario |
| Publicar descripción o perfil de profesor | Profesor (S-03) | Coordinación | M-02 flujo de revisión |
| Nuevo usuario de equipo o cambio de rol | Coordinación | Admin | M-01 |
| Apagar/encender features | Admin | Owner | M-01 |

## 4. Traspasos (handoffs)
1. Recepción → Coordinación: incidentes, quejas, solicitudes de pausa fuera de regla, no-shows repetidos. Se deja **nota en M-06** con categoría y se avisa por el grupo interno.
2. Recepción → Finanzas: cierre de caja diario, pagos pendientes (transferencias sin confirmar), solicitudes de reembolso.
3. Profesores → Coordinación: asistencia fuera de la ventana (después de T+2h), sustituciones, lesiones observadas.
4. Coordinación → Owner: decisiones pendientes, cambios de política, resultados semanales.
5. Cualquiera → Admin: acceso, permisos, algo que HoyOS no deja hacer.

## 5. Principios
1. Cada acción en HoyOS queda en **M-07 Registro de actividad** con tu nombre. Trabaja siempre con tu propio usuario; nunca compartas la sesión.
2. Recepción ve la cronología del socio pero no edita pagos; finanzas ve pagos pero no notas de salud. Si te falta un permiso, no lo rodees: pide a admin.

> DECISIÓN PENDIENTE: nombres de las personas que ocupan cada rol y horario de cobertura de recepción por franja.
