// H-9 — the launch emails (NT-02, NT-03): every trigger maps to one template, the Spanish copy is complete and only
// uses paths Company OS fills, no domain is hard-coded, and deploy/comms/hoy-templates.json matches its source.
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { loadLaunchEmails, templatesJson, OUT } from './gen-launch-emails.mjs';
import { reporter } from './lib/launch-qa.mjs';

const { check, done } = reporter('launch emails');
const m = await loadLaunchEmails();
const json = await readFile(OUT, 'utf8');
const doc = JSON.parse(json);
const brand = m.launchBrand();

// ── the file the recipe loads is the generated one
check(`${OUT} is current (node scripts/gen-launch-emails.mjs)`, json === templatesJson(m));

// ── the ten NT-02 emails (plus the gift buyer's two notices, BO-06) and the NT-03 alert, in the tracker's order
const NT02 = ['welcome', 'sign_in_code', 'booking_pending_payment', 'payment_confirmed', 'payment_rejected', 'booking_released', 'booking_moved', 'class_cancelled', 'voucher_received', 'gift_sent', 'gift_used', 'purchase_note'];
check('NT-02 lists the ten launch emails and the two gift notices in the tracker order', JSON.stringify(m.LAUNCH_EMAILS.filter((e) => e.row === 'NT-02').map((e) => e.key)) === JSON.stringify(NT02));
check('NT-03 has the receipt alert for the front desk and administration', m.LAUNCH_EMAILS.some((e) => e.row === 'NT-03' && e.key === 'receipt_uploaded_team'
  && (e.blocked?.automations ?? []).map((a) => a.name).join() === 'receipt_uploaded_front_desk,receipt_uploaded_admin'));
check('keys are unique', new Set(m.LAUNCH_EMAILS.map((e) => e.key)).size === m.LAUNCH_EMAILS.length);
check('only the sign-in code is Clerk\'s, and it has no automation', m.LAUNCH_EMAILS.filter((e) => e.sender === 'clerk').map((e) => `${e.key}:${e.automations.length}`).join() === 'sign_in_code:0');
check('the Clerk email is documented in the file, not loaded as a template', doc.clerk.map((c) => c.key).join() === 'sign_in_code' && !doc.records[0].rows.some((r) => r.key === 'sign_in_code'));

// ── every trigger maps to one template per recipient (a gift tells its recipient and its buyer)
const templates = doc.records[0].rows, automations = doc.records[1].rows, all = [...automations, ...doc.blocked_automations];
const recipientOf = (a) => a.recipient ?? a.recipient_email;
const triggerOf = (a) => `${a.event} ${JSON.stringify(Object.fromEntries(Object.entries(a.filter ?? {}).sort()))} → ${recipientOf(a)}`;
const byTrigger = new Map();
for (const a of all) byTrigger.set(triggerOf(a), new Set([...(byTrigger.get(triggerOf(a)) ?? []), a.template]));
for (const [trigger, set] of byTrigger) check(`trigger ${trigger} → one template`, set.size === 1, [...set].join());
check('every automation names a loaded template', all.every((a) => templates.some((r) => r.key === a.template)));
check('every Company OS template has an automation (live or blocked)', templates.every((r) => all.some((a) => a.template === r.key)));
// Filters are equality on event details: two automations on one event overlap unless they disagree on a shared key
// or write to different recipients.
const overlaps = (a, b) => a.event === b.event && recipientOf(a) === recipientOf(b) && Object.keys(a.filter ?? {}).every((k) => !(k in (b.filter ?? {})) || JSON.stringify(a.filter[k]) === JSON.stringify(b.filter[k]));
const pairs = automations.flatMap((a, i) => automations.slice(i + 1).filter((b) => overlaps(a, b) && a.template !== b.template).map((b) => `${a.name}/${b.name}`));
check('no event sends one recipient two different templates (filters don\'t overlap)', pairs.length === 0, pairs.join(' '));
check('overlap check itself: an empty filter overlaps any filter, conflicting values don\'t', overlaps({ event: 'e' }, { event: 'e', filter: { k: 1 } }) && !overlaps({ event: 'e', filter: { k: 1 } }, { event: 'e', filter: { k: 2 } }));
check('the recipe\'s placeholder rows are retired, and none is reloaded under its old name', ['receipt', 'hold_released', 'gift'].every((n) => doc.retire.automation.includes(n) && doc.retire.message_template.includes(n)
  && !automations.some((a) => a.name === n) && !templates.some((r) => r.key === n)));
