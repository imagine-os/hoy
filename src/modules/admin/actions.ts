import type { ActionDef } from '../../actions/types';

/**
 * 0041 — what the admin pages can be asked to do (WebMCP today, the voice controller later). Declared on the
 * page specs in `./specs.ts` (`ADMIN_ACTIONS`), mounted by each page with `useActions()`. As on the customer
 * pages, `permission` is advisory metadata: the route's roles decide whether the page (and so the handler) is
 * mounted, and each handler re-checks the permission before it writes. The admin module declared no actions
 * before 0041; the rest of M-xx gains them as each page is touched.
 */
const DAY = 'enum:0,1,2,3,4,5,6 (0 = Sunday)';
const TIME = 'HH:MM (24 h)';
const DATE = 'YYYY-MM-DD';

export const settingsHoursUpdate: ActionDef = {
  id: 'settings.hours.update', label: { es: 'Cambiar el horario de un día', en: 'Change one day’s hours' },
  intent: { es: 'Abre el {day} de {open} a {close} (o ciérralo)', en: 'Open {day} from {open} to {close} (or close it)' },
  params: { day: DAY, open: `${TIME} | closed`, close: `${TIME} (omit when closed)` }, permission: 'settings.write',
};
export const settingsHoursOverrideAdd: ActionDef = {
  id: 'settings.hours.override.add', label: { es: 'Añadir un festivo u horario especial', en: 'Add a holiday or special hours' },
  intent: { es: 'El {start} cerramos por {label} / abrimos de {open} a {close}', en: 'On {start} we close for {label} / open {open} to {close}' },
  params: { start: DATE, end: `${DATE} (optional, inclusive)`, label: 'string (ES; EN optional as label_en)', closed: 'enum:true,false', open: `${TIME} (when not closed)`, close: `${TIME} (when not closed)`, kind: 'enum:holiday,special,event' }, permission: 'hours.write',
};
export const settingsHoursOverrideRemove: ActionDef = {
  id: 'settings.hours.override.remove', label: { es: 'Quitar un festivo u horario especial', en: 'Remove a holiday or special hours' },
  intent: { es: 'Quita la excepción del {date}', en: 'Remove the exception on {date}' },
  params: { id: 'string (hours_overrides.id)', date: `${DATE} (alternative to id)` }, permission: 'hours.write',
};
export const settingsHoursHolidaysImport: ActionDef = {
  id: 'settings.hours.holidays.import', label: { es: 'Importar festivos de Colombia', en: 'Import Colombian holidays' },
  intent: { es: 'Importa los festivos de Colombia de este año y el próximo', en: 'Import this year’s and next year’s Colombian holidays' },
  permission: 'hours.write',
};

/** 0047 — M-08a WhatsApp contacts by topic (D-0022): who receives each intent, with the front desk as the fallback. */
export const settingsContactsUpdate: ActionDef = {
  id: 'settings.contacts.update', label: { es: 'Cambiar un contacto de WhatsApp', en: 'Change a WhatsApp contact' },
  intent: { es: 'Las preguntas de {intent} las recibe {name} en el WhatsApp {whatsapp}', en: 'Questions about {intent} go to {name} on WhatsApp {whatsapp}' },
  params: { intent: 'enum:frontDesk,sales,specials,support,finance,payroll,legal,coordinator,owner', name: 'string (optional)', whatsapp: 'string — +57 3xx xxx xxxx; empty falls back to the front desk (optional)', role: 'enum:super_admin,admin,coordinator,front_desk,finance,maintenance,marketing,developer (optional; empty clears)', hours: 'enum:always,studioHours,businessDays (optional)' },
  permission: 'settings.write',
};

export const integrationsGoogleCopyHours: ActionDef = {
  id: 'integrations.google.copyHours', label: { es: 'Copiar el horario para Google', en: 'Copy the hours for Google' },
  intent: { es: 'Copia el horario para pegarlo en Google Business Profile', en: 'Copy the hours to paste into Google Business Profile' },
  params: { format: 'enum:text,json (default text)' },
};
export const integrationsGoogleConnect: ActionDef = {
  id: 'integrations.google.connect', label: { es: 'Conectar con Google', en: 'Connect with Google' },
  intent: { es: 'Conecta el perfil de Google del estudio (no conectado aún)', en: 'Connect the studio’s Google profile (not wired yet)' },
  permission: 'settings.write',
};
export const integrationsGooglePush: ActionDef = {
  id: 'integrations.google.push', label: { es: 'Enviar el horario a Google', en: 'Push the hours to Google' },
  intent: { es: 'Envía el horario a Google ahora (no conectado aún)', en: 'Push the hours to Google now (not wired yet)' },
  permission: 'settings.write',
};

