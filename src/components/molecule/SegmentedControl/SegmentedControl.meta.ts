import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { SegmentedControl } from './SegmentedControl';

function Demo() {
  const [v, setV] = useState<'today' | 'week'>('today');
  const [c, setC] = useState<'month' | 'year'>('month');
  return h('div', { className: 'stack-sm' },
    h(SegmentedControl, { ariaLabel: 'Vista', value: v, onChange: (x: string) => setV(x as 'today' | 'week'), options: [{ value: 'today', label: 'Hoy' }, { value: 'week', label: 'Semana' }] }),
    h(SegmentedControl, { ariaLabel: 'Ciclo', size: 'sm', block: true, value: c, onChange: (x: string) => setC(x as 'month' | 'year'), options: [{ value: 'month', label: 'Mensual' }, { value: 'year', label: 'Anual', count: 2 }] }),
  );
}

export default defineMeta({
  tier: 'molecule', name: 'SegmentedControl',
  description: { es: 'Conmutador de 2 a 4 vías (Hoy / Semana, Clases / Pagos, Mensual / Anual). Píldora sobre pista.', en: 'Two-to-four way switch (Today / Week, Classes / Payments, Monthly / Yearly). Pill on a track.' },
  props: [
    { name: 'options', type: '{ value, label, count? }[]', required: true, description: { es: 'Opciones en orden.', en: 'Options in order.' } },
    { name: 'value / onChange', type: 'T / (v: T) => void', required: true, description: { es: 'Controlado.', en: 'Controlled.' } },
    { name: 'size', type: "'sm' | 'md'", default: 'md', description: { es: 'Altura 30 / 38.', en: 'Height 30 / 38.' } },
    { name: 'block', type: 'boolean', default: 'false', description: { es: 'Ancho completo, opciones iguales.', en: 'Full width, equal options.' } },
  ],
  states: ['default', 'active', 'hover', 'with count'],
  usages: [{ title: { es: 'Vista y ciclo', en: 'View and cycle' }, render: () => h(Demo) }],
  a11y: [{ es: 'role=tablist con aria-selected por opción; navegable con teclado como botones.', en: 'role=tablist with aria-selected per option; keyboard-reachable as buttons.' }],
  usedBy: ['C-02', 'C-06', 'C-11', 'C-18', 'MessageComposer'],
});