check('the booking settings the triggers need are handed over', doc.settings.bookings.hold_frozen_while_payment_pending === true && doc.settings.bookings.reschedule_hours > 0 && doc.settings.bookings.policy_as_of_booking === true);
check('automation names are unique', new Set(all.map((a) => a.name)).size === all.length);
check('every live automation is loadable: email, an event. / record. recipient path, active', automations.every((a) =>
  JSON.stringify(a.channels) === '["email"]' && a.active === true && [a.recipient, a.recipient_email].some((p) => typeof p === 'string' && /^(event|record)\.\w+$/.test(p))));
check('every live automation listens to an event Company OS writes', automations.every((a) => a.event in m.EVENT_DETAILS), automations.filter((a) => !(a.event in m.EVENT_DETAILS)).map((a) => a.event).join());
check('a filter only names details the event carries', all.filter((a) => a.event in m.EVENT_DETAILS).every((a) => Object.keys(a.filter ?? {}).every((k) => m.EVENT_DETAILS[a.event].includes(k))));
check('blocked automations stay inactive and outside `records`', doc.blocked_automations.every((a) => a.active === false) && !automations.some((a) => doc.blocked_automations.some((b) => b.name === a.name)));
check('one email per approved payment: purchase note for product payments, payment confirmed otherwise',
  automations.find((a) => a.name === 'payment_confirmed')?.filter?.product === null && automations.find((a) => a.name === 'purchase_note')?.filter?.kind === 'receipt');

// ── the Spanish copy is complete and every placeholder is one Company OS fills
const ENGLISH = /\b(the|your|you|and|booking|payment|hello|hi|thanks|class|receipt|please|here)\b/i;
const PATH = /\{\{\s*([\w.]+)(?:\|(\w+))?\s*\}\}/g;
for (const e of m.LAUNCH_EMAILS) {
  const row = e.sender === 'clerk' ? doc.clerk.find((c) => c.key === e.key) : templates.find((r) => r.key === e.key);
  const text = `${row.subject}\n${row.body}`;
  check(`${e.key}: subject and body written`, row.subject.trim().length > 8 && row.body.trim().length > 40);
  check(`${e.key}: Spanish (greets with "Hola", no English words)`, /^Hola\b/.test(row.body) && !ENGLISH.test(text.replace(PATH, '')), text.match(ENGLISH)?.[0]);
  check(`${e.key}: brand and contact filled from the app config`, !/\{(brand|contact_email)\}/.test(text) && text.includes(brand.brand) && (e.row === 'NT-03' || text.includes(brand.contact_email)));
  check(`${e.key}: Spanish and English names for the admin screen`, !!e.name.es && !!e.name.en && !!e.trigger.es && !!e.trigger.en);
  if (e.sender === 'clerk') { check(`${e.key}: only Clerk's {{otp_code}}`, [...text.matchAll(PATH)].every((p) => p[1] === 'otp_code')); continue; }
  const users = all.filter((a) => a.template === e.key);
  for (const [, path, filter] of text.matchAll(PATH)) {
    const [root, field, ...rest] = path.split('.');
    const ok = rest.length === 0 && (!filter || ['date', 'time', 'datetime'].includes(filter)) && (
      (root === 'person' && field === 'name' && users.every((a) => a.recipient)) ||
      (root === 'tenant' && field === 'name') || (root === 'links' && field === 'base') ||
      (root === 'event' && users.every((a) => (m.EVENT_DETAILS[a.event] ?? []).includes(field))) ||
      (root === 'record' && users.every((a) => (m.RECORD_FIELDS[a.record_entity] ?? []).includes(field))));
    check(`${e.key}: {{${path}${filter ? `|${filter}` : ''}}} is filled for every automation that sends it`, ok);
  }
}

