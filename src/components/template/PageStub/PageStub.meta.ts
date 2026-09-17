import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PageStub } from './PageStub';
import { canvasSpecs } from '../../../specs/canvasSpecs';

export default defineMeta({
  tier: 'template', name: 'PageStub',
  description: { es: 'Página “próximamente” para un código del canvas: muestra nombre, propósito y layout previsto. Úsala mientras la pantalla real no exista.', en: '“Coming soon” page for a canvas code: shows name, purpose and planned layout. Use it until the real screen exists.' },
  props: [{ name: 'spec', type: 'PageSpec', required: true, description: { es: 'La spec a mostrar.', en: 'The spec to show.' } }],
  states: ['default', 'dev-mode (spec button)'],
  usages: [{ title: { es: 'C-20', en: 'C-20' }, render: () => h(PageStub, { spec: canvasSpecs['C-20'] }) }],
  a11y: [{ es: 'Título en h1; el código va en <code>.', en: 'h1 title; code in <code>.' }],
  usedBy: ['C-*', 'S-*', 'M-*'],
});
