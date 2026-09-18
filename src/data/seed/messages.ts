/**
 * Demo conversations for the unified message record (0.8.0): WhatsApp threads both ways, automated
 * reminders and receipts, two newsletters, one real email exchange and the team's internal notes.
 *
 * Fixed rows, no RNG: appended after every other pass so nothing else in the seed shifts. Every row is anchored
 * to a local clock time N days back (customers write in the day, the desk answers in opening hours, newsletters
 * at 09:30, reminders 2 h before class, receipts at the till), and a thread that would reach past NOW moves back
 * whole days. Six inbound messages across five people are left unread (read_at null) inside the last 48 hours —
 * that is what the bell, S-01 and S-06 show at first load. Juliana (usr_cust, the screenshot member) has the richest thread.
 * Everything is fictional; the studio name comes from the tenant config.
 */
import type { MessageLogRow } from '../schema';
import { tenant } from '../../tenant/tenant';
import { pricing } from '../../tenant/pricing';
import { formatCOP, MS } from '../../i18n/format';
import { NOW, base, iso } from './catalog';

const studio = tenant.name;
const DESK = 'usr_desk', COORD = 'usr_coord';
const price = (id: string) => formatCOP(pricing.find((p) => p.id === id)?.price ?? 0, 'es');

/** Body (and subject) of an automated send, by template key — also used to backfill the older reminder/receipt rows. */
export function automationText(templateKey: string, first: string, channel: 'whatsapp' | 'email'): { subject: string | null; body: string } {
  switch (templateKey) {
    case 'class_reminder': return { subject: channel === 'email' ? 'Tu clase es en 2 horas' : null, body: `Hola ${first}, tu clase de Hot Vinyasa empieza a las 5:30 p. m. Trae agua y toalla. Nos vemos en ${studio}.` };
    case 'receipt': return { subject: channel === 'email' ? `Tu recibo de ${studio}` : null, body: `Hola ${first}, recibimos tu pago. Gracias por practicar con nosotros. Tu recibo queda en la app, en Historial.` };
    case 'how_to_prepare': return { subject: `Tu primera clase en ${studio}`, body: `Hola ${first},\n\nTe damos la bienvenida a ${studio}. Llega 15 minutos antes, ven con ropa cómoda y sin comer pesado 2 horas antes. Tenemos mats, toallas y duchas.` };
    default: return { subject: null, body: `Hola ${first}, mensaje de ${studio}.` };
  }
}

type Draft = Pick<MessageLogRow, 'user_id' | 'channel' | 'direction' | 'source' | 'body'> & { at: string; template_key?: string | null; automation_id?: string | null; subject?: string | null; status?: MessageLogRow['status']; sent_by?: string | null; read_at?: string | null; read_by?: string | null };

/**
 * A local clock time `daysAgo` days back: `at(2, '18:05')` is 6:05 p. m. two days ago in the browser's zone
 * (America/Bogota for the studio). Rows are anchored to plausible hours — customers write 07:00–21:30, the desk
 * answers in opening hours, newsletters go out at 09:30, a class reminder lands 2 h before the 5:30 p. m. class.
 */
const at = (daysAgo: number, hhmm: string) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return iso(d); };
/** Newsletters go out on a weekday: a Saturday or Sunday anchor moves back to the Friday. */
const weekday = (daysAgo: number) => { const d = new Date(NOW); d.setDate(d.getDate() - daysAgo); const wd = d.getDay(); return wd === 0 ? daysAgo + 2 : wd === 6 ? daysAgo + 1 : daysAgo; };
const plus = (ts: string, minutes: number) => iso(new Date(new Date(ts).getTime() + minutes * MS.min));
const recent = (ts: string) => NOW.getTime() - new Date(ts).getTime() < MS.day;

