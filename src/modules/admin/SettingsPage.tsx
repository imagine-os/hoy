import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import type { Role } from '../../auth/roles';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, RoomRow } from '../../data/schema';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Badge } from '../../components/atom/Badge/Badge';
import { Notice } from '../../components/molecule/Notice/Notice';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { useAudit } from '../staff/audit';
import { useSettings, type SettingsSection, type StudioSettings } from './settings';
import './admin.css';

/** The five sub-pages of M-08. `general` is /admin/settings; the rest are /admin/settings/<key>. */
export type SettingsGroup = 'general' | 'features' | 'payments' | 'communications' | 'branding';
/** Roles mirror the RouteDef roles in src/modules/admin/index.ts so the rail never offers a blocked page. */
export const SETTINGS_GROUPS: { key: SettingsGroup; path: string; roles: Role[] }[] = [
  { key: 'general', path: '/admin/settings', roles: ['super_admin', 'admin', 'coordinator', 'finance'] },
  { key: 'features', path: '/admin/settings/features', roles: ['super_admin', 'admin', 'coordinator', 'finance'] },
  { key: 'payments', path: '/admin/settings/payments', roles: ['super_admin', 'admin', 'finance'] },
  { key: 'communications', path: '/admin/settings/communications', roles: ['super_admin', 'admin', 'coordinator'] },
  { key: 'branding', path: '/admin/settings/branding', roles: ['super_admin', 'admin'] },
];

const DAYS = ['0', '1', '2', '3', '4', '5', '6'];
const DAY_LABEL: Record<string, { es: string; en: string }> = { '0': { es: 'Dom', en: 'Sun' }, '1': { es: 'Lun', en: 'Mon' }, '2': { es: 'Mar', en: 'Tue' }, '3': { es: 'Mié', en: 'Wed' }, '4': { es: 'Jue', en: 'Thu' }, '5': { es: 'Vie', en: 'Fri' }, '6': { es: 'Sáb', en: 'Sat' } };
/** Flags whose page is load-bearing for the demo and cannot be switched off. */
const LOCKED_PAGES = ['A-06', 'E-04'];
interface FlagRow extends BaseRow { key: string; page_code: string | null; label: string; enabled: boolean }

/**
 * M-08 — every operating parameter other screens read, stored in tenants.settings through the data layer.
 * One page per group (M-08a…M-08e) behind a shared sub-navigation; the feature switches live here
 * (M-08b), not on the M-01 dashboard.
 */