/** 0044 — M-03 table manager. `table` is a name from src/data/schema.ts (e.g. bookings); `id` a row id. 0046: calendar / timeline and saved-view rename / delete. */
const TABLE = 'string — a table name from src/data/schema.ts (bookings, class_sessions, users…)';
export const TABLES_ACTIONS: ActionDef[] = [
  { id: 'tables.open', label: { es: 'Abrir una tabla', en: 'Open a table' }, intent: { es: 'Abre la tabla {table}', en: 'Open the {table} table' }, params: { table: TABLE }, permission: 'tables.read' },
  { id: 'tables.openRow', label: { es: 'Abrir una fila', en: 'Open a row' }, intent: { es: 'Abre la fila {id} de {table}', en: 'Open row {id} of {table}' }, params: { table: TABLE, id: 'string — the row id' }, permission: 'tables.read' },
  { id: 'tables.setView', label: { es: 'Cambiar el tipo de vista', en: 'Change the view type' }, intent: { es: 'Muéstralo como {kind} (cuadrícula, lista, galería, tablero, calendario, línea de tiempo o grafo)', en: 'Show it as a {kind} (grid, list, gallery, board, calendar, timeline or graph)' }, params: { kind: 'enum:grid,list,gallery,kanban,calendar,timeline,graph (calendar and timeline need a date column)' }, permission: 'tables.read' },
  { id: 'tables.setDateColumn', label: { es: 'Elegir la columna de fecha', en: 'Pick the date column' }, intent: { es: 'Pon las filas en el calendario por {column} hasta {endColumn}', en: 'Place the rows by {column} until {endColumn}' }, params: { column: 'string — a date or timestamp column of the open table (starts_at, start_date, created_at…)', endColumn: 'string — where rows end (none = a point; default: the pair of column, e.g. ends_at)' }, permission: 'tables.read' },
  { id: 'tables.calendarMode', label: { es: 'Disposición del calendario', en: 'Calendar layout' }, intent: { es: 'Muestra el calendario por {mode}', en: 'Show the calendar by {mode}' }, params: { mode: 'enum:month,week,agenda' }, permission: 'tables.read' },
  { id: 'tables.timelineZoom', label: { es: 'Zoom de la línea de tiempo', en: 'Timeline zoom' }, intent: { es: 'Acerca o aleja la línea de tiempo a {zoom}', en: 'Zoom the timeline to {zoom}' }, params: { zoom: 'enum:day,week,month,quarter' }, permission: 'tables.read' },
  { id: 'tables.goToDate', label: { es: 'Ir a una fecha', en: 'Go to a date' }, intent: { es: 'Ve al {date} en el calendario o la línea de tiempo', en: 'Go to {date} on the calendar or the timeline' }, params: { date: 'string — YYYY-MM-DD, today, next or previous' }, permission: 'tables.read' },
  { id: 'tables.search', label: { es: 'Buscar en la tabla', en: 'Search the table' }, intent: { es: 'Busca {q} en esta tabla', en: 'Search this table for {q}' }, params: { q: 'string (empty clears)' }, permission: 'tables.read' },
  { id: 'tables.filter', label: { es: 'Añadir un filtro', en: 'Add a filter' }, intent: { es: 'Filtra donde {column} {op} {value}', en: 'Filter where {column} {op} {value}' }, params: { column: 'string — a column name of the open table', op: 'enum:is,is_not,contains,empty,not_empty,before,after,gt,lt,in (default: the first for the column type)', value: 'string (comma-separated for in; YYYY-MM-DD for dates)' }, permission: 'tables.read' },
  { id: 'tables.newRow', label: { es: 'Crear una fila', en: 'Create a row' }, intent: { es: 'Crea una fila nueva en esta tabla', en: 'Create a new row in this table' }, permission: 'tables.write' },
  { id: 'tables.export', label: { es: 'Exportar la vista', en: 'Export the view' }, intent: { es: 'Exporta esta vista en {format}', en: 'Export this view as {format}' }, params: { format: 'enum:json,csv (default json)' }, permission: 'tables.read' },
  { id: 'tables.toggleSidebar', label: { es: 'Mostrar u ocultar la barra de tablas', en: 'Show or hide the tables bar' }, intent: { es: 'Contrae (o expande) la barra de tablas', en: 'Collapse (or expand) the tables bar' }, permission: 'tables.read' },
  { id: 'tables.saveView', label: { es: 'Guardar la vista', en: 'Save the view' }, intent: { es: 'Guarda esta vista como {name}', en: 'Save this view as {name}' }, params: { name: 'string' }, permission: 'tables.write' },
  { id: 'tables.renameView', label: { es: 'Renombrar una vista', en: 'Rename a view' }, intent: { es: 'Cambia el nombre de la vista {view} a {name}', en: 'Rename the view {view} to {name}' }, params: { view: 'string — a saved view id or its current name (default: the active one)', name: 'string' }, permission: 'tables.write' },
  { id: 'tables.deleteView', label: { es: 'Eliminar una vista', en: 'Delete a view' }, intent: { es: 'Elimina la vista {view}', en: 'Delete the view {view}' }, params: { view: 'string — a saved view id or its current name (default: the active one)' }, permission: 'tables.write' },
  { id: 'tables.pin', label: { es: 'Fijar una tabla', en: 'Pin a table' }, intent: { es: 'Fija (o suelta) la tabla {table}', en: 'Pin (or unpin) the {table} table' }, params: { table: `${TABLE} (default: the open one)` }, permission: 'tables.read' },
  { id: 'tables.toggleTechnicalNames', label: { es: 'Nombres técnicos', en: 'Technical names' }, intent: { es: 'Muestra (u oculta) los nombres técnicos', en: 'Show (or hide) the technical names' }, permission: 'dev.tools' },
];

/** Page code → the actions it declares. Merged into the specs in `./specs.ts`. */
export const ADMIN_ACTIONS: Record<string, ActionDef[]> = {
  'M-08a': [settingsHoursUpdate, settingsContactsUpdate],
  'M-08g': [settingsHoursOverrideAdd, settingsHoursOverrideRemove, settingsHoursHolidaysImport],
  'M-10a': [integrationsGoogleCopyHours, integrationsGoogleConnect, integrationsGooglePush],
  'M-03': TABLES_ACTIONS,
};

/** Reads a required string param or throws, so `run()` answers `{ ok: false }` instead of pretending. */
export function need(p: Record<string, string> | undefined, key: string): string {
  const v = p?.[key]?.trim();
  if (!v) throw new Error(`missing param "${key}"`);
  return v;
}
