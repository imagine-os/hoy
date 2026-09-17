---
title: Biblioteca de medios y artwork
role: coordinación, admin
part: V
version: 0.6.0
updated: 2026-09-17
summary: Qué imágenes necesita el sistema, en qué formato, quién las aprueba y la checklist de lo que falta.
---

# Biblioteca de medios y artwork

Hoy el sistema tiene los espacios de las fotos, no las fotos. Este capítulo es la lista de lo que hay
que producir y las reglas para que entre bien.

## 1. Reglas de la biblioteca
1. Una imagen que se publica está **aprobada**: coordinación la revisó, el owner la aprobó si es de
   marca, y la persona que aparece firmó permiso.
2. Nombre de archivo descriptivo y en minúsculas, sin tildes ni espacios: `sala-caliente-manana-01.jpg`.
3. Formato: JPG para foto, PNG solo para logos y gráficos con transparencia, SVG para íconos.
4. Se guarda el original grande; el sistema no es el archivo de la sesión de fotos.
5. Nada de fotos con caras reconocibles de socios sin permiso escrito (`23`). Personas de espaldas,
   manos, detalle de sala: siempre seguro.

## 2. Formatos que pide el sistema
| Espacio | Proporción | Dónde se ve |
|---|---|---|
| Héroe de la portada | 16:9 | W-01 |
| Foto de clase | 16:9 | C-03 |
| Retrato de maestro | 4:3 | C-18, W-05, S-03 |
| Foto de evento | 4:5 | C-23 |
| Tour del estudio (video) | 16:9 | C-13 |
| Mapa / fachada | 16:9 | W-06 |
| Wordmark | PNG con transparencia | toda la app |

![Dónde va el retrato del maestro](../../screenshots/C-18/es-390.jpg "C-18 · /app/teachers")

![Dónde va la foto del evento](../../screenshots/C-23/es-390.jpg "C-23 · /app/events")

## 3. Checklist de artwork (lo que falta)
| # | Pieza | Para | Estado |
|---|---|---|---|
| 1 | Héroe de portada, sala con luz de mañana | W-01 | pendiente |
| 2 | Una foto por modalidad (5) | C-03, W-03 | pendiente |
| 3 | Retrato de cada maestro activo | C-18, W-05 | pendiente |
| 4 | Video corto del tour del estudio | C-13 | pendiente |
| 5 | Fachada y mapa | W-06 | pendiente |
| 6 | Detalle de sala caliente (sin personas) | `02`, redes | pendiente |
| 7 | Foto de Pausas: alguien 20 minutos, ropa de oficina | `03`, `11` | pendiente |
| 8 | Espacio vacío para el catálogo de alquiler | `12` | pendiente |
| 9 | Wordmark en las tres variantes, fondo claro y oscuro | app, sitio | listo |
| 10 | Plantilla de bono de regalo | C-17 | pendiente |

## 4. Uso del wordmark
1. Tres variantes: azul, crema y amarillo. El tema claro usa azul, el oscuro usa crema.
2. No se deforma, no se recolorea, no se pone sobre una foto con ruido detrás.
3. La variante por defecto se configura en **M-08e Marca**.

![Ajustes de marca](../../screenshots/M-08e/es-1280.jpg "M-08e · /admin/settings/branding")

> DECISIÓN PENDIENTE: quién aprueba el uso del wordmark por terceros (rodajes, pop-ups, marcas aliadas) y si el material producido en el estudio debe llevar crédito a HOY.

> DECISIÓN PENDIENTE: de quién son los derechos de las fotos y videos tomados en el estudio durante un alquiler o una sesión pagada por un tercero.

## 5. Qué está simulado hoy
1. No hay biblioteca de medios: `photo_url` es un campo de texto en M-02 y la app dibuja un marcador
   con la proporción correcta hasta que llegue la imagen.
2. El tour del estudio (C-13) es un marcador de video.
3. El mapa de contacto (W-06) es un marcador: falta proveedor de mapas y dirección definitiva.
