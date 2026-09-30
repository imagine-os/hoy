import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MarkdownViewer } from './MarkdownViewer';

export default defineMeta({
  tier: 'organism', name: 'MarkdownViewer',
  description: {
    es: 'Renderiza markdown con estilos .prose; resuelve imágenes relativas, convierte enlaces .md internos en rutas, pinta callouts (DECISIÓN PENDIENTE, NOTA, ADVERTENCIA), tablas GFM (que react-markdown por sí solo no parsea), cajas punteadas para `[screenshot: …]`, figuras con leyenda y chip de código, y bloques de datos en vivo `{{directiva}}`.',
    en: 'Renders markdown with .prose styles; resolves relative images, turns internal .md links into app routes, styles callouts (DECISION NEEDED, NOTE, WARNING), renders GFM tables (which react-markdown alone does not parse), dashed boxes for `[screenshot: …]` placeholders, captioned code-chipped figures, and `{{directive}}` live-data blocks.',
  },
  props: [
    { name: 'source', type: 'string', required: true, description: { es: 'Markdown.', en: 'Markdown.' } },
    { name: 'path', type: 'string', description: { es: 'Ruta del documento para resolver relativos.', en: 'Document path to resolve relatives.' } },
    { name: 'resolveAsset / resolveLink', type: '(rel) => string | undefined', description: { es: 'Mapeadores.', en: 'Mappers.' } },
    { name: 'components', type: 'Components', description: { es: 'Overrides de react-markdown aplicados después de los internos.', en: 'react-markdown overrides applied after the built-in ones.' } },
    { name: 'directive', type: '(kind, arg?) => ReactNode', description: { es: 'Renderiza una línea `{{kind:arg}}` (o un bloque ```live). Sin esta prop la directiva se muestra como chip de código, así el documento sigue legible.', en: 'Renders a `{{kind:arg}}` line (or a ```live block). Without it the directive shows as a code chip, so the document stays readable.' } },
    { name: 'figure', type: '(fig) => ReactNode', description: { es: 'Renderiza una imagen con `title` como figura. Sin esta prop es un `<img>` normal.', en: 'Renders an image carrying a `title` as a figure. Without it, a plain `<img>`.' } },
    { name: 'figureGroup', type: '(figures) => ReactNode', description: { es: 'Envuelve un párrafo que solo tiene imágenes con `title` (dos o más, una por línea), p. ej. FigurePair. Sin esta prop, un bloque `.mdv-figures`.', en: 'Wraps a paragraph holding only titled images (two or more, one per line), e.g. FigurePair. Without it, a `.mdv-figures` block.' } },
    { name: 'scope', type: '(roles, content) => ReactNode', description: { es: 'Renderiza un bloque `{{for:teacher,front_desk}}` … `{{/for}}`. Sin esta prop se muestra con una etiqueta «→ teacher, front_desk»; nunca se oculta.', en: 'Renders a `{{for:teacher,front_desk}}` … `{{/for}}` block. Without it the block shows with a "→ teacher, front_desk" label; it is never hidden.' } },
    { name: 'headingIds', type: 'boolean', default: 'false', description: { es: 'Pone `id` en cada `##` para que un índice en página pueda enlazarlo.', en: 'Puts an `id` on every `##` so an in-page outline can link to it.' } },
  ],
  states: ['default', 'callout decision', 'callout note', 'callout warn', 'screen box (EN HOYOS / IN HOYOS)', 'role-scoped block {{for}}', 'GFM table', 'screenshot placeholder', 'figure (titled image)', 'figure group (images one per line)', 'live directive', 'live directive without a renderer'],
  usages: [
    { title: { es: 'Ejemplo', en: 'Example' }, render: () => (h(MarkdownViewer, { source: '# Título\n\nTexto con **negrita**, `código` y una [lista](#):\n\n- uno\n- dos\n' })) },
    { title: { es: 'Tabla GFM', en: 'GFM table' }, render: () => (h(MarkdownViewer, { source: '| Situación | Regla | Qué dices |\n|---|---|---:|\n| Cancela dentro de la ventana | crédito vuelve | "Listo, ya está de vuelta." |\n| Cancela fuera | crédito se consume | "Esta clase cuenta." |' })) },
    { title: { es: 'Callouts', en: 'Callouts' }, render: () => (h(MarkdownViewer, { source: '> DECISIÓN PENDIENTE: vigencia del Paquete de 10 (1 mes o 3 meses).\n\n> NOTE: policies are read from M-08; the screen wins.\n\n> WARNING: never run playwright install here.\n\n> Cita normal sin prefijo.' })) },
    { title: { es: 'Caja de pantalla y bloque por rol', en: 'Screen box and role-scoped block' }, render: () => (h(MarkdownViewer, { source: 'Saluda por el nombre y confirma la clase.\n\n> EN HOYOS: S-02 Puerta -> busca el nombre -> Check-in. Si no tiene plan, S-04 Caja.\n\n{{for:front_desk,coordinator}}\nSolo recepción: el cierre de caja se cuadra con finanzas antes de irte.\n{{/for}}\n\n> NOTA: las políticas se leen de M-08.' })) },
    { title: { es: 'Placeholder de captura', en: 'Screenshot placeholder' }, render: () => (h(MarkdownViewer, { source: 'Texto antes.\n\n[screenshot: S-02 — panel de puerta con búsqueda y tira del día]\n\nTexto después.' })) },
    { title: { es: 'Directiva sin renderizador', en: 'Directive with no renderer' }, render: () => (h(MarkdownViewer, { source: 'Los precios se leen del sistema:\n\n{{pricing:membresia}}\n\nY las políticas también.' })) },
  ],
  a11y: [
    { es: 'Los enlaces externos abren en pestaña nueva con rel=noreferrer. El placeholder expone role=img con la leyenda como aria-label.', en: 'External links open in a new tab with rel=noreferrer. The placeholder exposes role=img with the caption as aria-label.' },
    { es: 'Las tablas se emiten como `table`/`th`/`td` reales con la alineación de la fila de guiones, no como texto con barras.', en: 'Tables are emitted as real `table`/`th`/`td` with the alignment from the dashes row, not as pipe-separated text.' },
  ],
  usedBy: ['K-02', 'K-03', 'K-04', 'K-01', 'A-06'],
});
