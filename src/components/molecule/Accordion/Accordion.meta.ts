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
    { name: 'variant', type: "'card' | 'editorial'", default: "'card'", description: { es: 'card: lista en caja de la app; editorial: lista abierta del sitio (W-10) con preguntas en serif.', en: 'card: the app’s boxed list; editorial: the website’s open list (W-10) with serif questions.' } },
  ],
  states: ['collapsed', 'one expanded', 'hover', 'editorial', 'editorial · open'],
  usages: [{ title: { es: 'Sección de FAQ', en: 'FAQ section' }, render: () => h(Accordion, { defaultOpen: ['q1'], items: [
    { id: 'q1', question: '¿Necesito experiencia previa?', answer: 'No. Todas las clases son para todos los niveles; el profesor adapta la práctica.' },
    { id: 'q2', question: '¿Qué debo llevar?', answer: 'Nosotros ponemos el mat y todos los implementos. Si quieres, trae una toalla pequeña y un termo.' },
    { id: 'q3', question: '¿Puedo cancelar mi reserva?', answer: 'Sí. Puedes cancelar hasta 12 horas antes de la clase.' },
  ] }) },
  { title: { es: 'Editorial (sitio web)', en: 'Editorial (website)' }, render: () => h(Accordion, { variant: 'editorial', defaultOpen: ['e2'], items: [
    { id: 'e1', question: '¿Con cuánta anticipación puedo reservar?', answer: 'No hay un tiempo mínimo, siempre que haya cupos disponibles.' },
    { id: 'e2', question: '¿Cómo hago el check-in?', answer: 'En recepción, cuando llegas.' },
  ] }) }],
  a11y: [{ es: 'Botón con aria-expanded y aria-controls hacia el panel; el panel solo existe abierto.', en: 'Button with aria-expanded and aria-controls to the panel; the panel exists only when open.' }],
  usedBy: ['C-14 / C-15', 'C-13', 'W-10'],
});
