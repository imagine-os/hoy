import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import type { Role } from '../../auth/roles';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, LegalDocumentRow, ModalityRow, RoomRow, TeacherRow } from '../../data/schema';
import { rateFor } from '../../data/payrollCalc';
import { formatCOP, formatDate, digitsOf } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { SegmentedControl } from '../../components/molecule/SegmentedControl/SegmentedControl';
import { MapSlot } from '../../components/molecule/MapSlot/MapSlot';
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
import { contactOf, useSettings, type SettingsSection, type StudioSettings } from './settings';
import './admin.css';

/** The six sub-pages of M-08. `general` is /admin/settings; the rest are /admin/settings/<key>. `content` (M-08f) arrived in 0018. */
export type SettingsGroup = 'general' | 'features' | 'payments' | 'communications' | 'branding' | 'content';
/** Roles mirror the RouteDef roles in src/modules/admin/index.ts so the rail never offers a blocked page. */
export const SETTINGS_GROUPS: { key: SettingsGroup; path: string; roles: Role[] }[] = [
  { key: 'general', path: '/admin/settings', roles: ['super_admin', 'admin', 'coordinator', 'finance'] },
  { key: 'features', path: '/admin/settings/features', roles: ['super_admin', 'admin', 'coordinator', 'finance'] },
  { key: 'payments', path: '/admin/settings/payments', roles: ['super_admin', 'admin', 'finance'] },
  { key: 'communications', path: '/admin/settings/communications', roles: ['super_admin', 'admin', 'coordinator'] },
  { key: 'branding', path: '/admin/settings/branding', roles: ['super_admin', 'admin'] },
  { key: 'content', path: '/admin/settings/content', roles: ['super_admin', 'admin', 'coordinator'] },
];

const DAYS = ['0', '1', '2', '3', '4', '5', '6'];
const DAY_LABEL: Record<string, { es: string; en: string }> = { '0': { es: 'Dom', en: 'Sun' }, '1': { es: 'Lun', en: 'Mon' }, '2': { es: 'Mar', en: 'Tue' }, '3': { es: 'Mié', en: 'Wed' }, '4': { es: 'Jue', en: 'Thu' }, '5': { es: 'Vie', en: 'Fri' }, '6': { es: 'Sáb', en: 'Sat' } };
/** Flags whose page is load-bearing for the demo and cannot be switched off. */
const LOCKED_PAGES = ['A-06', 'E-04'];
interface FlagRow extends BaseRow { key: string; page_code: string | null; label: string; enabled: boolean }
/** The spec toggle label as a string key: 'Week view' → 'week_view' (the seed builds `feature_flags.key` the same way). */
const flagKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_');

/**
 * M-08 — every operating parameter other screens read, stored in tenants.settings through the data layer.
 * One page per group (M-08a…M-08e) behind a shared sub-navigation; the feature switches live here
 * (M-08b), not on the M-01 dashboard.
 */
