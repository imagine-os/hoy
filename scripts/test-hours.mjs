// Proves the pure hours readers in src/tenant/hours.ts: overrides win over the week (inclusive ranges, narrowest first),
// the Google Business Profile body has the Business Information API shape, and the customer "today" line.
// Run: npm run test:hours   (node --experimental-strip-types imports the TS source; no dependencies)
const H = await import('../src/tenant/hours.ts');

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const j = (v) => JSON.stringify(v);

const weekly = { '0': null, '1': { open: '06:00', close: '20:00' }, '2': { open: '06:00', close: '20:00' }, '3': { open: '06:00', close: '20:00' }, '4': { open: '06:00', close: '20:00' }, '5': { open: '06:00', close: '20:00' }, '6': { open: '08:00', close: '13:00' } };
const raza = { start_date: '2026-10-12', end_date: '2026-10-12', closed: true, open: null, close: null, label: { es: 'Día de la Raza', en: 'Columbus Day' }, kind: 'holiday' };
const jornada = { start_date: '2026-10-17', end_date: '2026-10-17', closed: false, open: '08:00', close: '11:00', label: { es: 'Jornada especial', en: 'Special day' }, kind: 'special' };
const retreat = { start_date: '2026-12-24', end_date: '2026-12-31', closed: false, open: '09:00', close: '12:00', label: { es: 'Fin de año', en: 'Year end' }, kind: 'special' };
const xmas = { start_date: '2026-12-25', end_date: '2026-12-25', closed: true, open: null, close: null, label: { es: 'Navidad', en: 'Christmas' }, kind: 'holiday' };
const overrides = [raza, jornada, retreat, xmas];

check('sentence ES', H.hoursSentence(weekly, 'es') === 'Lun–Vie 6:00–20:00 · Sáb 8:00–13:00 · Dom cerrado', H.hoursSentence(weekly, 'es'));
check('sentence EN', H.hoursSentence(weekly, 'en') === 'Mon–Fri 6:00–20:00 · Sat 8:00–13:00 · Sun closed', H.hoursSentence(weekly, 'en'));
check('weekday from key (2026-10-12 is a Monday)', H.weekdayOf('2026-10-12') === 1);
check('plain Tuesday reads the week', j(H.effectiveHoursFor('2026-10-13', weekly, overrides)) === j({ hours: { open: '06:00', close: '20:00' } }));
check('Sunday is closed by the week, no override', H.effectiveHoursFor('2026-10-11', weekly, overrides).hours === null && !H.effectiveHoursFor('2026-10-11', weekly, overrides).override);
check('holiday Monday is closed by its override', H.effectiveHoursFor('2026-10-12', weekly, overrides).hours === null && H.effectiveHoursFor('2026-10-12', weekly, overrides).override === raza);
check('special Saturday takes the override hours', j(H.effectiveHoursFor('2026-10-17', weekly, overrides).hours) === j({ open: '08:00', close: '11:00' }));
check('range is inclusive at both ends', H.effectiveHoursFor('2026-12-24', weekly, overrides).override === retreat && H.effectiveHoursFor('2026-12-31', weekly, overrides).override === retreat);
check('narrowest override wins (Christmas inside the year-end range)', H.effectiveHoursFor('2026-12-25', weekly, overrides).hours === null);
check('open override without times keeps the week\'s times', j(H.effectiveHoursFor('2026-10-14', weekly, [{ ...jornada, start_date: '2026-10-14', end_date: '2026-10-14', open: null, close: null }]).hours) === j({ open: '06:00', close: '20:00' }));
check('upcoming 30 days from 2026-10-01', j(H.upcomingOverrides(overrides, '2026-10-01', 30).map((o) => o.start_date)) === j(['2026-10-12', '2026-10-17']));

