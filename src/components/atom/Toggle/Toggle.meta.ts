import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Toggle } from './Toggle';

export default defineMeta({
  tier: 'atom', name: 'Toggle',
  description: { es: 'Interruptor on/off con etiqueta opcional. Para feature flags, tema, modo dev.', en: 'On/off switch with optional label. For feature flags, theme, dev mode.' },
  props: [
    { name: 'checked', type: 'boolean', required: true, description: { es: 'Estado.', en: 'State.' } },
    { name: 'onChange', type: '(next: boolean) => void', required: true, description: { es: 'Callback.', en: 'Callback.' } },
    { name: 'label', type: 'string', description: { es: 'Texto a la derecha.', en: 'Trailing text.' } },
    { name: 'size', type: "'sm' | 'md'", default: 'md', description: { es: 'Tamaño.', en: 'Size.' } },
  ],
  states: ['off', 'on', 'focus', 'disabled'],
  usages: [
    { title: { es: 'Estados', en: 'States' }, render: () => h('div', { className: 'row wrap' }, h(Toggle, { checked: false, onChange: () => {}, label: 'Apagado' }), h(Toggle, { checked: true, onChange: () => {}, label: 'Encendido' }), h(Toggle, { checked: true, onChange: () => {}, label: 'Deshabilitado', disabled: true }), h(Toggle, { checked: true, onChange: () => {}, size: 'sm', label: 'Pequeño' })) },
  ],
  a11y: [{ es: 'Checkbox nativo con role="switch"; la etiqueta envuelve el control.', en: 'Native checkbox with role="switch"; label wraps the control.' }],
  usedBy: ['HUB', 'M-01', 'D-01'],
});
