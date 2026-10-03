import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useContact , pendingSuffix } from './settings';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, MessageLogRow } from '../../data/schema';
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
import { EmailPreview } from '../../components/organism/EmailPreview/EmailPreview';
import { DataTable } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit, type AuditRow } from '../staff/audit';
import { APP, EMAIL_AUDIENCES, EMAIL_CATALOG, EMAIL_PRIORITIES, emailEntry, sampleFor, type EmailAudience, type EmailPriority } from '../../data/emailCatalog';
import { usePeople } from '../staff/people';
import './admin.css';

interface EmailRow extends BaseRow { key: string; name: string; audience?: EmailAudience; trigger: string; priority?: EmailPriority | null; subject: Bi; body_mjml: string; version: number; active: boolean }

const PRIORITY_TONE: Record<EmailPriority, 'primary' | 'highlight' | 'neutral'> = { launch: 'primary', first_60: 'highlight', later: 'neutral' };
/** A row written before 0055 has no audience / priority: the catalog entry with the same key answers. */
const audienceOf = (row: EmailRow): EmailAudience => row.audience ?? emailEntry(row.key)?.audience ?? 'customer';
const priorityOf = (row: EmailRow): EmailPriority | null => row.priority ?? emailEntry(row.key)?.priority ?? null;
/** `name` is the studio's Spanish label; while it is still the catalog's, the English UI shows the catalog's English name. */
const nameOf = (row: EmailRow, bi: (b: Bi) => string) => { const m = emailEntry(row.key); return m && m.name.es === row.name ? bi(m.name) : row.name; };
/** Within a priority the list follows the catalog (the inventory's order); templates the studio added go last. */
const catalogOrder = (row: EmailRow) => { const i = EMAIL_CATALOG.findIndex((m) => m.key === row.key); return i < 0 ? EMAIL_CATALOG.length : i; };

interface ParsedBody { es: string; en: string; cta?: { label: Bi; href: string } }
function parseBody(row: EmailRow): ParsedBody {
  try { const j = JSON.parse(row.body_mjml); if (j && typeof j.es === 'string') return j; } catch { /* not json */ }
  const std = emailEntry(row.key);
  if (std) return { es: std.body.es, en: std.body.en, cta: std.cta };
  return { es: row.body_mjml.startsWith('<') ? '' : row.body_mjml, en: '' };
}
const varsIn = (...texts: string[]) => [...new Set(texts.join(' ').match(/\{\{\s*[\w.]+\s*\}\}/g)?.map((v) => v.replace(/[{}\s]/g, '')) ?? [])];

