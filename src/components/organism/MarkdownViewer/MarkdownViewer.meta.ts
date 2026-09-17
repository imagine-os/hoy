import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MarkdownViewer } from './MarkdownViewer';

export default defineMeta({
  tier: 'organism', name: 'MarkdownViewer',
  description: { es: 'Renderiza markdown con estilos .prose; resuelve imágenes relativas, convierte enlaces .md internos en rutas, pinta callouts (DECISIÓN PENDIENTE, NOTA, ADVERTENCIA) y cajas punteadas para `[screenshot: …]`.', en: 'Renders markdown with .prose styles; resolves relative images, turns internal .md links into app routes, styles callouts (DECISION NEEDED, NOTE, WARNING) and dashed boxes for `[screenshot: …]` placeholders.' },
  props: [
    { name: 'source', type: 'string', required: true, description: { es: 'Markdown.', en: 'Markdown.' } },
    { name: 'path', type: 'string', description: { es: 'Ruta del documento para resolver relativos.', en: 'Document path to resolve relatives.' } },
    { name: 'resolveAsset / resolveLink', type: '(rel) => string | undefined', description: { es: 'Mapeadores.', en: 'Mappers.' } },
    { name: 'components', type: 'Components', description: { es: 'Overrides de react-markdown aplicados después de los internos.', en: 'react-markdown overrides applied after the built-in ones.' } },
  ],
  states: ['default', 'callout decision', 'callout note', 'callout warn', 'screenshot placeholder'],
  usages: [
    { title: { es: 'Ejemplo', en: 'Example' }, render: () => (h(MarkdownViewer, { source: '# Título\n\nTexto con **negrita**, `código` y una [lista](#):\n\n- uno\n- dos\n\n| Col | Val |\n| --- | --- |\n| a | 1 |' })) },
    { title: { es: 'Callouts', en: 'Callouts' }, render: () => (h(MarkdownViewer, { source: '> DECISIÓN PENDIENTE: vigencia del Paquete de 10 (1 mes o 3 meses).\n\n> NOTE: policies are read from M-08; the screen wins.\n\n> WARNING: never run playwright install here.\n\n> Cita normal sin prefijo.' })) },
    { title: { es: 'Placeholder de captura', en: 'Screenshot placeholder' }, render: () => (h(MarkdownViewer, { source: 'Texto antes.\n\n[screenshot: S-02 — panel de puerta con búsqueda y tira del día]\n\nTexto después.' })) },
  ],
  a11y: [{ es: 'Los enlaces externos abren en pestaña nueva con rel=noreferrer. El placeholder expone role=img con la leyenda como aria-label.', en: 'External links open in a new tab with rel=noreferrer. The placeholder exposes role=img with the caption as aria-label.' }],
  usedBy: ['K-02', 'K-03', 'K-04', 'K-01', 'A-06'],
});
