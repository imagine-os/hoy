import type { BaseRow, BookingRow, ClassSessionRow, CreditRow, EventRow, IntentionRow, InviteRow, MembershipRow, NotificationRow, NotificationPrefRow, PaymentMethodRow, PaymentRow, ProfileRow, ReviewRow, TeacherRow, UserRow } from '../schema';
import { tableNames } from '../schema';
import { demoUsers } from '../../auth/demoUsers';
import { tenant } from '../../tenant/tenant';
import { canvasSpecs } from '../../specs/canvasSpecs';
import { rng } from './rng';
import { NOW, base, dateOnly, iso, modalities, plans, rooms, teachers } from './catalog';
import { contentArticles, events as seedEvents, faqEntries } from './content';
import { currentLegal, legalDocuments } from './legal';
import { mediaAssets } from './media';
import { buildPayroll } from './payroll';

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
    profiles.push({ ...base(`prf_${id.slice(4)}`, daysAgo), user_id: id, full_name: name, initials: name.split(' ').map((s) => s[0]).join('').slice(0, 2), photo_url: null, birthday: r.chance(0.3) ? dateOnly(new Date(1975 + r.int(0, 30), r.chance(0.5) ? NOW.getMonth() : r.int(0, 11), r.int(1, 28))) : null, emergency_contact: null, marketing_optin: r.chance(0.7), whatsapp_verified: r.chance(0.8), notes: null });
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
    payments.push({ ...base(payId, daysAgo), user_id: uid, plan_id: plan.id, amount: plan.price, amount_paid: plan.price, note: null, currency: 'COP', method: r.pick(['card', 'pse', 'nequi', 'cash', 'transfer']), provider: r.chance(0.7) ? 'wompi' : 'manual', provider_ref: r.chance(0.7) ? `wmp_${r.int(100000, 999999)}` : null, status: 'approved', paid_at: iso(paidAt), taken_by: r.chance(0.3) ? 'usr_desk' : null });
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
  const custDays = new Set<string>(); // the demo customer books at most one class per day (tenant.studio.perPersonPerDay)
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    const n = r.int(4, tenant.studio.mats);
    const shuffled = [...customerIds].sort(() => r.next() - 0.5).slice(0, n);
    if (new Date(s.starts_at).getDate() === NOW.getDate() && !shuffled.includes('usr_cust') && r.chance(0.5)) shuffled[0] = 'usr_cust';
    for (const uid of shuffled) {
      if (uid === 'usr_cust') { const day = s.starts_at.slice(0, 10); if (custDays.has(day)) continue; custDays.add(day); }
      const past = s.status === 'completed';
      const status = past ? (r.chance(0.85) ? 'checked_in' : r.chance(0.5) ? 'no_show' : 'late_cancel') : 'booked';
      bookings.push({ ...base(`bk_${b++}`, 3), user_id: uid, session_id: s.id, status, paid_with: memberships.some((m) => m.user_id === uid) ? 'membership' : 'credit', credit_id: null, checked_in_at: status === 'checked_in' ? s.starts_at : null, cancelled_at: status === 'late_cancel' ? s.starts_at : null, rated: past && r.chance(0.4) });
      if (status !== 'late_cancel') s.booked_count++;
    }
    if (s.booked_count >= s.capacity) {
      for (let w = 0; w < r.int(1, 3); w++) db.waitlist.push({ ...base(`wl_${s.id}_${w}`, 1), user_id: r.pick(customerIds), session_id: s.id, position: w + 1, status: 'waiting', offered_at: null, claim_until: null });
    }
  }

  // One upcoming class today is always full, so the "Sin cupos" / "Full" state on C-01 and C-02 is real data (Jas review, 2026-09-17).
  const startOf = new Map(sessions.map((s) => [s.id, s.starts_at]));
  const bookedIn = (sid: string, uid: string) => bookings.some((bk) => bk.session_id === sid && bk.user_id === uid && bk.status === 'booked');
  const fullToday = sessions
    .filter((s) => s.status === 'scheduled' && s.starts_at.slice(0, 10) === dateOnly(NOW) && new Date(s.starts_at) > NOW && !bookedIn(s.id, 'usr_cust'))
    .sort((a, b) => b.booked_count - a.booked_count || a.starts_at.localeCompare(b.starts_at))[0];
  if (fullToday) {
    // Fill from people who already have an earlier class today first, so nobody's "next class" notification changes.
    const hasEarlier = (uid: string) => bookings.some((bk) => bk.user_id === uid && bk.status === 'booked' && (startOf.get(bk.session_id) ?? '') < fullToday.starts_at);
    const fillers = customerIds.filter((uid) => uid !== 'usr_cust' && !bookedIn(fullToday.id, uid)).sort((a, b) => Number(hasEarlier(b)) - Number(hasEarlier(a)));
    for (const uid of fillers) {
      if (fullToday.booked_count >= fullToday.capacity) break;
      bookings.push({ ...base(`bk_full_${fullToday.booked_count}`, 1), user_id: uid, session_id: fullToday.id, status: 'booked', paid_with: memberships.some((m) => m.user_id === uid) ? 'membership' : 'credit', credit_id: null, checked_in_at: null, cancelled_at: null, rated: false });
      fullToday.booked_count++;
    }
    const waiter = customerIds.find((uid) => uid !== 'usr_cust' && !bookedIn(fullToday.id, uid));
    if (waiter && !(db.waitlist as (BaseRow & { session_id: string })[]).some((w) => w.session_id === fullToday.id)) {
      db.waitlist.push({ ...base(`wl_${fullToday.id}_0`, 1), user_id: waiter, session_id: fullToday.id, position: 1, status: 'waiting', offered_at: null, claim_until: null });
    }
  }

  // intentions today for a few people
  const intentions = db.intentions as IntentionRow[];
  for (const uid of customerIds.slice(1, 8)) intentions.push({ ...base(`int_${uid}`, 0), user_id: uid, date: dateOnly(NOW), movement: r.pick(['enraiza', 'fluye', 'arde', 'libera'] as const) });

  // ---- content as data: club rules (C-13), FAQ (C-14/C-15), events (C-23) ----
  db.content_articles.push(...contentArticles);
  db.faq_entries.push(...faqEntries);
  db.events.push(...seedEvents);

  // event RSVPs: each event between a third and three quarters full; the demo customer is going to the first.
  (db.events as EventRow[]).forEach((ev, ei) => {
    const n = Math.max(2, Math.min(ev.capacity - 2, r.int(Math.ceil(ev.capacity / 3), Math.round(ev.capacity * 0.75))));
    const who = [...customerIds].sort(() => r.next() - 0.5).slice(0, n);
    if (ei === 0 && !who.includes('usr_cust')) who[0] = 'usr_cust';
    who.forEach((uid, i) => db.event_rsvps.push({ ...base(`rsv_${ev.id}_${i}`, r.int(0, 12)), event_id: ev.id, user_id: uid, status: 'going', payment_id: null, guests: 0 }));
  });

  // reviews (C-10): every past class the seed marked as rated has a real review row.
  const GOOD_TAGS = ['music', 'heat', 'pace', 'clarity'] as const;
  const FIX_TAGS = ['crowded', 'late', 'tooHard', 'tooEasy'] as const;
  const COMMENTS = ['Salí como nueva.', 'La música acompañó muy bien.', 'Sala un poco llena hoy.', 'Buenas correcciones, gracias.', 'Ideal para empezar la semana.'];
  const reviews = db.reviews as ReviewRow[];
  bookings.filter((b) => b.rated && b.status === 'checked_in').forEach((b, i) => {
    const s = sessions.find((x) => x.id === b.session_id);
    if (!s) return;
    const rating = r.chance(0.62) ? 5 : r.chance(0.7) ? 4 : 3;
    const tags = new Set<string>([rating >= 4 ? r.pick(GOOD_TAGS) : r.pick(FIX_TAGS)]);
    if (rating === 5 && r.chance(0.4)) tags.add(r.pick(GOOD_TAGS));
    reviews.push({ ...base(`rev_${i}`, 1), user_id: b.user_id, class_session_id: s.id, teacher_id: s.teacher_id, rating, tags: [...tags], comment: r.chance(0.22) ? r.pick(COMMENTS) : null, visibility: r.chance(0.6) ? 'anonymous' : 'named', created_at: s.ends_at, updated_at: s.ends_at });
  });
  // teachers.rating_avg is the average of the reviews above (copied, never mutating the catalog rows).
  db.teachers = (db.teachers as TeacherRow[]).map((tea) => {
    const mine = reviews.filter((x) => x.teacher_id === tea.id);
    return mine.length ? { ...tea, rating_avg: Math.round((mine.reduce((a, x) => a + x.rating, 0) / mine.length) * 10) / 10 } : tea;
  });

  // saved payment methods (C-05): one for anyone who paid electronically, two for the demo customer.
  const methods = db.payment_methods as PaymentMethodRow[];
  const BRANDS: Record<string, string> = { card: 'Visa', pse: 'Bancolombia', nequi: 'Nequi' };
  customerIds.forEach((uid, i) => {
    const pay = payments.find((p) => p.user_id === uid && p.provider === 'wompi' && p.status === 'approved' && p.method !== 'cash' && p.method !== 'transfer');
    if (!pay) return;
    const kind = pay.method as 'card' | 'pse' | 'nequi';
    methods.push({ ...base(`pm_${i}_${kind}`, r.int(5, 90)), user_id: uid, provider: 'wompi', kind, brand: BRANDS[kind] ?? 'Wompi', last4: kind === 'card' ? String(r.int(1000, 9999)) : null, token_ref: `tok_demo_${r.int(100000, 999999)}`, is_default: true, expires: kind === 'card' ? `0${r.int(1, 9)}/2${r.int(7, 9)}` : null });
  });
  if (!methods.some((m) => m.user_id === 'usr_cust')) methods.push({ ...base('pm_cust_card', 40), user_id: 'usr_cust', provider: 'wompi', kind: 'card', brand: 'Visa', last4: '4242', token_ref: 'tok_demo_424242', is_default: true, expires: '08/28' });
  methods.push({ ...base('pm_cust_nequi', 12), user_id: 'usr_cust', provider: 'wompi', kind: 'nequi', brand: 'Nequi', last4: null, token_ref: 'tok_demo_900112', is_default: false, expires: null });

  // invites (C-16): the demo customer has one pending and one rewarded; a few others have sent one.
  const inviteCode = (uid: string) => `HOY-${uid.slice(-4).toUpperCase()}`;
  const rewardCredit: CreditRow = { ...base('crd_invite_reward', 30), user_id: 'usr_cust', plan_id: null, payment_id: null, delta: 1, reason: 'gift', expires_at: null } as CreditRow;
  credits.push(rewardCredit);
  const invites = db.invites as InviteRow[];
  invites.push(
    { ...base('inv_cust_1', 6), inviter_user_id: 'usr_cust', invitee_phone: '+57 300 000 0002', invitee_email: null, invitee_user_id: null, channel: 'whatsapp', code: inviteCode('usr_cust'), session_id: null, status: 'sent', reward_credit_id: null },
    { ...base('inv_cust_2', 30), inviter_user_id: 'usr_cust', invitee_phone: null, invitee_email: 'invitada@demo.hoyos.test', invitee_user_id: 'usr_c11', channel: 'email', code: inviteCode('usr_cust'), session_id: null, status: 'rewarded', reward_credit_id: rewardCredit.id },
  );
  ['usr_c02', 'usr_c05', 'usr_c09'].forEach((uid, i) => invites.push({ ...base(`inv_${uid}`, r.int(3, 45)), inviter_user_id: uid, invitee_phone: null, invitee_email: null, invitee_user_id: null, channel: 'link', code: inviteCode(uid), session_id: null, status: i === 0 ? 'joined' : 'opened', reward_credit_id: null }));

  // notifications (C-24): a real inbox per person, built from what actually happened to them.
  const notifications = db.notifications as NotificationRow[];
  let nid = 0;
  const notify = (uid: string, kind: NotificationRow['kind'], title: NotificationRow['title'], body: NotificationRow['body'], opts?: { at?: string; link?: string | null; via?: NotificationRow['sent_via']; read?: boolean }) => {
    const at = opts?.at ?? iso(NOW);
    notifications.push({ ...base(`ntf_${nid++}`, 0), created_at: at, updated_at: at, user_id: uid, kind, title, body, read_at: opts?.read ? at : null, deep_link: opts?.link ?? null, sent_via: opts?.via ?? 'in_app' });
  };
  const hoursBefore = (isoDate: string, h: number) => iso(new Date(new Date(isoDate).getTime() - h * 3600e3));
  for (const uid of customerIds) {
    const mine = bookings.filter((b) => b.user_id === uid);
    const upcoming = mine.filter((b) => b.status === 'booked').map((b) => sessions.find((s) => s.id === b.session_id)).filter((s): s is ClassSessionRow => !!s).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    if (upcoming) notify(uid, 'booking', { es: `Reserva confirmada · ${upcoming.title}`, en: `Booking confirmed · ${upcoming.title}` }, { es: 'Llega 10 minutos antes. Puedes cambiarla hasta 2 horas antes.', en: 'Arrive 10 minutes early. You can change it until 2 hours before.' }, { at: hoursBefore(upcoming.starts_at, 26), link: `/app/class/${upcoming.id}`, via: 'whatsapp' });
    const lastPay = payments.filter((p) => p.user_id === uid && p.status === 'approved').sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))[0];
    if (lastPay) notify(uid, 'payment', { es: 'Recibo de pago', en: 'Payment receipt' }, { es: 'Tu recibo está en Historial → Pagos.', en: 'Your receipt is in History → Payments.' }, { at: lastPay.paid_at ?? undefined, link: '/app/history', via: 'email', read: true });
    const toRate = mine.filter((b) => b.status === 'checked_in' && !b.rated).map((b) => sessions.find((s) => s.id === b.session_id)).filter((s): s is ClassSessionRow => !!s).sort((a, b) => b.ends_at.localeCompare(a.ends_at))[0];
    if (toRate) notify(uid, 'review', { es: `¿Cómo estuvo ${toRate.title}?`, en: `How was ${toRate.title}?` }, { es: 'Dos toques y nos ayudas a cuidar la calidad de la sala.', en: 'Two taps and you help us keep the room’s quality.' }, { at: toRate.ends_at, link: `/app/rate/${toRate.id}`, via: 'push' });
    if (r.chance(0.55)) notify(uid, 'event', { es: 'Nuevo en la agenda: Baño de sonido · Luna llena', en: 'New on the calendar: Full Moon Sound Bath' }, { es: 'Cupos limitados. Incluido para socios de Membresía.', en: 'Limited spots. Included for Membership members.' }, { at: iso(new Date(NOW.getTime() - r.int(1, 5) * 864e5)), link: '/app/events/evt_sound_bath', via: 'email', read: r.chance(0.5) });
  }
  for (const w of db.waitlist as (BaseRow & { user_id: string; session_id: string; status: string })[]) {
    if (w.status !== 'waiting') continue;
    const s = sessions.find((x) => x.id === w.session_id);
    if (!s || r.chance(0.6)) continue;
    notify(w.user_id, 'waitlist', { es: `Estás en lista de espera · ${s.title}`, en: `You are on the waitlist · ${s.title}` }, { es: 'Te escribimos por WhatsApp si se libera un cupo; tienes 30 minutos para reclamarlo.', en: 'We message you on WhatsApp if a spot opens; you have 30 minutes to claim it.' }, { at: hoursBefore(s.starts_at, 30), link: `/app/waitlist/${s.id}`, via: 'whatsapp' });
  }
  notify('usr_cust', 'invite', { es: 'Tu invitada reservó su primera clase', en: 'Your guest booked her first class' }, { es: 'Te abonamos una clase de regalo. Está en Créditos.', en: 'We credited you one class. It is in Credits.' }, { at: iso(new Date(NOW.getTime() - 29 * 864e5)), link: '/app/credits', via: 'push', read: true });

  // notification prefs (C-24 / C-19): no row means enabled, so only real choices are stored.
  const prefs = db.notification_prefs as NotificationPrefRow[];
  const CHANNELS = ['whatsapp', 'email', 'push'] as const;
  const CATEGORIES = ['bookings', 'waitlist', 'payments', 'events', 'marketing'] as const;
  for (const channel of CHANNELS) for (const category of CATEGORIES) prefs.push({ ...base(`np_cust_${channel}_${category}`, 60), user_id: 'usr_cust', channel, category, enabled: !(category === 'marketing' && channel === 'push') });
  ['usr_c04', 'usr_c08', 'usr_c14', 'usr_c21'].forEach((uid) => prefs.push({ ...base(`np_${uid}_marketing`, r.int(5, 80)), user_id: uid, channel: 'whatsapp', category: 'marketing', enabled: false }));

  // feature flags from spec toggles
  for (const spec of Object.values(canvasSpecs)) for (const t of spec.toggles ?? []) {
    db.feature_flags.push({ ...base(`ff_${spec.code}_${t.label}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase(), 100), key: `${spec.code}.${t.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`, page_code: spec.code, label: t.label, enabled: t.on, audience: 'all' });
  }

  // ---- legal library (A-06): six kinds, bilingual, versioned ----
  db.legal_documents.push(...legalDocuments);
  for (const uid of customerIds) { db.consents.push({ ...base(`con_${uid}_t`, 30), user_id: uid, legal_document_id: 'leg_terms_es', accepted_at: iso(NOW), ip: null }); }
  // Acceptance of the waiver version in force: every member signed it on their first visit.
  const waiver = currentLegal('waiver');
  customerIds.forEach((uid, i) => {
    const signedAt = new Date(NOW.getTime() - r.int(20, 180) * 864e5);
    db.legal_acceptances.push({ ...base(`lac_${uid}_waiver`, r.int(20, 180)), user_id: uid, document_id: waiver.id, kind: waiver.kind, version: waiver.version, accepted_at: iso(signedAt), channel: i % 4 === 0 ? 'front_desk' : 'app', ip: null });
    db.legal_acceptances.push({ ...base(`lac_${uid}_terms`, r.int(20, 180)), user_id: uid, document_id: 'leg_terms_es', kind: 'terms', version: '1.0', accepted_at: iso(signedAt), channel: 'app', ip: null });
  });

  // ---- media library (M-02d): one pending slot per known place art belongs ----
  db.media_assets.push(...mediaAssets);

  // ---- teacher payroll (M-09a / S-03): three months, the latest still a draft ----
  const payroll = buildPayroll({ sessions, bookings, templates: db.class_templates as (BaseRow & { teacher_id: string; weekday: number; active: boolean })[], teachers: db.teachers as TeacherRow[] });
  db.payroll_runs.push(...payroll.runs);
  db.payroll_lines.push(...payroll.lines);

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
