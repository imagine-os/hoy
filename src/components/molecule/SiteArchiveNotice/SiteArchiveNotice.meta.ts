import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { SiteArchiveNotice } from './SiteArchiveNotice';
export default defineMeta({
  tier: 'molecule', name: 'SiteArchiveNotice',
  description: { es: 'Distingue el archivo de diseño de las ofertas actuales y permite volver a Latest.', en: 'Distinguishes the design archive from current offers and returns to Latest.' },
  props: [{ name: 'onLatest', type: '() => void', required: true, description: { es: 'Abrir la versión actual', en: 'Open the current version' } }],
  states: ['archived design preview', 'responsive', 'keyboard focus'],
  usages: [{ title: { es: 'Archivo', en: 'Archive' }, render: () => h(SiteArchiveNotice, { onLatest: () => undefined }) }],
  a11y: [{ es: 'Aviso visible y botón nativo con teclado.', en: 'Visible notice and native keyboard-operable button.' }],
  usedBy: ['W-01', 'W-02', 'W-03', 'W-05', 'W-07', 'W-08', 'P-01'],
});
