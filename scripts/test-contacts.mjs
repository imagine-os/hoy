// Proves the WhatsApp contact routing in src/tenant/contacts.ts (0047, D-0022): an intent with no number falls back
// to the front desk, payroll goes to the payroll number on a business day, and off duty the note names the next open day.
// Run: npm run test:contacts   (esbuild bundles the TS source into a scratch file, like test-analytics.mjs)
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failed++; };

const scratch = await mkdtemp(join(tmpdir(), 'hoy-contacts-'));
try {
  const file = join(scratch, 'contacts.mjs');
  await build({ entryPoints: ['src/tenant/contacts.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent' });
  const C = await import(pathToFileURL(file));
  const { resolveContact, whatsappLink, DEFAULT_CONTACT_ROUTES, CONTACT_INTENTS, isBusinessDay, nextBusinessDay } = C;

  const tz = 'America/Bogota';
  const FRONT = '+57 312 776 5000';
  const PAYROLL = '+57 300 111 2222';
  const weekly = { '0': null, '1': { open: '06:00', close: '20:00' }, '2': { open: '06:00', close: '20:00' }, '3': { open: '06:00', close: '20:00' }, '4': { open: '06:00', close: '20:00' }, '5': { open: '06:00', close: '20:00' }, '6': { open: '08:00', close: '13:00' } };
  const raza = { start_date: '2026-10-12', end_date: '2026-10-12', closed: true, open: null, close: null, label: { es: 'Día de la Raza', en: 'Columbus Day' }, kind: 'holiday' };
  const hours = { weekly, overrides: [raza] };
  const holidays = ['2026-10-12', '2026-11-02'];
  const withNumber = (intent, patch) => ({ ...DEFAULT_CONTACT_ROUTES, [intent]: { ...DEFAULT_CONTACT_ROUTES[intent], ...patch } });
  const settings = (contacts = DEFAULT_CONTACT_ROUTES) => ({ contacts, frontDeskWhatsapp: FRONT });
  const at = (iso) => new Date(iso);
  // Wednesday 30 Sep 2026, 10:00 Bogotá (15:00Z): studio open, business day.
  const WED_OPEN = at('2026-09-30T15:00:00Z');

  check('nine intents', CONTACT_INTENTS.length === 9 && CONTACT_INTENTS[0] === 'frontDesk');

  // ---- fallback to the front desk ----
  for (const intent of CONTACT_INTENTS) {
    const r = resolveContact(settings(), hours, intent, { now: WED_OPEN, tz, holidays });
    check(`${intent} with no number → front desk`, r.resolvedIntent === 'frontDesk' && r.whatsapp === FRONT && !r.note, `${r.resolvedIntent} ${r.whatsapp}`);
  }
  const fd = resolveContact(settings(withNumber('frontDesk', { whatsapp: '+57 300 999 0000', name: 'Recepción HOY' })), hours, 'support', { now: WED_OPEN, tz, holidays });
  check('a front desk row with its own number wins over the profile number', fd.whatsapp === '+57 300 999 0000' && fd.name === 'Recepción HOY');
  check('link shape', whatsappLink({ whatsapp: FRONT }, 'Hola') === 'https://wa.me/573127765000?text=Hola', whatsappLink({ whatsapp: FRONT }, 'Hola'));

  // ---- payroll routing ----
  const payroll = settings(withNumber('payroll', { whatsapp: PAYROLL, name: 'Sergio', role: 'finance', hours: 'businessDays' }));
  const p1 = resolveContact(payroll, hours, 'payroll', { now: WED_OPEN, tz, holidays });
  check('payroll on a business day → the payroll number, no note', p1.resolvedIntent === 'payroll' && p1.whatsapp === PAYROLL && p1.name === 'Sergio' && !p1.note, JSON.stringify(p1));
  check('payroll link carries the payroll number', whatsappLink(p1, 'x').startsWith('https://wa.me/573001112222'));
  const p2 = resolveContact(payroll, hours, 'finance', { now: WED_OPEN, tz, holidays });
  check('finance (no number) still falls back to the front desk', p2.resolvedIntent === 'frontDesk' && p2.whatsapp === FRONT);
  // Saturday 3 Oct 2026, 10:00 Bogotá: studio open (08:00–13:00), not a business day → front desk while open.
  const p3 = resolveContact(payroll, hours, 'payroll', { now: at('2026-10-03T15:00:00Z'), tz, holidays });
  check('payroll on an open Saturday → front desk (studio open, contact off duty)', p3.resolvedIntent === 'frontDesk' && p3.whatsapp === FRONT && !p3.note, JSON.stringify(p3));
  // Saturday 3 Oct 2026, 15:00 Bogotá (20:00Z): studio closed → payroll number + note naming Monday.
  const p4 = resolveContact(payroll, hours, 'payroll', { now: at('2026-10-03T20:00:00Z'), tz, holidays });
  check('payroll on a closed Saturday → payroll number with a next-business-day note', p4.resolvedIntent === 'payroll' && p4.whatsapp === PAYROLL && p4.note?.es === 'Respondemos el próximo día hábil (el lunes)' && p4.note?.en === 'We reply on the next open day (Monday)', JSON.stringify(p4.note));
  // Wednesday 30 Sep 2026, 22:00 Bogotá (03:00Z Thu): business day, studio closed → payroll number, no note (the day counts).
  const p5 = resolveContact(payroll, hours, 'payroll', { now: at('2026-10-01T03:00:00Z'), tz, holidays });
  check('payroll late on a business day → the payroll number (businessDays ignores the clock)', p5.resolvedIntent === 'payroll' && !p5.note, JSON.stringify(p5));
  const always = settings(withNumber('owner', { whatsapp: '+57 301 000 0000', hours: 'always' }));
  const o1 = resolveContact(always, hours, 'owner', { now: at('2026-10-04T20:00:00Z'), tz, holidays });
  check('always → its number on a closed Sunday night, no note', o1.resolvedIntent === 'owner' && !o1.note);

  // ---- holiday note ----
  // Monday 12 Oct 2026 (Día de la Raza), 10:00 Bogotá: closed override + holiday → not a business day, studio closed.
  const h1 = resolveContact(payroll, hours, 'payroll', { now: at('2026-10-12T15:00:00Z'), tz, holidays });
  check('holiday Monday → payroll number with the note naming tomorrow', h1.resolvedIntent === 'payroll' && h1.note?.es === 'Respondemos el próximo día hábil (mañana)' && h1.note?.en === 'We reply on the next open day (tomorrow)', JSON.stringify(h1.note));
  check('isBusinessDay: holiday override alone (no calendar) is enough', !isBusinessDay('2026-10-12', [raza], []) && isBusinessDay('2026-10-13', [raza], []));
  check('isBusinessDay: the calendar alone (no override) is enough', !isBusinessDay('2026-11-02', [], holidays));
  check('nextBusinessDay skips a holiday Monday and a weekend (Fri 9 Oct → Tue 13 Oct)', nextBusinessDay('2026-10-09', [raza], holidays) === '2026-10-13', nextBusinessDay('2026-10-09', [raza], holidays));
  // studioHours contact, Friday 9 Oct 2026, 21:00 Bogotá (02:00Z Sat): closed → its number + note for Saturday's opening.
  const spec = settings(withNumber('specials', { whatsapp: '+57 302 000 0000', hours: 'studioHours' }));
  const s1 = resolveContact(spec, hours, 'specials', { now: at('2026-10-10T02:00:00Z'), tz, holidays });
  check('studioHours after closing → its number with the note naming the next opening day', s1.resolvedIntent === 'specials' && s1.note?.en === 'We reply on the next open day (tomorrow)', JSON.stringify(s1.note));
  const s2 = resolveContact(spec, hours, 'specials', { now: WED_OPEN, tz, holidays });
  check('studioHours while open → its number, no note', s2.resolvedIntent === 'specials' && !s2.note);
  // Saturday 10 Oct 2026, 14:00 Bogotá (19:00Z): closed; Sunday closed; Monday 12 is the holiday → note says Tuesday.
  const s3 = resolveContact(spec, hours, 'specials', { now: at('2026-10-10T19:00:00Z'), tz, holidays });
  check('studioHours note skips Sunday and the holiday Monday', s3.note?.es === 'Respondemos el próximo día hábil (el martes)', JSON.stringify(s3.note));
} finally {
  await rm(scratch, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall contact checks pass');
process.exit(failed ? 1 : 0);
