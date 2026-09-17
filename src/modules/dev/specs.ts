import { defineSpec } from '../../specs/define';
export const specsIndexSpec = defineSpec({
  code: 'D-03', name: { es: 'Índice de specs', en: 'Specs index' },
  purpose: { es: 'Lista todas las PageSpec registradas con badge de completitud, ruta y estado (construida / stub / sin ruta).', en: 'Lists every registered PageSpec with completeness badge, route and status (built / stub / no route).' },
  layout: ['PageHead', 'FilterChips', 'SpecTable'], data: ['components', 'page_layouts'], roles: ['super_admin'],
  logic: ['Completeness = 7 checks (purpose, layout, data, roles, logic, integrations, states).', 'A route is a stub when its element is PageStub.'],
  integrations: [], states: ['default', 'filtered by family'],
});
export const layoutEditorSpec = defineSpec({
  code: 'D-04', name: { es: 'Editor de layout', en: 'Layout editor' },
  purpose: { es: 'Reordenar y ocultar las secciones de una página con drag-and-drop; persiste en page_layouts y las páginas lo leen con useLayout(spec).', en: 'Reorder and hide a page’s sections with drag-and-drop; persists to page_layouts and pages read it with useLayout(spec).' },
  layout: ['PagePicker', 'SortableList (dnd-kit)', 'Toolbar (reset, preview)'], data: ['page_layouts'], roles: ['super_admin'],
  logic: ['Stored order wins; new spec sections append; removed ones drop.', 'Hidden sections stay in order but are skipped by the page.'],
  integrations: [], states: ['default (spec order)', 'custom order saved', 'page not wired'],
});