/** M-04 — template list by recipient and priority, rendered canvas with sample data, ES/EN switch, editor, versions, test send, send log. */
export function EmailsPage() {
  const { t, lang, bi } = useI18n();
  const data = useData();
  const { can, user } = useSession();
  const audit = useAudit('admin');
  const { rows: templates, loading } = useTable<EmailRow>('email_templates', { orderBy: { column: 'trigger' } });
  const { rows: log } = useTable<MessageLogRow>('message_log', { where: { channel: 'email' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { byId } = usePeople();
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<'es' | 'en'>('es');
  const [tab, setTab] = useState<'edit' | 'versions' | 'log'>('edit');
  const [audience, setAudience] = useState<EmailAudience>('customer');
  const [priority, setPriority] = useState<EmailPriority | 'all'>('all');
  const shown = templates.filter((x) => audienceOf(x) === audience && (priority === 'all' || priorityOf(x) === priority)).sort((a, b) => catalogOrder(a) - catalogOrder(b));
  const groups = [...EMAIL_PRIORITIES, null].map((p) => ({ p, rows: shown.filter((x) => priorityOf(x) === p) })).filter((g) => g.rows.length > 0);
  const row = shown.find((x) => x.id === selected) ?? groups[0]?.rows[0];
  const inAudience = templates.filter((x) => audienceOf(x) === audience);
  const { rows: versions } = useTable<AuditRow>('audit_log', { where: { entity: 'email_templates', entity_id: row?.id ?? '__none__' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const canWrite = can('content.write');
  const missing = EMAIL_CATALOG.filter((s) => !templates.some((x) => x.key === s.key));

  const createMissing = async () => {
    for (const s of missing) {
      const r = await data.insert<EmailRow>('email_templates', { key: s.key, name: s.name.es, audience: s.audience, trigger: s.trigger, priority: s.priority, subject: s.subject, body_mjml: JSON.stringify({ es: s.body.es, en: s.body.en, cta: s.cta }), version: 1, active: false });
      await audit('email_template.create', 'email_templates', r.id, { key: s.key });
    }
  };
  const testSend = async () => {
    if (!row) return;
    const m = await data.insert<MessageLogRow>('message_log', { user_id: user.id, channel: 'email', direction: 'outbound', source: 'manual', template_key: row.key, automation_id: null, subject: bi(row.subject), body: null, status: 'sent', sent_at: new Date().toISOString(), sent_by: user.id, read_at: null, read_by: null, external_id: null, payload: { test: true, to: user.email, locale: preview, version: row.version } });
    await audit('email_template.test', 'email_templates', row.id, { message_id: m.id, to: user.email, locale: preview });
    setTab('log');
  };

  const logColumns = [
    { key: 'sent_at', label: t('admin.emails.log.when'), render: (r: MessageLogRow) => <span className="mono small">{r.sent_at ? formatDateTime(r.sent_at, lang) : '—'}</span> },
    { key: 'user_id', label: t('admin.emails.log.to'), render: (r: MessageLogRow) => r.payload?.test ? <span>{String(r.payload.to)} <Badge tone="warn">test</Badge></span> : byId.get(r.user_id ?? '')?.name ?? '—' },
    { key: 'template_key', label: t('admin.emails.log.template') },
    { key: 'status', label: t('admin.emails.log.status'), render: (r: MessageLogRow) => <Badge tone={toneForStatus(r.status)}>{r.status}</Badge> },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.emails.title')}</h1><p className="muted small">{t('admin.emails.subtitle')}</p></div>
        {canWrite && missing.length > 0 && <Button size="sm" variant="secondary" onClick={createMissing}>{t('admin.emails.createMissing', { n: missing.length })}</Button>}
      </div>
      {loading && templates.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {!loading && templates.length === 0 && <EmptyState title={t('admin.emails.empty')} body={t('admin.emails.empty.body')} action={canWrite && <Button size="sm" onClick={createMissing}>{t('admin.emails.createMissing', { n: missing.length })}</Button>} />}
      {templates.length > 0 && (
        <div className="stack-sm">
          <div className="row wrap" role="tablist" aria-label={t('admin.emails.f.audience')}>
            {EMAIL_AUDIENCES.map((a) => <Chip key={a} selected={audience === a} onClick={() => { setAudience(a); setSelected(null); }}>{t(`admin.emails.audience.${a}`)} · {templates.filter((x) => audienceOf(x) === a).length}</Chip>)}
          </div>
          <div className="row-between wrap">
            <div className="row wrap" role="tablist" aria-label={t('admin.emails.f.priority')}>
              <Chip selected={priority === 'all'} onClick={() => setPriority('all')}>{t('admin.emails.priority.all')}</Chip>
              {EMAIL_PRIORITIES.map((p) => <Chip key={p} selected={priority === p} onClick={() => { setPriority(p); setSelected(null); }}>{t(`admin.emails.priority.${p}`)} · {inAudience.filter((x) => priorityOf(x) === p).length}</Chip>)}
            </div>
            <span className="xs muted">{t('admin.emails.coverage', { active: inAudience.filter((x) => x.active).length, total: inAudience.length, launch: inAudience.filter((x) => priorityOf(x) === 'launch').length })}</span>
          </div>
        </div>
      )}
      {templates.length > 0 && !row && <EmptyState title={t('admin.emails.filter.empty')} />}
      {row && (
        <div className="emails">
          <aside className="emails-list">
            {groups.map(({ p, rows }) => (
              <div key={p ?? 'none'} className="stack-sm">
                <div className="eyebrow">{t(`admin.emails.priority.${p ?? 'none'}`)} · {rows.length}</div>
                {rows.map((x) => { const b = parseBody(x); return (
                  <button key={x.id} type="button" className={`emails-item ${x.id === row.id ? 'is-selected' : ''}`} onClick={() => { setSelected(x.id); setTab('edit'); }}>
                    <span className="grow"><span className="small">{nameOf(x, bi)}</span><span className="xs muted"> · v{x.version}</span></span>
                    <span className="row"><code className="xs muted emails-trigger">{x.trigger}</code><span className="row"><span className="xs muted">{b.en ? 'ES · EN' : 'ES'}</span><Badge tone={x.active ? 'success' : 'warn'}>{x.active ? t('core.common.on') : t('admin.emails.draft')}</Badge></span></span>
                  </button>
                ); })}
              </div>
            ))}
          </aside>
          <section className="emails-canvas stack-sm">
            <div className="row-between wrap">
              <div className="row wrap"><h2 className="adm-h2">{nameOf(row, bi)}</h2><code className="xs muted">{row.key}</code></div>
              <div className="row wrap" role="tablist"><Chip selected={preview === 'es'} onClick={() => setPreview('es')}>ES</Chip><Chip selected={preview === 'en'} onClick={() => setPreview('en')}>EN</Chip></div>
            </div>
            <Facts row={row} />
            <Canvas row={row} lang={preview} />
            <p className="xs muted">{t('admin.emails.deepLink')} · {t('admin.emails.dianNote')}</p>
          </section>
          <aside className="emails-side stack">
            <div className="row wrap" role="tablist">
              <Chip selected={tab === 'edit'} onClick={() => setTab('edit')}>{t('core.common.edit')}</Chip>
              <Chip selected={tab === 'versions'} onClick={() => setTab('versions')}>{t('admin.emails.versions')} · {versions.length}</Chip>
              <Chip selected={tab === 'log'} onClick={() => setTab('log')}>{t('admin.emails.log')}</Chip>
            </div>
            {tab === 'edit' && <Editor key={row.id} row={row} readOnly={!canWrite} onSave={async (patch, before) => { await data.update('email_templates', row.id, { ...patch, version: row.version + 1 }); await audit('email_template.update', 'email_templates', row.id, { before, after: patch, version: row.version + 1 }); }} onTest={testSend} />}
            {tab === 'versions' && (
              <Card padding="sm">
                {versions.length === 0 && <p className="small muted" style={{ padding: 'var(--sp-sm)' }}>{t('admin.emails.versions.empty')}</p>}
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
  const { t } = useI18n();
  const contact = useContact();
  const b = parseBody(row);
  const body = lang === 'en' ? b.en || b.es : b.es;
  const subject = lang === 'en' ? row.subject.en || row.subject.es : row.subject.es;
  const vars = sampleFor(audienceOf(row), row.key);
  return <EmailPreview envelope={`${tenant.name} <${contact.email}>${pendingSuffix(contact, 'email', lang)} → ${vars.first_name.toLowerCase()}@…  ·  ${lang.toUpperCase()} · v${row.version}`} subject={subject} body={body} cta={b.cta ? { label: lang === 'en' ? b.cta.label.en || b.cta.label.es : b.cta.label.es, href: b.cta.href } : undefined} footer={`${tenant.legalName} · ${contact.address}, ${contact.city}${pendingSuffix(contact, 'address', lang)} · WhatsApp ${contact.whatsapp}${pendingSuffix(contact, 'whatsapp', lang)} · ${t('admin.emails.footer', { studio: tenant.name })}`} vars={vars} />;
}

/** What the catalog knows about this email: when it sends, its priority, the 2026-10-02 inventory state and its rows. */
function Facts({ row }: { row: EmailRow }) {
  const { t, bi } = useI18n();
  const m = emailEntry(row.key);
  const p = priorityOf(row);
  if (!m && !p) return null;
  return (
    <div className="stack-sm">
      {m && <p className="small"><span className="muted">{t('admin.emails.sendsWhen')}:</span> {bi(m.sendsWhen)}</p>}
      <div className="row wrap">
        {p && <Badge tone={PRIORITY_TONE[p]}>{t(`admin.emails.priority.${p}`)}</Badge>}
        {m?.promised && <Badge tone="warn">{t('admin.emails.promised')}</Badge>}
        {m?.category === 'marketing' && <Badge>{t('admin.emails.consent')}</Badge>}
        {m?.channelTbd && <Badge>{t('admin.emails.channelTbd')}</Badge>}
        {m && <span className="xs muted">{t('admin.emails.intake')}: {t(`admin.emails.intake.${m.intake}`)} · <span className="mono">{m.refs.join(' · ')}</span></span>}
      </div>
    </div>
  );
}

function Editor({ row, readOnly, onSave, onTest }: { row: EmailRow; readOnly: boolean; onSave: (patch: Partial<EmailRow>, before: Record<string, unknown>) => Promise<void>; onTest: () => Promise<void> }) {
  const { t } = useI18n();
  const init = useMemo(() => { const b = parseBody(row); return { name: row.name, audience: audienceOf(row), priority: (priorityOf(row) ?? '') as EmailPriority | '', trigger: row.trigger, subjectEs: row.subject.es, subjectEn: row.subject.en ?? '', bodyEs: b.es, bodyEn: b.en, ctaLabelEs: b.cta?.label.es ?? '', ctaLabelEn: b.cta?.label.en ?? '', ctaHref: b.cta?.href ?? '', active: row.active }; }, [row]);
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
      await onSave({ name: d.name, audience: d.audience, priority: d.priority || null, trigger: d.trigger, subject: { es: d.subjectEs, en: d.subjectEn }, body_mjml: JSON.stringify(body), active: d.active && !missingEn }, { name: row.name, audience: row.audience, priority: row.priority, trigger: row.trigger, subject: row.subject, body_mjml: row.body_mjml, active: row.active });
    } finally { setSaving(false); }
  };
  return (
    <div className="stack-sm">
      <Field label={t('admin.emails.f.name')}>{(id) => <Input id={id} disabled={readOnly} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />}</Field>
      <div className="grid grid-2">
        <Field label={t('admin.emails.f.audience')}>{(id) => <Select id={id} disabled={readOnly} value={d.audience} onChange={(e) => setD({ ...d, audience: e.target.value as EmailAudience })}>{EMAIL_AUDIENCES.map((a) => <option key={a} value={a}>{t(`admin.emails.audience.${a}`)}</option>)}</Select>}</Field>
        <Field label={t('admin.emails.f.priority')}>{(id) => <Select id={id} disabled={readOnly} value={d.priority} onChange={(e) => setD({ ...d, priority: e.target.value as EmailPriority | '' })}><option value="">{t('admin.emails.priority.none')}</option>{EMAIL_PRIORITIES.map((p) => <option key={p} value={p}>{t(`admin.emails.priority.${p}`)}</option>)}</Select>}</Field>
      </div>
      <Field label={t('admin.emails.f.trigger')} hint={t('admin.emails.f.trigger.hint')}>{(id) => <Input id={id} disabled={readOnly} value={d.trigger} onChange={(e) => setD({ ...d, trigger: e.target.value })} className="mono" />}</Field>
      <Field label={`${t('admin.emails.f.subject')} · ES`} required>{(id) => <Input id={id} disabled={readOnly} value={d.subjectEs} onChange={(e) => setD({ ...d, subjectEs: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.subject')} · EN`}>{(id) => <Input id={id} disabled={readOnly} value={d.subjectEn} onChange={(e) => setD({ ...d, subjectEn: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.body')} · ES`} required>{(id) => <textarea id={id} className="input adm-textarea" rows={6} disabled={readOnly} value={d.bodyEs} onChange={(e) => setD({ ...d, bodyEs: e.target.value })} />}</Field>
      <Field label={`${t('admin.emails.f.body')} · EN`}>{(id) => <textarea id={id} className="input adm-textarea" rows={6} disabled={readOnly} value={d.bodyEn} onChange={(e) => setD({ ...d, bodyEn: e.target.value })} />}</Field>
      <div className="grid grid-2">
        <Field label={`${t('admin.emails.f.cta')} · ES`}>{(id) => <Input id={id} disabled={readOnly} value={d.ctaLabelEs} onChange={(e) => setD({ ...d, ctaLabelEs: e.target.value })} />}</Field>
        <Field label={`${t('admin.emails.f.cta')} · EN`}>{(id) => <Input id={id} disabled={readOnly} value={d.ctaLabelEn} onChange={(e) => setD({ ...d, ctaLabelEn: e.target.value })} />}</Field>
      </div>
      <Field label={t('admin.emails.f.deepLink')}>{(id) => <Input id={id} disabled={readOnly} value={d.ctaHref} onChange={(e) => setD({ ...d, ctaHref: e.target.value })} className="mono" placeholder={`${APP}…`} />}</Field>
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

