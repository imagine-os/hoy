// Training checklists as data (0031): Día 1 / Semana 1 / Mes 1 per role, verbatim from the tables in
// docs/ops-manual/<lang>/09-checklists-de-entrenamiento.md (re-aligned to the 0032 rewrite; keys unchanged
// where the item is the same, so stored progress keeps its meaning). Chapter 09 keeps its tables as text; the
// `{{training:<role>}}` directive renders this list with a checkbox per item, stored per person in
// `manual_training` (item_key = the key below; a stage sign-off is item_key `__signoff`).
// Marketing and developer (new roles in 0031) have their own tables in chapter 09 §7–§8 since 0032.
import type { Role } from '../../auth/roles';
import type { Bi } from '../../specs/types';
import type { TrainingStage } from '../../data/schema';

export const STAGES: TrainingStage[] = ['day1', 'week1', 'month1'];
export const SIGNOFF = '__signoff';

export interface TrainingItem { key: string; text: Bi }
export type TrainingPlan = Record<TrainingStage, TrainingItem[]>;

const i = (key: string, es: string, en: string): TrainingItem => ({ key, text: { es, en } });

export const TRAINING: Partial<Record<Role, TrainingPlan>> = {
  front_desk: {
    day1: [i('read', 'Leer 01, 04, 08 y 20', 'Read 01, 04, 08 and 20'), i('user', 'tener tu propio usuario', 'have your own user'), i('tour', 'recorrer el espacio', 'walk the space'), i('checkin', 'practicar el check-in en modo demo', 'practise check-in in demo mode'), i('greeting', 'aprender el saludo', 'learn the greeting')],
    week1: [i('openclose', 'Abrir y cerrar acompañada', 'Open and close with someone beside you'), i('registrations', '5 ventas reales con cada medio de pago', '5 real sales with each payment method'), i('cancellation', 'una cancelación dentro y otra fuera de la ventana', 'one cancellation inside and one outside the window'), i('waitlist', 'promover a alguien de la lista de espera', 'promote someone from the waitlist'), i('cashclose', 'cerrar caja con finanzas', 'close the till with finance')],
    month1: [i('solo', 'Un turno completo sola', 'A full shift on your own'), i('whatsapp', 'respuestas de WhatsApp revisadas por coordinación', 'WhatsApp replies reviewed by coordination'), i('read', 'leer 07 y 13', 'read 07 and 13'), i('nodiff', 'dos semanas sin diferencias de caja', 'two weeks with no till differences')],
  },
  teacher: {
    day1: [i('read', 'Leer 01, 02, 06 y 08', 'Read 01, 02, 06 and 08'), i('app', 'entrar a la app de maestros con tu usuario', 'sign in to the teacher app with your user'), i('observe', 'observar una clase', 'observe a class'), i('room', 'conocer la sala y los accesorios', 'get to know the room and the props')],
    week1: [i('supervised', 'Dar una clase acompañado', 'Teach a class with someone beside you'), i('attendance', 'marcar la asistencia a tiempo', 'mark attendance on time'), i('bio', 'enviar tu bio y tu foto a revisión', 'send your bio and photo for review')],
    month1: [i('schedule', 'Horario fijo', 'A fixed schedule'), i('substitution', 'gestionar bien un reemplazo', 'handle a substitution properly'), i('payroll', 'revisar tu extracto de pago antes de que cierre el periodo', 'check your pay statement before the period closes')],
  },
  coordinator: {
    day1: [i('read', 'Leer todo el manual', 'Read the whole manual'), i('demo', 'recorrer en modo demo Contenido, Correos, WhatsApp y el CRM', 'go through Content, Emails, WhatsApp and the CRM in demo mode')],
    week1: [i('publish', 'Publicar una clase recurrente y verla en el horario', 'Publish a recurring class and see it on the schedule'), i('approve', 'aprobar un contenido de un maestro', 'approve a teacher\'s content'), i('cancel', 'cancelar una clase de prueba y ver lo que le llega al socio', 'cancel a test class and see what the member receives')],
    month1: [i('nextmonth', 'Horario del mes siguiente publicado', 'Next month\'s schedule published'), i('automations', 'mensajes automáticos sin errores', 'automated messages without errors'), i('weekly', 'reunión semanal con el owner', 'a weekly meeting with the owner')],
  },
  finance: {
    day1: [i('read', 'Leer 03, 14, 15 y 16', 'Read 03, 14, 15 and 16'), i('access', 'acceso al Panel, al Registro de actividad, a los pagos del CRM, a Finanzas y a Wompi', 'access to the Dashboard, Activity, the CRM\'s payments, Finance and Wompi')],
    week1: [i('reconcile', '5 conciliaciones diarias', '5 daily reconciliations'), i('transfers', 'confirmar transferencias', 'confirm transfers'), i('export', 'exportar el registro de actividad', 'export the activity log')],
    month1: [i('close', 'Un cierre de mes completo', 'A full month-end close'), i('payroll', 'una nómina de maestros', 'one teacher payroll'), i('report', 'el reporte al owner', 'the report to the owner')],
  },
  admin: {
    day1: [i('read', 'Leer 21, 24, 25 y 26', 'Read 21, 24, 25 and 26'), i('screens', 'recorrer el Panel, Ajustes y Tablas', 'go through the Dashboard, Settings and Tables')],
    week1: [i('users', 'Crear usuarios para cada rol', 'Create users for every role'), i('policies', 'revisar las políticas en Ajustes', 'review the policies in Settings'), i('integrations', 'revisar el estado de las integraciones', 'check the state of the integrations')],
    month1: [i('audit', 'Revisar el registro de actividad', 'Review the activity log'), i('switches', 'revisar qué funciones están encendidas', 'review which features are on'), i('backup', 'plan de respaldo de accesos', 'a backup plan for access')],
  },
  maintenance: {
    day1: [i('read', 'Leer 07 y 08', 'Read 07 and 08'), i('tour', 'recorrer el espacio', 'walk the space'), i('supplies', 'saber dónde están los insumos y los equipos', 'know where the supplies and the equipment are')],
    week1: [i('setups', 'Montajes diarios acompañado', 'Daily set-ups with someone beside you'), i('closing', 'checklist de cierre', 'the closing checklist')],
    month1: [i('inventory', 'Inventario semanal por tu cuenta', 'The weekly inventory on your own'), i('equipment', 'revisión mensual de equipos hecha', 'the monthly equipment check done')],
  },
  marketing: {
    day1: [i('read', 'Leer 01, 03, 18, 19 y 20', 'Read 01, 03, 18, 19 and 20'), i('tour', 'recorrer el estudio y el sitio', 'walk the studio and the website'), i('brand', 'conocer el manual de marca', 'get to know the brand manual')],
    week1: [i('calendar', 'Proponer el calendario de publicaciones del mes', 'Propose the month\'s posting calendar'), i('photos', 'revisar qué fotos están aprobadas', 'check which photos are approved'), i('posts', 'escribir 3 publicaciones y que coordinación revise el tono', 'write 3 posts and have coordination review the tone')],
    month1: [i('published', 'Un mes publicado según el calendario', 'A month posted to the calendar'), i('nothingfake', 'nada publicado que no exista en el sistema (precios, horarios, promociones)', 'nothing posted that doesn\'t exist in the system (prices, times, promotions)'), i('report', 'primer reporte al owner', 'a first report to the owner')],
  },
  developer: {
    day1: [i('read', 'Leer 24, 25 y 26', 'Read 24, 25 and 26'), i('docs', 'leer la documentación del software', 'read the software documentation'), i('devmode', 'abrir la app en local y activar el modo de desarrollo', 'run the app locally and turn on developer mode')],
    week1: [i('specs', 'Recorrer las especificaciones de cada pantalla', 'Go through each screen\'s spec'), i('simulated', 'entender qué está simulado y qué es real', 'understand what is simulated and what is real'), i('change', 'un cambio pequeño con su registro en la documentación', 'one small change recorded in the documentation')],
    month1: [i('integration', 'Una integración avanzada (con su tarjeta de Integraciones al día)', 'One integration moved forward (with its Integrations card up to date)'), i('docsync', 'la documentación y este manual actualizados en el mismo cambio', 'the documentation and this manual updated in the same change')],
  },
};

/** The checklist a role follows; super_admin follows admin's. */
export function trainingFor(role: Role): TrainingPlan | undefined {
  return TRAINING[role === 'super_admin' ? 'admin' : role];
}