// ── no hard-coded domain: links are {{links.base}}/#/<an app route>, the only address is the configured contact
const routes = new Set();
for (const dir of await readdir('src/modules')) {
  const src = await readFile(`src/modules/${dir}/index.ts`, 'utf8').catch(() => '');
  for (const [, p] of src.matchAll(/path:\s*'([^']+)'/g)) routes.add(p);
}
const bodies = [...templates, ...doc.clerk].map((r) => `${r.subject}\n${r.body}`).join('\n');
const links = [...bodies.matchAll(/\{\{links\.base\}\}(\S*)/g)].map((x) => x[1]);
// A segment may be one record field ({{record.code}}), matching a route parameter (:code).
const asRoute = (l) => l.slice(2).replace(/\{\{record\.(\w+)\}\}/g, ':$1');
check('every email that links somewhere links to {{links.base}}/#/…', links.length >= 8 && links.every((l) => /^\/#\/([\w-]+|\{\{record\.\w+\}\}|\/)*$/.test(l)), links.join(' '));
check('every link is an app route', links.every((l) => routes.has(asRoute(l))), links.filter((l) => !routes.has(asRoute(l))).join(' '));
const withoutContact = (s) => s.split(brand.contact_email).join('');
const DOMAIN = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|co|app|io|net|org|test|dev)\b)/i;
check('no domain in the generated file except the configured contact email', !DOMAIN.test(withoutContact(json)), withoutContact(json).match(DOMAIN)?.[0]);
const source = await readFile('src/notifications/launchEmails.ts', 'utf8');
check('the source names no domain or address (it reads them from config)', !DOMAIN.test(source) && !/@[a-z0-9-]+\./i.test(source));
check('link_base_url comes from the recipe\'s app_url variable', doc.settings.comms.link_base_url?.$var === 'app_url');

// ── the preview renders sample values only and fills every path
for (const e of m.LAUNCH_EMAILS) {
  const r = m.renderSample(`${e.subject}\n${e.body}`, m.LAUNCH_SAMPLE);
  check(`${e.key}: preview fills every placeholder`, !/\{\{|\{brand\}|\{contact_email\}/.test(r));
}

// ── delivery status: read from Company OS's comms_log as reported, never derived or defaulted to "sent"
const scratch = await mkdtemp(join(tmpdir(), 'hoy-delivery-'));
try {
  const file = join(scratch, 'deliveryLog.mjs');
  await build({ entryPoints: ['src/notifications/deliveryLog.ts'], bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'silent' });
  const d = await import(pathToFileURL(file));
  check('a provider without request() has no delivery status', d.cosRequest({ name: 'mock' }) === null);
  let sent;
  const request = d.cosRequest({ name: 'cos', async request(method, path, body) { sent = { method, path, body }; return { data: [
    { id: 'l1', created_at: '2026-11-01T13:00:00Z', data: { message_key: 'welcome', address: 'a@example.test', status: 'queued', channel: 'email' } },
    { id: 'l2', data: { message_key: 'booking_released', status: 'bounced', error: null, sent_at: '2026-11-01T14:00:00Z' } },
    { id: 'l3', data: { message_key: 'purchase_note', status: 'skipped', error: 'opted_out' } },
    { id: 'l4', data: { message_key: 'welcome', status: 'mystery' } },
    { id: 'l5', data: { message_key: 'welcome' } },
  ] }; } });
  const rows = await d.readDeliveryLog(request, ['welcome', 'booking_released', 'purchase_note']);
  check('reads comms_log email rows of the launch templates through POST /query', sent.method === 'POST' && sent.path === '/query' && sent.body.entity === 'comms_log'
    && JSON.stringify(sent.body.filter.and) === JSON.stringify([{ field: 'channel', op: 'eq', value: 'email' }, { field: 'message_key', op: 'in', value: ['welcome', 'booking_released', 'purchase_note'] }]));
  check('statuses are the ones Company OS reported', rows.map((r) => r.status).join() === 'queued,bounced,skipped,mystery,unknown');
  check('the time is the send time, else the log time', rows[0].at === '2026-11-01T13:00:00Z' && rows[1].at === '2026-11-01T14:00:00Z' && rows[2].at === null);
  check('a skip keeps its reason', rows[2].error === 'opted_out');
  let threw = false;
  try { await d.readDeliveryLog(d.cosRequest({ async request() { return { error: 'forbidden' }; } }), ['welcome']); } catch { threw = true; }
  check('an unreadable answer is an error, not an empty log', threw);
} finally { await rm(scratch, { recursive: true, force: true }); }
done();
