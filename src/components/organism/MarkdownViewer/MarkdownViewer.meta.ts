import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MarkdownViewer } from './MarkdownViewer';

export default defineMeta({
  tier: 'organism', name: 'MarkdownViewer',
  description: { es: 'Renderiza markdown con estilos .prose; resuelve imágenes relativas y convierte enlaces .md internos en rutas de la app.', en: 'Renders markdown with .prose styles; resolves relative images and turns internal .md links into app routes.' },
  props: [
    { name: 'source', type: 'string', required: true, description: { es: 'Markdown.', en: 'Markdown.' } },
    { name: 'path', type: 'string', description: { es: 'Ruta del documento para resolver relativos.', en: 'Document path to resolve relatives.' } },
    { name: 'resolveAsset / resolveLink', type: '(rel) => string | undefined', description: { es: 'Mapeadores.', en: 'Mappers.' } },
  ],
  states: ['default'],
  usages: [{ title: { es: 'Ejemplo', en: 'Example' }, render: () => (h(MarkdownViewer, { source: '# Título\n\nTexto con **negrita**, `código` y una [lista](#):\n\n- uno\n- dos\n\n| Col | Val |\n| --- | --- |\n| a | 1 |' })) }],
  a11y: [{ es: 'Los enlaces externos abren en pestaña nueva con rel=noreferrer.', en: 'External links open in a new tab with rel=noreferrer.' }],
  usedBy: ['DOCS', 'K-01', 'MANUAL', 'A-06'],
});
