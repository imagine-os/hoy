import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { GoalPicker } from './GoalPicker';

const ES = { perWeek: 'por semana', noGoal: 'Sin meta por ahora', suggested: 'Sugerido', plus: '4+' };
const EN = { perWeek: 'per week', noGoal: 'No goal for now', suggested: 'Suggested', plus: '4+' };

function Demo({ initial, suggested, en = false, disabled = false }: { initial: number; suggested?: number; en?: boolean; disabled?: boolean }) {
  const [v, setV] = useState(initial);
  return h(GoalPicker, { value: v, onChange: setV, suggested, labels: en ? EN : ES, disabled, ariaLabel: en ? 'Your weekly goal' : 'Tu meta semanal' },
    en ? 'Only for your own tracking; you can change it any time.' : 'Solo para tu seguimiento; puedes cambiarla cuando quieras.');
}

export default defineMeta({
  tier: 'molecule', name: 'GoalPicker',
  description: {
    es: '«¿Con qué frecuencia quieres practicar?» — la meta de seguimiento (no es una pregunta de ánimo). Grupo de radio: 1 · 2 · 3 · 4+ por semana sobre la pista de SegmentedControl, más «Sin meta por ahora» como Chip. Marca la opción sugerida. Activación manual: las flechas solo mueven el foco; Espacio / Enter o un toque eligen (cada elección guarda una meta, así que recorrer las opciones no escribe nada).',
    en: '"How often do you want to practise?" — the tracking goal (not a mood question). Radiogroup: 1 · 2 · 3 · 4+ per week on the SegmentedControl track, plus "No goal for now" as a Chip. Marks the suggested option. Manual activation: arrow keys only move focus; Space / Enter or a tap select (every selection saves a goal, so browsing the options writes nothing).',
  },
  props: [
    { name: 'value', type: 'number', required: true, description: { es: 'Clases por semana; 0 = sin meta. Un valor mayor que la última opción marca «4+».', en: 'Classes per week; 0 = no goal. A value above the last option checks "4+".' } },
    { name: 'onChange', type: '(target: number) => void', required: true, description: { es: 'Recibe 0 para «sin meta».', en: 'Receives 0 for "no goal".' } },
    { name: 'suggested', type: 'number', description: { es: 'Opción marcada «Sugerido».', en: 'Option marked "Suggested".' } },
    { name: 'options', type: 'number[]', default: '[1,2,3,4]', description: { es: 'Opciones numéricas; la última se lee «N+».', en: 'Numeric options; the last reads "N+".' } },
    { name: 'labels', type: '{ perWeek, noGoal, suggested?, plus? }', required: true, description: { es: 'Textos ya traducidos por la página.', en: 'Texts already translated by the page.' } },
    { name: 'disabled', type: 'boolean', default: 'false', description: { es: 'Bloquea todas las opciones.', en: 'Locks every option.' } },
    { name: 'ariaLabel', type: 'string', description: { es: 'Nombre del grupo; por defecto «Meta semanal».', en: 'Group name; defaults to "Weekly goal".' } },
    { name: 'children', type: 'ReactNode', description: { es: 'Pista de una línea (aria-describedby).', en: 'One-line hint (aria-describedby).' } },
  ],
  states: ['no goal (0)', 'selected', 'suggested', 'value above last (4+)', 'focus', 'disabled'],
  usages: [
    { title: { es: 'Sin meta, sugerido 2', en: 'No goal, suggested 2' }, render: () => h(Demo, { initial: 0, suggested: 2 }) },
    { title: { es: 'Meta 3 (EN)', en: 'Goal 3 (EN)' }, render: () => h(Demo, { initial: 3, suggested: 2, en: true }) },
    { title: { es: 'Deshabilitado, 5 → 4+', en: 'Disabled, 5 → 4+' }, render: () => h(Demo, { initial: 5, disabled: true }) },
  ],
  a11y: [
    { es: 'role="radiogroup" con aria-label y aria-describedby a la pista; cada opción es role="radio" con aria-checked. Cada número lleva «por semana» en texto sr-only.', en: 'role="radiogroup" with aria-label and aria-describedby to the hint; each option is role="radio" with aria-checked. Each number carries "per week" as sr-only text.' },
    { es: 'Un solo tab stop (roving tabindex) con activación manual: flechas e Inicio / Fin solo mueven el foco (el tab stop las sigue y vuelve a la opción marcada al salir); Espacio / Enter o clic marcan; volver a marcar la opción activa no hace nada. Todas las opciones miden ≥ 44 px (--h-ctl).', en: 'One tab stop (roving tabindex) with manual activation: arrows and Home / End only move focus (the tab stop follows and returns to the checked option on leaving); Space / Enter or click check; re-checking the checked option is a no-op. Every option is ≥ 44 px (--h-ctl).' },
    { es: 'Lo sugerido lleva palabra y punto, no solo color. Sin hover obligatorio: táctil, lápiz y ratón hacen lo mismo con un toque.', en: 'Suggested carries a word and a dot, not colour alone. Nothing hover-only: touch, pen and mouse all work with a tap.' },
  ],
  usedBy: ['C-01', 'C-27'],
});
