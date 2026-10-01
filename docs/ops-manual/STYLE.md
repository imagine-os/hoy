# Guía de estilo del manual de operaciones

Esta guía es para quien edita el manual, a mano o pidiéndoselo a un asistente. Sigue estas reglas y el
manual sonará igual en todos los capítulos, aunque lo escriban diez personas distintas.

## 1. Para quién escribimos
Para una persona del equipo en su primer día: recepción, un maestro, mantenimiento, coordinación,
finanzas, marketing o desarrollo. No sabe cómo está hecho el software y no le hace falta.

## 2. El registro
1. **Tú**, siempre. "Busca a la persona", no "se busca a la persona".
2. **Frases cortas.** Una idea por frase y una idea por párrafo.
3. **Primero la acción.** Cada procedimiento sigue el orden **qué hacer → qué decir → qué revisar**.
4. **Los pasos van numerados.** Si el orden importa, es una lista con números.
5. **Palabras de la puerta.** Escribe como habla una recepcionista o un maestro: "reserva", "clase",
   "paquete", "lista de espera". Nunca "crédito" (HOY no tiene créditos), "entitlement", "order", "flag", "registro de la tabla".
6. **Lo que se dice en voz alta va entre comillas**, completo, listo para leerlo tal cual.
7. **Sin culpas y sin promesas.** Explica la regla y lo que la persona sí puede hacer.

## 3. Lo que no va en el texto
1. **Códigos de pantalla** (S-02, M-08…) y rutas (`/staff/checkin`). En el texto se dice el nombre de
   la pantalla como aparece en el menú: "Check-in", "Registrar y cobrar", "la Bandeja", "la ficha del socio", "Ajustes".
2. **Nombres de tablas, archivos o carpetas** (`bookings`, `src/…`, `pricing.ts`).
3. **Frases de ingeniería** como "el sistema lee de…", "la costura", "idempotente", "RLS".
4. Referencias internas como K-01 o D-01.

Los capítulos 25 (datos) y 26 (integraciones) pueden ser más técnicos, pero abren con
"Para qué te sirve esto" en lenguaje llano.

## 4. Dónde van las pantallas: el recuadro En HoyOS
Al final de una sección, como máximo uno por sección, un recuadro dice en qué pantalla se hace y en qué
orden. Ahí sí van los códigos:

```
> EN HOYOS: S-02 Check-in → selector de clase → Buscar socio → Registrado.
```

En el espejo en inglés se escribe `> IN HOYOS:`.

## 5. Los bloques en vivo
Los números que el sistema ya sabe no se escriben a mano. Se escribe el bloque, solo en su línea, y
antes una frase sencilla que diga qué es:

```
Esta es la ventana de cancelación vigente:

{{policy:cancellation_window_hours}}
```

| Bloque | Muestra |
|---|---|
| `{{pricing}}`, `{{pricing:<familia>}}` | los precios vigentes |
| `{{tenant:hours}}`, `{{tenant:contact}}`, `{{tenant:capacity}}` | horario, contacto y capacidad del estudio |
| `{{policy}}`, `{{policy:<campo>}}` | las políticas de Ajustes |
| `{{roles}}`, `{{routes:<superficie>}}`, `{{tables}}`, `{{table:<tabla>}}`, `{{stats}}`, `{{kpi:<nombre>}}` | datos del sistema |
| `{{audience}}`, `{{audience:<capítulo>}}` | quién lee qué / la fila "Para:" de un capítulo |
| `{{training:<rol>}}` | el checklist de entrenamiento de un rol |
| `{{studio:<clave>}}` | una regla del estudio que el owner o coordinación ajusta (ver la sección 6) |
| `{{source:modelo-de-valor}}`, `{{source:contenido-completo}}`, `{{source:manual-de-marca}}` | el documento fuente, incrustado |

## 6. Lo que el estudio ajusta
1. Una sección cuya regla la adapta el estudio (saludo, objetos perdidos, apertura, invitados, términos de
   alquiler, calendario de redes, reglas de la casa, checklists, ejemplos de tono) lleva, en su propia línea
   justo debajo del título `##`, `{{editable:owner}}` o `{{editable:coordinator}}`.
2. No marques como editable una sección que solo muestra valores de Ajustes: esos se cambian en Ajustes.
   Quién edita en la app (desde 0050, `canEditSection`): **admin y super admin editan cualquier sección `##`**, esté
   marcada o no; **coordinación** solo las marcadas `{{editable:coordinator}}`; el resto del equipo usa "Pedir un
   cambio" al final del capítulo (llega a K-04) o un agente propone con `manual.suggestEdit`. La marca sirve para dos
   cosas: la etiqueta "Ajustable por…" que ve todo el equipo y el permiso de coordinación; `{{editable:owner}}` ya no
   cambia quién edita (admin edita todo), pero sigue diciendo que esa regla es del estudio.
3. Un valor que el estudio decide (días, minutos, una frase) no se escribe a mano: va en su propia línea como
   `{{studio:<clave>}}`, con una frase antes que diga qué es ("Cuánto tiempo los guardamos:"). Se ve como una
   tarjeta con su título, y quien tiene permiso la edita ahí mismo. La clave vive en la lista de reglas del
   estudio (`src/data/seed/studioPolicies.ts`: clave, título, valor en español e inglés, capítulo y quién la
   edita). En el texto de alrededor se escribe "ver abajo", nunca el número.

## 7. Partes para un rol
Cuando una parte de la sección solo la hace uno o dos roles, se envuelve así (con moderación):

```
{{for:teacher,front_desk}}
…
{{/for}}
```

Roles: `super_admin admin coordinator front_desk finance teacher maintenance marketing developer`.

## 8. Decisiones pendientes
Lo que el estudio aún no decidió va en una línea: `> DECISIÓN PENDIENTE: …` (inglés: `> DECISION NEEDED: …`).
Una decisión se marca **una sola vez**, en el capítulo que la "posee". Cuando se decide, se borra la marca y la
respuesta se escribe en el texto.

## 9. Imágenes
Una captura real lleva título: `![leyenda](../../screenshots/S-02/es-1280.jpg "S-02 · /staff/checkin")`.
La leyenda dice qué se ve, en palabras llanas. Más adelante vendrán fotos y videos cortos de guía; siguen la
misma regla.

## 10. Antes de guardar
- [ ] ¿Lo entiende alguien en su primer día?
- [ ] ¿Cada procedimiento dice qué hacer, qué decir y qué revisar?
- [ ] ¿Quedó algún código, ruta o nombre de tabla en el texto? Muévelo al recuadro En HoyOS.
- [ ] ¿Hay un número escrito a mano que el sistema ya sabe? Cámbialo por su bloque.
- [ ] ¿Existe el mismo cambio en el espejo en inglés?
