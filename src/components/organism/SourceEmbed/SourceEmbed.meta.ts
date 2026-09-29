import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { SourceEmbed, type SourceDocView } from './SourceEmbed';

const COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#35597D"/><text x="320" y="190" font-size="56" text-anchor="middle" fill="#F7F3B2" font-family="sans-serif">hoy</text></svg>');
const DOC: SourceDocView = {
  id: 'demo', kind: 'deck', pages: 8, date: '2026-09-29', fileUrl: 'about:blank', coverUrl: COVER,
  title: { es: 'Modelo de valor (sin precios)', en: 'Value model (no prices)' },
  summary: { es: 'Las seis líneas de ingreso de HOY y la disciplina detrás: 16 tapetes por sesión y una clase diaria por persona.', en: 'HOY’s six revenue lines and the discipline behind them: 16 mats per session and one class per person per day.' },
};

export default defineMeta({
  tier: 'organism', name: 'SourceEmbed',
  description: {
    es: 'Un documento fuente del owner (deck del modelo de valor, textos del sitio, manual de marca) como tarjeta embebida: tipo, título, páginas y fecha, resumen, y un visor PDF en línea que carga solo cuando se pide (la primera página lo reemplaza mientras), con pantalla completa, descarga y abrir en otra pestaña. En el manual se escribe `{{source:<id>}}`; K-05 lista los tres.',
    en: 'An owner source document (value-model deck, website copy, brand manual) as an embed card: kind, title, pages and date, summary, and an inline PDF viewer that loads only when asked (the first page stands in until then), with fullscreen, download and open-in-a-tab. In the manual it is written `{{source:<id>}}`; K-05 lists all three.',
  },
  props: [
    { name: 'doc', type: 'SourceDocView', required: true, description: { es: 'id, title{es,en}, kind, pages, date, summary{es,en}, fileUrl, coverUrl?', en: 'id, title{es,en}, kind, pages, date, summary{es,en}, fileUrl, coverUrl?' } },
    { name: 'children', type: 'ReactNode', description: { es: 'Enlaces bajo la tarjeta (los capítulos que lo citan).', en: 'Links under the card (the chapters that cite it).' } },
    { name: 'open', type: 'boolean', default: 'false', description: { es: 'Abre el visor de una vez en lugar de la portada.', en: 'Opens the viewer at once instead of the cover.' } },
    { name: 'level', type: '2 | 3 | 4', default: '3', description: { es: 'Nivel del título.', en: 'Heading level of the title.' } },
  ],
  states: ['cover (viewer not loaded)', 'viewer open (iframe)', 'fullscreen', 'no cover image', 'print (card only)'],
  usages: [
    { title: { es: 'Portada', en: 'Cover' }, render: () => h(SourceEmbed, { doc: DOC }) },
    { title: { es: 'Sin portada', en: 'No cover' }, render: () => h(SourceEmbed, { doc: { ...DOC, coverUrl: undefined, kind: 'brand-manual' } }) },
  ],
  a11y: [
    { es: 'La tarjeta es una región con el título como nombre; la portada es un botón «Ver aquí» y el iframe lleva title. Pantalla completa, descarga y nueva pestaña son controles de 44 px con texto.', en: 'The card is a region named by its title; the cover is a "View here" button and the iframe has a title. Fullscreen, download and new tab are 44 px text controls.' },
    { es: 'Un navegador sin visor PDF (iOS) siempre tiene «Abrir en otra pestaña» y «Descargar».', en: 'A browser with no PDF viewer (iOS) always has "Open in a new tab" and "Download".' },
  ],
  usedBy: ['K-03', 'K-05'],
});
