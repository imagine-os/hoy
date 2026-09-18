import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, MessageLogRow, ProfileRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { formatDateTime } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { PhoneBubble } from '../../components/molecule/PhoneBubble/PhoneBubble';
import { DataTable } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { usePeople } from '../staff/people';
import { inQuietHours, useSettings } from './settings';
import './admin.css';

interface AutomationRow extends BaseRow { name: string; trigger: string; channel: 'whatsapp' | 'email' | 'push'; template_key: string; delay_min: number; quiet_hours: { from: string; to: string } | null; enabled: boolean }
interface WaTemplateRow extends BaseRow { key: string; name: string; category: 'utility' | 'marketing' | 'authentication'; body: Bi; approval_status: 'draft' | 'pending' | 'approved' | 'rejected'; active: boolean }

/** The nine automations the spec names; created on demand when missing. */
const STANDARD: { name: Bi; trigger: string; template: { key: string; name: string; category: WaTemplateRow['category']; body: Bi }; delay_min: number }[] = [
  { name: { es: 'Reserva confirmada', en: 'Booking confirmed' }, trigger: 'booking.created', delay_min: 0, template: { key: 'booking_confirmed', name: 'Reserva confirmada', category: 'utility', body: { es: 'Hola {{1}}, tu cupo en {{2}} el {{3}} está confirmado. Llega 10 min antes.', en: 'Hi {{1}}, your spot in {{2}} on {{3}} is confirmed. Arrive 10 min early.' } } },
  { name: { es: 'Recordatorio 2h antes', en: 'Reminder T−2h' }, trigger: 'booking.t-2h', delay_min: 0, template: { key: 'class_reminder', name: 'Recordatorio de clase', category: 'utility', body: { es: 'Hola {{1}}, tu clase de {{2}} empieza a las {{3}}.', en: 'Hi {{1}}, your {{2}} class starts at {{3}}.' } } },
  { name: { es: 'Clase cancelada', en: 'Class cancelled' }, trigger: 'session.cancelled', delay_min: 0, template: { key: 'class_cancelled', name: 'Clase cancelada', category: 'utility', body: { es: 'Hola {{1}}, la clase de {{2}} del {{3}} fue cancelada. Te devolvimos el crédito. Reagenda con un toque.', en: 'Hi {{1}}, {{2}} on {{3}} was cancelled. Your credit is back. Rebook in one tap.' } } },
  { name: { es: 'Oferta de lista de espera', en: 'Waitlist promoted' }, trigger: 'waitlist.offered', delay_min: 0, template: { key: 'waitlist_offer', name: 'Cupo liberado', category: 'utility', body: { es: 'Se liberó un cupo en {{1}}. Tienes 30 min para reclamarlo.', en: 'A spot opened in {{1}}. You have 30 min to claim it.' } } },
  { name: { es: 'Cumpleaños', en: 'Birthday' }, trigger: 'user.birthday', delay_min: 8 * 60, template: { key: 'birthday', name: 'Cumpleaños', category: 'marketing', body: { es: 'Feliz cumpleaños, {{1}}. Te regalamos un pase de invitado para celebrar en HOY.', en: 'Happy birthday, {{1}}. Here is a guest pass to celebrate at HOY.' } } },
  { name: { es: 'Recibo', en: 'Receipt' }, trigger: 'payment.approved', delay_min: 0, template: { key: 'receipt', name: 'Recibo de pago', category: 'utility', body: { es: 'Hola {{1}}, recibimos tu pago de {{2}} por {{3}}. Factura {{4}}.', en: 'Hi {{1}}, we received your payment of {{2}} for {{3}}. Invoice {{4}}.' } } },
  { name: { es: 'Membresía por vencer', en: 'Membership expiring' }, trigger: 'membership.t-3d', delay_min: 0, template: { key: 'membership_expiring', name: 'Membresía por vencer', category: 'utility', body: { es: 'Hola {{1}}, tu {{2}} se renueva el {{3}}. Pausa o cambia desde la app.', en: 'Hi {{1}}, your {{2}} renews on {{3}}. Pause or change from the app.' } } },
  { name: { es: 'Pedir feedback', en: 'Feedback request' }, trigger: 'class.attended', delay_min: 180, template: { key: 'feedback_request', name: 'Pedir feedback', category: 'marketing', body: { es: 'Hola {{1}}, ¿cómo estuvo {{2}} con {{3}}? Califícala en 30 segundos.', en: 'Hi {{1}}, how was {{2}} with {{3}}? Rate it in 30 seconds.' } } },
  { name: { es: 'Invitación enviada', en: 'Invite sent' }, trigger: 'invite.sent', delay_min: 0, template: { key: 'invite', name: 'Invitación', category: 'marketing', body: { es: `{{1}} te invita a una clase en ${tenant.name}. Tu pase vale hasta el {{2}}.`, en: `{{1}} invites you to a class at ${tenant.name}. Your pass is valid until {{2}}.` } } },
];
const SAMPLE = ['Mariana', 'Hot Vinyasa', '17:30', 'HOY-1031'];
const delayLabel = (min: number, now: string) => (min === 0 ? now : min % 60 === 0 ? `T+${min / 60}h` : `T+${min}m`);