let n = 0;
const row = (p: Draft): MessageLogRow => ({
  ...base(`msg_c${String(++n).padStart(3, '0')}`, 0), created_at: p.at, updated_at: p.at,
  user_id: p.user_id, channel: p.channel, direction: p.direction, source: p.source,
  template_key: p.template_key ?? null, automation_id: p.automation_id ?? null, subject: p.subject ?? null, body: p.body,
  status: p.status ?? (p.direction === 'inbound' ? 'received' : recent(p.at) ? 'delivered' : 'read'), sent_at: p.at, sent_by: p.sent_by ?? null,
  read_at: p.read_at ?? null, read_by: p.read_by ?? null, external_id: p.direction === 'inbound' ? `wamid.demo.${n}` : null, payload: null,
});

/** Inbound WhatsApp; the desk read it a few minutes later unless `unread`. */
const inWa = (user: string, d: number, t: string, body: string, unread = false) => { const ts = at(d, t); return row({ user_id: user, channel: 'whatsapp', direction: 'inbound', source: 'manual', body, at: ts, read_at: unread ? null : plus(ts, 4), read_by: unread ? null : DESK }); };
const outWa = (user: string, d: number, t: string, body: string, by = DESK) => row({ user_id: user, channel: 'whatsapp', direction: 'outbound', source: 'manual', body, at: at(d, t), sent_by: by });
/** The 2 h reminder for the 5:30 p. m. class the automation text names. */
const autoWa = (user: string, d: number, first: string) => row({ user_id: user, channel: 'whatsapp', direction: 'outbound', source: 'automation', template_key: 'class_reminder', automation_id: 'aut_1', body: automationText('class_reminder', first, 'whatsapp').body, at: at(d, '15:30') });
const inMail = (user: string, d: number, t: string, subject: string, body: string, unread = false) => { const ts = at(d, t); return row({ user_id: user, channel: 'email', direction: 'inbound', source: 'manual', subject, body, at: ts, read_at: unread ? null : plus(ts, 25), read_by: unread ? null : DESK }); };
const outMail = (user: string, d: number, t: string, subject: string, body: string, by = DESK) => row({ user_id: user, channel: 'email', direction: 'outbound', source: 'manual', subject, body, at: at(d, t), sent_by: by, status: 'delivered' });
/** Receipt at the payment time; the welcome email the morning after sign-up. */
const autoMail = (user: string, d: number, t: string, first: string, templateKey: 'receipt' | 'how_to_prepare', invoice?: string) => {
  const tx = automationText(templateKey, first, 'email');
  return row({ user_id: user, channel: 'email', direction: 'outbound', source: 'automation', template_key: templateKey, automation_id: templateKey === 'receipt' ? 'aut_2' : null, subject: invoice ? `${tx.subject} · ${invoice}` : tx.subject, body: invoice ? `${tx.body}\n\nFactura ${invoice}.` : tx.body, at: at(d, t), status: 'delivered' });
};
const note = (user: string, d: number, t: string, body: string, by = DESK) => row({ user_id: user, channel: 'note', direction: 'internal', source: 'manual', body, at: at(d, t), sent_by: by, status: 'sent' });

const NEWS_SEPT = { subject: `Septiembre en ${studio}: horarios nuevos y Respiración los sábados`, body: `Este mes abrimos Hot Vinyasa a las 6:30 a. m. de lunes a sábado, sumamos Barre los martes y jueves, y los sábados a las 10:00 a. m. llega Respiración con Felipe: 45 minutos de pranayama, sin esfuerzo, para cerrar la semana.\n\nComo siempre: llega 10 minutos antes, hidrátate y trae toalla para la sala caliente.` };
const NEWS_AUG = { subject: `Agosto en ${studio}: semana de puertas abiertas y Yin a la luz de las velas`, body: `Del 12 al 17 de agosto trae a alguien que nunca haya venido: su primera clase es cortesía nuestra. Y todos los viernes de agosto, Yin a las 7:00 p. m. con velas y música en vivo.` };
/** Campaign send: 09:30 on a weekday. */
const news = (user: string, d: number, nl: typeof NEWS_SEPT, read = true) => row({ user_id: user, channel: 'email', direction: 'outbound', source: 'newsletter', template_key: 'newsletter', subject: nl.subject, body: nl.body, at: at(weekday(d), '09:30'), status: read ? 'read' : 'delivered' });

