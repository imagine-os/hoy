import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ChapterCard } from './ChapterCard';

const LABELS = { minutes: 'min de lectura', figures: 'capturas', decisions: 'decisiones', placeholders: 'por capturar' };

export default defineMeta({
  tier: 'molecule', name: 'ChapterCard',
  description: {
    es: 'Un capítulo del manual de operaciones como tarjeta: número, título, resumen de una línea, chips de rol y su peso (minutos de lectura, capturas, decisiones pendientes, capturas por tomar). Todo se calcula del markdown, nada se escribe a mano.',
    en: 'One operations-manual chapter as a card: number, title, one-line summary, role chips and its weight (reading minutes, figures, pending decisions, captures still missing). Everything is derived from the markdown, nothing is typed by hand.',
  },
  props: [
    { name: 'number', type: 'string', required: true, description: { es: 'Número del capítulo (`04`).', en: 'Chapter number (`04`).' } },
    { name: 'title', type: 'string', required: true, description: { es: 'Título del front matter.', en: 'Title from the front matter.' } },
    { name: 'summary', type: 'string', description: { es: 'Resumen de una línea.', en: 'One-line summary.' } },
    { name: 'roles', type: 'string[]', description: { es: 'Roles para los que es obligatorio.', en: 'Roles it is required for.' } },
    { name: 'to', type: 'string', required: true, description: { es: 'Ruta del capítulo.', en: 'Chapter route.' } },
    { name: 'minutes / figures / decisions / placeholders', type: 'number', description: { es: 'Cifras de la fila inferior; una cifra en cero no se muestra.', en: 'Figures for the bottom row; a zero is not shown.' } },
    { name: 'labels', type: '{ minutes, figures, decisions, placeholders }', description: { es: 'Etiquetas ya traducidas; el i18n vive fuera del componente.', en: 'Already-translated labels; i18n stays outside the component.' } },
    { name: 'active', type: 'boolean', default: 'false', description: { es: 'Marca el capítulo abierto.', en: 'Marks the chapter currently open.' } },
  ],
  states: ['default', 'hover', 'focus', 'active', 'with decisions', 'without summary'],
  usages: [
    { title: { es: 'Capítulo operativo', en: 'Operational chapter' }, render: () => h(ChapterCard, { number: '04', title: 'Recepción y check-in', summary: 'La puerta: saludo, check-in, walk-ins, lista de espera y cierre de caja.', roles: ['recepción', 'coordinación'], to: '/manual/04-recepcion-y-check-in', minutes: 9, figures: 5, decisions: 2, labels: LABELS }) },
    { title: { es: 'Abierto, sin resumen', en: 'Open, no summary' }, render: () => h(ChapterCard, { number: '27', title: 'Glosario', to: '/manual/27-glosario', minutes: 3, active: true, labels: LABELS }) },
  ],
  a11y: [
    { es: 'Toda la tarjeta es un solo enlace, así que hay un único destino de tabulación por capítulo y el foco se ve con outline de 2 px.', en: 'The whole card is one link, so there is a single tab stop per chapter and focus shows as a 2 px outline.' },
    { es: 'Las cifras se acompañan de su etiqueta en texto; el color de «decisiones» no es la única señal.', en: 'Figures carry their label as text; the colour of "decisions" is never the only signal.' },
  ],
  usedBy: ['K-03'],
});
