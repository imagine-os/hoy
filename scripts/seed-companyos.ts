// Writes Hoy's made-up sample (src/data/seed, buildSeed) as Company OS's test seed: <seeds>/hoy.json, loaded once into
// a new test tenant (test-hoy's hoy-dev) by the deploy (Company OS ADR 0025 amendment 2026-10-30, the registry's
// `testSeed`), so a super admin viewing test-hoy as any role sees data. Fictional data only.
//   node scripts/seed-companyos.ts ../Company-OS/deploy/seeds [--as-of 2026-11-01T06:00:00-05:00] [--recipe-refs]
// (npm run seed:companyos). Run it again whenever src/data/seed or the recipe's products change, and commit the
// result in Company OS. Checked by scripts/test-seed-companyos.mjs.
//
// What it writes (Company OS entities; the import runs no module rules, so this file does what they would):
// - a person per sample user (one per role, 31 customers) and per teacher, with a made-up name, address
//   (@demo.hoyos.test) and no phone (Colombia has no reserved range for made-up numbers); the studio publishes its real teachers' names, so the seed
//   never uses them;
// - `memberships`: each sample user's role key (the recipe's, or the system super_admin). Company OS's seed loader makes
//   a login per membership and links it to the person (ADR 0025 addendum 2026-10-31);
// - customers' `member` facets and teachers' `coach` facets;
// - the sample's weekly timetable (src/data/seed/timetable.ts) as `schedule` rows, each with its coach, its class type
//   (the recipe's tenant field `modality`, the class type's slug), its length and the studio's mats (Company OS lane Y1:
//   the recipe holds no timetable; Administration enters Hoy's real one in the app);
// - the classes (`occurrence`) of the sample's two weeks around `asOf`, plus two more weeks of the timetable ahead,
//   each with its coach and its schedule (so class generation, once the test tenant goes live after the seed, continues
//   the timetable without making a date again); with --recipe-refs, classes and schedules name their room (the
//   recipe's, by name: see ROOM_OF);
// - the customers' approved payments of the recipe's products with their numbered receipts, a credit lot per pack or
//   trial with its grant entry, and the sample's bookings that the rules would accept: one a day per person, each
//   taking a class from a usable lot (credit entry) or paid by its own single-class payment; the rest are left out;
//   each class's booked_count counts what is left.
// With --recipe-refs (what Company OS commits), recipe rows are named by their fields, which the loader resolves:
// products by `key`, rooms by `name`. Without it, no product or room is written.
// Ids are derived from the sample's ids, so the same `asOf` gives the same file on any machine.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

/** The date the sample is built for: its classes run two weeks back and three weeks on from here. */
export const DEFAULT_AS_OF = '2026-11-01T06:00:00-05:00';
const TIMEZONE = 'America/Bogota';
const UTC_OFFSET = '-05:00'; // Bogota keeps no daylight saving time.
/** Days of the timetable added after the sample's last day (the sample stops 7 days ahead). */
const EXTRA_DAYS = 14;
/** Classes a lot keeps for what lies ahead when the history is booked (see the bookings below). */
const PAST_RESERVE = 2;

/** Hoy role → Company OS role key (the recipe's keys; super admin is Company OS's system role). */
export const ROLE_KEY_OF: Record<string, string> = {
  super_admin: 'super_admin', admin: 'administrator', coordinator: 'booking_manager', front_desk: 'front_desk',
  finance: 'treasurer', teacher: 'coach', maintenance: 'maintenance', marketing: 'marketing', developer: 'developer',
  customer: 'member',
};
export const ROLE_KEYS: string[] = [...new Set(Object.values(ROLE_KEY_OF))];

/** The sample's room → the recipe's room (`resource` row), by its name. The sample builds every class in its main room. */
export const ROOM_OF: Record<string, string> = { room_main: 'Main room', room_meditacion: 'Small room' };
/** The room a timetable class takes, as the sample builds its classes (src/data/seed/index.ts). */
const TIMETABLE_ROOM = 'room_main';

/** Made-up names for the catalog's teachers, in catalog order (the real ones are published on Hoy's site). */
const TEACHER_NAMES = ['Lucía Montoya', 'Tomás Villegas', 'Paula Echeverri', 'Andrés Quintero', 'Mariana Salazar', 'Daniela Ochoa', 'Natalia Giraldo', 'Sebastián Uribe', 'Isabel Carmona', 'Felipe Arboleda', 'Manuela Zapata'];

