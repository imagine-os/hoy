import type { BaseRow } from '../../data/schema';
import type { DataProvider } from '../../data/types';
import type { Bi } from '../../specs/types';
import { tenant } from '../../tenant/tenant';
import { formatDateTime, formatCOP } from '../../i18n/format';
import { APP } from '../../data/emailCatalog';
import { LAUNCH_NOTIFICATION_EVENTS, launchSourceUnavailable, type LaunchNotificationEvent, type LaunchPreviewPayload, type LaunchPreviewResult, type LaunchTargetScope, type LaunchUnavailableReason } from './contracts';

class Missing extends Error { constructor(readonly reason: LaunchUnavailableReason) { super(reason); } }
class Cancelled extends Error {}
const missing = (reason: LaunchUnavailableReason): never => { throw new Missing(reason); };
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const bi = (value: unknown): value is Bi => !!value && typeof value === 'object' && text((value as Bi).es) && text((value as Bi).en);
const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);
const freeze = <T,>(value: T): T => { if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); } return value; };
const render = (copy: string, vars: Record<string, string>): string => copy.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (token, key: string) => Object.prototype.hasOwnProperty.call(vars, key) && typeof vars[key] === 'string' ? vars[key] : token);
const previewHref = (href: string) => !/[\u0000-\u001f]/.test(href) && (/^(https?:\/\/|\/?#\/|\/(app|site|auth)\/|\.\/#\/)/.test(href) || href.startsWith(APP) && /^[A-Za-z0-9_/?=&%#.-]+$/.test(href.slice(APP.length)));
interface SavedTemplate extends BaseRow { key: string; trigger: string; subject: Bi; body_mjml: string; version: number; active: boolean }

/** Read-only exact source/proof/template resolution. Never invoked by page render or historical scans. */
export async function buildLaunchNotificationPreview(data: DataProvider, event: LaunchNotificationEvent, scope: LaunchTargetScope, control: { isCurrent: () => boolean }): Promise<LaunchPreviewResult> {
  const check = () => { if (!control.isCurrent()) throw new Cancelled(); };
  const rows = async (table: string, where: Record<string, unknown>) => {
    check(); const found = await data.list(table, { where: { ...where, tenant_id: scope.tenantId } }); check();
    return found.filter(row => row.tenant_id === scope.tenantId && Object.entries(where).every(([key, value]) => row[key] === value));
  };
  const one = async (table: string, where: Record<string, unknown>, reason: LaunchUnavailableReason = 'source-unverified'): Promise<BaseRow> => {
    const found = await rows(table, where); if (found.length !== 1) return missing(reason); return found[0];
  };
  try {
    check();
    if (data.name !== 'mock') return launchSourceUnavailable(event.type, 'unsupported-provider');
    if (scope.tenantId !== tenant.id || scope.actorId !== event.ownerId || scope.role === 'public' || event.type === 'welcome' && scope.role !== 'customer') return launchSourceUnavailable(event.type, 'source-unverified');
    const owner = await one('users', { id: event.ownerId }, 'recipient-unavailable');
    if (owner.status !== 'active' || !text(owner.email) || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(owner.email) || /[\u0000-\u001f\u007f]/.test(owner.email) || /@sin-email\.hoyos\.test$/i.test(owner.email)) return launchSourceUnavailable(event.type, 'recipient-unavailable');
    const profiles = await rows('profiles', { user_id: event.ownerId });
    const name = profiles.length === 1 && text(profiles[0].full_name) ? profiles[0].full_name.trim() : null;
    const recipient: LaunchPreviewPayload['recipient'] = { kind: 'account', name, email: owner.email.trim(), locale: owner.locale === 'es' || owner.locale === 'en' ? owner.locale : null };
    const variables: Record<'es' | 'en', Record<string, string>> = { es: { studio: tenant.name }, en: { studio: tenant.name } };
    if (name) { variables.es.first_name = name.split(/\s+/)[0]; variables.en.first_name = variables.es.first_name; }
    let sourceId: string, summary: Bi | undefined;
    let recheckSource: () => Promise<boolean> = async () => true;
    if (event.type === 'welcome') {
      if (!/^[A-Za-z0-9_-]{16,80}$/.test(event.requestId)) return launchSourceUnavailable(event.type, 'source-unverified');
      sourceId = `mock_signup_${scope.tenantId}_${event.requestId}`;
      const proof = await one('audit_log', { id: sourceId });
      const detail = proof.diff as Record<string, unknown> | null;
      if (proof.action !== 'mock.registration' || proof.entity !== 'users' || proof.entity_id !== owner.id || detail?.userId !== owner.id || detail.role !== 'customer' || detail.source !== 'fictional-browser-registration') return launchSourceUnavailable(event.type, 'source-unverified');
      recheckSource = async () => {
        const latest = await one('audit_log', { id: sourceId }), d = latest.diff as Record<string, unknown> | null;
        return latest.action === proof.action && latest.entity === proof.entity && latest.entity_id === owner.id && d?.userId === owner.id && d.role === 'customer' && d.source === 'fictional-browser-registration';
      };
    } else if (event.type === 'payment-confirmed' || event.type === 'payment-rejected') {
      const payment = await one('payments', { id: event.paymentId, user_id: owner.id });
      const status = event.type === 'payment-confirmed' ? 'approved' : 'declined';
      if (payment.status !== status || typeof payment.amount !== 'number' || !Number.isFinite(payment.amount) || payment.amount < 0 || payment.currency !== tenant.currency) return launchSourceUnavailable(event.type, 'source-unverified');
      sourceId = payment.id;
      recheckSource = async () => { const latest = await one('payments', { id: payment.id, user_id: owner.id }); return latest.status === status && latest.amount === payment.amount && latest.currency === payment.currency; };
      for (const lang of ['es', 'en'] as const) { variables[lang].amount = formatCOP(payment.amount, lang); variables[lang].payment_id = payment.id; variables[lang].reason = lang === 'es' ? 'Motivo bancario no verificado en esta simulación' : 'Bank reason not verified in this simulation'; }
    } else if (event.type === 'rescheduled') {
      const old = await one('bookings', { id: event.oldBookingId, user_id: owner.id });
      const next = await one('bookings', { id: event.newBookingId, user_id: owner.id });
      if (old.id === next.id || old.status !== 'cancelled' || next.status !== 'booked' || old.session_id === next.session_id || !same(old.paid_with, next.paid_with) || !same(old.ledger_id, next.ledger_id) || !same(old.payment_id, next.payment_id)) return launchSourceUnavailable(event.type, 'source-unverified');
      const audits = await rows('audit_log', { action: 'booking.reschedule', entity: 'bookings', entity_id: old.id, actor_id: owner.id });
      const proofs = audits.filter(a => { const d = a.diff as Record<string, unknown> | null; return d?.source === 'app' && d.from_session_id === old.session_id && d.to_session_id === next.session_id && d.replacement_booking_id === next.id; });
      if (proofs.length !== 1) return launchSourceUnavailable(event.type, 'source-unverified');
      const before = await one('class_sessions', { id: old.session_id }), after = await one('class_sessions', { id: next.session_id });
      if (!text(before.starts_at) || !text(after.starts_at) || !Number.isFinite(Date.parse(before.starts_at)) || !Number.isFinite(Date.parse(after.starts_at)) || !text(before.title) || !text(after.title)) return launchSourceUnavailable(event.type, 'source-unverified');
      const teachers = text(after.teacher_id) ? await rows('teachers', { id: after.teacher_id }) : [];
      for (const lang of ['es', 'en'] as const) {
        variables[lang].old_class_datetime = formatDateTime(before.starts_at, lang); variables[lang].class_datetime = formatDateTime(after.starts_at, lang);
        variables[lang].class_name = after.title; variables[lang].booking_id = next.id;
        if (teachers.length === 1 && text(teachers[0].display_name)) variables[lang].teacher_name = teachers[0].display_name;
      }
      summary = { es: `${before.title} · ${variables.es.old_class_datetime} → ${after.title} · ${variables.es.class_datetime}`, en: `${before.title} · ${variables.en.old_class_datetime} → ${after.title} · ${variables.en.class_datetime}` };
      sourceId = next.id;
      recheckSource = async () => {
        const a = await one('bookings', { id: old.id, user_id: owner.id }), b = await one('bookings', { id: next.id, user_id: owner.id });
        return a.status === 'cancelled' && b.status === 'booked' && a.session_id === old.session_id && b.session_id === next.session_id && ['paid_with', 'ledger_id', 'payment_id'].every(field => same(a[field], old[field]) && same(b[field], next[field]));
      };
    } else return launchSourceUnavailable(event.type, 'source-unverified');
    const definition = LAUNCH_NOTIFICATION_EVENTS.find(item => item.id === event.type)!;
    let payload: LaunchPreviewPayload;
    if (definition.template.kind === 'builtin-mock') {
      payload = { event: event.type, status: 'unsent-preview', sourceId, ownerId: owner.id, recipient, template: { ...definition.template },
        subject: { es: 'Confirmación de pago demo', en: 'Demo payment confirmation' },
        body: { es: `El pago ficticio ${sourceId} figura aprobado por ${variables.es.amount}. Esta confirmación es distinta de la vista previa del recibo. No se envió ningún email.`, en: `Fictional payment ${sourceId} is recorded as approved for ${variables.en.amount}. This confirmation is separate from the receipt preview. No email was sent.` } };
    } else if (definition.template.kind === 'saved') {
      const row = await one('email_templates', { key: definition.template.key }, 'template-unavailable') as SavedTemplate;
      if (row.trigger !== definition.template.trigger || !Number.isInteger(row.version) || row.version < 1 || typeof row.active !== 'boolean' || !bi(row.subject) || !text(row.body_mjml)) return launchSourceUnavailable(event.type, 'template-unavailable');
      let parsed: { es: string; en: string; cta?: { label: Bi; href: string } };
      try { parsed = JSON.parse(row.body_mjml); } catch { return launchSourceUnavailable(event.type, 'template-unavailable'); }
      if (!bi(parsed) || parsed.cta && (!bi(parsed.cta.label) || !text(parsed.cta.href))) return launchSourceUnavailable(event.type, 'template-unavailable');
      const subject = { es: render(row.subject.es, variables.es), en: render(row.subject.en, variables.en) };
      const body = { es: render(parsed.es, variables.es), en: render(parsed.en, variables.en) };
      const cta = parsed.cta ? { label: { es: render(parsed.cta.label.es, variables.es), en: render(parsed.cta.label.en, variables.en) }, href: { es: render(parsed.cta.href, variables.es), en: render(parsed.cta.href, variables.en) } } : undefined;
      if (/\{\{/.test(JSON.stringify([subject, body, cta])) || cta && Object.values(cta.href).some(href => !previewHref(href))) return launchSourceUnavailable(event.type, 'template-unavailable');
      payload = { event: event.type, status: 'unsent-preview', sourceId, ownerId: owner.id, recipient, template: { kind: 'saved', key: row.key, id: row.id, version: row.version, active: row.active }, subject, body, ...(cta ? { cta } : {}), ...(summary ? { summary } : {}) };
    } else return launchSourceUnavailable(event.type, 'policy-pending');
    if (!await recheckSource()) return launchSourceUnavailable(event.type, 'source-unverified');
    // An account change during resolution cannot turn another actor's preview into a late result.
    const currentOwner = await one('users', { id: event.ownerId }, 'recipient-unavailable');
    if (currentOwner.status !== 'active' || currentOwner.email !== owner.email || !same(currentOwner.locale, owner.locale)) return launchSourceUnavailable(event.type, 'recipient-unavailable');
    check(); return { status: 'ready', payload: freeze(payload) };
  } catch (error) {
    if (error instanceof Cancelled) return { status: 'cancelled', event: event.type };
    if (error instanceof Missing) return launchSourceUnavailable(event.type, error.reason);
    return { status: 'error', event: event.type };
  }
}

/** Current fictional challenge only; no account lookup, code generation, notification record or queue. */
export function buildDemoSignInPreview(input: { active: boolean; code: string | null; expiresAt: number | null; now: number }): LaunchPreviewResult | null {
  if (!input.active || !input.code || !/^\d{6}$/.test(input.code) || !Number.isFinite(input.now) || input.expiresAt === null || !Number.isFinite(input.expiresAt) || input.expiresAt <= input.now) return null;
  const expiryDate = new Date(input.expiresAt);
  if (!Number.isFinite(expiryDate.getTime())) return null;
  const expiry = expiryDate.toISOString();
  return { status: 'ready', payload: freeze({ event: 'sign-in-code', status: 'unsent-preview', sourceId: 'current-fictional-challenge', ownerId: null,
    recipient: { kind: 'demo-only', name: null, email: null, locale: null }, template: { kind: 'builtin-mock', key: 'nt02.demo-sign-in-code', contractRevision: 1 },
    subject: { es: 'Código de acceso demo · sin enviar', en: 'Demo sign-in code · unsent' },
    body: { es: `Código ficticio actual: ${input.code}. Vence: ${expiry}. Solo pertenece a esta simulación; no se seleccionó una dirección de email verificada ni se envió ningún mensaje.`, en: `Current fictional code: ${input.code}. Expires: ${expiry}. It belongs only to this simulation; no verified email address was selected and no message was sent.` } }) };
}
