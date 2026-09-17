import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { EmptyState } from './EmptyState';
import { Button } from '../../atom/Button/Button';

export default defineMeta({
  tier: 'molecule', name: 'EmptyState',
  description: { es: 'Los tres estados de spec (vacío, error, cargando) con el mismo aspecto en toda la app.', en: 'The three spec states (empty, error, loading) rendered the same way across the app.' },
  props: [
    { name: 'title', type: 'string', required: true, description: { es: 'Qué pasa.', en: 'What is going on.' } },
    { name: 'body', type: 'string', description: { es: 'Contexto o siguiente paso.', en: 'Context or next step.' } },
    { name: 'tone', type: "'empty' | 'error' | 'loading'", default: 'empty', description: { es: 'Semántica del estado.', en: 'State semantics.' } },
    { name: 'action', type: 'ReactNode', description: { es: 'Botón opcional.', en: 'Optional button.' } },
    { name: 'compact', type: 'boolean', default: 'false', description: { es: 'Menos padding para paneles.', en: 'Less padding for panels.' } },
  ],
  states: ['empty', 'error', 'loading', 'compact'],
  usages: [
    { title: { es: 'Vacío con acción', en: 'Empty with action' }, render: () => h(EmptyState, { title: 'Nadie en la lista de espera', body: 'Cuando alguien se anote aparecerá aquí.', action: h(Button, { size: 'sm', variant: 'secondary' }, 'Abrir horario') }) },
    { title: { es: 'Error', en: 'Error' }, render: () => h(EmptyState, { tone: 'error', title: 'No pudimos cargar la clase', body: 'Revisa la conexión e intenta de nuevo.', compact: true }) },
    { title: { es: 'Cargando', en: 'Loading' }, render: () => h(EmptyState, { tone: 'loading', title: 'Cargando…', compact: true }) },
  ],
  a11y: [{ es: 'role=status (o alert en error) y aria-busy mientras carga.', en: 'role=status (alert on error) and aria-busy while loading.' }],
  usedBy: ['S-02', 'S-03', 'S-04', 'M-02', 'M-04', 'M-05', 'M-06', 'M-07', 'M-09'],
});
