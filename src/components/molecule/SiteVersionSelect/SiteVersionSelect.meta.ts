import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { SiteVersionSelect } from './SiteVersionSelect';
export default defineMeta({
  tier: 'molecule', name: 'SiteVersionSelect', description: { es: 'Cambia entre la web original y Santuario; conserva la ruta.', en: 'Switches between the original site and Sanctuary; preserves the route.' },
  props: [{ name: 'value', type: "'classic' | 'sanctuary'", required: true, description: { es: 'Versión activa', en: 'Active edition' } }],
  states: ['sanctuary video', 'sanctuary still', 'classic', 'focus', 'open'],
  usages: [{ title: { es: 'Selector', en: 'Selector' }, render: () => h(SiteVersionSelect, { value: 'sanctuary', onChange: () => undefined }) }],
  a11y: [{ es: 'Selector nativo con etiqueta traducida y teclado.', en: 'Native keyboard-operable select with translated label.' }], usedBy: ['W-01','W-02','W-04','W-05','W-06','W-07','W-08','P-01'],
});
