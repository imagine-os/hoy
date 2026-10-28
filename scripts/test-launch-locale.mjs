// PL-09 — "Times in America/Bogota, Colombian holidays and pesos without decimals."
// PL-11 — "All launch text is in Spanish, with no mixed phrases."
// Part 1 (node, run under a non-Colombian TZ on purpose): the shared formatters, the holiday calendar and a source scan
// of launch modules for date formatting that skips the studio timezone. Part 2 (browser, built app): every launch
// screen in Spanish for the launch roles, checking for missing keys, raw status values and English UI phrases.
// Run: npm run build && TZ=Asia/Tokyo node scripts/test-launch-locale.mjs
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { serveDist, launchBrowser, newContext, reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('PL-09 / PL-11');
process.env.TZ ||= 'Asia/Tokyo';

// ── Part 1 · PL-09 ───────────────────────────────────────────────────────────────────────────────────────────
const bundle = await build({ stdin: { contents: "export * from './src/i18n/format'; export { colombianHolidays } from './src/tenant/holidays.co';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', define: { 'import.meta.env': '{"DEV":false}' } });
const F = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const nbsp = (s) => s.replace(/[  ]/g, ' ');
const sixPmBogota = '2026-11-02T23:00:00Z'; // 18:00 in Bogotá, 08:00 next day in Tokyo
check(`PL-09 times render in Bogotá on a ${process.env.TZ} device (18:00 → "6:00 p. m.")`, /^6:00\s?p\.\s?m\.$/.test(nbsp(F.formatTime(sixPmBogota, 'es'))), F.formatTime(sixPmBogota, 'es'));
check('PL-09 dates render on the Bogotá day, not the device day', /^2( de)? nov/.test(nbsp(F.formatDate(sixPmBogota, 'es', { day: 'numeric', month: 'short' }))), F.formatDate(sixPmBogota, 'es', { day: 'numeric', month: 'short' }));
check('PL-09 dateKey is the studio day', F.dateKey(new Date(sixPmBogota)) === '2026-11-02', F.dateKey(new Date(sixPmBogota)));
check('PL-09 pesos have no decimals and use Colombian grouping', nbsp(F.formatCOP(600000, 'es')) === '$ 600.000' && nbsp(F.formatCOP(35000.4, 'es')) === '$ 35.000', F.formatCOP(600000, 'es'));
const hol = (y) => new Set(F.colombianHolidays(y).map((h) => h.date));
const h26 = hol(2026), h27 = hol(2027);
for (const [d, why] of [['2026-11-02', 'Todos los Santos moved to Monday'], ['2026-11-16', 'Independencia de Cartagena moved to Monday'], ['2026-12-08', 'Inmaculada Concepción'], ['2026-12-25', 'Navidad'], ['2027-01-01', 'Año Nuevo'], ['2027-01-11', 'Reyes Magos moved to Monday'], ['2027-03-25', 'Jueves Santo'], ['2027-03-26', 'Viernes Santo']])
  check(`PL-09 Colombian holiday ${d} (${why})`, (d.startsWith('2026') ? h26 : h27).has(d));
check('PL-09 2026 has 18 Colombian public holidays', h26.size === 18, String(h26.size));

// Source scan: launch modules must format dates through src/i18n/format.ts or pass the studio timezone.
const LAUNCH = /^src\/(modules\/(website|coming-soon|customer|staff|transfers|products|vouchers|classSchedule|launch-receipts|admin)\/|components\/)/;
const SKIP = /\/archive\/|\.meta\.ts$|\/(Payroll|Payout|Analytics|Subscription|Promotion|Marketing|WhatsApp|ClassPay|GoogleBusiness|Integrations)/i;
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src'], { encoding: 'utf8' }).split('\n').filter((f) => LAUNCH.test(f) && !SKIP.test(f) && /\.tsx?$/.test(f));
const bad = [];
for (const f of files) {
  const lines = (await readFile(f, 'utf8')).split('\n');
  lines.forEach((l, i) => {
    if (/new Intl\.DateTimeFormat\(/.test(l) && !/timeZone/.test(l)) bad.push(`${f}:${i + 1} Intl.DateTimeFormat without timeZone`);
    if (/\.toLocale(Date|Time)String\(/.test(l) && !/timeZone/.test(l)) bad.push(`${f}:${i + 1} toLocale*String without timeZone`);
    if (/\.(getHours|getDate|getDay|setHours)\(\)/.test(l) && !/UTC/.test(l) && !/studio|tenant\.timezone/.test(l)) bad.push(`${f}:${i + 1} device-local clock`);
    if (/toFixed\(2\)|minimumFractionDigits:\s*2/.test(l)) bad.push(`${f}:${i + 1} money with decimals`);
  });
}
check(`PL-09 launch code formats dates in the studio timezone (${files.length} files scanned)`, bad.length === 0, bad.slice(0, 12).join('; '));

// ── Part 2 · PL-11 ───────────────────────────────────────────────────────────────────────────────────────────
const SCREENS = {
  usr_public: ['/', '/site', '/site/about', '/site/classes', '/site/schedule', '/site/teachers', '/site/plans', '/site/faq', '/site/contact', '/site/legal/terms', '/site/legal/privacy', '/auth/sign-in', '/auth/sign-up'],
  usr_c01: ['/app', '/app/schedule', '/app/plans', '/app/classes', '/app/history', '/app/profile', '/app/more', '/app/vouchers', '/app/faq'],
  usr_desk: ['/staff', '/staff/checkin', '/staff/register', '/staff/expense', '/staff/transfers', '/staff/vouchers', '/admin/crm'],
  usr_admin: ['/admin', '/admin/products', '/admin/settings', '/admin/class-schedule', '/admin/finance', '/admin/finance/expenses', '/admin/vouchers', '/admin/crm'],
};
// English UI chrome and raw stored values that must not reach a Spanish screen. Class titles, names, brand words and
// accepted loanwords (check-in, mat, walk-in, Pilates, Barre) are content, not UI chrome.
const ENGLISH = /\b(Loading|Sign in|Sign up|Log in|Save|Cancel|Close|Submit|Continue|Book now|Booked|Pending|Approved|Declined|Confirmed|Refunded|Payment|Payments|Settings|Search|Next|Previous|Back to|Your |the |and the|You have|No results|Error:|Something went wrong|undefined|NaN|\[object Object\])\b/;
const RAW = /\b(late_cancel|no_show|checked_in|pending_review|gift_card|bank_transfer|plan_[a-z0-9_]+|usr_[a-z0-9_]+|tea_[a-z0-9_]+|ses_[a-z0-9_]+)\b/;
const srv = await serveDist(5324);
const browser = await launchBrowser();
try {
  for (const [userId, paths] of Object.entries(SCREENS)) {
    const ctx = await newContext(browser, { userId, lang: 'es' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.clock.install({ time: new Date('2026-10-28T15:00:00Z') });
    for (const path of paths) {
      errs.length = 0;
      await page.goto(`${srv.base}/#${path}`); await page.waitForTimeout(1300);
      const text = (await page.locator('body').innerText()).replace(/https?:\/\/\S+/g, '');
      const missing = text.match(/⟨[^⟩]+⟩/g);
      const english = text.split('\n').filter((l) => ENGLISH.test(l)).slice(0, 4);
      const raw = text.match(RAW);
      const lang = await page.evaluate(() => document.documentElement.lang);
      check(`PL-11 ${userId} ${path}: Spanish, no missing keys, raw values or English UI`, !missing && !english.length && !raw && lang === 'es' && !errs.length,
        [missing?.slice(0, 3).join(', '), english.map((l) => `"${l.slice(0, 80)}"`).join(' · '), raw?.[0], lang !== 'es' && `lang=${lang}`, errs[0]].filter(Boolean).join(' | '));
    }
    await ctx.close();
  }
} finally { await browser.close(); await srv.close(); }
done();