export function SettingsPage({ group = 'general' }: { group?: SettingsGroup }) {
  const { t, bi, lang, dict } = useI18n();
  const { can, hasRole } = useSession();
  const data = useData();
  const audit = useAudit('admin');
  const { settings, save, ready } = useSettings();
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const { rows: flags } = useTable<FlagRow>('feature_flags', { orderBy: { column: 'page_code' } });
  const { rows: modalities } = useTable<ModalityRow>('modalities', { orderBy: { column: 'name_es' } });
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: legalDocs } = useTable<LegalDocumentRow>('legal_documents', { orderBy: { column: 'kind' } });
  const canLegal = can('settings.write');
  const contact = contactOf(settings);
  const canWrite = can('settings.write');
  const canFlags = can('features.write');

  /** M-08f — publish or withdraw one legal version (A-06 reads `status`); every flip is audited. */
  const toggleLegal = async (d: LegalDocumentRow, on: boolean) => {
    if (!canLegal) return;
    const status = on ? 'published' : 'draft';
    await data.update('legal_documents', d.id, { status, published_at: on ? new Date().toISOString() : null });
    await audit(on ? 'legal.publish' : 'legal.unpublish', 'legal_documents', d.id, { kind: d.kind, version: d.version, before: d.status, after: status });
  };

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
                  <div className="row-between wrap">
                    <p className="small muted" style={{ maxWidth: '60ch' }}>{t('admin.settings.profile.note')}</p>
                    <Badge tone={d.confirmed ? 'success' : 'warn'}>{d.confirmed ? t('admin.settings.profile.confirmed') : t('admin.settings.profile.pending')}</Badge>
                  </div>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.name')} hint={t('admin.settings.f.name.hint')}>{(id) => <Input id={id} value={tenant.name} disabled />}</Field><Field label={t('admin.settings.f.legal')}>{(id) => <Input id={id} value={tenant.legalName} disabled />}</Field></div>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.address')}>{(id) => <Input id={id} value={d.address} disabled={!canWrite} onChange={(e) => set({ ...d, address: e.target.value })} />}</Field><Field label={t('admin.settings.f.city')}>{(id) => <Input id={id} value={d.city} disabled={!canWrite} placeholder={tenant.city} onChange={(e) => set({ ...d, city: e.target.value })} />}</Field></div>
                  <div className="grid grid-2"><Field label="WhatsApp" hint={t('admin.settings.f.whatsapp.hint', { dial: tenant.dialCode })}>{(id) => <Input id={id} value={d.whatsapp} disabled={!canWrite} onChange={(e) => set({ ...d, whatsapp: e.target.value })} />}</Field><Field label="Email">{(id) => <Input id={id} type="email" value={d.email} disabled={!canWrite} onChange={(e) => set({ ...d, email: e.target.value })} />}</Field></div>
                  <div className="grid grid-2"><Field label="Instagram" hint={t('admin.settings.f.instagram.hint')}>{(id) => <Input id={id} value={d.instagram} disabled={!canWrite} placeholder={tenant.social.instagram} onChange={(e) => set({ ...d, instagram: e.target.value })} />}</Field><Field label={t('admin.settings.f.instagramUrl')}>{(id) => <Input id={id} value={d.instagramUrl} disabled={!canWrite} placeholder="https://www.instagram.com/…" onChange={(e) => set({ ...d, instagramUrl: e.target.value })} />}</Field></div>
                  <div className="grid grid-3">
                    <Field label={t('admin.settings.f.mapLat')}>{(id) => <Input id={id} type="number" step="0.0001" value={d.mapLat} disabled={!canWrite} onChange={(e) => set({ ...d, mapLat: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.mapLng')}>{(id) => <Input id={id} type="number" step="0.0001" value={d.mapLng} disabled={!canWrite} onChange={(e) => set({ ...d, mapLng: Number(e.target.value) })} />}</Field>
                    <Field label={t('admin.settings.f.mapLabel')} hint={t('admin.settings.f.mapLabel.hint')}>{(id) => <Input id={id} value={d.mapLabel} disabled={!canWrite} placeholder={contact.location.label.es} onChange={(e) => set({ ...d, mapLabel: e.target.value })} />}</Field>
                  </div>
                  <div className="grid grid-2"><Field label={t('admin.settings.f.mapLink')} hint={t('admin.settings.f.mapLink.hint')}>{(id) => <Input id={id} value={d.mapLink} disabled={!canWrite} placeholder="https://maps.app.goo.gl/…" onChange={(e) => set({ ...d, mapLink: e.target.value })} />}</Field><Field label="NIT" hint={t('admin.settings.f.nit.hint')}>{(id) => <Input id={id} value={d.nit} disabled={!canWrite} onChange={(e) => set({ ...d, nit: e.target.value })} placeholder="901.xxx.xxx-1" />}</Field></div>
                  <Toggle checked={d.confirmed} disabled={!canWrite} label={t('admin.settings.f.confirmed')} onChange={(on) => set({ ...d, confirmed: on })} />
                  <p className="xs muted">{t('admin.settings.f.confirmed.hint')}</p>
                </>
              ))}
              {S('openingHours', t('admin.settings.sec.openingHours'), (d, set) => (
                <div className="stack-sm">
                  {DAYS.map((day) => { const v = d[day]; return (
                    <div key={day} className="settings-day">
                      <strong className="small">{bi(DAY_LABEL[day])}</strong>
                      <Toggle size="sm" checked={!!v} disabled={!canWrite} label={v ? t('admin.settings.open') : t('admin.settings.closed')} onChange={(on) => set({ ...d, [day]: on ? { open: '06:00', close: '20:00' } : null })} />
                      {v && <><Input type="time" value={v.open} disabled={!canWrite} onChange={(e) => set({ ...d, [day]: { ...v, open: e.target.value } })} aria-label={t('admin.settings.open')} /><span className="muted">–</span><Input type="time" value={v.close} disabled={!canWrite} onChange={(e) => set({ ...d, [day]: { ...v, close: e.target.value } })} aria-label={t('admin.settings.closed')} /></>}
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
              <Card title={t('admin.settings.sec.integrations')} eyebrow="M-10" actions={<Link to="/admin/integrations"><Button size="sm" variant="ghost">{t('admin.settings.int.open')} →</Button></Link>}>
                <p className="small muted">{t('admin.settings.int.pointer')}</p>
              </Card>
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
                      {flags.filter((f) => (f.page_code ?? '—') === code).map((f) => <Toggle key={f.id} size="sm" checked={f.enabled} disabled={!canFlags || LOCKED_PAGES.includes(code)} label={dict[`admin.flag.${flagKey(f.label)}`] ? t(`admin.flag.${flagKey(f.label)}`) : f.label} onChange={(on) => toggleFlag(f, on)} />)}
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
                    <Field label={t('admin.settings.f.bank')}>{(id) => <Input id={id} value={d.bankName} disabled={!canWrite} onChange={(e) => set({ ...d, bankName: e.target.value })} placeholder={t('admin.settings.f.bank.ph')} />}</Field>
                    <Field label={t('admin.settings.f.accountType')}>{(id) => <Select id={id} value={d.accountType} disabled={!canWrite} onChange={(e) => set({ ...d, accountType: e.target.value as StudioSettings['payments']['accountType'] })}><option value="savings">{t('admin.settings.f.savings')}</option><option value="checking">{t('admin.settings.f.checking')}</option></Select>}</Field>
                    <Field label={t('admin.settings.f.accountNumber')}>{(id) => <Input id={id} value={d.accountNumber} disabled={!canWrite} onChange={(e) => set({ ...d, accountNumber: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.accountHolder')}>{(id) => <Input id={id} value={d.accountHolder} disabled={!canWrite} onChange={(e) => set({ ...d, accountHolder: e.target.value })} />}</Field>
                    <Field label={t('admin.settings.f.wompiEnv')} hint="Wompi">{(id) => <Select id={id} value={d.wompiEnv} disabled={!canWrite} onChange={(e) => set({ ...d, wompiEnv: e.target.value as StudioSettings['payments']['wompiEnv'] })}><option value="sandbox">{t('admin.settings.f.sandbox')}</option><option value="production">{t('admin.settings.f.production')}</option></Select>}</Field>
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
                  <p className="xs muted">{t('admin.settings.tax.readers')}</p>
                </>
              ))}
              {S('payroll', t('admin.settings.sec.payroll'), (d, set) => {
                const setMod = (id: string, v: string) => { const byModality = { ...d.rateCard.byModality }; if (v.trim()) byModality[id] = Number(v); else delete byModality[id]; set({ ...d, rateCard: { ...d.rateCard, byModality } }); };
                const setTea = (id: string, v: string) => { const byTeacher = { ...d.rateCard.byTeacher }; if (v.trim()) byTeacher[id] = Number(v); else delete byTeacher[id]; set({ ...d, rateCard: { ...d.rateCard, byTeacher } }); };
                return (
                  <>

                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.cadence')} hint={t('admin.settings.f.cadence.hint')}>{() => (
                      <SegmentedControl<StudioSettings['payroll']['cadence']> ariaLabel={t('admin.settings.f.cadence')} value={d.cadence} onChange={(v) => canWrite && set({ ...d, cadence: v })} options={[{ value: 'monthly', label: t('admin.settings.f.cadence.monthly') }, { value: 'biweekly', label: t('admin.settings.f.cadence.biweekly') }]} />
                    )}</Field>
                    <Field label={t('admin.settings.f.payoutMethod')} hint="M-09a">{(id) => <Select id={id} value={d.payoutMethod} disabled={!canWrite} onChange={(e) => set({ ...d, payoutMethod: e.target.value as StudioSettings['payroll']['payoutMethod'] })}>{(['wompi', 'transfer', 'cash'] as const).map((m) => <option key={m} value={m}>{t(`admin.payouts.method.${m}`)}</option>)}</Select>}</Field>
                    <Field label={t('admin.settings.f.signedBy')} hint={t('admin.settings.f.signedBy.hint')}>{(id) => <Input id={id} value={d.signedBy} disabled={!canWrite} placeholder={t('admin.settings.f.signedBy.placeholder')} onChange={(e) => set({ ...d, signedBy: e.target.value })} />}</Field>
                  </div>
                  <Toggle checked={d.withholding} disabled={!canWrite} label={t('admin.settings.f.withholding')} onChange={(on) => set({ ...d, withholding: on })} />
                  <p className="xs muted">{d.cadence === 'biweekly' ? t('admin.settings.payroll.note.biweekly') : t('admin.settings.payroll.note.monthly')} <Link to="/admin/finance/payouts">M-09a</Link> · <Link to="/teach/payroll">S-03</Link></p>
                </>
                    <div className="eyebrow" style={{ marginTop: 8 }}>{t('admin.settings.sec.rateCard')}</div>
                    <p className="small muted">{t('admin.settings.rate.hint')}</p>
                    <div className="grid grid-2">
                      <div className="stack-sm">
                        <div className="eyebrow">{t('admin.settings.rate.modality')}</div>
                        {modalities.map((m) => (
                          <div key={m.id} className="settings-rate">
                            <span className="small">{bi({ es: m.name_es, en: m.name_en })}</span>
                            <Input inputMode="numeric" aria-label={m.name_es} value={d.rateCard.byModality[m.id] ?? ''} placeholder="—" disabled={!canWrite} onChange={(e) => setMod(m.id, digitsOf(e.target.value))} /><span className="xs muted settings-rate-fmt">{d.rateCard.byModality[m.id] ? formatCOP(d.rateCard.byModality[m.id], lang) : ''}</span>
                          </div>
                        ))}
                      </div>
                      <div className="stack-sm">
                        <div className="eyebrow">{t('admin.settings.rate.teacher')}</div>
                        {teachers.map((te) => (
                          <div key={te.id} className="settings-rate">
                            <span className="small">{te.display_name}<span className="xs muted"> · {t('admin.settings.rate.profile', { rate: formatCOP(te.rate_per_class ?? 0, lang) })}</span></span>
                            <Input inputMode="numeric" aria-label={te.display_name} value={d.rateCard.byTeacher[te.id] ?? ''} placeholder="—" disabled={!canWrite} onChange={(e) => setTea(te.id, digitsOf(e.target.value))} /><span className="xs muted settings-rate-fmt">{d.rateCard.byTeacher[te.id] ? formatCOP(d.rateCard.byTeacher[te.id], lang) : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="xs muted">{t('admin.settings.rate.example', { teacher: teachers[0]?.display_name ?? '—', modality: modalities[0]?.name_es ?? '—', rate: formatCOP(teachers[0] && modalities[0] ? rateFor(teachers[0].id, modalities[0].id, teachers, d.rateCard) : 0, lang) })}</p>
                  </>
                );
                            })}
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

          {group === 'content' && (
            <>
              {S('content', t('admin.settings.sec.content'), (d, set) => (
                <>
                  <div className="grid grid-2">
                    <Field label={t('admin.settings.f.naming')} hint={t('admin.settings.f.naming.hint')}>{() => (
                      <SegmentedControl<StudioSettings['content']['publicNaming']> ariaLabel={t('admin.settings.f.naming')} value={d.publicNaming} onChange={(v) => canWrite && set({ ...d, publicNaming: v })} options={[{ value: 'disciplines', label: t('admin.settings.f.naming.disciplines') }, { value: 'movements', label: t('admin.settings.f.naming.movements') }]} />
                    )}</Field>
                    <Field label={t('admin.settings.f.mapProvider')} hint={t('admin.settings.f.mapProvider.hint')}>{(id) => <Select id={id} value={d.mapProvider} disabled={!canWrite} onChange={(e) => set({ ...d, mapProvider: e.target.value as StudioSettings['content']['mapProvider'] })}>{(['none', 'osm', 'google'] as const).map((v) => <option key={v} value={v}>{t(`admin.settings.f.mapProvider.${v}`)}</option>)}</Select>}</Field>
                  </div>
                  <Toggle checked={d.breathworkOwnClass} disabled={!canWrite} label={t('admin.settings.f.breathwork')} onChange={(on) => set({ ...d, breathworkOwnClass: on })} />
                  <p className="xs muted">{t('admin.settings.f.breathwork.hint')} <Link to="/site/classes/respiracion">W-08</Link></p>
                  <div className="settings-map"><MapSlot provider={d.mapProvider} ratio="21:9" /></div>
                  <p className="xs muted">{t('admin.settings.content.note')}</p>
                </>
              ))}
              <Card title={t('admin.settings.sec.legal')} eyebrow={t('admin.settings.legal.eyebrow')}>
                <p className="small muted" style={{ marginBottom: 12 }}>{t('admin.settings.legal.body', { n: legalDocs.length, on: legalDocs.filter((x) => x.status === 'published').length })}</p>
                <div className="stack-sm">
                  {legalDocs.map((d) => (
                    <div key={d.id} className="row-between wrap settings-int">
                      <div className="grow"><strong className="small">{bi(d.title)}</strong> <span className="xs mono muted">v{d.version}</span><div className="xs muted">{d.kind} · {t('admin.settings.legal.effective', { date: formatDate(d.effective_from, lang) })}{d.requires_acceptance ? ` · ${t('admin.settings.legal.requiresAcceptance')}` : ''}</div></div>
                      <div className="row"><Badge tone={d.status === 'published' ? 'success' : 'warn'}>{t(`admin.settings.legal.${d.status}`)}</Badge><Toggle size="sm" checked={d.status === 'published'} disabled={!canLegal} label={t('admin.settings.legal.publish')} onChange={(on) => toggleLegal(d, on)} /><Link to={`/site/legal/${d.kind}`} className="xs">{t('admin.settings.legal.view')} →</Link></div>
                    </div>
                  ))}
                </div>
                <p className="xs muted" style={{ marginTop: 12 }}>{t('admin.settings.legal.note')}</p>
              </Card>
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
