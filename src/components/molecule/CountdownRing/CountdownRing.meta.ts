import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { CountdownRing } from './CountdownRing';

const inMin = (n: number) => new Date(Date.now() + n * 60e3).toISOString();
const agoMin = (n: number) => new Date(Date.now() - n * 60e3).toISOString();

export default defineMeta({
  tier: 'molecule', name: 'CountdownRing',
  description: { es: 'Cuenta regresiva circular: la clase empieza en…, ventana de reclamo, retención de pago, bloqueo. El anillo se vacía con el tiempo.', en: 'Circular countdown: class starts in…, claim window, payment hold, lockout. The ring drains as time passes.' },
  props: [
    { name: 'until', type: 'ISO string', required: true, description: { es: 'Momento en que llega a cero.', en: 'When it reaches zero.' } },
    { name: 'from', type: 'ISO string', description: { es: 'Inicio para calcular el llenado; por defecto, el montaje.', en: 'Start for the fill; defaults to mount time.' } },
    { name: 'tone', type: "'primary' | 'warn' | 'danger' | 'success'", default: 'primary', description: { es: 'Color del anillo.', en: 'Ring colour.' } },
    { name: 'onDone', type: '() => void', description: { es: 'Se dispara una vez al llegar a cero.', en: 'Fires once at zero.' } },
  ],
  states: ['running', 'under a minute', 'done'],
  usages: [{ title: { es: 'Tres usos', en: 'Three uses' }, render: () => h('div', { className: 'row wrap' },
    h(CountdownRing, { until: inMin(192), label: 'empieza en', size: 150 }),
    h(CountdownRing, { until: inMin(28), from: agoMin(2), tone: 'warn', label: 'para reclamar', size: 120 }),
    h(CountdownRing, { until: inMin(9), from: agoMin(1), tone: 'danger', label: 'cupo retenido', size: 100 }),
  ) }],
  a11y: [{ es: 'role=timer con aria-label legible; aria-live off para no leer cada segundo.', en: 'role=timer with a readable aria-label; aria-live off so it does not read every second.' }],
  usedBy: ['C-08', 'C-20', 'E-02', 'E-04', 'C-21'],
});