const g = H.toGoogleBusinessHours(weekly, overrides, '2026-10-01');
check('Google: 6 regular periods, Monday first', g.regularHours.periods.length === 6 && g.regularHours.periods[0].openDay === 'MONDAY' && g.regularHours.periods[5].openDay === 'SATURDAY');
check('Google: time of day is {hours, minutes}', j(g.regularHours.periods[0].openTime) === j({ hours: 6, minutes: 0 }) && j(g.regularHours.periods[5].closeTime) === j({ hours: 13, minutes: 0 }));
check('Google: same-day close', g.regularHours.periods.every((p) => p.openDay === p.closeDay));
const sp = g.specialHours.specialHourPeriods;
check('Google: one special period per date (1 + 1 + 8 days)', sp.length === 10, String(sp.length));
check('Google: closed holiday', j(sp[0]) === j({ startDate: { year: 2026, month: 10, day: 12 }, endDate: { year: 2026, month: 10, day: 12 }, closed: true }), j(sp[0]));
check('Google: special hours', j(sp[1]) === j({ startDate: { year: 2026, month: 10, day: 17 }, endDate: { year: 2026, month: 10, day: 17 }, openTime: { hours: 8, minutes: 0 }, closeTime: { hours: 11, minutes: 0 } }), j(sp[1]));
check('Google: Christmas closed inside the expanded range', sp.find((p) => p.startDate.month === 12 && p.startDate.day === 25)?.closed === true);
check('Google: overrides before fromDate are left out', H.toGoogleBusinessHours(weekly, overrides, '2026-11-01').specialHours.specialHourPeriods.every((p) => p.startDate.month === 12));
const night = H.toGoogleBusinessHours({ '5': { open: '18:00', close: '02:00' } }, []);
check('Google: overnight close moves to the next day', night.regularHours.periods[0].openDay === 'FRIDAY' && night.regularHours.periods[0].closeDay === 'SATURDAY');
check('update mask', H.GOOGLE_HOURS_UPDATE_MASK === 'regularHours,specialHours');

const s = H.toSchemaOrgHours(weekly, overrides, '2026-10-01');
check('schema.org: weekdays grouped', j(s.openingHoursSpecification.map((x) => x.dayOfWeek.length)) === j([5, 1]));
check('schema.org: closed special = 00:00–00:00', s.specialOpeningHoursSpecification[0].opens === '00:00' && s.specialOpeningHoursSpecification[0].closes === '00:00');

const tz = 'America/Bogota';
const at = (iso) => new Date(iso);
check('today: open weekday', H.todayStatus(at('2026-10-13T15:00:00Z'), tz, weekly, overrides, 'es') === 'Hoy: 06:00–20:00', H.todayStatus(at('2026-10-13T15:00:00Z'), tz, weekly, overrides, 'es'));
check('today: holiday', H.todayStatus(at('2026-10-12T15:00:00Z'), tz, weekly, overrides, 'es') === 'Hoy cerrado · Festivo (Día de la Raza) · abre mañana 06:00', H.todayStatus(at('2026-10-12T15:00:00Z'), tz, weekly, overrides, 'es'));
check('today: after closing (21:00 Bogotá = 02:00Z next day)', H.todayStatus(at('2026-10-14T02:00:00Z'), tz, weekly, overrides, 'es') === 'Cerrado ahora · abre mañana 06:00', H.todayStatus(at('2026-10-14T02:00:00Z'), tz, weekly, overrides, 'es'));
check('today: special hours in EN', H.todayStatus(at('2026-10-17T14:00:00Z'), tz, weekly, overrides, 'en') === 'Today: 08:00–11:00 · Special hours (Special day)', H.todayStatus(at('2026-10-17T14:00:00Z'), tz, weekly, overrides, 'en'));
check('today: Saturday after close skips Sunday', H.todayStatus(at('2026-10-10T20:00:00Z'), tz, weekly, [], 'en') === 'Closed now · opens Monday 06:00', H.todayStatus(at('2026-10-10T20:00:00Z'), tz, weekly, [], 'en'));
check('copy text lists special hours', H.hoursForGoogleText(weekly, overrides, '2026-10-01', 'es').includes('12/10 · Festivo (Día de la Raza) · cerrado'));

console.log(failed ? `\n${failed} check(s) failed` : '\nall hours checks pass');
process.exit(failed ? 1 : 0);
