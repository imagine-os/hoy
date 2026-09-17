import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { OtpInput } from './OtpInput';

function Demo() { const [v, setV] = useState('41'); const [bad, setBad] = useState('123456'); return h('div', { className: 'stack' }, h(OtpInput, { value: v, onChange: setV, label: 'Código' }), h(OtpInput, { value: bad, onChange: setBad, label: 'Código incorrecto', invalid: true })); }

export default defineMeta({
  tier: 'molecule', name: 'OtpInput',
  description: { es: 'Seis celdas de un dígito que se comportan como un solo campo: escribir avanza, borrar retrocede, pegar rellena.', en: 'Six single-digit cells that behave as one field: typing advances, backspace retreats, paste fills.' },
  props: [
    { name: 'value / onChange', type: 'string / (v) => void', required: true, description: { es: 'Controlado; solo dígitos.', en: 'Controlled; digits only.' } },
    { name: 'length', type: 'number', default: '6', description: { es: 'Celdas.', en: 'Cells.' } },
    { name: 'invalid', type: 'boolean', default: 'false', description: { es: 'Borde rojo y sacudida.', en: 'Red border and shake.' } },
    { name: 'onComplete', type: '(code) => void', description: { es: 'Al llenar la última celda.', en: 'When the last cell is filled.' } },
  ],
  states: ['empty', 'partial', 'complete', 'invalid (shake)', 'disabled'],
  usages: [{ title: { es: 'Normal e inválido', en: 'Normal and invalid' }, render: () => h(Demo) }],
  a11y: [{ es: 'role=group con etiqueta; cada celda tiene aria-label "n/6", inputmode numérico y aria-invalid.', en: 'role=group with a label; each cell has aria-label "n/6", numeric inputmode and aria-invalid.' }],
  usedBy: ['C-21'],
});