type Row = Record<string, any>;
type SeedRecord = { entity: string; id: string; createdAt?: string; data: Record<string, unknown> };
export type CompanyOsSeed = { fictional: true; _about: string; asOf: string; records: SeedRecord[]; files: never[]; memberships: { person: string; role: string }[] };
type Recipe = { modules?: { key: string; settings?: Row }[]; records?: { entity: string; rows: Row[] }[]; fields?: { entity: string; field: string; config?: { options?: { value: string }[] } }[] };
export type HoySample = { db: Record<string, Row[]>; TIMETABLE: Row[]; timetableId: (row: Row) => string; teachers: Row[]; modalities: Row[]; demoUsers: Row[]; mats: number };

/**
 * Hoy's sample as the app builds it, on a clock frozen at `asOf` (the sample is dated from "now"): bundled with
 * esbuild, as scripts/test-sample-clock.mjs does, so `new Date()` and `Date.now()` inside it return `asOf`.
 */
export async function loadHoySample(asOf: string = DEFAULT_AS_OF): Promise<HoySample> {
  const now = Date.parse(asOf);
  if (Number.isNaN(now)) throw new Error(`--as-of ${asOf} is not a date`);
  const scratch = mkdtempSync(join(tmpdir(), 'hoy-seed-companyos-'));
  try {
    const outfile = join(scratch, 'sample.mjs');
    await build({
      stdin: {
        contents: [
          "export { buildSeed } from './src/data/seed';",
          "export { TIMETABLE, timetableId } from './src/data/seed/timetable';",
          "export { teachers, modalities } from './src/data/seed/catalog';",
          "export { demoUsers } from './src/auth/demoUsers';",
          "export { tenant } from './src/tenant/tenant';",
        ].join('\n'),
        resolveDir: fileURLToPath(new URL('..', import.meta.url)),
        loader: 'ts',
      },
      bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent',
      define: { Date: 'FrozenDate', 'import.meta.env.BASE_URL': '"/"' },
      banner: { js: `class FrozenDate extends Date { constructor(...args) { super(...(args.length ? args : [${now}])); } static now() { return ${now}; } }` },
    });
    const m = await import(pathToFileURL(outfile).href);
    return { db: m.buildSeed(), TIMETABLE: [...m.TIMETABLE], timetableId: m.timetableId, teachers: m.teachers, modalities: m.modalities, demoUsers: m.demoUsers, mats: m.tenant.studio.mats };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** A stable UUID (version 5 layout) for one of the sample's ids. */
function uuid(name: string): string {
  const h = createHash('sha1').update(`hoy-companyos-seed:${name}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

const dayOf = (at: string | number) => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date(at));
const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const isoAt = (ms: number) => new Date(ms).toISOString();
const ascii = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
const HOUR = 3600000;

/** Hoy's payment method → Company OS's (a PSE transfer goes through the gateway; a QR code is a bank transfer). */
const METHOD: Record<string, string> = { card: 'card', pse: 'online_gateway', qr: 'transfer', cash: 'cash', transfer: 'transfer' };
const GATEWAY_METHODS = new Set(['card', 'online_gateway']);

export async function buildCompanyOsSeed(opts: { recipe: Recipe; asOf?: string; recipeRefs?: boolean }): Promise<CompanyOsSeed> {
  const asOf = opts.asOf ?? DEFAULT_AS_OF;
  const sample = await loadHoySample(asOf);
  return toCompanyOsSeed(sample, opts.recipe, asOf, opts.recipeRefs === true);
}

export function toCompanyOsSeed(sample: HoySample, recipe: Recipe, asOf: string, recipeRefs = false): CompanyOsSeed {
  const { db } = sample;
  const now = Date.parse(asOf);
  const products = new Map((recipe.records ?? []).filter((s) => s.entity === 'product').flatMap((s) => s.rows).filter((p) => !p.valid_from).map((p) => [String(p.key), p]));
  const settingsOf = (key: string): Row => recipe.modules?.find((m) => m.key === key)?.settings ?? {};
  const bookingSettings = settingsOf('bookings');
  /** Bookings a person may hold a day (0 = no limit), and the methods whose payment carries a reference: the recipe's. */
  const perDay = Number(bookingSettings.max_bookings_per_person_per_day ?? 0);
  const needsReference = new Set(String(settingsOf('payments').methods_requiring_reference ?? '').split(',').map((m) => m.trim()).filter(Boolean));
  const policy = bookingSettings.policy_as_of_booking === true
    ? { policy_late_cancel_hours: Number(bookingSettings.late_cancel_hours ?? 0), policy_reschedule_hours: Number(bookingSettings.reschedule_hours ?? 0) }
    : {};
  const productRef = (key: string) => (recipeRefs ? { product: { $ref: { entity: 'product', where: { key } } } } : {});
  const roomNames = new Set((recipe.records ?? []).filter((s) => s.entity === 'resource').flatMap((s) => s.rows).map((r) => String(r.name)));
  const roomRef = (roomId: string) => {
    if (!recipeRefs) return {};
    const name = ROOM_OF[roomId];
    if (!name || !roomNames.has(name)) throw new Error(`the sample's room ${roomId} has no room in the recipe (${name ?? 'no name in ROOM_OF'}): add it to ROOM_OF or the recipe's resources`);
    return { resource: { $ref: { entity: 'resource', where: { name } } } };
  };

  /** The class types the recipe offers on a schedule (its `modality` options); none listed: any. */
  const classTypes = recipe.fields?.find((f) => f.entity === 'schedule' && f.field === 'modality')?.config?.options?.map((o) => String(o.value));
  const people: SeedRecord[] = [], facets: SeedRecord[] = [], schedules: SeedRecord[] = [], classes: SeedRecord[] = [], money: SeedRecord[] = [], lots: SeedRecord[] = [], bookings: SeedRecord[] = [];
  const memberships: CompanyOsSeed['memberships'] = [];
  const emails = new Set<string>();
  const person = (key: string, name: string, email: string, createdAt: string) => {
    if (!email.endsWith('@demo.hoyos.test')) throw new Error(`${key}: ${email} is not a made-up address`);
    if (emails.has(email)) throw new Error(`two people share ${email}`);
    emails.add(email);
    const id = uuid(`person:${key}`);
    people.push({ entity: 'person', id, createdAt, data: { name, email, locale: 'es' } });
    return id;
  };

  // People: the sample's users (one per role and the customers) with their role, then the teachers.
  const nameOf = new Map(db.profiles.map((p) => [p.user_id, p.full_name]));
  const roleOf = new Map(db.user_roles.map((r) => [r.user_id, r.role]));
  const teacherName = new Map(sample.teachers.map((t, i) => {
    if (!TEACHER_NAMES[i]) throw new Error('more catalog teachers than made-up names: add names to TEACHER_NAMES');
    return [t.id, TEACHER_NAMES[i]];
  }));
  const personOfUser = new Map<string, string>();
  const users = [...db.users].sort((a, b) => a.id.localeCompare(b.id));
  // The super admin first: the loader marks the seed loaded by its first record.
  users.sort((a, b) => Number(roleOf.get(b.id) === 'super_admin') - Number(roleOf.get(a.id) === 'super_admin'));
  for (const u of users) {
    const role = roleOf.get(u.id);
    const key = role && ROLE_KEY_OF[role];
    if (!key) throw new Error(`${u.id}: role ${role} has no Company OS key`);
    const teacher = sample.teachers.find((t) => t.user_id === u.id);
    const name = teacher ? teacherName.get(teacher.id)! : String(nameOf.get(u.id));
    // The teacher who signs in gets an address from the made-up name: the sample's is the real teacher's first name.
    const id = person(u.id, name, teacher ? `profe.${ascii(name)}@demo.hoyos.test` : String(u.email), u.created_at);
    personOfUser.set(u.id, id);
    memberships.push({ person: id, role: key });
  }
  const coachOf = new Map<string, string>();
  for (const t of sample.teachers) {
    const name = teacherName.get(t.id)!;
    const personId = t.user_id ? personOfUser.get(t.user_id)! : person(t.id, name, `profe.${ascii(name)}@demo.hoyos.test`, t.created_at);
    const id = uuid(`coach:${t.id}`);
    coachOf.set(t.id, id);
    facets.push({ entity: 'coach', id, createdAt: t.created_at, data: { person: personId, kind: 'teacher', active: true } });
  }
  const customers = users.filter((u) => roleOf.get(u.id) === 'customer');

  // The timetable: one schedule per row (the sample builds every timetable class in its main room).
  const scheduleOf = new Map<string, string>();
  for (const row of sample.TIMETABLE) {
    const coach = coachOf.get(row.teacher);
    if (!coach) throw new Error(`timetable ${row.weekday} ${row.time}: teacher ${row.teacher} is not in the catalog`);
    const modality = sample.modalities.find((m) => m.id === row.modality);
    if (!modality) throw new Error(`timetable ${row.weekday} ${row.time}: class type ${row.modality} is not in the catalog`);
    if (classTypes && !classTypes.includes(String(modality.slug))) throw new Error(`timetable ${row.weekday} ${row.time}: class type ${modality.slug} is not one of the recipe's (schedule modality options)`);
    const key = sample.timetableId(row);
    const id = uuid(`schedule:${key}`);
    scheduleOf.set(key, id);
    schedules.push({
      entity: 'schedule', id,
      data: { title: row.title, kind: 'class', coach, ...roomRef(TIMETABLE_ROOM), weekday: row.weekday, start_time: row.time, duration_minutes: Number(modality.duration_min ?? 50), capacity: sample.mats, modality: modality.slug, active: true },
    });
  }

  // Classes: the sample's, then the timetable for two more weeks.
  type Cls = { rec: SeedRecord; start: number; end: number; status: string; sessionId: string };
  const cls: Cls[] = [];
  const durationOf = (modality: string) => Number(sample.modalities.find((m) => m.id === modality)?.duration_min ?? 50);
  const addClass = (key: string, title: string, teacherId: string, roomId: string, start: number, end: number, capacity: number, status: string, cancelReason: string | null, templateId: string | null) => {
    const coach = coachOf.get(teacherId);
    if (!coach) throw new Error(`${key}: teacher ${teacherId} is not in the catalog`);
    const schedule = templateId ? scheduleOf.get(templateId) : undefined;
    if (templateId && !schedule) throw new Error(`${key}: its timetable row ${templateId} is not in the timetable`);
    const rec: SeedRecord = {
      entity: 'occurrence', id: uuid(`occurrence:${key}`),
      data: {
        title, kind: 'class', ...(schedule ? { schedule } : {}), coach, ...roomRef(roomId), starts_at: isoAt(start), ends_at: isoAt(end), capacity, status, booked_count: 0,
        ...(status === 'cancelled' ? { cancel_reason: cancelReason ?? 'Clase cancelada', cancelled_at: isoAt(Math.min(now, start - 24 * HOUR)) } : {}),
        ...(status === 'completed' ? { completed_at: isoAt(end) } : {}),
      },
    };
    cls.push({ rec, start, end, status, sessionId: key });
  };
  for (const s of [...db.class_sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.id.localeCompare(b.id))) {
    addClass(s.id, s.title, s.teacher_id, s.room_id, Date.parse(s.starts_at), Date.parse(s.ends_at), s.capacity, s.status, s.cancel_reason, s.template_id ?? null);
  }
  const lastDay = dayOf(Math.max(...cls.map((c) => c.start)));
  for (let d = 1; d <= EXTRA_DAYS; d++) {
    const day = addDays(lastDay, d);
    for (const row of sample.TIMETABLE.filter((t) => t.weekday === weekdayOf(day))) {
      const start = Date.parse(`${day}T${row.time}:00${UTC_OFFSET}`);
      addClass(`ahead_${day}_${row.time}`, row.title, row.teacher, TIMETABLE_ROOM, start, start + durationOf(row.modality) * 60000, sample.mats, 'scheduled', null, sample.timetableId(row));
    }
  }
  const classOf = new Map(cls.map((c) => [c.sessionId, c]));

  // Payments of the recipe's products, their receipts, and a lot per pack or trial.
  type Lot = { id: string; person: string; from: string; until: string | null; paidAt: number; left: number };
  type Single = { payment: SeedRecord; person: string; paidAt: number; used: boolean };
  const lotsOf = new Map<string, Lot[]>(), singlesOf = new Map<string, Single[]>();
  const audience = new Map<string, string>();
  const planKey = new Map(db.plans.map((p) => [p.id, p.slug]));
  const paid = db.payments.filter((p) => p.status === 'approved' && personOfUser.has(p.user_id) && roleOf.get(p.user_id) === 'customer' && products.has(String(planKey.get(p.plan_id))))
    .sort((a, b) => a.paid_at.localeCompare(b.paid_at) || a.id.localeCompare(b.id));
  const payments: { rec: SeedRecord; productKey: string }[] = [];
  for (const p of paid) {
    const key = String(planKey.get(p.plan_id));
    const product = products.get(key)!;
    if (product.kind === 'gift') continue;
    const personId = personOfUser.get(p.user_id)!;
    const method = METHOD[p.method] ?? 'cash';
    const gateway = GATEWAY_METHODS.has(method);
    const ref = gateway || needsReference.has(method) ? (p.provider_ref ?? `wmp_${uuid(`ref:${p.id}`).slice(0, 6)}`) : null;
    const paidAt = Date.parse(p.paid_at);
    const rec: SeedRecord = {
      entity: 'payment', id: uuid(`payment:${p.id}`), createdAt: p.paid_at,
      data: {
        person: personId, date: dayOf(paidAt), amount: product.price, method, concept: product.name,
        provider: gateway ? 'gateway' : 'manual', ...(ref ? { reference: ref } : {}), ...(ref && gateway ? { provider_ref: ref } : {}),
        status: 'approved', approved_at: p.paid_at, ...productRef(key),
      },
    };
    if (product.audience) audience.set(personId, String(product.audience));
    if (product.kind === 'single') {
      // A single class pays for its booking (for_entity), once one is found below; unused, it is left out.
      singlesOf.set(personId, [...(singlesOf.get(personId) ?? []), { payment: rec, person: personId, paidAt, used: false }]);
      payments.push({ rec, productKey: key });
      continue;
    }
    payments.push({ rec, productKey: key });
    const credits = Number(product.credits ?? 0);
    if (credits <= 0) continue;
    const from = dayOf(paidAt);
    const validity = Number(product.validity_days ?? 0);
    const until = validity > 0 ? addDays(from, validity - 1) : null;
    const lotId = uuid(`lot:${p.id}`);
    lots.push({
      entity: 'credit_lot', id: lotId, createdAt: p.paid_at,
      data: { person: personId, source: product.kind === 'trial' ? 'trial' : 'purchase', quantity: credits, valid_from: from, valid_until: until, freezable: product.freezable === true, freezes_used: 0, payment: rec.id, ...productRef(key) },
    });
    lots.push({ entity: 'credit_entry', id: uuid(`grant:${p.id}`), createdAt: p.paid_at, data: { lot: lotId, person: personId, delta: credits, reason: 'grant', at: p.paid_at } });
    lotsOf.set(personId, [...(lotsOf.get(personId) ?? []), { id: lotId, person: personId, from, until, paidAt, left: credits }]);
  }

  // Bookings the rules would accept: one a day per person, paid from a lot or by a single class. The classes ahead
  // are booked first, then the history from the most recent back, which stops PAST_RESERVE classes short of a lot's
  // end: the sample has one pack per customer, so a customer is mid-pack (classes left) rather than out of classes.
  const ahead = (b: Row) => classOf.get(b.session_id)!.status !== 'completed';
  const sampleBookings = db.bookings.filter((b) => classOf.has(b.session_id) && personOfUser.has(b.user_id) && roleOf.get(b.user_id) === 'customer')
    .sort((a, b) => Number(ahead(b)) - Number(ahead(a)) || (ahead(a) ? 1 : -1) * (classOf.get(a.session_id)!.start - classOf.get(b.session_id)!.start) || a.id.localeCompare(b.id));
  const bookedDays = new Map<string, number>();
  const entries: SeedRecord[] = [];
  for (const b of sampleBookings) {
    const c = classOf.get(b.session_id)!;
    if (c.status === 'cancelled') continue;
    const personId = personOfUser.get(b.user_id)!;
    const day = dayOf(c.start);
    if (perDay > 0 && (bookedDays.get(`${personId} ${day}`) ?? 0) >= perDay) continue;
    // A past class keeps the sample's attended, no-show or late-cancel; a class ahead is booked; anything else is left out.
    if (c.status === 'completed' ? !['checked_in', 'no_show', 'late_cancel'].includes(b.status) : !['booked', 'checked_in'].includes(b.status)) continue;
    const status = c.status === 'completed' ? b.status : 'booked';
    // Booked two days ahead, after paying, never after the seed's date.
    const lot = (lotsOf.get(personId) ?? [])
      .filter((l) => l.left > (c.status === 'completed' ? PAST_RESERVE : 0) && l.from <= day && (!l.until || day <= l.until) && l.paidAt <= c.start - HOUR)
      .sort((x, y) => (x.until ?? '9999').localeCompare(y.until ?? '9999') || x.from.localeCompare(y.from))[0];
    const single = lot ? undefined : (singlesOf.get(personId) ?? []).find((s) => !s.used && s.paidAt <= c.start - HOUR);
    if (!lot && !single) continue;
    const paidAt = lot?.paidAt ?? single!.paidAt;
    const at = isoAt(Math.max(paidAt, Math.min(now - HOUR, c.start - 48 * HOUR)));
    const id = uuid(`booking:${b.id}`);
    if (status === 'booked' || status === 'checked_in') bookedDays.set(`${personId} ${day}`, (bookedDays.get(`${personId} ${day}`) ?? 0) + 1);
    bookings.push({
      entity: 'booking', id, createdAt: at,
      data: {
        person: personId, occurrence: c.rec.id, start: c.rec.data.starts_at, end: c.rec.data.ends_at, status,
        entitlement: lot ? 'credit' : 'single', source: 'member', ...policy,
        ...(status === 'checked_in' ? { checked_in_at: c.rec.data.starts_at } : {}),
        ...(status === 'late_cancel' ? { cancelled_at: isoAt(c.start - 2 * HOUR) } : {}),
      },
    });
    if (lot) {
      lot.left--;
      entries.push({ entity: 'credit_entry', id: uuid(`take:${b.id}`), createdAt: at, data: { lot: lot.id, person: personId, delta: -1, reason: 'booking', booking: id, at } });
    } else {
      single!.used = true;
      // A single class is paid for its booking once the booking exists (payments checks for_id): dated with it.
      single!.payment.createdAt = at;
      Object.assign(single!.payment.data, { for_entity: 'booking', for_id: id, date: dayOf(at), approved_at: at });
    }
    if (status === 'booked' || status === 'checked_in') c.rec.data.booked_count = Number(c.rec.data.booked_count) + 1;
  }
  const unused = new Set([...singlesOf.values()].flat().filter((s) => !s.used).map((s) => s.payment.id));
  const kept = payments.filter((p) => !unused.has(p.rec.id)).sort((x, y) => String(x.rec.data.approved_at).localeCompare(String(y.rec.data.approved_at)) || x.rec.id.localeCompare(y.rec.id));
  kept.forEach(({ rec, productKey }, i) => {
    money.push(rec);
    const amount = rec.data.amount as number;
    money.push({
      entity: 'invoice', id: uuid(`receipt:${rec.id}`), createdAt: rec.createdAt,
      data: { kind: 'receipt', number: i + 1, payment: rec.id, person: rec.data.person, tax_rate_percent: 0, subtotal: amount, tax: 0, total: amount, issued_at: rec.data.approved_at, ...productRef(productKey) },
    });
  });

  for (const u of customers) {
    const personId = personOfUser.get(u.id)!;
    facets.push({ entity: 'member', id: uuid(`member:${u.id}`), createdAt: u.created_at, data: { person: personId, status: 'active', price_audience: audience.get(personId) ?? 'general', joined_at: dayOf(Date.parse(u.created_at)), source: 'import' } });
  }

  return {
    fictional: true,
    _about: "Hoy's made-up sample (src/data/seed in imagine-os/hoy, dated asOf), generated by its scripts/seed-companyos.ts. Every person, address (@demo.hoyos.test), teacher name, payment and booking is fictional. Do not edit by hand: regenerate.",
    asOf,
    records: [...people, ...facets, ...schedules, ...cls.map((c) => c.rec), ...money, ...lots, ...bookings, ...entries],
    files: [],
    memberships,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (name: string) => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
  const asOf = flag('--as-of') ?? DEFAULT_AS_OF;
  const recipeRefs = args.includes('--recipe-refs');
  const out = args.filter((a) => a !== '--recipe-refs')[0];
  if (!out) {
    console.error('usage: node scripts/seed-companyos.ts <Company OS deploy/seeds folder> [--as-of <ISO date>] [--recipe-refs]');
    process.exit(1);
  }
  const recipe = JSON.parse(readFileSync(join(out, '../recipes/hoy.json'), 'utf8')) as Recipe;
  const seed = await buildCompanyOsSeed({ recipe, asOf, recipeRefs });
  writeFileSync(join(out, 'hoy.json'), `${JSON.stringify(seed, null, 2)}\n`);
  const count = (e: string) => seed.records.filter((r) => r.entity === e).length;
  console.log(`seed-companyos: ${seed.records.length} records (${count('person')} people, ${count('schedule')} schedules, ${count('occurrence')} classes, ${count('booking')} bookings, ${count('payment')} payments, ${count('credit_lot')} packs), ${seed.memberships.length} memberships, as of ${asOf} → ${join(out, 'hoy.json')}`);
}
