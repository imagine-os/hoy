import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { BaseRow, RoomRow } from '../../data/schema';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Badge } from '../../components/atom/Badge/Badge';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { useSettings, type SettingsSection, type StudioSettings } from './settings';
import './admin.css';

const SECTIONS: SettingsSection[] = ['profile', 'openingHours', 'studio', 'policies', 'quietHours', 'tax', 'features', 'integrations'];
const DAYS = ['0', '1', '2', '3', '4', '5', '6'];
const DAY_LABEL: Record<string, { es: string; en: string }> = { '0': { es: 'Dom', en: 'Sun' }, '1': { es: 'Lun', en: 'Mon' }, '2': { es: 'Mar', en: 'Tue' }, '3': { es: 'Mié', en: 'Wed' }, '4': { es: 'Jue', en: 'Thu' }, '5': { es: 'Vie', en: 'Fri' }, '6': { es: 'Sáb', en: 'Sat' } };
interface FlagRow extends BaseRow { enabled: boolean }

/** M-08 — every operating parameter other screens read, stored in tenants.settings through the data layer. */
export function SettingsPage() {
  const { t, bi } = useI18n();
  const { can } = useSession();
  const audit = useAudit('admin');
  const { settings, save, ready } = useSettings();
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const { rows: flags } = useTable<FlagRow>('feature_flags');
  const [active, setActive] = useState<SettingsSection>('profile');
  const canWrite = can('settings.write');
  if (!ready) return <div className="stack"><div className="page-head"><h1>{t('admin.settings.title')}</h1></div><EmptyState tone="loading" title={t('core.common.loading')} /></div>;

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('admin.settings.title')}</h1><p className="muted small">{t('admin.settings.subtitle')}</p></div>{!canWrite && <Badge tone="warn">{t('admin.settings.readonly')}</Badge>}</div>
      <div className="settings">
        <nav className="settings-rail" aria-label={t('admin.settings.title')}>
          {SECTIONS.map((s) => <button key={s} type="button" className={`settings-link ${active === s ? 'is-active' : ''}`} onClick={() => setActive(s)}>{t(`admin.settings.sec.${s}`)}</button>)}
        </nav>
        <div className="settings-main stack">
          {active === 'profile' && <Section<'profile'> section="profile" value={settings.profile} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.profile')} render={(d, set) => (
            <>
              <div className="grid grid-2"><Field label={t('admin.settings.f.name')} hint={t('admin.settings.f.name.hint')}>{(id) => <Input id={id} value={tenant.name} disabled />}</Field><Field label={t('admin.settings.f.legal')}>{(id) => <Input id={id} value={tenant.legalName} disabled />}</Field></div>
              <div className="grid grid-2"><Field label="NIT">{(id) => <Input id={id} value={d.nit} disabled={!canWrite} onChange={(e) => set({ ...d, nit: e.target.value })} placeholder="901.xxx.xxx-1" />}</Field><Field label={t('admin.settings.f.address')}>{(id) => <Input id={id} value={d.address} disabled={!canWrite} onChange={(e) => set({ ...d, address: e.target.value })} />}</Field></div>
              <div className="grid grid-2"><Field label="WhatsApp">{(id) => <Input id={id} value={d.whatsapp} disabled={!canWrite} onChange={(e) => set({ ...d, whatsapp: e.target.value })} />}</Field><Field label="Email">{(id) => <Input id={id} value={d.email} disabled={!canWrite} onChange={(e) => set({ ...d, email: e.target.value })} />}</Field></div>
            </>
          )} />}
          {active === 'openingHours' && <Section<'openingHours'> section="openingHours" value={settings.openingHours} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.openingHours')} render={(d, set) => (
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
          )} />}
          {active === 'studio' && <Section<'studio'> section="studio" value={settings.studio} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.studio')} render={(d, set) => (
            <>
              <div className="grid grid-3">
                <Field label={t('admin.settings.f.mats')} hint={t('admin.settings.f.mats.hint')}>{(id) => <Input id={id} type="number" min={1} value={d.mats} disabled={!canWrite} onChange={(e) => set({ ...d, mats: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.classesPerDay')}>{(id) => <Input id={id} type="number" min={1} value={d.classesPerDay} disabled={!canWrite} onChange={(e) => set({ ...d, classesPerDay: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.perPerson')} hint={t('admin.settings.f.perPerson.hint')}>{(id) => <Input id={id} type="number" min={1} value={d.perPersonPerDay} disabled={!canWrite} onChange={(e) => set({ ...d, perPersonPerDay: Number(e.target.value) })} />}</Field>
              </div>
              <div className="stack-sm"><div className="eyebrow">{t('admin.settings.rooms')}</div>{rooms.map((r) => <div key={r.id} className="row-between small"><span>{r.name}</span><span className="muted">{r.capacity} mats{r.heated ? ' · ♨' : ''}</span></div>)}<Link to="/admin/content" className="small">{t('admin.settings.rooms.edit')}</Link></div>
            </>
          )} />}
          {active === 'policies' && <Section<'policies'> section="policies" value={settings.policies} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.policies')} render={(d, set) => (
            <>
              <div className="grid grid-2">
                <Field label={t('admin.settings.f.cancellation')} hint="C-08 · C-11 · E-03">{(id) => <Input id={id} type="number" min={0} value={d.cancellationHours} disabled={!canWrite} onChange={(e) => set({ ...d, cancellationHours: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.waitlistClaim')} hint="C-20">{(id) => <Input id={id} type="number" min={5} value={d.waitlistClaimMin} disabled={!canWrite} onChange={(e) => set({ ...d, waitlistClaimMin: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.lateGrace')} hint="S-02 · S-03">{(id) => <Input id={id} type="number" min={0} value={d.lateGraceMin} disabled={!canWrite} onChange={(e) => set({ ...d, lateGraceMin: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.noShowFee')} hint={settings.features.noShowFee ? 'COP' : t('admin.settings.f.noShowFee.off')}>{(id) => <Input id={id} type="number" min={0} value={d.noShowFee} disabled={!canWrite || !settings.features.noShowFee} onChange={(e) => set({ ...d, noShowFee: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.pauseDays')} hint="C-22">{(id) => <Input id={id} type="number" min={0} value={d.pauseDaysPerYear} disabled={!canWrite} onChange={(e) => set({ ...d, pauseDaysPerYear: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.maxPauses')}>{(id) => <Input id={id} type="number" min={0} value={d.maxPausesPerYear} disabled={!canWrite} onChange={(e) => set({ ...d, maxPausesPerYear: Number(e.target.value) })} />}</Field>
              </div>
              <p className="xs muted">{t('admin.settings.policies.note')}</p>
            </>
          )} />}
          {active === 'quietHours' && <Section<'quietHours'> section="quietHours" value={settings.quietHours} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.quietHours')} render={(d, set) => (
            <>
              <div className="grid grid-2"><Field label={t('admin.settings.f.from')}>{(id) => <Input id={id} type="time" value={d.from} disabled={!canWrite} onChange={(e) => set({ ...d, from: e.target.value })} />}</Field><Field label={t('admin.settings.f.to')}>{(id) => <Input id={id} type="time" value={d.to} disabled={!canWrite} onChange={(e) => set({ ...d, to: e.target.value })} />}</Field></div>
              <p className="xs muted">{t('admin.settings.quiet.note')}</p>
            </>
          )} />}
          {active === 'tax' && <Section<'tax'> section="tax" value={settings.tax} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.tax')} render={(d, set) => (
            <>
              <div className="grid grid-2">
                <Field label={t('admin.settings.f.iva')}>{(id) => <Input id={id} type="number" min={0} max={100} value={d.ivaPct} disabled={!canWrite} onChange={(e) => set({ ...d, ivaPct: Number(e.target.value) })} />}</Field>
                <Field label={t('admin.settings.f.dian')} hint={t('admin.settings.f.dian.hint')}>{(id) => <Input id={id} value={d.dianResolution} disabled={!canWrite} onChange={(e) => set({ ...d, dianResolution: e.target.value })} placeholder="18764…" />}</Field>
              </div>
              <Toggle checked={d.pricesIncludeIva} disabled={!canWrite} label={t('admin.settings.f.included')} onChange={(on) => set({ ...d, pricesIncludeIva: on })} />
              <Toggle checked={d.eInvoicing} disabled={!canWrite || !d.dianResolution.trim()} label={t('admin.settings.f.eInvoicing')} onChange={(on) => set({ ...d, eInvoicing: on })} />
              {!d.dianResolution.trim() && <p className="xs muted">{t('admin.settings.tax.needsDian')}</p>}
            </>
          )} />}
          {active === 'features' && <Section<'features'> section="features" value={settings.features} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.features')} render={(d, set) => (
            <>
              <div className="stack-sm">{(Object.keys(d) as (keyof StudioSettings['features'])[]).map((k) => <Toggle key={k} checked={d[k]} disabled={!canWrite} label={t(`admin.settings.feat.${k}`)} onChange={(on) => set({ ...d, [k]: on })} />)}</div>
              <p className="xs muted">{t('admin.settings.features.note', { n: flags.length, on: flags.filter((f) => f.enabled).length })} <Link to="/admin">{t('core.nav.dashboard')}</Link></p>
            </>
          )} />}
          {active === 'integrations' && <Section<'integrations'> section="integrations" value={settings.integrations} save={save} audit={audit} readOnly={!canWrite} title={t('admin.settings.sec.integrations')} render={(d, set) => (
            <>
              <div className="stack-sm">{(Object.keys(d) as (keyof StudioSettings['integrations'])[]).map((k) => (
                <div key={k} className="row-between wrap settings-int">
                  <div><strong className="small">{t(`admin.settings.int.${k}`)}</strong><div className="xs muted">{t(`admin.settings.int.${k}.body`)}</div></div>
                  <div className="row"><Badge tone={d[k] === 'connected' ? 'success' : d[k] === 'error' ? 'danger' : 'warn'}>{t(`admin.settings.int.status.${d[k]}`)}</Badge><Select value={d[k]} disabled={!canWrite} onChange={(e) => set({ ...d, [k]: e.target.value as StudioSettings['integrations'][typeof k] })} aria-label={k}>{(['pending', 'connected', 'error'] as const).map((s) => <option key={s} value={s}>{t(`admin.settings.int.status.${s}`)}</option>)}</Select></div>
                </div>
              ))}</div>
              <p className="xs muted">{t('admin.settings.int.note')}</p>
            </>
          )} />}
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

