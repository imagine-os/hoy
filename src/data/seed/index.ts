import type { BaseRow, BookingRow, ClassSessionRow, CreditRow, IntentionRow, MembershipRow, PaymentRow, ProfileRow, UserRow } from '../schema';
import { tableNames } from '../schema';
import { demoUsers } from '../../auth/demoUsers';
import { tenant } from '../../tenant/tenant';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { rng } from './rng';
import { NOW, base, dateOnly, iso, modalities, plans, rooms, teachers } from './catalog';

const FIRST = ['Camila', 'Nicolás', 'Sara', 'Tomás', 'Mariana', 'Julián', 'Daniela', 'Sebastián', 'Gabriela', 'Alejandro', 'Antonia', 'Samuel', 'Salomé', 'Emilio', 'Luciana', 'Martín', 'Elena', 'David', 'Paulina', 'Jerónimo', 'Amelia', 'Simón', 'Renata', 'Lucas', 'Violeta', 'Benjamín', 'Catalina', 'Joaquín', 'Isabel', 'Gael'];
const LAST = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez', 'Ruiz', 'Álvarez', 'Castro', 'Vargas', 'Romero', 'Suárez', 'Moreno', 'Muñoz', 'Rojas', 'Medina', 'Guerrero', 'Cortés'];

/** Weekly timetable: 4 classes/day Mon–Sat. [weekday, 'HH:MM', modality, teacher] */
const TIMETABLE: [number, string, string, string][] = [];
for (const wd of [1, 2, 3, 4, 5, 6]) {
  TIMETABLE.push([wd, '06:30', wd % 2 ? 'mod_morning_flow' : 'mod_hot_vinyasa', wd % 2 ? 'tea_manuela' : 'tea_isabela']);
  TIMETABLE.push([wd, '08:00', wd % 2 ? 'mod_pilates' : 'mod_barre', wd % 2 ? 'tea_paula' : 'tea_daniel']);
  TIMETABLE.push([wd, wd === 6 ? '10:00' : '17:30', wd % 3 === 0 ? 'mod_yin' : 'mod_hot_vinyasa', wd % 3 === 0 ? 'tea_santiago' : 'tea_andres']);
  TIMETABLE.push([wd, wd === 6 ? '11:30' : '19:00', wd % 2 ? 'mod_meditacion' : 'mod_pilates', wd % 2 ? 'tea_felipe' : 'tea_carolina']);
}

