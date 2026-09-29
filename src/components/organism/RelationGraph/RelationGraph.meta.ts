import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { RelationGraph } from './RelationGraph';

const nodes = [
  { id: 'users', label: 'Usuarios', sublabel: '40 filas', tone: 'river' as const, state: 'focus' as const, cluster: 'people' },
  { id: 'bookings', label: 'Reservas', tone: 'moss' as const, state: 'near' as const, cluster: 'schedule' },
  { id: 'class_sessions', label: 'Sesiones de clase', tone: 'moss' as const, state: 'near' as const, cluster: 'schedule' },
  { id: 'payments', label: 'Pagos', tone: 'clay' as const, state: 'near' as const, cluster: 'commerce' },
  { id: 'plans', label: 'Planes', tone: 'clay' as const, state: 'dim' as const, cluster: 'commerce' },
  { id: 'teachers', label: 'Profesores', tone: 'river' as const, state: 'dim' as const, cluster: 'people' },
];
const edges = [
  { from: 'bookings', to: 'users' }, { from: 'bookings', to: 'class_sessions' }, { from: 'payments', to: 'users' },
  { from: 'payments', to: 'plans' }, { from: 'class_sessions', to: 'teachers' }, { from: 'teachers', to: 'users' },
];

export default defineMeta({
  tier: 'organism', name: 'RelationGraph',
  description: { es: 'Grafo de relaciones en SVG (0044, M-03): nodos coloreados por tono, flechas de clave foránea, nodo en foco con sus vecinos, zoom y desplazamiento con botones, arrastre o teclado.', en: 'SVG relationship graph (0044, M-03): tone-coloured nodes, foreign-key arrows, a focused node with its neighbours, zoom and pan with buttons, drag or keyboard.' },
  props: [
    { name: 'nodes', type: '{ id, label, sublabel?, tone?, state?: focus|near|dim, weight?, cluster? }[]', required: true, description: { es: 'Nodos. dim = etiqueta solo al pasar o enfocar.', en: 'Nodes. dim = label only on hover or focus.' } },
    { name: 'edges', type: '{ from, to, label?, strong? }[]', required: true, description: { es: 'Aristas dirigidas (from → to).', en: 'Directed edges (from → to).' } },
    { name: 'positions', type: 'Record<id, {x, y}>', description: { es: 'Posiciones en el espacio virtual 1000 × 640; sin ellas usa layoutGraph() (fuerzas, determinista).', en: 'Positions in the virtual 1000 × 640 space; without them it uses layoutGraph() (force-directed, deterministic).' } },
    { name: 'onActivate', type: '(id) => void', description: { es: 'Clic, Enter o Espacio sobre un nodo.', en: 'Click, Enter or Space on a node.' } },
    { name: 'legend / controls / hint', type: '{ tone, label }[] / ReactNode / string', description: { es: 'Leyenda de tonos, controles extra junto al zoom y texto de ayuda.', en: 'Tone legend, extra controls beside zoom and help text.' } },
  ],
  states: ['default', 'focus node', 'neighbour highlight (hover / focus)', 'zoomed', 'panned', 'empty'],
  usages: [{ title: { es: 'Usuarios y sus relaciones', en: 'Users and their relations' }, render: () => h(RelationGraph, { nodes, edges, ariaLabel: 'Relaciones', legend: [{ tone: 'river', label: 'Personas' }, { tone: 'moss', label: 'Horario' }, { tone: 'clay', label: 'Comercio' }] }) }],
  a11y: [
    { es: 'Cada nodo es un botón enfocable (Tab) con nombre; Enter o Espacio lo abre.', en: 'Every node is a focusable, named button (Tab); Enter or Space opens it.' },
    { es: 'El lienzo enfocado desplaza con las flechas y hace zoom con + / − / 0; los botones de zoom miden 44 px. Nada depende solo del puntero.', en: 'The focused canvas pans with the arrow keys and zooms with + / − / 0; the zoom buttons are 44 px. Nothing is pointer-only.' },
  ],
  usedBy: ['M-03'],
});
