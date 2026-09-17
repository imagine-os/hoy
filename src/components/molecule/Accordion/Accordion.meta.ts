import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { Accordion } from './Accordion';

export default defineMeta({
  tier: 'molecule', name: 'Accordion',
  description: { es: 'Lista de preguntas plegadas por defecto; con `single`, abrir una cierra las demás (regla de las FAQ).', en: 'Question list collapsed by default; with `single`, opening one closes the others (FAQ rule).' },
  props: [
    { name: 'items', type: '{ id, question, answer }[]', required: true, description: { es: 'Preguntas en orden.', en: 'Questions in order.' } },
    { name: 'single', type: 'boolean', default: 'true', description: { es: 'Una abierta a la vez.', en: 'One open at a time.' } },
    { name: 'defaultOpen', type: 'string[]', description: { es: 'Ids abiertos al montar.', en: 'Ids open on mount.' } },
  ],
  states: ['collapsed', 'one expanded', 'hover'],
  usages: [{ title: { es: 'Sección de FAQ', en: 'FAQ section' }, render: () => h(Accordion, { defaultOpen: ['q1'], items: [
    { id: 'q1', question: '¿Necesito experiencia previa?', answer: 'No. Todas las clases son para todos los niveles; el profesor adapta la práctica.' },
    { id: 'q2', question: '¿Qué llevo a la sala caliente?', answer: 'Mat, toalla y agua. Llega 10 minutos antes.' },
    { id: 'q3', question: '¿Puedo cancelar?', answer: 'Sí, hasta 2 horas antes sin costo.' },
  ] }) }],
  a11y: [{ es: 'Botón con aria-expanded y aria-controls hacia el panel; el panel solo existe abierto.', en: 'Button with aria-expanded and aria-controls to the panel; the panel exists only when open.' }],
  usedBy: ['C-14 / C-15', 'C-13'],
});
