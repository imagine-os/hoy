---
title: Roles y permisos
role: todos
part: VII
version: __VERSION__
updated: 2026-09-29
summary: El organigrama, qué hace cada rol (también marketing y desarrollo), qué pantallas usa, quién aprueba qué y cómo se piden accesos.
---

# Roles y permisos

Cada persona entra con su usuario y su rol. El rol decide qué ve, qué puede cambiar y qué capítulos de este
manual le aparecen primero.

{{audience:24-roles-y-permisos}}

## 1. Organigrama
```
Owner
├─ Admin
│  ├─ Coordinación
│  │  ├─ Recepción
│  │  └─ Maestros
│  ├─ Finanzas
│  ├─ Marketing
│  └─ Desarrollo
└─ Mantenimiento (en el día a día responde a coordinación)
```
Hoy una misma persona puede cubrir más de un rol. Lo que no cambia es quién aprueba qué.

> DECISIÓN PENDIENTE: los nombres de las personas en cada rol y qué recepcionista cubre cada franja del día.

## 2. Los roles en el sistema
{{roles}}

## 3. Qué hace cada rol
| Rol | Responde por | Dónde trabaja |
|---|---|---|
| Owner | la visión, los precios, las políticas, los contratos, las decisiones pendientes | Panel, Ajustes, Registro de actividad, Finanzas |
| Admin | la configuración de HoyOS, las funciones, las integraciones, los usuarios del equipo | Panel, Ajustes, Tablas |
| Coordinación | horario, maestros, reemplazos, eventos, contenido, mensajes automáticos, calidad | Contenido, Correos, WhatsApp, CRM, Bandeja, horario |
| Recepción | la puerta, el check-in, las ventas, los cobros, WhatsApp y correo en horario | Check-in, Bandeja, Registrar y cobrar, CRM |
| Finanzas | conciliación, nómina, facturación, reembolsos, reportes | Finanzas, Panel, Registro de actividad, pagos del CRM |
| Maestros | la clase, antes, durante y después; la asistencia; su perfil | la app de maestros |
| Mantenimiento | limpieza, montaje, insumos, equipos, seguridad | los checklists de [Sala](07-sala-calor-y-mantenimiento.md) |
| Marketing | contenido, redes, el kit de marca, campañas | Contenido, el sitio, [Parte V](18-web-y-redes.md) |
| Desarrollo | herramientas de desarrollo, documentación, especificaciones, integraciones | herramientas de desarrollo, Documentación, Integraciones |

**Lo que le aplica a marketing:** los capítulos de contenido ([17](17-cms-y-contenido.md)), web y redes
([18](18-web-y-redes.md)), medios y logo ([19](19-medios-y-artwork.md)) y voz y tono
([20](20-voz-y-tono.md)), más el modelo de valor ([03](03-modelo-de-valor.md)) para no anunciar nada que no
exista. El kit de marketing llega pronto al hub.

**Lo que le aplica a desarrollo:** roles ([24](24-roles-y-permisos.md)), datos ([25](25-datos-y-tablas.md)) e
integraciones ([26](26-integraciones.md)), más la documentación del software, las especificaciones de cada
pantalla y las herramientas de desarrollo.

## 4. Quién aprueba qué
| Decisión | La propone | La aprueba |
|---|---|---|
| Un precio o un plan | admin o finanzas | owner |
| Una política | coordinación | owner |
| Un reembolso en dinero | recepción o finanzas | finanzas (hasta el valor de una clase) · owner (más) |
| Devolver un crédito como cortesía | recepción | coordinación |
| Cancelar una clase del estudio | coordinación | coordinación (y avisa al owner) |
| Un reemplazo de maestro | el maestro | coordinación |
| Publicar el perfil de un maestro | el maestro | coordinación |
| Aprobar el pago de los maestros | finanzas | owner |
| Un alquiler del espacio | coordinación | owner |
| Una publicación con precios o promociones | marketing | owner |
| Un usuario nuevo o un cambio de rol | coordinación | admin |
| Encender o apagar funciones | admin | owner |

## 5. La Bandeja: quién la abre y quién escribe
| Rol | Bandeja | Conversación del socio | Escribir (WhatsApp, correo, nota) |
|---|---|---|---|
| Owner y admin | sí | sí | sí |
| Coordinación | sí | sí | sí |
| Recepción | sí | sí | sí |
| Finanzas | no | solo leer | no |
| Maestros | no | no | no; un reemplazo se pide a coordinación |
| Mantenimiento, marketing y desarrollo | no | no | no |

La campana de mensajes solo aparece a quien puede abrir la Bandeja. Si alguien abre una conversación, queda leída
para todo el equipo, y se guarda quién la abrió.

## 6. Principios
1. Todo lo que haces queda registrado con tu nombre. Trabaja siempre con tu usuario y nunca compartas la sesión.
2. Si te falta un permiso, no lo rodees: pídeselo a admin. Un permiso pedido es seguro; un usuario compartido no.
3. Un super admin puede "ver como" otro rol para probar una pantalla. Eso también queda registrado.

![Inicio por rol](../../screenshots/S-01/es-1280.jpg "S-01 · /staff")

> EN HOYOS: S-01 Inicio por rol · M-01 Panel → usuarios del equipo (admin) · selector "ver como" (super admin).

## 7. Pantallas por superficie
Las pantallas de administración y de maestros:

{{routes:admin}}

{{routes:teacher}}
