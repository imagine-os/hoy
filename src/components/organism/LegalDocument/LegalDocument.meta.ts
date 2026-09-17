import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { LegalDocument } from './LegalDocument';

const BODY = `## 1. La regla, en una línea

Cancela **hasta 2 horas antes** del inicio de la clase y no pierdes nada.

## 2. Por qué existe la ventana

La sala tiene 15 mats. Un cupo que se libera tarde es un cupo que nadie más alcanza a tomar.`;

export default defineMeta({
  tier: 'organism', name: 'LegalDocument',
  description: {
    es: 'Un documento legal versionado (A-06): título, versión y fecha de vigencia, aviso de revisión legal, cuerpo en markdown, selector de versiones y recibo de aceptación. Mismo render en la web pública y dentro de la app.',
    en: 'One versioned legal document (A-06): title, version and effective date, counsel-review notice, markdown body, version switcher and acceptance receipt. Same render on the public site and inside the app.',
  },
  props: [
    { name: 'title', type: 'string', required: true, description: { es: 'Título ya traducido.', en: 'Title, already translated.' } },
    { name: 'summary', type: 'string', description: { es: 'Una línea bajo el título.', en: 'One line under the title.' } },
    { name: 'body', type: 'string', required: true, description: { es: 'Markdown con los {{token}} ya resueltos por resolveLegalTokens().', en: 'Markdown with every {{token}} already resolved by resolveLegalTokens().' } },
    { name: 'version', type: 'string', required: true, description: { es: 'Número de versión del documento.', en: 'The document version number.' } },
    { name: 'status', type: "'draft' | 'published'", required: true, description: { es: 'Vigente o borrador pendiente de abogado.', en: 'In force, or a draft pending counsel.' } },
    { name: 'effectiveLabel', type: 'string', required: true, description: { es: 'Fecha de vigencia ya formateada.', en: 'Effective date, already formatted.' } },
    { name: 'statusLabel', type: 'string', required: true, description: { es: 'Texto del badge de estado.', en: 'Text of the status badge.' } },
    { name: 'notice', type: 'ReactNode', description: { es: 'Aviso de revisión legal; se muestra siempre mientras ninguna versión esté revisada.', en: 'Counsel-review notice; always shown while no version is reviewed.' } },
    { name: 'versions', type: '{ id, label }[]', description: { es: 'Versiones del mismo tipo; el selector aparece solo con más de una.', en: 'Versions of the same kind; the switcher appears only with more than one.' } },
    { name: 'activeVersionId', type: 'string', description: { es: 'Versión mostrada.', en: 'The version on screen.' } },
    { name: 'onPickVersion', type: '(id) => void', description: { es: 'Cambia de versión; sin handler los chips son de lectura.', en: 'Switches version; without a handler the chips are read-only.' } },
    { name: 'accepted', type: 'ReactNode', description: { es: 'Recibo “aceptado el …” en la copia dentro de la app.', en: '“Accepted on …” receipt on the in-app copy.' } },
    { name: 'footer', type: 'ReactNode', description: { es: 'Enlaces a los documentos hermanos.', en: 'Links to the sibling documents.' } },
  ],
  states: ['published (vigente)', 'draft (borrador)', 'with version switcher', 'accepted by the member', 'print'],
  usages: [
    {
      title: { es: 'Vigente, con aceptación', en: 'In force, with acceptance' },
      render: () => h(LegalDocument, {
        title: 'Política de cancelaciones', summary: 'La ventana de cancelación, la lista de espera y los no-shows.',
        body: BODY, version: '1.0', status: 'published', effectiveLabel: 'Vigente desde el 1 de enero de 2026', statusLabel: 'Vigente',
        accepted: 'Aceptaste esta versión el 3 de febrero de 2026.',
      }),
    },
    {
      title: { es: 'Borrador con selector de versiones', en: 'Draft with a version switcher' },
      render: () => h(LegalDocument, {
        title: 'Exoneración de responsabilidad', body: BODY, version: '1.1', status: 'draft',
        effectiveLabel: 'Propuesta para el 1 de octubre de 2026', statusLabel: 'Borrador',
        notice: 'Borrador para revisión de abogado. La versión vigente es la 1.0.',
        versions: [{ id: 'a', label: 'v1.0 · vigente' }, { id: 'b', label: 'v1.1 · borrador' }], activeVersionId: 'b',
      }),
    },
  ],
  a11y: [
    { es: 'El selector de versiones es un role="tablist" con aria-selected en la versión mostrada; el estado no se comunica solo por color, el badge lo dice en palabras.', en: 'The version switcher is a role="tablist" with aria-selected on the version shown; status is never colour-only — the badge says it in words.' },
    { es: 'El cuerpo se limita a 74ch y los títulos bajan un nivel (h2) porque el h1 es el título del documento.', en: 'The body is capped at 74ch and headings start at h2 because the h1 is the document title.' },
  ],
  usedBy: ['A-06', 'W-07'],
});
