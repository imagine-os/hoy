// Proves src/tenant/holidays.co.ts against the published 2026 Colombian calendar (Ley 51/1983, "Ley Emiliani"):
// 18 festivos, Easter on 5 April. Run: npm run test:holidays   (node --experimental-strip-types imports the TS source)
const { colombianHolidays, easterSunday, upcomingColombianHolidays } = await import('../src/tenant/holidays.co.ts');

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failed++; };
const key = (d) => d.toISOString().slice(0, 10);

const EXPECTED_2026 = ['01-01', '01-12', '03-23', '04-02', '04-03', '05-01', '05-18', '06-08', '06-15', '06-29', '07-20', '08-07', '08-17', '10-12', '11-02', '11-16', '12-08', '12-25'].map((d) => `2026-${d}`);
const got = colombianHolidays(2026).map((h) => h.date);
check('Easter 2026 is 5 April', key(easterSunday(2026)) === '2026-04-05', key(easterSunday(2026)));
check('2026 has 18 holidays', got.length === 18, String(got.length));
check('2026 dates match the official calendar exactly', JSON.stringify(got) === JSON.stringify(EXPECTED_2026), got.filter((d) => !EXPECTED_2026.includes(d)).concat(EXPECTED_2026.filter((d) => !got.includes(d)).map((d) => `missing ${d}`)).join(', '));
// Known Easter dates (Meeus) for a spread of years, including the century edge cases.
for (const [y, e] of [[2000, '2000-04-23'], [2019, '2019-04-21'], [2024, '2024-03-31'], [2025, '2025-04-20'], [2027, '2027-03-28'], [2038, '2038-04-25'], [2100, '2100-03-28']]) check(`Easter ${y}`, key(easterSunday(y)) === e, key(easterSunday(y)));
// Every moved holiday lands on a Monday, every year.
for (const y of [2025, 2026, 2027, 2028]) {
  const hs = colombianHolidays(y);
  const bad = hs.filter((h) => !h.fixed && !['jueves-santo', 'viernes-santo'].includes(h.key) && new Date(`${h.date}T00:00:00Z`).getUTCDay() !== 1);
  check(`${y}: every Emiliani holiday is a Monday`, bad.length === 0, bad.map((h) => `${h.key} ${h.date}`).join(', '));
  check(`${y}: 18 holidays, labels in ES and EN`, hs.length === 18 && hs.every((h) => h.label.es && h.label.en));
}
check('2025 spot checks (Reyes 6 Jan is a Monday, Sagrado Corazón 30 Jun)', ['2025-01-06', '2025-06-30'].every((d) => colombianHolidays(2025).some((h) => h.date === d)));
const up = upcomingColombianHolidays('2026-09-29');
check('upcoming from 2026-09-29 starts with Día de la Raza, then 2 Nov, 16 Nov', up.slice(0, 3).map((h) => h.date).join(',') === '2026-10-12,2026-11-02,2026-11-16', up.slice(0, 3).map((h) => h.date).join(','));
check('upcoming covers the rest of 2026 and all of 2027 (5 + 18)', up.length === 23, String(up.length));

console.log(failed ? `\n${failed} check(s) failed` : '\nall holiday checks pass');
process.exit(failed ? 1 : 0);
