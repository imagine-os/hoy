import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { ShareLink } from './ShareLink';

const labels = { link: 'Enlace del pase / Pass link', copy: 'Copiar / Copy', copied: 'Enlace copiado / Link copied', failed: 'No se pudo copiar: selecciona el enlace / Could not copy: select the link' };

export default defineMeta({
  tier: 'molecule', name: 'ShareLink',
  description: { es: 'Un enlace para compartir con su botón Copiar; si el navegador no deja copiar, lo dice y el enlace queda seleccionable.', en: 'A link to share with its Copy button; if the browser refuses the copy, it says so and the link stays selectable.' },
  props: [
    { name: 'url', type: 'string', required: true, description: { es: 'El enlace completo.', en: 'The full link.' } },
    { name: 'labels', type: '{ link, copy, copied, failed }', required: true, description: { es: 'Textos en el idioma de la página.', en: 'Copy in the page language.' } },
    { name: 'disabled', type: 'boolean', description: { es: 'Sin botón activo.', en: 'Button disabled.' } },
  ],
  states: ['default', 'copied', 'copy failed', 'disabled'],
  usages: [
    { title: { es: 'Antes del primer uso', en: 'Before first use' }, render: () => h(ShareLink, { url: 'https://hoy.example.test/#/app/pass/ABCD2345', labels }) },
    { title: { es: 'Con la clase', en: 'With the class' }, render: () => h(ShareLink, { url: 'https://hoy.example.test/#/app/pass/ABCD2345?c=occ_demo', labels }) },
    { title: { es: 'Deshabilitado', en: 'Disabled' }, render: () => h(ShareLink, { url: 'https://hoy.example.test/#/app/pass/ABCD2345', labels, disabled: true }) },
  ],
  a11y: [{ es: 'Campo de solo lectura con etiqueta; el resultado de copiar se anuncia (role=status).', en: 'Labelled read-only field; the copy result is announced (role=status).' }],
  usedBy: ['C-43', 'C-44'],
});
