import type { ActionDef } from '../../actions/types';

/**
 * 0040 — what the admin pages can be asked to do (WebMCP today, the voice controller later). Declared on the
 * page specs in `./specs.ts` (`ADMIN_ACTIONS`), mounted by each page with `useActions()`. As on the customer
 * pages, `permission` is advisory metadata: the route's roles decide whether the page (and so the handler) is
 * mounted, and each handler re-checks the permission before it writes. The admin module declared no actions
 * before 0040; the rest of M-xx gains them as each page is touched.
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

/** Page code → the actions it declares. Merged into the specs in `./specs.ts`. */
export const ADMIN_ACTIONS: Record<string, ActionDef[]> = {
  'M-08a': [settingsHoursUpdate],
  'M-08g': [settingsHoursOverrideAdd, settingsHoursOverrideRemove, settingsHoursHolidaysImport],
  'M-10a': [integrationsGoogleCopyHours, integrationsGoogleConnect, integrationsGooglePush],
};

/** Reads a required string param or throws, so `run()` answers `{ ok: false }` instead of pretending. */
export function need(p: Record<string, string> | undefined, key: string): string {
  const v = p?.[key]?.trim();
  if (!v) throw new Error(`missing param "${key}"`);
  return v;
}