export function SettingsPage({ group = 'general' }: { group?: SettingsGroup }) {
  const { t, bi, lang } = useI18n();
  const { can, hasRole } = useSession();
  const data = useData();
  const audit = useAudit('admin');
  const { settings, save, ready } = useSettings();
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const { rows: flags } = useTable<FlagRow>('feature_flags', { orderBy: { column: 'page_code' } });
  const canWrite = can('settings.write');
  const canFlags = can('features.write');

  const toggleFlag = async (f: FlagRow, on: boolean) => {
    if (!canFlags) return;
    await data.update('feature_flags', f.id, { enabled: on });
    await audit('flag.toggle', 'feature_flags', f.id, { key: f.key, before: f.enabled, after: on });
  };

  const head = (
    <div className="page-head">
      <div><h1>{t('admin.settings.title')}</h1><p className="muted small">{t(`admin.settings.group.${group}.body`)}</p></div>
      {!canWrite && <Badge tone="warn">{t('admin.settings.readonly')}</Badge>}
    </div>
  );
  if (!ready) return <div className="stack">{head}<EmptyState tone="loading" title={t('core.common.loading')} /></div>;

  const S = <K extends SettingsSection>(section: K, title: string, render: (d: StudioSettings[K], set: (v: StudioSettings[K]) => void) => ReactNode) => (
    <Section<K> section={section} value={settings[section]} save={save} audit={audit} readOnly={!canWrite} title={title} render={render} />
  );

  return (
    <div className="stack">
      {head}
      <div className="settings">
        <nav className="settings-rail" aria-label={t('admin.settings.title')}>
          {SETTINGS_GROUPS.filter((g) => hasRole(g.roles)).map((g) => (
            <NavLink key={g.key} to={g.path} end className={({ isActive }) => `settings-link ${isActive ? 'is-active' : ''}`}>{t(`admin.settings.group.${g.key}`)}</NavLink>
          ))}
        </nav>
        <div className="settings-main stack">
          {group === 'general' && (
            <>
              {S('profile', t('admin.settings.sec.profile'), (d, set) => (
                <>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.name')} hint={t('admin.settings.f.name.hint')}>{(id) => <Input id={id} value={tenant.name} disabled />}</Field><Field label={t('admin.settings.f.legal')}>{(id) => <Input id={id} value={tenant.legalName} disabled />}</Field></div>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.address')}>{(id) => <Input id={id} value={d.address} disabled={!canWrite} onChange={(e) => set({ ...d, address: e.target.value })} />}</Field><Field label="WhatsApp">{(id) => <Input id={id} value={d.whatsapp} disabled={!canWrite} onChange={(e) => set({ ...d, whatsapp: e.target.value })} />}</Field></div>
                  <div className="grid grid-2"><Field label="Email">{(id) => <Input id={id} value={d.email} disabled={!canWrite} onChange={(e) => set({ ...d, email: e.target.value })} />}</Field><Field label="NIT" hint={t('admin.settings.f.nit.hint')}>{(id) => <Input id={id} value={d.nit} disabled={!canWrite} onChange={(e) => set({ ...d, nit: e.target.value })} placeholder="901.xxx.xxx-1" />}</Field></div>
                </>
              ))}
              {S('openingHours', t('admin.settings.sec.openingHours'), (d, set) => (
                <div className="stack-sm">
                  {DAYS.map((day) => { const v = d[day]; return (
                    <div key={day} className="settings-day">
                      <strong className="small">{bi(DAY_LABEL[day])}</strong>
                      <Toggle size="sm" checked={!!v} disabled={!canWrite} label={v ? t('admin.settings.open') : t('admin.settings.closed')} onChange={(on) => set({ ...d, [day]: on ? { open: '06:00', close: '20:00' } : null })} />
                      {v && <><Input type="time" value={v.open} disabled={!canWrite} onChange={(e) => set({ ...d, [day]: { ...v, open: e.target.value } })} aria-label="open" /><span className="muted">–</span><Input type="time" value={v.close} disabled={!canWrite} onChange={(e) => set({ ...d, [day]: { ...v, close: e.target.value } })} aria-label="close" /></>}
                    </div>
                  ); })}
                  <p className="xs muted">{t('admin.settings.hours.note')}</p>
                </div>
              ))}
              {S('studio', t('admin.settings.sec.studio'), (d, set) => (
                <>
                  <div className="grid grid-3">
                    <Field label={t('admin.settings.f.mats')} hint={t('admin.settings.f.mats.hint')}>{(id) => <Input id={id} type="number" min={1} value={d.mats} disabled={!canWrite} onChange={(e) => set({ ...d, mats: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.classesPerDay')}>{(id) => <Input id={id} type="number" min={1} value={d.classesPerDay} disabled={!canWrite} onChange={(e) => set({ ...d, classesPerDay: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.perPerson')} hint={t('admin.settings.f.perPerson.hint')}>{(id) => <Input id={id} type="number" min={1} value={d.perPersonPerDay} disabled={!canWrite} onChange={(e) => set({ ...d, perPersonPerDay: Number(e.target.value) })} />}</Field>
                  </div>
                  <div className="stack-sm"><div className="eyebrow">{t('admin.settings.rooms')}</div>{rooms.map((r) => <div key={r.id} className="row-between small"><span>{r.name}</span><span className="muted">{r.capacity} mats{r.heated ? ' · ♨' : ''}</span></div>)}<Link to="/admin/content" className="small">{t('admin.settings.rooms.edit')}</Link></div>
                </>
              ))}
              {S('policies', t('admin.settings.sec.policies'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.cancellation')} hint="C-08 · C-11 · E-03">{(id) => <Input id={id} type="number" min={0} value={d.cancellationHours} disabled={!canWrite} onChange={(e) => set({ ...d, cancellationHours: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.waitlistClaim')} hint="C-20">{(id) => <Input id={id} type="number" min={5} value={d.waitlistClaimMin} disabled={!canWrite} onChange={(e) => set({ ...d, waitlistClaimMin: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.lateGrace')} hint="S-02 · S-03">{(id) => <Input id={id} type="number" min={0} value={d.lateGraceMin} disabled={!canWrite} onChange={(e) => set({ ...d, lateGraceMin: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.noShowFee')} hint={settings.features.noShowFee ? 'COP' : t('admin.settings.f.noShowFee.off')}>{(id) => <Input id={id} type="number" min={0} value={d.noShowFee} disabled={!canWrite || !settings.features.noShowFee} onChange={(e) => set({ ...d, noShowFee: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.pauseDays')} hint="C-22">{(id) => <Input id={id} type="number" min={0} value={d.pauseDaysPerYear} disabled={!canWrite} onChange={(e) => set({ ...d, pauseDaysPerYear: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.maxPauses')}>{(id) => <Input id={id} type="number" min={0} value={d.maxPausesPerYear} disabled={!canWrite} onChange={(e) => set({ ...d, maxPausesPerYear: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.paymentHold')} hint="E-02">{(id) => <Input id={id} type="number" min={0} value={d.paymentHoldMin} disabled={!canWrite} onChange={(e) => set({ ...d, paymentHoldMin: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.chargeNotice')} hint="C-22">{(id) => <Input id={id} type="number" min={0} value={d.chargeNoticeDays} disabled={!canWrite} onChange={(e) => set({ ...d, chargeNoticeDays: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.lockoutAttempts')} hint="A-02 · E-04">{(id) => <Input id={id} type="number" min={1} value={d.lockoutAttempts} disabled={!canWrite} onChange={(e) => set({ ...d, lockoutAttempts: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.lockoutMinutes')} hint="E-04">{(id) => <Input id={id} type="number" min={1} value={d.lockoutMinutes} disabled={!canWrite} onChange={(e) => set({ ...d, lockoutMinutes: Number(e.target.value) })} />}</Field>
                  </div>
                  <p className="xs muted">{t('admin.settings.policies.note')}</p>
                </>
              ))}
              {S('integrations', t('admin.settings.sec.integrations'), (d, set) => (
                <>
                  <div className="stack-sm">{(Object.keys(d) as (keyof StudioSettings['integrations'])[]).map((k) => (
                    <div key={k} className="row-between wrap settings-int">
                      <div className="grow"><strong className="small">{t(`admin.settings.int.${k}`)}</strong><div className="xs muted">{t(`admin.settings.int.${k}.body`)}</div></div>
                      <div className="row"><Badge tone={d[k] === 'connected' ? 'success' : d[k] === 'error' ? 'danger' : 'warn'}>{t(`admin.settings.int.status.${d[k]}`)}</Badge><Select value={d[k]} disabled={!canWrite} onChange={(e) => set({ ...d, [k]: e.target.value as StudioSettings['integrations'][typeof k] })} aria-label={k}>{(['pending', 'connected', 'error'] as const).map((s) => <option key={s} value={s}>{t(`admin.settings.int.status.${s}`)}</option>)}</Select></div>
                    </div>
                  ))}</div>
                  <p className="xs muted">{t('admin.settings.int.note')}</p>
                </>
              ))}
            </>
          )}

          {group === 'features' && (
            <>
              {S('features', t('admin.settings.sec.features'), (d, set) => (
                <>
                  <div className="stack-sm">{(Object.keys(d) as (keyof StudioSettings['features'])[]).map((k) => <Toggle key={k} checked={d[k]} disabled={!canWrite} label={t(`admin.settings.feat.${k}`)} onChange={(on) => set({ ...d, [k]: on })} />)}</div>
                  <p className="xs muted">{t('admin.settings.features.note')}</p>
                </>
              ))}
              <Card title={t('admin.settings.flags.title')} eyebrow={t('admin.settings.flags.eyebrow')}>
                <p className="muted small" style={{ marginBottom: 16 }}>{canFlags ? t('admin.settings.flags.body') : t('admin.settings.flags.readonly')}</p>
                <div className="grid grid-3">
                  {[...new Set(flags.map((f) => f.page_code ?? '—'))].map((code) => (
                    <div key={code} className="stack-sm">
                      <div className="eyebrow">{code}</div>
                      {flags.filter((f) => (f.page_code ?? '—') === code).map((f) => <Toggle key={f.id} size="sm" checked={f.enabled} disabled={!canFlags || LOCKED_PAGES.includes(code)} label={f.label} onChange={(on) => toggleFlag(f, on)} />)}
                    </div>
                  ))}
                </div>
                <p className="xs muted" style={{ marginTop: 16 }}>{t('admin.settings.flags.count', { n: flags.length, on: flags.filter((f) => f.enabled).length })} <Link to="/admin/activity">{t('core.nav.activity')}</Link></p>
              </Card>
            </>
          )}

          {group === 'payments' && (
            <>
              {S('payments', t('admin.settings.sec.payments'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.bank')}>{(id) => <Input id={id} value={d.bankName} disabled={!canWrite} onChange={(e) => set({ ...d, bankName: e.target.value })} placeholder="Bancolombia" />}</Field>
                    <Field label={t('admin.settings.f.accountType')}>{(id) => <Select id={id} value={d.accountType} disabled={!canWrite} onChange={(e) => set({ ...d, accountType: e.target.value as StudioSettings['payments']['accountType'] })}><option value="savings">{t('admin.settings.f.savings')}</option><option value="checking">{t('admin.settings.f.checking')}</option></Select>}</Field>
                    <Field label={t('admin.settings.f.accountNumber')}>{(id) => <Input id={id} value={d.accountNumber} disabled={!canWrite} onChange={(e) => set({ ...d, accountNumber: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.accountHolder')}>{(id) => <Input id={id} value={d.accountHolder} disabled={!canWrite} onChange={(e) => set({ ...d, accountHolder: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.wompiEnv')} hint="Wompi">{(id) => <Select id={id} value={d.wompiEnv} disabled={!canWrite} onChange={(e) => set({ ...d, wompiEnv: e.target.value as StudioSettings['payments']['wompiEnv'] })}><option value="sandbox">Sandbox</option><option value="production">{t('admin.settings.f.production')}</option></Select>}</Field>
                  </div>
                  <Notice tone="warn" title={t('admin.settings.pay.keys.title')}>{t('admin.settings.pay.keys.body')}</Notice>
                </>
              ))}
              {S('profile', t('admin.settings.sec.fiscal'), (d, set) => (
                <div className="grid grid-2"><Field label="NIT" hint={t('admin.settings.f.nit.hint')}>{(id) => <Input id={id} value={d.nit} disabled={!canWrite} onChange={(e) => set({ ...d, nit: e.target.value })} placeholder="901.xxx.xxx-1" />}</Field><Field label={t('admin.settings.f.legal')}>{(id) => <Input id={id} value={tenant.legalName} disabled />}</Field></div>
              ))}
              {S('tax', t('admin.settings.sec.tax'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.iva')}>{(id) => <Input id={id} type="number" min={0} max={100} value={d.ivaPct} disabled={!canWrite} onChange={(e) => set({ ...d, ivaPct: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.dian')} hint={t('admin.settings.f.dian.hint')}>{(id) => <Input id={id} value={d.dianResolution} disabled={!canWrite} onChange={(e) => set({ ...d, dianResolution: e.target.value })} placeholder="18764…" />}</Field>
                  </div>
                  <Toggle checked={d.pricesIncludeIva} disabled={!canWrite} label={t('admin.settings.f.included')} onChange={(on) => set({ ...d, pricesIncludeIva: on })} />
                  <Toggle checked={d.eInvoicing} disabled={!canWrite || !d.dianResolution.trim()} label={t('admin.settings.f.eInvoicing')} onChange={(on) => set({ ...d, eInvoicing: on })} />
                  {!d.dianResolution.trim() && <p className="xs muted">{t('admin.settings.tax.needsDian')}</p>}
                </>
              ))}
            </>
          )}

          {group === 'communications' && (
            <>
              {S('quietHours', t('admin.settings.sec.quietHours'), (d, set) => (
                <>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.from')}>{(id) => <Input id={id} type="time" value={d.from} disabled={!canWrite} onChange={(e) => set({ ...d, from: e.target.value })} />}</Field><Field label={t('admin.settings.f.to')}>{(id) => <Input id={id} type="time" value={d.to} disabled={!canWrite} onChange={(e) => set({ ...d, to: e.target.value })} />}</Field></div>
                  <p className="xs muted">{t('admin.settings.quiet.note')}</p>
                </>
              ))}
              {S('comms', t('admin.settings.sec.senders'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.waSender')} hint={t('admin.settings.f.waSender.hint')}>{(id) => <Input id={id} value={d.whatsappSender} disabled={!canWrite} onChange={(e) => set({ ...d, whatsappSender: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.emailSender')}>{(id) => <Input id={id} value={d.emailSender} disabled={!canWrite} onChange={(e) => set({ ...d, emailSender: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.replyTo')}>{(id) => <Input id={id} type="email" value={d.emailReplyTo} disabled={!canWrite} onChange={(e) => set({ ...d, emailReplyTo: e.target.value })} />}</Field>
                  </div>
                  <p className="xs muted">{t('admin.settings.senders.note')} <Link to="/admin/whatsapp">M-05</Link> · <Link to="/admin/emails">M-04</Link></p>
                </>
              ))}
            </>
          )}

          {group === 'branding' && S('branding', t('admin.settings.sec.branding'), (d, set) => (
            <>
              <div className="grid grid-2">
                <Field label={t('admin.settings.f.displayName')} hint={t('admin.settings.f.displayName.hint')}>{(id) => <Input id={id} value={d.displayName} disabled={!canWrite} onChange={(e) => set({ ...d, displayName: e.target.value })} placeholder={tenant.name} />}</Field>
                <Field label={t('admin.settings.f.wordmark')}>{(id) => <Select id={id} value={d.wordmarkVariant} disabled={!canWrite} onChange={(e) => set({ ...d, wordmarkVariant: e.target.value as StudioSettings['branding']['wordmarkVariant'] })}>{(['auto', 'blue', 'cream', 'yellow'] as const).map((v) => <option key={v} value={v}>{t(`admin.settings.f.wordmark.${v}`)}</option>)}</Select>}</Field>
                <Field label={t('admin.settings.f.defaultLang')} hint={t('admin.settings.f.defaultLang.hint')}>{(id) => <Select id={id} value={d.defaultLang} disabled={!canWrite} onChange={(e) => set({ ...d, defaultLang: e.target.value as StudioSettings['branding']['defaultLang'] })}><option value="es">Español</option><option value="en">English</option></Select>}</Field>
              </div>
              <div className="settings-brand">
                <span className="eyebrow">{t('admin.settings.f.preview')}</span>
                <Wordmark height={30} variant={d.wordmarkVariant} />
                <span className="small muted">{d.displayName || tenant.name} · {d.defaultLang === 'en' ? 'English' : 'Español'} ({lang})</span>
              </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section<K extends SettingsSection>({ section, value, save, audit, readOnly, title, render }: { section: K; value: StudioSettings[K]; save: (s: K, v: StudioSettings[K]) => Promise<{ before: unknown; after: unknown }>; audit: (a: string, e: string, id?: string | null, d?: Record<string, unknown>) => Promise<unknown>; readOnly: boolean; title: string; render: (d: StudioSettings[K], set: (v: StudioSettings[K]) => void) => ReactNode }) {
  const { t } = useI18n();
  const [d, setD] = useState(value);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => setD(value), [value]);
  const dirty = JSON.stringify(d) !== JSON.stringify(value);
  const doSave = async () => {
    setState('saving');
    const { before, after } = await save(section, d);
    await audit('settings.update', 'tenants', tenant.id, { section, before, after });
    setState('saved'); setTimeout(() => setState('idle'), 2000);
  };
  return (
    <Card title={title} actions={!readOnly && <div className="row"><span className="xs muted">{state === 'saved' ? t('admin.settings.saved') : dirty ? t('admin.settings.unsaved') : ''}</span><Button size="sm" disabled={!dirty} loading={state === 'saving'} onClick={doSave}>{t('core.common.save')}</Button></div>}>
      <div className="stack">{render(d, setD)}</div>
    </Card>
  );
}
