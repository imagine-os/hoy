import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PhoneBubble } from './PhoneBubble';

export default defineMeta({
  tier: 'molecule', name: 'PhoneBubble',
  description: { es: 'Burbuja estilo WhatsApp, opcionalmente dentro de un marco de teléfono, con variables resaltadas.', en: 'WhatsApp-style bubble, optionally inside a phone frame, with highlighted variables.' },
  props: [
    { name: 'text', type: 'string', required: true, description: { es: 'Cuerpo con {{variables}}.', en: 'Body with {{variables}}.' } },
    { name: 'vars', type: 'Record<string,string>', description: { es: 'Valores de muestra que sustituyen las variables.', en: 'Sample values replacing variables.' } },
    { name: 'header', type: 'string', description: { es: 'Con valor, dibuja el marco del teléfono.', en: 'When set, draws the phone frame.' } },
    { name: 'cta', type: 'string', description: { es: 'Botón de un toque bajo la burbuja.', en: 'One-tap button under the bubble.' } },
    { name: 'undeliverable', type: 'string', description: { es: 'Motivo por el que no se entregaría.', en: 'Why it would not be delivered.' } },
  ],
  states: ['business', 'user', 'with-cta', 'unresolved-vars', 'undeliverable'],
  usages: [
    { title: { es: 'Plantilla con variables', en: 'Template with variables' }, render: () => h(PhoneBubble, { header: 'HOY · WhatsApp', text: 'Hola {{1}}, tu clase de {{2}} empieza a las {{3}}.', vars: { '1': 'Mariana' }, time: '17:30', cta: 'Ver clase' }) },
    { title: { es: 'No entregable', en: 'Undeliverable' }, render: () => h(PhoneBubble, { header: 'HOY · WhatsApp', text: 'Se liberó un cupo en {{1}}.', undeliverable: 'Plantilla pendiente de aprobación en Meta' }) },
  ],
  a11y: [{ es: 'El marco es role=img con el nombre del negocio; las variables sin resolver son <mark>.', en: 'Frame is role=img named after the business; unresolved variables are <mark>.' }],
  usedBy: ['M-05'],
});