/** M-05 — automation list, phone preview, template editor with Meta approval, quiet hours, opt-in rule, log. */
export function WhatsAppPage() {
  const { t, lang, dict } = useI18n();
  const data = useData();
  const { can, user } = useSession();
  const audit = useAudit('admin');
  const { settings } = useSettings();
  const { rows: automations, loading } = useTable<AutomationRow>('automations', { where: { channel: 'whatsapp' }, orderBy: { column: 'trigger' } });
  const { rows: templates } = useTable<WaTemplateRow>('wa_templates', { orderBy: { column: 'name' } });
  const { rows: log } = useTable<MessageLogRow>('message_log', { where: { channel: 'whatsapp' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { rows: profiles } = useTable<ProfileRow>('profiles');
  const { byId } = usePeople();
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [preview, setPreview] = useState<'es' | 'en'>('es');
  const auto = automations.find((a) => a.id === selected) ?? automations[0];
  const tplByKey = useMemo(() => new Map(templates.map((x) => [x.key, x])), [templates]);
  const tpl = auto ? tplByKey.get(auto.template_key) : undefined;
  const canWrite = can('content.write');
  const canSend = can('members.write');
  const optIn = profiles.filter((p) => p.marketing_optin && p.whatsapp_verified).length;
  const quiet = inQuietHours(new Date(), settings.quietHours);
  const missing = STANDARD.filter((s) => !automations.some((a) => a.trigger === s.trigger));
  const sampleVars = Object.fromEntries(SAMPLE.map((v, i) => [String(i + 1), v]));

  const createMissing = async () => {
    for (const s of missing) {
      if (!tplByKey.has(s.template.key) && !templates.some((x) => x.key === s.template.key)) {
        const tr = await data.insert<WaTemplateRow>('wa_templates', { ...s.template, approval_status: 'draft', active: false });
        await audit('wa_template.create', 'wa_templates', tr.id, { key: s.template.key });
      }
      const a = await data.insert<AutomationRow>('automations', { name: s.name.es, trigger: s.trigger, channel: 'whatsapp', template_key: s.template.key, delay_min: s.delay_min, quiet_hours: s.trigger === 'session.cancelled' ? null : settings.quietHours, enabled: false });
      await audit('automation.create', 'automations', a.id, { trigger: s.trigger });
    }
  };
  const toggle = async (a: AutomationRow, on: boolean) => {
    const tt = tplByKey.get(a.template_key);
    if (on && tt?.approval_status !== 'approved') return;
    await data.update('automations', a.id, { enabled: on });
    await audit('automation.toggle', 'automations', a.id, { before: a.enabled, after: on });
  };
  const testSend = async () => {
    if (!auto || !tpl) return;
    const hold = quiet && !!auto.quiet_hours;
    const body = (preview === 'en' ? tpl.body.en || tpl.body.es : tpl.body.es).replace(/\{\{\s*(\d+)\s*\}\}/g, (_, i: string) => SAMPLE[Number(i) - 1] ?? '');
    const m = await data.insert<MessageLogRow>('message_log', { user_id: user.id, channel: 'whatsapp', direction: 'outbound', source: 'manual', template_key: tpl.key, automation_id: auto.id, subject: null, body, status: hold ? 'queued' : 'sent', sent_at: hold ? null : new Date().toISOString(), sent_by: user.id, read_at: null, read_by: null, external_id: null, payload: { test: true, to: user.name, locale: preview, vars: SAMPLE } });
    await audit('wa_template.test', 'wa_templates', tpl.id, { message_id: m.id, automation_id: auto.id });
  };

  const logColumns = [
    { key: 'sent_at', label: t('admin.wa.log.when'), render: (r: MessageLogRow) => <span className="mono small">{formatDateTime(r.sent_at ?? r.created_at, lang)}</span> },
    { key: 'user_id', label: t('admin.wa.log.to'), render: (r: MessageLogRow) => r.payload?.test ? <span>{String(r.payload.to)} <Badge tone="warn">test</Badge></span> : byId.get(r.user_id ?? '')?.name ?? String(r.payload?.to ?? '—') },
    { key: 'template_key', label: t('admin.wa.log.template') },
    { key: 'status', label: t('admin.wa.log.status'), render: (r: MessageLogRow) => <Badge tone={toneForStatus(r.status)}>{dict[`admin.wa.status.${r.status}`] ? t(`admin.wa.status.${r.status}`) : r.status}</Badge> },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.wa.title')}</h1><p className="muted small">{t('admin.wa.subtitle')}</p></div>
        {canWrite && missing.length > 0 && <Button size="sm" variant="secondary" onClick={createMissing}>{t('admin.wa.createMissing', { n: missing.length })}</Button>}
      </div>
      <div className="grid grid-3 wa-rules">
        <Card tone={quiet ? 'highlight' : 'muted'} padding="sm"><div className="eyebrow">{t('admin.wa.quiet')}</div><strong>{settings.quietHours.from} – {settings.quietHours.to}</strong><p className="xs muted">{quiet ? t('admin.wa.quiet.now') : t('admin.wa.quiet.body')}</p></Card>
        <Card tone="muted" padding="sm"><div className="eyebrow">{t('admin.wa.optin')}</div><strong>{optIn} / {profiles.length}</strong><p className="xs muted">{t('admin.wa.optin.body')}</p></Card>
        <Card tone="muted" padding="sm"><div className="eyebrow">{t('admin.wa.meta')}</div><strong>{templates.filter((x) => x.approval_status === 'approved').length} / {templates.length}</strong><p className="xs muted">{t('admin.wa.meta.body')}</p></Card>
      </div>
      {loading && automations.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {!loading && automations.length === 0 && <EmptyState title={t('admin.wa.empty')} body={t('admin.wa.empty.body')} action={canWrite && <Button size="sm" onClick={createMissing}>{t('admin.wa.createMissing', { n: missing.length })}</Button>} />}
      {auto && (
        <div className="wa">
          <Card padding="none" className="wa-list">
            <div className="wa-listhead xs muted"><span>{t('admin.wa.col.automation')}</span><span>{t('admin.wa.col.trigger')}</span><span>{t('admin.wa.col.delay')}</span><span>{t('admin.wa.col.status')}</span><span /></div>
            {automations.map((a) => { const tt = tplByKey.get(a.template_key); const blocked = tt?.approval_status !== 'approved'; return (
              <div key={a.id} className={`wa-row ${a.id === auto.id ? 'is-selected' : ''}`} onClick={() => setSelected(a.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelected(a.id); }}>
                <span className="small"><strong>{a.name}</strong><span className="xs muted"> · {tt?.name ?? a.template_key}</span></span>
                <code className="xs">{a.trigger}</code>
                <span className="xs mono">{delayLabel(a.delay_min, t('admin.wa.delay.now'))}{a.quiet_hours ? ' · ☾' : ''}</span>
                <span>{tt ? <Badge tone={toneForStatus(tt.approval_status)}>{t(`admin.wa.approval.${tt.approval_status}`)}</Badge> : <Badge tone="danger">{t('admin.wa.noTemplate')}</Badge>}</span>
                <span onClick={(e) => e.stopPropagation()} title={blocked && !a.enabled ? t('admin.wa.blocked') : undefined}><Toggle size="sm" checked={a.enabled} disabled={!canWrite || (blocked && !a.enabled)} onChange={(on) => toggle(a, on)} /></span>
              </div>
            ); })}
          </Card>
          <aside className="wa-side stack">
            <div className="row-between wrap"><div className="eyebrow">{t('admin.wa.preview')}</div><div className="row" role="tablist"><Chip selected={preview === 'es'} onClick={() => setPreview('es')}>ES</Chip><Chip selected={preview === 'en'} onClick={() => setPreview('en')}>EN</Chip></div></div>
            <PhoneBubble header={`${tenant.name} · WhatsApp`} text={tpl ? (preview === 'en' ? tpl.body.en || tpl.body.es : tpl.body.es) : t('admin.wa.noTemplate')} vars={sampleVars} time={settings.quietHours.to} cta={tpl && /cancel|waitlist|booking|invite/.test(tpl.key) ? t('admin.wa.cta') : undefined} undeliverable={tpl?.approval_status !== 'approved' ? t('admin.wa.blocked') : undefined} />
            {tpl && (
              <Card padding="sm" className="stack-sm">
                <div className="row-between wrap"><strong className="small">{tpl.name}</strong><Badge tone={toneForStatus(tpl.approval_status)}>Meta · {t(`admin.wa.approval.${tpl.approval_status}`)}</Badge></div>
                <div className="row wrap xs muted"><code>{tpl.key}</code><span>· {tpl.category}</span><span>· {tpl.body.en ? 'ES · EN' : 'ES'}</span></div>
                <div className="row wrap">
                  {canWrite && <Button size="sm" variant="secondary" onClick={() => setEditing(tpl.id)}>{t('admin.wa.editTemplate')}</Button>}
                  {canSend && <Button size="sm" variant="ghost" onClick={testSend}>{quiet && auto.quiet_hours ? t('admin.wa.test.queue') : t('admin.wa.test')}</Button>}
                </div>
                <p className="xs muted">{auto.quiet_hours ? t('admin.wa.respectsQuiet') : t('admin.wa.overridesQuiet')}</p>
              </Card>
            )}
          </aside>
        </div>
      )}
      <section className="stack-sm">
        <div className="eyebrow">{t('admin.wa.log')}</div>
        <DataTable columns={logColumns} rows={log} rowKey={(r) => r.id} dense pageSize={10} emptyText={t('admin.wa.log.empty')} />
      </section>
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={t('admin.wa.editTemplate')} width={480}>
        {editing && templates.find((x) => x.id === editing) && <TemplateEditor key={editing} row={templates.find((x) => x.id === editing)!} onSave={async (patch) => { const before = templates.find((x) => x.id === editing)!; await data.update('wa_templates', editing, patch); await audit('wa_template.update', 'wa_templates', editing, { before: { body: before.body, approval_status: before.approval_status, category: before.category }, after: patch }); setEditing(null); }} />}
      </Drawer>
    </div>
  );
}

function TemplateEditor({ row, onSave }: { row: WaTemplateRow; onSave: (patch: Partial<WaTemplateRow>) => Promise<void> }) {
  const { t } = useI18n();
  const [d, setD] = useState({ name: row.name, category: row.category, es: row.body.es, en: row.body.en ?? '', approval_status: row.approval_status });
  useEffect(() => setD({ name: row.name, category: row.category, es: row.body.es, en: row.body.en ?? '', approval_status: row.approval_status }), [row]);
  return (
    <div className="stack-sm">
      <Field label={t('admin.wa.f.name')}>{(id) => <Input id={id} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />}</Field>
      <Field label={t('admin.wa.f.category')}>{(id) => <Select id={id} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as WaTemplateRow['category'] })}>{(['utility', 'marketing', 'authentication'] as const).map((c) => <option key={c} value={c}>{t(`admin.wa.category.${c}`)}</option>)}</Select>}</Field>
      <Field label={`${t('admin.wa.f.body')} · ES`} hint={t('admin.wa.f.body.hint')}>{(id) => <textarea id={id} className="input adm-textarea" rows={4} value={d.es} onChange={(e) => setD({ ...d, es: e.target.value })} />}</Field>
      <Field label={`${t('admin.wa.f.body')} · EN`}>{(id) => <textarea id={id} className="input adm-textarea" rows={4} value={d.en} onChange={(e) => setD({ ...d, en: e.target.value })} />}</Field>
      <Field label={t('admin.wa.f.approval')} hint={t('admin.wa.f.approval.hint')}>{(id) => <Select id={id} value={d.approval_status} onChange={(e) => setD({ ...d, approval_status: e.target.value as WaTemplateRow['approval_status'] })}>{(['draft', 'pending', 'approved', 'rejected'] as const).map((s) => <option key={s} value={s}>{t(`admin.wa.approval.${s}`)}</option>)}</Select>}</Field>
      <PhoneBubble text={d.es} vars={Object.fromEntries(SAMPLE.map((v, i) => [String(i + 1), v]))} />
      <Button disabled={!d.es.trim()} onClick={() => onSave({ name: d.name, category: d.category, body: { es: d.es, en: d.en }, approval_status: d.approval_status, active: d.approval_status === 'approved' })}>{t('core.common.save')}</Button>
    </div>
  );
}
