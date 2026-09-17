import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { formatDateTime } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { EmailPreview } from '../../components/organism/EmailPreview/EmailPreview';
import { DataTable } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit, type AuditRow } from '../staff/audit';
import { usePeople } from '../staff/people';
import './admin.css';

interface EmailRow extends BaseRow { key: string; name: string; trigger: string; subject: Bi; body_mjml: string; version: number; active: boolean }
interface MsgRow extends BaseRow { user_id: string | null; channel: string; template_key: string | null; status: string; sent_at: string | null; payload: Record<string, unknown> | null }

/** The eleven templates the spec names, with default copy. `body_mjml` holds a JSON {es,en} plain-text body until the MJML designer exists. */
const STANDARD: { key: string; name: string; trigger: string; subject: Bi; body: Bi; cta: { label: Bi; href: string } }[] = [
  { key: 'booking_confirmed', name: 'Reserva confirmada', trigger: 'booking.created', subject: { es: 'Reserva confirmada: {{class_name}}', en: 'Booking confirmed: {{class_name}}' }, body: { es: 'Hola {{first_name}},\n\nTu cupo en {{class_name}} el {{class_datetime}} con {{teacher_name}} está confirmado.\n\nLlega 10 minutos antes. Cancela hasta {{cancel_hours}} h antes sin perder el crédito.', en: 'Hi {{first_name}},\n\nYour spot in {{class_name}} on {{class_datetime}} with {{teacher_name}} is confirmed.\n\nArrive 10 minutes early. Cancel up to {{cancel_hours}} h before without losing the credit.' }, cta: { label: { es: 'Ver mi reserva', en: 'View my booking' }, href: 'hoyapp://booking/{{booking_id}}' } },
  { key: 'receipt', name: 'Recibo de pago', trigger: 'payment.approved', subject: { es: 'Tu recibo de HOY · {{invoice_number}}', en: 'Your HOY receipt · {{invoice_number}}' }, body: { es: 'Hola {{first_name}},\n\nRecibimos tu pago de {{amount}} por {{product}}.\n\nFactura {{invoice_number}} · Referencia DIAN: {{dian_ref}}', en: 'Hi {{first_name}},\n\nWe received your payment of {{amount}} for {{product}}.\n\nInvoice {{invoice_number}} · DIAN reference: {{dian_ref}}' }, cta: { label: { es: 'Ver historial', en: 'View history' }, href: 'hoyapp://history' } },
  { key: 'class_cancelled', name: 'Clase cancelada', trigger: 'session.cancelled', subject: { es: 'Tu clase de {{class_name}} fue cancelada', en: 'Your {{class_name}} class was cancelled' }, body: { es: 'Hola {{first_name}},\n\nLa clase de {{class_name}} del {{class_datetime}} con {{teacher_name}} fue cancelada. Te devolvimos {{credit_returned}} crédito.\n\nElige otra clase cuando quieras.', en: 'Hi {{first_name}},\n\n{{class_name}} on {{class_datetime}} with {{teacher_name}} was cancelled. We returned {{credit_returned}} credit.\n\nPick another class whenever you like.' }, cta: { label: { es: 'Ver horario', en: 'View schedule' }, href: 'hoyapp://classes?date={{date}}' } },
  { key: 'waitlist_promoted', name: 'Cupo liberado', trigger: 'waitlist.offered', subject: { es: 'Se liberó un cupo en {{class_name}}', en: 'A spot opened in {{class_name}}' }, body: { es: 'Hola {{first_name}},\n\nSe liberó un cupo en {{class_name}} el {{class_datetime}}. Tienes {{claim_minutes}} minutos para reclamarlo.', en: 'Hi {{first_name}},\n\nA spot opened in {{class_name}} on {{class_datetime}}. You have {{claim_minutes}} minutes to claim it.' }, cta: { label: { es: 'Reclamar cupo', en: 'Claim spot' }, href: 'hoyapp://waitlist/{{waitlist_id}}' } },
  { key: 'class_reminder', name: 'Recordatorio de clase', trigger: 'booking.t-2h', subject: { es: 'Tu clase es en 2 horas', en: 'Your class is in 2 hours' }, body: { es: 'Hola {{first_name}},\n\n{{class_name}} empieza a las {{time}} con {{teacher_name}}. Trae agua y toalla.', en: 'Hi {{first_name}},\n\n{{class_name}} starts at {{time}} with {{teacher_name}}. Bring water and a towel.' }, cta: { label: { es: 'Ver clase', en: 'View class' }, href: 'hoyapp://booking/{{booking_id}}' } },
  { key: 'how_to_prepare', name: 'Cómo prepararte', trigger: 'booking.first', subject: { es: 'Tu primera clase en HOY', en: 'Your first class at HOY' }, body: { es: 'Hola {{first_name}},\n\nBienvenida a HOY. Llega 15 minutos antes, ven con ropa cómoda y sin comer pesado 2 horas antes. Tenemos mats, toallas y duchas.', en: 'Hi {{first_name}},\n\nWelcome to HOY. Arrive 15 minutes early, wear comfortable clothes and avoid heavy meals 2 hours before. We have mats, towels and showers.' }, cta: { label: { es: 'Reglas del club', en: 'Club rules' }, href: 'hoyapp://rules' } },
  { key: 'birthday', name: 'Cumpleaños', trigger: 'user.birthday', subject: { es: 'Feliz cumpleaños, {{first_name}}', en: 'Happy birthday, {{first_name}}' }, body: { es: 'Hoy es tu día. Te regalamos un pase de invitado para que vengas con alguien especial.', en: 'It is your day. Here is a guest pass so you can bring someone special.' }, cta: { label: { es: 'Invitar a alguien', en: 'Invite someone' }, href: 'hoyapp://invite' } },
  { key: 'membership_renewal', name: 'Renovación de membresía', trigger: 'membership.t-3d', subject: { es: 'Tu membresía se renueva el {{renews_at}}', en: 'Your membership renews on {{renews_at}}' }, body: { es: 'Hola {{first_name}},\n\nTu {{plan_name}} se renueva el {{renews_at}} por {{amount}}. Si quieres pausar o cambiar, hazlo desde la app.', en: 'Hi {{first_name}},\n\nYour {{plan_name}} renews on {{renews_at}} for {{amount}}. Pause or change it from the app.' }, cta: { label: { es: 'Gestionar membresía', en: 'Manage membership' }, href: 'hoyapp://membership' } },
  { key: 'payment_failed', name: 'Pago rechazado', trigger: 'payment.declined', subject: { es: 'No pudimos procesar tu pago', en: 'We could not process your payment' }, body: { es: 'Hola {{first_name}},\n\nEl pago de {{amount}} fue rechazado ({{reason}}). Puedes reintentar o cambiar de método.', en: 'Hi {{first_name}},\n\nThe payment of {{amount}} was declined ({{reason}}). Retry or change the method.' }, cta: { label: { es: 'Reintentar pago', en: 'Retry payment' }, href: 'hoyapp://payment-methods' } },
  { key: 'gift_card_delivered', name: 'Tarjeta de regalo', trigger: 'gift_card.deliver', subject: { es: '{{buyer_name}} te regaló HOY', en: '{{buyer_name}} gave you HOY' }, body: { es: 'Hola {{first_name}},\n\nTienes un bono de {{amount}} para usar en HOY. Código: {{code}}.', en: 'Hi {{first_name}},\n\nYou have a {{amount}} voucher for HOY. Code: {{code}}.' }, cta: { label: { es: 'Canjear', en: 'Redeem' }, href: 'hoyapp://gift/{{code}}' } },
  { key: 'invite', name: 'Invitación', trigger: 'invite.sent', subject: { es: '{{inviter_name}} te invita a HOY', en: '{{inviter_name}} invites you to HOY' }, body: { es: 'Hola,\n\n{{inviter_name}} te invita a una clase en HOY. Tu pase de invitado vale hasta el {{expires_at}}.', en: 'Hi,\n\n{{inviter_name}} invites you to a class at HOY. Your guest pass is valid until {{expires_at}}.' }, cta: { label: { es: 'Aceptar invitación', en: 'Accept invitation' }, href: 'https://hoy.co/invite/{{code}}' } },
];
const SAMPLE: Record<string, string> = { first_name: 'Mariana', class_name: 'Hot Vinyasa', class_datetime: 'jue 18 sep · 17:30', teacher_name: 'Andrés', time: '17:30', cancel_hours: '4', credit_returned: '1', amount: '$39.000', product: 'Clase de Prueba', invoice_number: 'HOY-1031', dian_ref: '—', claim_minutes: '30', renews_at: '17 oct', plan_name: 'Plan Mensual', reason: 'fondos insuficientes', buyer_name: 'Sofía', code: 'HOY-REGALO-2401', inviter_name: 'Juliana', expires_at: '30 sep', booking_id: 'bk_1', waitlist_id: 'wl_1', date: '2026-09-18' };