export function buildSeed(): Record<string, BaseRow[]> {
  const r = rng(2026);
  const db: Record<string, BaseRow[]> = Object.fromEntries(tableNames.map((t) => [t, []]));

  db.tenants.push({ ...base('ten_hoy', 365), id: tenant.id, slug: tenant.slug, name: tenant.name, legal_name: tenant.legalName, timezone: tenant.timezone, currency: tenant.currency, default_locale: tenant.defaultLocale, settings: { studio: tenant.studio, hours: tenant.hours } });

  // people: demo users + customers
  const users = db.users as UserRow[], profiles = db.profiles as ProfileRow[];
  const addPerson = (id: string, name: string, role: string, email: string, daysAgo: number) => {
    users.push({ ...base(id, daysAgo), email, phone: `+57 3${r.int(10, 50)}${r.int(1000000, 9999999)}`, status: 'active', locale: 'es', last_sign_in_at: iso(new Date(NOW.getTime() - r.int(0, 72) * 3600e3)) });
    profiles.push({ ...base(`prf_${id.slice(4)}`, daysAgo), user_id: id, full_name: name, initials: name.split(' ').map((s) => s[0]).join('').slice(0, 2), photo_url: null, birthday: null, emergency_contact: null, marketing_optin: r.chance(0.7), whatsapp_verified: r.chance(0.8), notes: null });
    db.user_roles.push({ ...base(`rol_${id.slice(4)}`, daysAgo), user_id: id, role, granted_by: 'usr_super' });
  };
  for (const u of demoUsers) if (u.role !== 'public') addPerson(u.id, u.name, u.role, u.email, 120);
  const customerIds: string[] = ['usr_cust'];
  for (let i = 0; i < 30; i++) {
    const name = `${FIRST[i]} ${LAST[(i * 7) % LAST.length]}`;
    const id = `usr_c${String(i + 1).padStart(2, '0')}`;
    addPerson(id, name, 'customer', `${FIRST[i].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}${i + 1}@demo.hoyos.test`, r.int(5, 200));
    customerIds.push(id);
  }

  db.modalities.push(...modalities); db.rooms.push(...rooms); db.teachers.push(...teachers); db.plans.push(...plans);

  // templates
  TIMETABLE.forEach(([weekday, start, mod, tea], i) => {
    const m = modalities.find((x) => x.id === mod)!;
    db.class_templates.push({ ...base(`tpl_${i}`, 150), title: m.name_es, modality_id: mod, teacher_id: tea, room_id: 'room_main', weekday, start_time: start, duration_min: m.duration_min, capacity: tenant.studio.mats, level: 'all', active: true });
  });

  // sessions: 7 days back, 7 days forward (skip Sundays)
  const sessions = db.class_sessions as ClassSessionRow[];
  for (let d = -7; d <= 7; d++) {
    const day = new Date(NOW); day.setDate(day.getDate() + d); day.setHours(0, 0, 0, 0);
    const wd = day.getDay();
    TIMETABLE.filter((t) => t[0] === wd).forEach(([, start, mod, tea], i) => {
      const m = modalities.find((x) => x.id === mod)!;
      const [h, mi] = start.split(':').map(Number);
      const startsAt = new Date(day); startsAt.setHours(h, mi, 0, 0);
      const endsAt = new Date(startsAt.getTime() + m.duration_min * 60e3);
      const past = endsAt < NOW;
      const cancelled = d > 0 && r.chance(0.04);
      sessions.push({ ...base(`ses_${dateOnly(day)}_${i}`, 14), template_id: `tpl_${TIMETABLE.findIndex((t) => t[0] === wd && t[1] === start)}`, title: m.name_es, modality_id: mod, teacher_id: tea, room_id: 'room_main', starts_at: iso(startsAt), ends_at: iso(endsAt), capacity: tenant.studio.mats, booked_count: 0, level: 'all', status: cancelled ? 'cancelled' : past ? 'completed' : 'scheduled', cancel_reason: cancelled ? 'Profesor enfermo' : null });
    });
  }

  // memberships, credits, payments
  const memberships = db.memberships as MembershipRow[], credits = db.credits as CreditRow[], payments = db.payments as PaymentRow[];
  customerIds.forEach((uid, i) => {
    const kind = uid === 'usr_cust' ? 'monthly' : r.pick(['monthly', 'monthly', 'annual', 'pack10', 'pack3', 'single', 'trial', 'none'] as const);
    if (kind === 'none') return;
    const plan = plans.find((p) => p.slug === kind)!;
    const daysAgo = r.int(1, 60);
    const payId = `pay_${i}_${kind}`;
    const paidAt = new Date(NOW); paidAt.setDate(paidAt.getDate() - daysAgo);
    payments.push({ ...base(payId, daysAgo), user_id: uid, plan_id: plan.id, amount: plan.price, currency: 'COP', method: r.pick(['card', 'pse', 'nequi', 'cash', 'transfer']), provider: r.chance(0.7) ? 'wompi' : 'manual', provider_ref: r.chance(0.7) ? `wmp_${r.int(100000, 999999)}` : null, status: 'approved', paid_at: iso(paidAt), taken_by: r.chance(0.3) ? 'usr_desk' : null });
    db.invoices.push({ ...base(`inv_${i}`, daysAgo), payment_id: payId, number: `HOY-${String(1000 + i)}`, subtotal: Math.round(plan.price / 1.19), tax: plan.price - Math.round(plan.price / 1.19), total: plan.price, issued_at: iso(paidAt), pdf_url: null, dian_cufe: null });
    if (plan.family === 'membresia') {
      const renews = new Date(paidAt); renews.setMonth(renews.getMonth() + (kind === 'annual' ? 12 : 1));
      memberships.push({ ...base(`mem_${i}`, daysAgo), user_id: uid, plan_id: plan.id, status: r.chance(0.9) ? 'active' : 'paused', starts_at: dateOnly(paidAt), renews_at: dateOnly(renews), ends_at: null, paused_until: null });
    } else if (plan.credits) {
      const exp = new Date(paidAt); exp.setDate(exp.getDate() + (plan.validity_days ?? 30));
      credits.push({ ...base(`crd_${i}_buy`, daysAgo), user_id: uid, plan_id: plan.id, payment_id: payId, delta: plan.credits, reason: 'purchase', expires_at: dateOnly(exp) });
    }
  });

  // bookings: fill sessions
  const bookings = db.bookings as BookingRow[];
  let b = 0;
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    const n = r.int(4, tenant.studio.mats);
    const shuffled = [...customerIds].sort(() => r.next() - 0.5).slice(0, n);
    if (new Date(s.starts_at).getDate() === NOW.getDate() && !shuffled.includes('usr_cust') && r.chance(0.5)) shuffled[0] = 'usr_cust';
    for (const uid of shuffled) {
      const past = s.status === 'completed';
      const status = past ? (r.chance(0.85) ? 'checked_in' : r.chance(0.5) ? 'no_show' : 'late_cancel') : 'booked';
      bookings.push({ ...base(`bk_${b++}`, 3), user_id: uid, session_id: s.id, status, paid_with: memberships.some((m) => m.user_id === uid) ? 'membership' : 'credit', credit_id: null, checked_in_at: status === 'checked_in' ? s.starts_at : null, cancelled_at: status === 'late_cancel' ? s.starts_at : null, rated: past && r.chance(0.4) });
      if (status !== 'late_cancel') s.booked_count++;
    }
    if (s.booked_count >= s.capacity) {
      for (let w = 0; w < r.int(1, 3); w++) db.waitlist.push({ ...base(`wl_${s.id}_${w}`, 1), user_id: r.pick(customerIds), session_id: s.id, position: w + 1, status: 'waiting', offered_at: null, claim_until: null });
    }
  }

  // intentions today for a few people
  const intentions = db.intentions as IntentionRow[];
  for (const uid of customerIds.slice(1, 8)) intentions.push({ ...base(`int_${uid}`, 0), user_id: uid, date: dateOnly(NOW), movement: r.pick(['enraiza', 'fluye', 'arde', 'libera'] as const) });

  // feature flags from spec toggles
  for (const spec of Object.values(canvasSpecs)) for (const t of spec.toggles ?? []) {
    db.feature_flags.push({ ...base(`ff_${spec.code}_${t.label}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase(), 100), key: `${spec.code}.${t.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, page_code: spec.code, label: t.label, enabled: t.on, audience: 'all' });
  }

  // legal + consents
  db.legal_documents.push(
    { ...base('leg_terms_es', 100), kind: 'terms', version: '1.0', locale: 'es', title: 'Términos y condiciones', body_md: '# Términos y condiciones\n\n_Borrador. Sustituir por el texto legal revisado._', published_at: iso(NOW) },
    { ...base('leg_privacy_es', 100), kind: 'privacy', version: '1.0', locale: 'es', title: 'Política de privacidad', body_md: '# Política de privacidad\n\nTratamiento de datos conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.\n\n_Borrador._', published_at: iso(NOW) },
  );
  for (const uid of customerIds) { db.consents.push({ ...base(`con_${uid}_t`, 30), user_id: uid, legal_document_id: 'leg_terms_es', accepted_at: iso(NOW), ip: null }); }

  db.gift_cards.push(
    { ...base('gc_1', 10), code: 'HOY-REGALO-2401', buyer_user_id: 'usr_c03', recipient_name: 'Ana', recipient_contact: '+57 300 000 0001', amount: 110000, balance: 110000, deliver_at: iso(NOW), redeemed_by: null, status: 'sent' },
    { ...base('gc_2', 40), code: 'HOY-REGALO-2377', buyer_user_id: 'usr_c07', recipient_name: 'Pedro', recipient_contact: 'pedro@example.com', amount: 58000, balance: 0, deliver_at: null, redeemed_by: 'usr_c11', status: 'redeemed' },
  );

  db.email_templates.push(
    { ...base('em_receipt', 90), key: 'receipt', name: 'Recibo de pago', trigger: 'payment.approved', subject: { es: 'Tu recibo de HOY', en: 'Your HOY receipt' }, body_mjml: '<mjml>…</mjml>', version: 1, active: true },
    { ...base('em_welcome', 90), key: 'welcome', name: 'Bienvenida', trigger: 'user.created', subject: { es: 'Bienvenido a HOY', en: 'Welcome to HOY' }, body_mjml: '<mjml>…</mjml>', version: 2, active: true },
    { ...base('em_reminder', 90), key: 'class_reminder', name: 'Recordatorio de clase', trigger: 'booking.t-2h', subject: { es: 'Tu clase es en 2 horas', en: 'Your class is in 2 hours' }, body_mjml: '<mjml>…</mjml>', version: 1, active: false },
  );
  db.wa_templates.push(
    { ...base('wa_otp', 90), key: 'otp', name: 'Código de acceso', category: 'authentication', body: { es: 'Tu código HOY es {{1}}.', en: 'Your HOY code is {{1}}.' }, approval_status: 'approved', active: true },
    { ...base('wa_reminder', 90), key: 'class_reminder', name: 'Recordatorio de clase', category: 'utility', body: { es: 'Hola {{1}}, tu clase de {{2}} empieza a las {{3}}.', en: 'Hi {{1}}, your {{2}} class starts at {{3}}.' }, approval_status: 'approved', active: true },
    { ...base('wa_waitlist', 90), key: 'waitlist_offer', name: 'Cupo liberado', category: 'utility', body: { es: 'Se liberó un cupo en {{1}}. Tienes 30 min para reclamarlo.', en: 'A spot opened in {{1}}. You have 30 min to claim it.' }, approval_status: 'pending', active: false },
  );
  db.automations.push(
    { ...base('aut_1', 80), name: 'Recordatorio 2h antes', trigger: 'booking.t-2h', channel: 'whatsapp', template_key: 'class_reminder', delay_min: 0, quiet_hours: { from: '21:00', to: '07:00' }, enabled: true },
    { ...base('aut_2', 80), name: 'Recibo por email', trigger: 'payment.approved', channel: 'email', template_key: 'receipt', delay_min: 0, quiet_hours: null, enabled: true },
    { ...base('aut_3', 80), name: 'Oferta de lista de espera', trigger: 'waitlist.offered', channel: 'whatsapp', template_key: 'waitlist_offer', delay_min: 0, quiet_hours: null, enabled: false },
  );
  for (let i = 0; i < 12; i++) db.message_log.push({ ...base(`msg_${i}`, r.int(0, 6)), user_id: r.pick(customerIds), channel: r.pick(['whatsapp', 'email']), template_key: r.pick(['class_reminder', 'receipt']), automation_id: r.pick(['aut_1', 'aut_2']), status: r.pick(['sent', 'delivered', 'read']), sent_at: iso(NOW), payload: null });
  for (let i = 0; i < 20; i++) db.audit_log.push({ ...base(`aud_${i}`, r.int(0, 10)), actor_id: r.pick(['usr_desk', 'usr_coord', 'usr_super', 'usr_fin']), action: r.pick(['booking.create', 'payment.take', 'session.cancel', 'member.update', 'flag.toggle']), entity: r.pick(['bookings', 'payments', 'class_sessions', 'profiles', 'feature_flags']), entity_id: null, diff: null, ip: null });

  return db;
}
