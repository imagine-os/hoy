// Training checklists as data (0031): Día 1 / Semana 1 / Mes 1 per role, seeded verbatim from the tables in
// docs/ops-manual/<lang>/09-checklists-de-entrenamiento.md. Chapter 09 keeps its tables as text; the
// `{{training:<role>}}` directive renders this list with a checkbox per item, stored per person in
// `manual_training` (item_key = the key below; a stage sign-off is item_key `__signoff`).
// Marketing and developer (new roles in 0031) have no table in chapter 09 yet: their lists are a first draft.
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
    day1: [i('read', 'Leer `01`, `04`, `08`, `20`', 'Read `01`, `04`, `08`, `20`'), i('user', 'usuario propio en HoyOS', 'own HoyOS user'), i('tour', 'recorrido del espacio', 'tour of the space'), i('checkin', 'practicar check-in en S-02 (demo)', 'practise check-in in S-02 (demo)'), i('greeting', 'aprender saludo', 'learn the greeting')],
    week1: [i('openclose', 'Apertura y cierre acompañados', 'Supervised opening and closing'), i('registrations', '5 registros reales en S-04 con cada medio de pago', '5 real registrations in S-04 with every payment method'), i('cancellation', 'manejar una cancelación dentro y fuera de ventana', 'handle a cancellation inside and outside the window'), i('waitlist', 'promover lista de espera', 'promote a waitlist'), i('cashclose', 'cierre de caja con finanzas', 'cash close with finance')],
    month1: [i('solo', 'Turno completo solo', 'Full shift alone'), i('whatsapp', 'respuestas WhatsApp con tono revisado por coordinación', 'WhatsApp replies with tone reviewed by coordination'), i('read', 'leer `13` y `07`', 'read `13` and `07`'), i('nodiff', 'sin diferencias de caja en 2 semanas', 'no cash differences for 2 weeks')],
  },
  teacher: {
    day1: [i('read', 'Leer `01`, `02`, `06`, `08`', 'Read `01`, `02`, `06`, `08`'), i('app', 'S-03 con su usuario', 'S-03 with own user'), i('observe', 'clase observada', 'observe a class'), i('room', 'sala y props', 'room and props')],
    week1: [i('supervised', 'Dictar acompañado', 'Teach supervised'), i('attendance', 'marcar asistencia en ventana', 'mark attendance within the window'), i('bio', 'enviar bio y foto a revisión desde S-03', 'submit bio and photo for review from S-03')],
    month1: [i('schedule', 'Horario fijo', 'Fixed schedule'), i('substitution', 'una sustitución gestionada correctamente', 'one substitution handled correctly'), i('payroll', 'revisar nómina en S-03 antes del 15', 'review payroll in S-03 before the 15th')],
  },
  coordinator: {
    day1: [i('read', 'Leer todo el manual', 'Read the whole manual'), i('demo', 'M-02, M-05, M-04, M-06 en demo', 'M-02, M-05, M-04, M-06 in demo')],
    week1: [i('publish', 'Publicar una clase recurrente y verla en C-02', 'Publish a recurring class and see it in C-02'), i('approve', 'aprobar un contenido de maestro', 'approve a teacher’s content'), i('cancel', 'cancelar una clase de prueba y revisar E-03', 'cancel a test class and review E-03')],
    month1: [i('nextmonth', 'Horario del mes siguiente publicado', 'Next month’s schedule published'), i('automations', 'automatizaciones sin errores en M-05', 'automations error-free in M-05'), i('weekly', 'reunión semanal con owner', 'weekly meeting with the owner')],
  },
  finance: {
    day1: [i('read', 'Leer `03`, `14`, `15`, `16`', 'Read `03`, `14`, `15`, `16`'), i('access', 'acceso a M-01, M-07, M-06 (Pagos), M-09 y Wompi', 'access to M-01, M-07, M-06 (Payments), M-09 and Wompi')],
    week1: [i('reconcile', '5 conciliaciones diarias', '5 daily reconciliations'), i('transfers', 'confirmar transferencias en M-06', 'confirm transfers in M-06'), i('export', 'exportar M-07', 'export M-07')],
    month1: [i('close', 'Cierre mensual completo', 'Full monthly close'), i('payroll', 'nómina del 15', 'payroll on the 15th'), i('report', 'reporte al owner', 'report to the owner')],
  },
  admin: {
    day1: [i('read', 'Leer `21`, `24`, `25`, `26`', 'Read `21`, `24`, `25`, `26`'), i('screens', 'M-01, M-08, M-03', 'M-01, M-08, M-03')],
    week1: [i('users', 'Crear usuarios por rol', 'Create users per role'), i('policies', 'revisar políticas en M-08', 'review policies in M-08'), i('integrations', 'estado de integraciones', 'integration status')],
    month1: [i('audit', 'Auditoría de M-07', 'M-07 audit'), i('switches', 'revisión de switches', 'switch review'), i('backup', 'plan de respaldo de accesos', 'access backup plan')],
  },
  maintenance: {
    day1: [i('read', 'Leer `07`, `08`', 'Read `07`, `08`'), i('tour', 'recorrido', 'tour'), i('supplies', 'ubicación de insumos y equipos', 'location of supplies and equipment')],
    week1: [i('setups', 'Montajes diarios acompañados', 'Daily setups supervised'), i('closing', 'checklist de cierre', 'closing checklist')],
    month1: [i('inventory', 'Inventario semanal propio', 'Own weekly inventory'), i('equipment', 'revisión mensual de equipos hecha', 'monthly equipment check done')],
  },
  // 0031 — first drafts for the two new roles; chapter 09 has no table for them yet.
  marketing: {
    day1: [i('read', 'Leer `01`, `20`, `17`, `18`', 'Read `01`, `20`, `17`, `18`'), i('brand', 'recorrer el manual de marca en K-05', 'walk through the brand manual in K-05'), i('demo', 'M-02 y M-02d en demo', 'M-02 and M-02d in demo')],
    week1: [i('article', 'publicar un artículo en M-02a con revisión de tono', 'publish an article in M-02a with a tone review'), i('template', 'revisar el tono de una plantilla de WhatsApp en M-05', 'review the tone of a WhatsApp template in M-05'), i('media', 'escribir el encargo de un cupo en M-02d', 'write the brief for one slot in M-02d')],
    month1: [i('calendar', 'calendario de contenido del mes aprobado por el owner', 'month’s content calendar approved by the owner'), i('consent', 'campaña enviada solo a quien aceptó marketing (M-06)', 'campaign sent only to people who opted in to marketing (M-06)')],
  },
  developer: {
    day1: [i('read', 'Leer `24`, `25`, `26`', 'Read `24`, `25`, `26`'), i('devmode', 'modo dev e inspector (Ctrl + .)', 'dev mode and the inspector (Ctrl + .)'), i('build', '`npm run build` en verde en su máquina', '`npm run build` green on their machine')],
    week1: [i('change', 'un cambio con prompt, changelog y kanban en el mismo PR', 'one change with prompt, changelog and kanban in the same PR'), i('shots', 'capturas regeneradas de la página tocada', 'captures regenerated for the page touched'), i('hubmap', 'hub-map regenerado y determinista', 'hub map regenerated and deterministic')],
    month1: [i('surfaces', 'docs/reference/surfaces.md revisado y fechado', 'docs/reference/surfaces.md re-checked and dated'), i('spec', 'una spec de página completa en D-03', 'one page spec complete in D-03')],
  },
};

/** The checklist a role follows; super_admin follows admin's. */
export function trainingFor(role: Role): TrainingPlan | undefined {
  return TRAINING[role === 'super_admin' ? 'admin' : role];
}