interface ParsedBody { es: string; en: string; cta?: { label: Bi; href: string } }
function parseBody(row: EmailRow): ParsedBody {
  try { const j = JSON.parse(row.body_mjml); if (j && typeof j.es === 'string') return j; } catch { /* not json */ }
  const std = STANDARD.find((s) => s.key === row.key);
  if (std) return { es: std.body.es, en: std.body.en, cta: std.cta };
  return { es: row.body_mjml.startsWith('<') ? '' : row.body_mjml, en: '' };
}
const varsIn = (...texts: string[]) => [...new Set(texts.join(' ').match(/\{\{\s*[\w.]+\s*\}\}/g)?.map((v) => v.replace(/[{}\s]/g, '')) ?? [])];

/** M-04 — template list by trigger, rendered canvas with sample data, ES/EN switch, editor, versions, test send, send log. */
export function EmailsPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { can, user } = useSession();
  const audit = useAudit('admin');
  const { rows: templates, loading } = useTable<EmailRow>('email_templates', { orderBy: { column: 'trigger' } });
  const { rows: log } = useTable<MsgRow>('message_log', { where: { channel: 'email' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { byId } = usePeople();
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<'es' | 'en'>('es');
  const [tab, setTab] = useState<'edit' | 'versions' | 'log'>('edit');
  const row = templates.find((x) => x.id === selected) ?? templates[0];
  const { rows: versions } = useTable<AuditRow>('audit_log', { where: { entity: 'email_templates', entity_id: row?.id ?? '__none__' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const canWrite = can('content.write');
  const missing = STANDARD.filter((s) => !templates.some((x) => x.key === s.key));

  const createMissing = async () => {
    for (const s of missing) {
      const r = await data.insert<EmailRow>('email_templates', { key: s.key, name: s.name, trigger: s.trigger, subject: s.subject, body_mjml: JSON.stringify({ es: s.body.es, en: s.body.en, cta: s.cta }), version: 1, active: false });
      await audit('email_template.create', 'email_templates', r.id, { key: s.key });
    }
  };
  const testSend = async () => {
    if (!row) return;
    const m = await data.insert('message_log', { user_id: user.id, channel: 'email', template_key: row.key, automation_id: null, status: 'sent', sent_at: new Date().toISOString(), payload: { test: true, to: user.email, locale: preview, version: row.version } });
    await audit('email_template.test', 'email_templates', row.id, { message_id: m.id, to: user.email, locale: preview });
    setTab('log');
  };

  const logColumns = [
    { key: 'sent_at', label: t('admin.emails.log.when'), render: (r: MsgRow) => <span className="mono small">{r.sent_at ? formatDateTime(r.sent_at, lang) : '—'}</span> },
    { key: 'user_id', label: t('admin.emails.log.to'), render: (r: MsgRow) => r.payload?.test ? <span>{String(r.payload.to)} <Badge tone="warn">test</Badge></span> : byId.get(r.user_id ?? '')?.name ?? '—' },
    { key: 'template_key', label: t('admin.emails.log.template') },
    { key: 'status', label: t('admin.emails.log.status'), render: (r: MsgRow) => <Badge tone={toneForStatus(r.status)}>{r.status}</Badge> },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.emails.title')}</h1><p className="muted small">{t('admin.emails.subtitle')}</p></div>
        {canWrite && missing.length > 0 && <Button size="sm" variant="secondary" onClick={createMissing}>{t('admin.emails.createMissing', { n: missing.length })}</Button>}
      </div>
      {loading && templates.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {!loading && templates.length === 0 && <EmptyState title={t('admin.emails.empty')} body={t('admin.emails.empty.body')} action={canWrite && <Button size="sm" onClick={createMissing}>{t('admin.emails.createMissing', { n: missing.length })}</Button>} />}
      {row && (
        <div className="emails">
          <aside className="emails-list">
            {[...new Set(templates.map((x) => x.trigger))].map((trigger) => (
              <div key={trigger} className="stack-sm">
                <div className="eyebrow mono">{trigger}</div>
                {templates.filter((x) => x.trigger === trigger).map((x) => { const b = parseBody(x); return (
                  <button key={x.id} type="button" className={`emails-item ${x.id === row.id ? 'is-selected' : ''}`} onClick={() => { setSelected(x.id); setTab('edit'); }}>
                    <span className="grow"><span className="small">{x.name}</span><span className="xs muted"> · v{x.version}</span></span>
                    <span className="row"><span className="xs muted">{b.en ? 'ES · EN' : 'ES'}</span><Badge tone={x.active ? 'success' : 'warn'}>{x.active ? t('core.common.on') : t('admin.emails.draft')}</Badge></span>
                  </button>
                ); })}
              </div>
            ))}
          </aside>
          <section className="emails-canvas stack-sm">
            <div className="row-between wrap">
              <div className="row wrap"><h2 className="adm-h2">{row.name}</h2><code className="xs muted">{row.key}</code></div>
              <div className="row" role="tablist"><Chip selected={preview === 'es'} onClick={() => setPreview('es')}>ES</Chip><Chip selected={preview === 'en'} onClick={() => setPreview('en')}>EN</Chip></div>
            </div>
            <Canvas row={row} lang={preview} />
            <p className="xs muted">{t('admin.emails.deepLink')} · {t('admin.emails.dianNote')}</p>
          </section>
          <aside className="emails-side stack">
            <div className="row" role="tablist">
              <Chip selected={tab === 'edit'} onClick={() => setTab('edit')}>{t('core.common.edit')}</Chip>
              <Chip selected={tab === 'versions'} onClick={() => setTab('versions')}>{t('admin.emails.versions')} · {versions.length}</Chip>
              <Chip selected={tab === 'log'} onClick={() => setTab('log')}>{t('admin.emails.log')}</Chip>
            </div>
            {tab === 'edit' && <Editor key={row.id} row={row} readOnly={!canWrite} onSave={async (patch, before) => { await data.update('email_templates', row.id, { ...patch, version: row.version + 1 }); await audit('email_template.update', 'email_templates', row.id, { before, after: patch, version: row.version + 1 }); }} onTest={testSend} />}
            {tab === 'versions' && (
              <Card padding="sm">
                {versions.length === 0 && <p className="small muted" style={{ padding: 8 }}>{t('admin.emails.versions.empty')}</p>}
                {versions.map((v) => (
                  <div key={v.id} className="emails-version">
                    <div className="grow"><div className="small"><strong>{v.action.replace('email_template.', '')}</strong>{v.diff?.version != null ? ` · v${String(v.diff.version)}` : ''}</div><div className="xs muted">{formatDateTime(v.created_at, lang)} · {byId.get(v.actor_id ?? '')?.name ?? '—'}</div></div>
                    {canWrite && v.action === 'email_template.update' && v.diff?.before != null && <Button size="sm" variant="ghost" onClick={async () => { const before = v.diff!.before as Record<string, unknown>; await data.update('email_templates', row.id, { ...before, version: row.version + 1 }); await audit('email_template.rollback', 'email_templates', row.id, { to: v.id, version: row.version + 1 }); }}>{t('admin.emails.rollback')}</Button>}
                  </div>
                ))}
              </Card>
            )}
            {tab === 'log' && <DataTable columns={logColumns} rows={log} rowKey={(r) => r.id} dense pageSize={10} emptyText={t('admin.emails.log.empty')} />}
          </aside>
        </div>
      )}
    </div>
  );
}

function Canvas({ row, lang }: { row: EmailRow; lang: 'es' | 'en' }) {
  const b = parseBody(row);
  const body = lang === 'en' ? b.en || b.es : b.es;
  const subject = lang === 'en' ? row.subject.en || row.subject.es : row.subject.es;
  return <EmailPreview envelope={`${tenant.name} <${tenant.contact.email}> → mariana@…  ·  ${lang.toUpperCase()} · v${row.version}`} subject={subject} body={body} cta={b.cta ? { label: lang === 'en' ? b.cta.label.en || b.cta.label.es : b.cta.label.es, href: b.cta.href } : undefined} footer={`${tenant.legalName} · ${tenant.city} · ${lang === 'es' ? 'Recibes este correo porque tienes una cuenta en' : 'You receive this email because you have an account at'} ${tenant.name}.`} vars={SAMPLE} />;
}

function Editor({ row, readOnly, onSave, onTest }: { row: EmailRow; readOnly: boolean; onSave: (patch: Partial<EmailRow>, before: Record<string, unknown>) => Promise<void>; onTest: () => Promise<void> }) {
  const { t } = useI18n();
  const init = useMemo(() => { const b = parseBody(row); return { name: row.name, trigger: row.trigger, subjectEs: row.subject.es, subjectEn: row.subject.en ?? '', bodyEs: b.es, bodyEn: b.en, ctaLabelEs: b.cta?.label.es ?? '', ctaLabelEn: b.cta?.label.en ?? '', ctaHref: b.cta?.href ?? '', active: row.active }; }, [row]);
  const [d, setD] = useState(init);
  const [saving, setSaving] = useState(false);
  useEffect(() => setD(init), [init]);
  const dirty = JSON.stringify(d) !== JSON.stringify(init);
  const missingEn = !d.subjectEn.trim() || !d.bodyEn.trim();
  const vars = varsIn(d.subjectEs, d.bodyEs, d.subjectEn, d.bodyEn, d.ctaHref);
  const save = async () => {
    setSaving(true);
    try {
      const body: ParsedBody = { es: d.bodyEs, en: d.bodyEn, cta: d.ctaHref ? { label: { es: d.ctaLabelEs, en: d.ctaLabelEn }, href: d.ctaHref } : undefined };
      await onSave({ name: d.name, trigger: d.trigger, subject: { es: d.subjectEs, en: d.subjectEn }, body_mjml: JSON.stringify(body), active: d.active && !missingEn }, { name: row.name, trigger: row.trigger, subject: row.subject, body_mjml: row.body_mjml, active: row.active });
    } finally { setSaving(false); }
  };
  return (
    <div className="stack-sm">
      <Field label={t('admin.emails.f.name')}>{(id) => <Input id={id} disabled={readOnly} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />}</Field>
      <Field label={t('admin.emails.f.trigger')} hint={t('admin.emails.f.trigger.hint')}>{(id) => <Input id={id} disabled={readOnly} value={d.trigger} onChange={(e) => setD({ ...d, trigger: e.target.value })} className="mono" />}</Field>
      <Field label={`${t('admin.emails.f.subject')} · ES`} required>{(id) => <Input id={id} disabled={readOnly} value={d.subjectEs} onChange={(e) => setD({ ...d, subjectEs: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.subject')} · EN`}>{(id) => <Input id={id} disabled={readOnly} value={d.subjectEn} onChange={(e) => setD({ ...d, subjectEn: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.body')} · ES`} required>{(id) => <textarea id={id} className="input adm-textarea" rows={6} disabled={readOnly} value={d.bodyEs} onChange={(e) => setD({ ...d, bodyEs: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.body')} · EN`}>{(id) => <textarea id={id} className="input adm-textarea" rows={6} disabled={readOnly} value={d.bodyEn} onChange={(e) => setD({ ...d, bodyEn: e.target.value })} />}</Field>
      <div className="grid grid-2">
        <Field label={`${t('admin.emails.f.cta')} · ES`}>{(id) => <Input id={id} disabled={readOnly} value={d.ctaLabelEs} onChange={(e) => setD({ ...d, ctaLabelEs: e.target.value })} />}</Field>
        <Field label={`${t('admin.emails.f.cta')} · EN`}>{(id) => <Input id={id} disabled={readOnly} value={d.ctaLabelEn} onChange={(e) => setD({ ...d, ctaLabelEn: e.target.value })} />}</Field>
      </div>
      <Field label={t('admin.emails.f.deepLink')}>{(id) => <Input id={id} disabled={readOnly} value={d.ctaHref} onChange={(e) => setD({ ...d, ctaHref: e.target.value })} className="mono" placeholder="hoyapp://…" />}</Field>
      <div className="stack-sm"><div className="eyebrow">{t('admin.emails.vars')}</div><div className="row wrap">{vars.map((v) => <code key={v} className="emails-var">{`{{${v}}}`}</code>)}{vars.length === 0 && <span className="xs muted">—</span>}</div></div>
      <div className="row-between wrap">
        <Toggle size="sm" checked={d.active} disabled={readOnly || missingEn} label={t('admin.emails.f.active')} onChange={(on) => setD({ ...d, active: on })} />
        {missingEn && <span className="xs muted">{t('admin.emails.missingEn')}</span>}
      </div>
      <div className="row-between wrap">
        <Button size="sm" variant="secondary" onClick={onTest}>{t('admin.emails.test')}</Button>
        {!readOnly && <Button size="sm" disabled={!dirty || !d.subjectEs.trim() || !d.bodyEs.trim()} loading={saving} onClick={save}>{t('admin.emails.saveVersion', { v: row.version + 1 })}</Button>}
      </div>
      {dirty && <p className="xs muted">{t('admin.emails.unsaved')}</p>}
    </div>
  );
}

