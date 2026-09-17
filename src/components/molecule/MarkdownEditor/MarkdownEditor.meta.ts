import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { MarkdownEditor } from './MarkdownEditor';

const SAMPLE = '## Antes de tu primera clase\n\nLlega **10 minutos antes**. Trae tu toalla; el mat lo ponemos nosotros.\n\n- Sala caliente: hidrátate antes\n- Puedes salir en cualquier momento';

function Demo({ start, disabled }: { start: string; disabled?: boolean }) {
  const [v, setV] = useState(start);
  return h(MarkdownEditor, { value: v, onChange: setV, editLabel: 'Markdown (ES)', previewLabel: 'Vista previa', placeholder: 'Escribe en markdown…', emptyPreview: 'La vista previa aparece mientras escribes.', disabled, rows: 8 });
}

export default defineMeta({
  tier: 'molecule', name: 'MarkdownEditor',
  description: {
    es: 'Editor de markdown con vista previa en vivo al lado: el cuerpo de los artículos en M-02a. Una columna bajo 900 px; la vista previa usa el mismo react-markdown que la página del lector.',
    en: 'Markdown editor with a live preview beside it: the article body in M-02a. One column below 900 px; the preview uses the same react-markdown the reader’s page uses.',
  },
  props: [
    { name: 'value', type: 'string', required: true, description: { es: 'Markdown en edición.', en: 'The markdown being edited.' } },
    { name: 'onChange', type: '(next: string) => void', required: true, description: { es: 'Cambio de texto; el guardado vive fuera.', en: 'Text change; saving lives outside.' } },
    { name: 'editLabel', type: 'string', required: true, description: { es: 'Rótulo de la columna de edición (p. ej. el idioma).', en: 'Label of the editing column (e.g. the language).' } },
    { name: 'previewLabel', type: 'string', required: true, description: { es: 'Rótulo de la vista previa.', en: 'Label of the preview.' } },
    { name: 'placeholder', type: 'string', description: { es: 'Texto del textarea vacío.', en: 'Empty-textarea text.' } },
    { name: 'emptyPreview', type: 'string', description: { es: 'Texto cuando no hay nada escrito, para que la vista previa nunca sea una caja vacía.', en: 'Text when nothing is written, so the preview is never a blank box.' } },
    { name: 'disabled', type: 'boolean', default: 'false', description: { es: 'Solo lectura (sin content.write).', en: 'Read-only (without content.write).' } },
    { name: 'rows', type: 'number', default: '14', description: { es: 'Altura inicial del textarea.', en: 'Initial textarea height.' } },
  ],
  states: ['empty (preview explains itself)', 'typing (live preview)', 'read-only', 'stacked below 900 px'],
  usages: [
    { title: { es: 'Con contenido', en: 'With content' }, render: () => h(Demo, { start: SAMPLE }) },
    { title: { es: 'Vacío', en: 'Empty' }, render: () => h(Demo, { start: '' }) },
    { title: { es: 'Solo lectura', en: 'Read-only' }, render: () => h(Demo, { start: SAMPLE, disabled: true }) },
  ],
  a11y: [
    { es: 'El rótulo de edición es un <label> unido al textarea por id; el contador de palabras y caracteres se lee como texto, no como decoración.', en: 'The editing label is a <label> tied to the textarea by id; the word and character count reads as text, not decoration.' },
    { es: 'La vista previa no es editable ni focalizable: el foco no se pierde al escribir.', en: 'The preview is neither editable nor focusable: focus is never lost while typing.' },
  ],
  usedBy: ['M-02a'],
});