const STAMPS = ['created_at', 'updated_at', 'sent_at', 'read_at'] as const;
/** A thread whose latest row would fall after NOW (a 7 p. m. row seeded at 3 a. m.) moves back whole days, so nothing is in the future and no reply precedes its question. */
const settle = (thread: MessageLogRow[]) => {
  while (thread.some((m) => new Date(m.created_at) > NOW)) {
    for (const m of thread) for (const k of STAMPS) { const v = m[k]; if (v) m[k] = iso(new Date(new Date(v).getTime() - MS.day)); }
  }
  return thread;
};

export function buildMessages(nameOf: Map<string, string>): MessageLogRow[] {
  n = 0;
  const first = (id: string) => (nameOf.get(id) ?? 'Hola').split(' ')[0];
  const J = 'usr_cust', CAMILA = 'usr_c01', NICO = 'usr_c02', TOMAS = 'usr_c04', MARIANA = 'usr_c05', DANIELA = 'usr_c07', GABRIELA = 'usr_c09', ANTONIA = 'usr_c11', SALOME = 'usr_c13', MARTIN = 'usr_c16', JERO = 'usr_c20';
  const threads: MessageLogRow[][] = [
    // ---- Juliana (usr_cust): welcome, receipts, newsletters, a WhatsApp exchange, a note, an unread email and an unread WhatsApp ----
    [
      autoMail(J, 60, '10:15', first(J), 'how_to_prepare'),
      autoMail(J, 30, '18:40', first(J), 'receipt', 'HOY-1002'),
      news(J, 50, NEWS_AUG),
      news(J, 20, NEWS_SEPT),
      autoWa(J, 3, first(J)),
      inWa(J, 2, '18:05', `Hola! ¿El sábado sí hay hot yoga temprano? Quiero ir con mi hermana que viene de Bogotá 🙂`),
      outWa(J, 2, '18:20', `¡Hola ${first(J)}! Sí: el sábado Hot Vinyasa es a las 6:30 a. m. con Isabela, y a las 8:00 hay Barre si prefieren algo más suave. Si tu hermana nunca ha venido, su primera clase va como invitada de tu membresía. ¿Les reservo dos cupos?`),
      inWa(J, 2, '18:32', `Sí, por favor, dos para las 6:30. Gracias, Camilo 🙌`),
      outWa(J, 2, '18:35', `Listo, quedaron las dos. Lleguen 10 minutos antes para el registro de tu hermana. ¡Nos vemos el sábado!`),
      note(J, 2, '18:40', 'Prefiere primera fila, cerca del ventilador. Viene con su hermana el sábado (primera vez, va como invitada).'),
      inMail(J, 1, '11:20', 'Certificado de asistencia para mi EPS', `Hola equipo ${studio},\n\nMi EPS me pide un certificado de que practico actividad física regular para el programa de bienestar. ¿Me pueden enviar una carta con mis asistencias de los últimos tres meses, a nombre de Juliana Ospina?\n\nMuchas gracias,\nJuliana`, true),
      autoWa(J, 1, first(J)),
      inWa(J, 0, '07:45', `Camilo, ¿me puedes cambiar la reserva de mañana de 6:30 a. m. a la de 5:30 p. m.? Me salió una reunión temprano 🙏`, true),
    ],
    // ---- Camila: price of the 10-class pack, receipt at the till, invoice request (unread) ----
    [
      inWa(CAMILA, 1, '10:05', `Hola, ¿cuánto vale el paquete de 10 clases y hasta cuándo vence?`),
      outWa(CAMILA, 1, '10:12', `¡Hola ${first(CAMILA)}! El Paquete de 10 Clases vale ${price('pack10')} y tienes 3 meses para usarlo desde la compra. Sirve para cualquier clase del horario.`),
      inWa(CAMILA, 1, '10:30', `Listo, mañana paso y lo pago. ¿Aceptan Nequi?`),
      outWa(CAMILA, 1, '10:33', `Claro: Nequi, tarjeta, PSE o efectivo. Te esperamos 🙂`),
      autoMail(CAMILA, 0, '09:40', first(CAMILA), 'receipt', 'HOY-1041'),
      note(CAMILA, 0, '09:45', 'Pidió factura electrónica a nombre de su empresa (Lumen Studio SAS). Pendiente pedir el NIT.'),
      inWa(CAMILA, 0, '10:10', `¡Gracias! ¿Me pueden mandar la factura electrónica al correo de la empresa? Es facturacion@lumen.example — les paso el NIT por acá.`, true),
    ],
    // ---- Tomás: knee injury, coordinator advice, a note for the teacher, an unread follow-up after class ----
    [
      inWa(TOMAS, 4, '12:10', `Buenas, tengo una lesión en la rodilla izquierda (menisco, ya en fisioterapia). ¿Puedo hacer Hot Vinyasa o mejor empiezo con otra clase?`),
      outWa(TOMAS, 4, '12:40', `Hola ${first(TOMAS)}, gracias por contarnos. Con la rodilla en recuperación te recomendamos empezar por Pilates o Yin: ambas trabajan fuerza y movilidad sin impacto. Le avisamos a la profe antes de tu clase para que te dé variaciones. Cuando el fisio te dé luz verde, pasas a la sala caliente.`, COORD),
      note(TOMAS, 4, '12:45', 'Lesión de rodilla izquierda (menisco) — avisar a la profe antes de Arde. Empieza con Pilates / Yin.', COORD),
      inWa(TOMAS, 4, '13:02', `Mil gracias, empiezo con Pilates entonces 💪`),
      autoWa(TOMAS, 1, first(TOMAS)),
      inWa(TOMAS, 0, '19:05', `Hoy salí feliz de Pilates, la profe Carolina me cuidó la rodilla todo el tiempo. ¿Ella da también los jueves?`, true),
    ],
    // ---- Daniela: late, lost the spot, credit returned as a courtesy ----
    [
      news(DANIELA, 20, NEWS_SEPT, false),
      autoWa(DANIELA, 1, first(DANIELA)),
      inWa(DANIELA, 1, '17:52', `Llegué 20 minutos tarde y ya no me dejaron entrar 😔 ¿Pierdo el crédito?`),
      outWa(DANIELA, 1, '18:05', `Hola ${first(DANIELA)}, qué pena contigo. La puerta cierra 15 minutos después del inicio por seguridad de la sala caliente. Esta vez te devolvimos el crédito; ya está en tu cuenta. ¿Te reservo la de mañana a la misma hora?`),
      inWa(DANIELA, 1, '18:12', `Gracias, de verdad. Sí, resérvame la de mañana. No vuelve a pasar 🙈`),
      outWa(DANIELA, 1, '18:14', `Hecho. Te llega el recordatorio 2 horas antes. ¡Descansa!`),
    ],
    // ---- Gabriela: invoice for her membership by email, then an unread WhatsApp nudge ----
    [
      autoMail(GABRIELA, 3, '11:30', first(GABRIELA), 'receipt', 'HOY-1037'),
      inMail(GABRIELA, 3, '16:40', 'Factura de mi membresía', `Hola,\n\n¿Me pueden enviar la factura electrónica de la renovación de este mes? La necesito para el reembolso de bienestar de mi empresa.\n\nGracias,\nGabriela`),
      outMail(GABRIELA, 2, '08:50', 'Re: Factura de mi membresía', `Hola ${first(GABRIELA)},\n\nClaro. La factura electrónica sale desde el sistema de facturación y te llega por correo en las próximas 24 horas; si no la ves, revisa la carpeta de promociones.\n\nUn abrazo,\nCamilo · ${studio}`),
      inWa(GABRIELA, 0, '12:30', `Hola, no me ha llegado la factura al correo, ¿me la reenvían? 🙏`, true),
    ],
    // ---- Antonia: reminder for the 7 p. m. class, then cannot make it (unread) ----
    [
      autoWa(ANTONIA, 0, first(ANTONIA)),
      inWa(ANTONIA, 0, '18:20', `Hoy no alcanzo a llegar a la de 7 p. m., ¿me la cancelan por fa? Sé que ya pasó la hora, disculpen`, true),
    ],
    // ---- Nicolás: a refund question by email, resolved ----
    [
      news(NICO, 20, NEWS_SEPT),
      inMail(NICO, 5, '08:15', 'Reembolso de la clase cancelada', `Buenas,\n\nLa clase del martes se canceló por el estudio y yo había pagado un pase individual. ¿Cómo funciona el reembolso?\n\nNicolás`),
      outMail(NICO, 5, '09:40', 'Re: Reembolso de la clase cancelada', `Hola ${first(NICO)},\n\nCuando cancelamos nosotros, el crédito vuelve a tu cuenta automáticamente (ya lo ves en la app, en Créditos) y no vence. Si prefieres el dinero de vuelta, respóndenos y lo devolvemos al mismo medio de pago en 5 días hábiles.\n\nValentina · ${studio}`, COORD),
      inMail(NICO, 5, '10:05', 'Re: Reembolso de la clase cancelada', `Perfecto, me quedo con el crédito. ¡Gracias por responder tan rápido!`),
    ],
    // ---- Mariana: her birthday in the meditation room (S-05 spb_cumple) ----
    [
      news(MARIANA, 50, NEWS_AUG),
      inWa(MARIANA, 10, '19:10', `Hola! Quiero reservar la sala de meditación para mi cumpleaños, somos 8. ¿Se puede con una sesión de respiración?`),
      outWa(MARIANA, 10, '19:25', `¡Feliz cumpleaños adelantado, ${first(MARIANA)}! Sí se puede: la sala de meditación es para hasta 8 personas y Felipe puede guiar 90 minutos de meditación y respiración. Te paso la cotización por acá en un momento.`, COORD),
      note(MARIANA, 9, '10:00', 'Cumpleaños: 8 personas, traen torta; el té va por nuestra cuenta. Precio acordado con coordinación.', COORD),
      autoMail(MARIANA, 9, '11:45', first(MARIANA), 'receipt', 'HOY-1019'),
      inWa(MARIANA, 2, '20:30', `Quedó divino, gracias a todos 💛 Felipe es un sol.`),
      outWa(MARIANA, 1, '08:10', `¡Nos alegra muchísimo! Se lo pasamos a Felipe. Gracias por celebrar con nosotros 🎂`),
    ],
    // ---- Salomé: breathwork on Saturdays ----
    [
      news(SALOME, 50, NEWS_AUG),
      news(SALOME, 20, NEWS_SEPT),
      inWa(SALOME, 6, '09:50', `Vi lo de Respiración los sábados 🙌 ¿hay que reservarla aparte o entra en la membresía?`),
      outWa(SALOME, 6, '10:05', `¡Hola ${first(SALOME)}! Entra en tu membresía como cualquier clase; solo resérvala desde la app porque la sala pequeña tiene 8 cupos.`),
    ],
    // ---- Martín: parking ----
    [
      inWa(MARTIN, 1, '14:20', `Buenas tardes, ¿tienen parqueadero cerca?`),
      outWa(MARTIN, 1, '14:35', `Hola ${first(MARTIN)}, hay un parqueadero público a media cuadra y bicicletero en la entrada. Si vienes en moto, avísanos al llegar y te indicamos dónde.`),
    ],
    // ---- Jerónimo: trial pass, answered next morning ----
    [
      inWa(JERO, 1, '20:15', `Hola, ¿todavía tienen la clase de prueba? Quiero probar la semana que viene`),
      outWa(JERO, 0, '07:30', `¡Hola ${first(JERO)}! Sí: la Clase de Prueba vale ${price('trial')} y puedes tomar cualquier clase del horario. ¿Qué día te gustaría? Te la dejo reservada.`),
    ],
  ];
  return threads.flatMap(settle).sort((a, b) => a.created_at.localeCompare(b.created_at));
}
