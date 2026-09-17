import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP, MS } from '../../../i18n/format';
import { Badge } from '../../atom/Badge/Badge';
import { Chip } from '../../atom/Chip/Chip';
import { useTable } from '../../../data/DataContext';
import { TABLE_GROUPS, tableRegistry, tables } from '../../../data/schema';
import { ROLES, ROLE_HOME, ROLE_LABEL } from '../../../auth/roles';
import { getRoutes } from '../../../app/registry';
import { useContact, usePolicy, type StudioSettings } from '../../../modules/admin/settings';
import { FAMILY_LABEL, FAMILY_RATIONALE, FAMILY_ROLE, pricing, pricingByFamily, type PlanFamily, type PriceItem } from '../../../tenant/pricing';
import { tenant } from '../../../tenant/tenant';
import type { Bi, Surface } from '../../../specs/types';
import './LiveBlock.css';

/**
 * What each plan family does for the business is no longer written here: `FAMILY_ROLE` and
 * `FAMILY_RATIONALE` live in `src/tenant/pricing.ts` (the value model's only home), so the manual,
 * P-01 and this block quote the same sentence.
 */
const familyLine = (fam: PlanFamily): Bi => ({
  es: `${FAMILY_ROLE[fam].es} — ${FAMILY_RATIONALE[fam].subtitle.es}`,
  en: `${FAMILY_ROLE[fam].en} — ${FAMILY_RATIONALE[fam].subtitle.en}`,
});

const SURFACES: Surface[] = ['public', 'customer', 'teacher', 'staff', 'admin', 'dev', 'docs'];

/** Snake_case aliases a chapter may write for a policy field, mapped to the M-08 key. */
const POLICY_ALIAS: Record<string, string> = {
  cancellation_window_hours: 'cancellationHours', cancellation_hours: 'cancellationHours',
  waitlist_claim_minutes: 'waitlistClaimMin', waitlist_claim_min: 'waitlistClaimMin',
  late_grace_minutes: 'lateGraceMin', late_grace_min: 'lateGraceMin',
  no_show_fee: 'noShowFee',
  pause_days_per_year: 'pauseDaysPerYear', max_pauses_per_year: 'maxPausesPerYear',
  payment_hold_minutes: 'paymentHoldMin', payment_hold_min: 'paymentHoldMin',
  charge_notice_days: 'chargeNoticeDays',
  lockout_attempts: 'lockoutAttempts', lockout_minutes: 'lockoutMinutes',
  quiet_hours: 'quietHours', iva_pct: 'ivaPct', prices_include_iva: 'pricesIncludeIva',
  payroll_cadence: 'payrollCadence', cadence: 'payrollCadence', payout_method: 'payoutMethod', signed_by: 'payrollSignedBy',
};

/** The policy fields a chapter may quote, in display order; labels and units are `manual.live.policy.*` keys. */
const POLICY_KEYS = ['cancellationHours', 'waitlistClaimMin', 'lateGraceMin', 'noShowFee', 'pauseDaysPerYear', 'maxPausesPerYear', 'paymentHoldMin', 'chargeNoticeDays', 'lockoutAttempts', 'lockoutMinutes', 'quietHours', 'ivaPct', 'pricesIncludeIva', 'payrollCadence', 'payoutMethod', 'payrollSignedBy'] as const;
type PolicyKey = typeof POLICY_KEYS[number];
const UNIT: Partial<Record<PolicyKey, 'hours' | 'minutes' | 'days'>> = {
  cancellationHours: 'hours', waitlistClaimMin: 'minutes', lateGraceMin: 'minutes', pauseDaysPerYear: 'days', paymentHoldMin: 'minutes', chargeNoticeDays: 'days', lockoutMinutes: 'minutes',
};
const PAYROLL_KEYS: PolicyKey[] = ['payrollCadence', 'payoutMethod', 'payrollSignedBy'];
/** The numeric policy fields live flat on the policy record; the grouped ones (tax, payroll, quiet hours) are read explicitly. */
type FlatPolicy = Pick<StudioSettings['policies'], 'cancellationHours' | 'waitlistClaimMin' | 'lateGraceMin' | 'noShowFee' | 'pauseDaysPerYear' | 'maxPausesPerYear' | 'paymentHoldMin' | 'chargeNoticeDays' | 'lockoutAttempts' | 'lockoutMinutes'>;

export interface LiveBlockProps {
  /** Directive name: pricing | tenant | policy | tables | table | roles | routes | stats | kpi. */
  kind: string;
  /** Directive argument after the colon, when the chapter wrote one. */
  arg?: string;
}

/** Frame + "live from the system" caption every block shares. */
function Frame({ title, eyebrow, source, children }: { title: string; eyebrow?: ReactNode; source?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="live" aria-label={title}>
      <header className="live-head">
        <div className="grow">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h4 className="live-title">{title}</h4>
        </div>
        <Badge>{t('manual.live.badge')}</Badge>
      </header>
      <div className="live-body">{children}</div>
      <footer className="live-foot">
        <span>{t('manual.live.foot')}</span>
        {source && <span className="live-source">{source}</span>}
      </footer>
    </section>
  );
}

function PricingTable({ items }: { items: PriceItem[] }) {
  const { t, lang, bi } = useI18n();
  const period = (p: PriceItem) => (p.period === 'month' ? t('core.common.perMonth') : p.period === 'year' ? t('core.common.perYear') : '');
  const validity = (p: PriceItem) => {
    const bits: string[] = [];
    if (p.credits) bits.push(t(p.credits === 1 ? 'manual.live.pricing.class' : 'manual.live.pricing.classes', { n: p.credits }));
    if (p.validityDays) bits.push(t('manual.live.pricing.days', { n: p.validityDays }));
    if (p.period === 'month') bits.push(t('manual.live.pricing.renewsMonthly'));
    if (p.period === 'year') bits.push(t('manual.live.pricing.renewsYearly'));
    return bits.join(' · ') || '—';
  };
  return (
    <table className="live-table">
      <thead><tr>
        <th>{t('manual.live.pricing.item')}</th>
        <th className="live-num">{t('manual.live.pricing.price')}</th>
        <th>{t('manual.live.pricing.validity')}</th>
      </tr></thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id}>
            <td>
              <div className="live-item"><strong>{bi(p.name)}</strong>{p.badge && <Badge tone="success">{bi(p.badge)}</Badge>}</div>
              <div className="muted xs">{bi(p.description)}</div>
            </td>
            <td className="live-num">{p.price === null ? t('core.common.included') : `${p.from ? `${t('core.common.from')} ` : ''}${formatCOP(p.price, lang)}`}<span className="live-period">{period(p)}</span></td>
            <td className="muted">{validity(p)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pricing({ family }: { family?: string }) {
  const { t, bi } = useI18n();
  const fam = family as PlanFamily | undefined;
  if (fam && !FAMILY_LABEL[fam]) return <Unknown kind="pricing" arg={family} options={Object.keys(FAMILY_LABEL)} />;
  const items = fam ? pricingByFamily(fam) : pricing;
  const title = fam ? bi(FAMILY_LABEL[fam]) : t('manual.live.pricing.title');
  const eyebrow = fam ? bi(FAMILY_ROLE[fam]) : t('manual.live.pricing.eyebrow', { n: pricing.length });
  return (
    <Frame title={title} eyebrow={eyebrow} source={<Link to="/site/plans">P-01</Link>}>
      {fam ? (
        <>
          <p className="live-rationale-sub">{bi(FAMILY_RATIONALE[fam].subtitle)}</p>
          <p className="live-rationale-why small">{bi(FAMILY_RATIONALE[fam].why)}</p>
          <PricingTable items={items} />
          {FAMILY_RATIONALE[fam].note && <p className="live-rationale-note xs muted">{bi(FAMILY_RATIONALE[fam].note!)}</p>}
        </>
      ) : (
        Object.keys(FAMILY_LABEL).map((k) => (
          <div key={k} className="live-group">
            <div className="live-group-head"><strong>{bi(FAMILY_LABEL[k as PlanFamily])}</strong><span className="muted small">{bi(familyLine(k as PlanFamily))}</span></div>
            <PricingTable items={pricingByFamily(k as PlanFamily)} />
          </div>
        ))
      )}
    </Frame>
  );
}

const TENANT_KEYS = ['hours', 'contact', 'capacity', 'all'] as const;

function TenantFacts({ what }: { what?: string }) {
  const { t, bi } = useI18n();
  const contact = useContact();
  const pend = contact.pending ? ` (${bi(contact.pendingLabel)})` : '';
  const key = (what ?? 'all') as typeof TENANT_KEYS[number];
  if (!TENANT_KEYS.includes(key)) return <Unknown kind="tenant" arg={what} options={['hours', 'contact', 'capacity']} />;
  const rows: [string, ReactNode][] = [];
  if (key === 'hours' || key === 'all') rows.push([t('manual.live.tenant.hours'), bi(tenant.hours)], [t('manual.live.tenant.timezone'), `${tenant.timezone} · ${tenant.currency}`]);
  if (key === 'contact' || key === 'all') rows.push(
    ['WhatsApp', `${contact.whatsapp}${pend}`],
    [t('manual.live.tenant.email'), `${contact.email}${pend}`],
    [t('manual.live.tenant.address'), `${contact.address}${pend}`],
    ['Instagram', `${contact.instagram}${pend}`],
    [t('manual.live.tenant.city'), contact.city],
  );
  if (key === 'capacity' || key === 'all') rows.push(
    [t('manual.live.tenant.mats'), String(tenant.studio.mats)],
    [t('manual.live.tenant.classesPerDay'), String(tenant.studio.classesPerDay)],
    [t('manual.live.tenant.perPerson'), String(tenant.studio.perPersonPerDay)],
    [t('manual.live.tenant.rooms'), String(tenant.studio.rooms)],
    [t('manual.live.tenant.seatsPerDay'), String(tenant.studio.mats * tenant.studio.classesPerDay)],
  );
  return (
    <Frame title={t(`manual.live.tenant.title.${key}`)} eyebrow={`${tenant.legalName} · M-08a → src/tenant/tenant.ts`} source={<Link to="/admin/settings">{t('manual.live.tenant.source')}</Link>}>
      <dl className="live-dl">{rows.map(([k, v]) => <div key={k} className="live-dl-row"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </Frame>
  );
}

function Policy({ field }: { field?: string }) {
  const { t, lang } = useI18n();
  const p = usePolicy();
  const flat = p as unknown as FlatPolicy;
  const value = (k: PolicyKey): ReactNode => {
    switch (k) {
      case 'quietHours': return `${p.quietHours.from} – ${p.quietHours.to}`;
      case 'ivaPct': return `${p.tax.ivaPct} %`;
      case 'pricesIncludeIva': return t(p.tax.pricesIncludeIva ? 'manual.live.yes' : 'manual.live.no');
      case 'payrollCadence': return t(p.payroll.cadence === 'biweekly' ? 'manual.live.policy.cadence.biweekly' : 'manual.live.policy.cadence.monthly');
      case 'payoutMethod': return p.payroll.payoutMethod === 'wompi' ? 'Wompi' : t(`manual.live.policy.payout.${p.payroll.payoutMethod}`);
      case 'payrollSignedBy': return p.payroll.signedBy || t('manual.live.policy.signedBy.pending');
      case 'noShowFee': return flat.noShowFee ? formatCOP(flat.noShowFee, lang) : t('manual.live.policy.noFee');
      default: {
        const raw = flat[k];
        const unit = UNIT[k] ? ` ${t(`manual.live.unit.${UNIT[k]}`)}` : '';
        return raw === undefined ? '—' : `${String(raw)}${unit}`;
      }
    }
  };
  if (field) {
    const k = (POLICY_ALIAS[field] ?? field) as PolicyKey;
    if (!POLICY_KEYS.includes(k)) return <Unknown kind="policy" arg={field} options={POLICY_KEYS} />;
    const payroll = PAYROLL_KEYS.includes(k);
    const source = <Link to={payroll ? '/admin/settings/payments' : '/admin/settings'}>{t(payroll ? 'manual.live.policy.source.payments' : 'manual.live.policy.source.policies')}</Link>;
    return (
      <Frame title={t(`manual.live.policy.${k}`)} eyebrow={t('manual.live.policy.current')} source={source}>
        <p className="live-big">{value(k)}</p>
      </Frame>
    );
  }
  return (
    <Frame title={t('manual.live.policy.title')} eyebrow={t('manual.live.policy.eyebrow')} source={<Link to="/admin/settings">{t('manual.live.policy.source.both')}</Link>}>
      <dl className="live-dl">
        {POLICY_KEYS.map((k) => <div key={k} className="live-dl-row"><dt>{t(`manual.live.policy.${k}`)}</dt><dd>{value(k)}</dd></div>)}
      </dl>
    </Frame>
  );
}

function TablesBlock() {
  const { t, bi } = useI18n();
  return (
    <Frame title={t('manual.live.tables.title', { n: tables.length })} eyebrow="src/data/schema.ts · supabase/schema.sql" source={<Link to="/admin/tables">M-03</Link>}>
      {TABLE_GROUPS.map((g) => {
        const list = tables.filter((x) => x.group === g.id);
        if (!list.length) return null;
        return (
          <div key={g.id} className="live-group">
            <div className="live-group-head"><strong>{bi(g.label)}</strong><span className="muted small">{list.length}</span></div>
            <div className="live-chips">{list.map((x) => <Chip key={x.name}>{x.name}<span className="live-cols">{tableRegistry[x.name].allColumns.length}</span></Chip>)}</div>
          </div>
        );
      })}
    </Frame>
  );
}

function TableBlock({ name }: { name?: string }) {
  const { t, bi } = useI18n();
  const def = name ? tableRegistry[name] : undefined;
  if (!def) return <Unknown kind="table" arg={name} options={tables.map((x) => x.name)} />;
  return (
    <Frame title={`${def.name} · ${bi(def.label)}`} eyebrow={bi(def.description)} source={<Link to={`/admin/tables/${def.name}`}>M-03</Link>}>
      <table className="live-table">
        <thead><tr><th>{t('manual.live.table.column')}</th><th>{t('manual.live.table.type')}</th><th>{t('manual.live.table.notes')}</th></tr></thead>
        <tbody>
          {def.allColumns.map((c) => (
            <tr key={c.name}>
              <td><code>{c.name}</code></td>
              <td className="muted">{c.type}{c.nullable ? ' ?' : ''}</td>
              <td className="muted">{[c.references ? `→ ${c.references}` : '', c.enum ? c.enum.join(' | ') : '', c.description ?? ''].filter(Boolean).join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="live-rls">
        <div className="eyebrow">{t('manual.live.table.rls')}</div>
        {def.rls?.length ? <ul>{def.rls.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="muted small">{t('manual.live.table.noRls')}</p>}
      </div>
    </Frame>
  );
}

function RolesBlock() {
  const { t, bi } = useI18n();
  const routes = useMemo(() => getRoutes(), []);
  return (
    <Frame title={t('manual.live.roles.title')} eyebrow="src/auth/roles.ts" source={<Link to="/docs/roles">docs/roles.md</Link>}>
      <table className="live-table">
        <thead><tr><th>{t('manual.live.roles.role')}</th><th><code>id</code></th><th>{t('manual.live.roles.home')}</th><th className="live-num">{t('manual.live.roles.routes')}</th></tr></thead>
        <tbody>
          {ROLES.map((r) => (
            <tr key={r}>
              <td><strong>{bi(ROLE_LABEL[r])}</strong></td>
              <td><code>{r}</code></td>
              <td className="muted"><code>{ROLE_HOME[r]}</code></td>
              <td className="live-num">{routes.filter((x) => x.roles.includes(r)).length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Frame>
  );
}

function RoutesBlock({ surface }: { surface?: string }) {
  const { t, bi } = useI18n();
  const routes = useMemo(() => getRoutes(), []);
  if (!surface || !SURFACES.includes(surface as Surface)) return <Unknown kind="routes" arg={surface} options={SURFACES} />;
  const list = routes.filter((r) => r.surface === surface).sort((a, b) => a.path.localeCompare(b.path));
  return (
    <Frame title={t('manual.live.routes.title', { surface })} eyebrow={t('manual.live.routes.eyebrow', { n: list.length })} source={<Link to="/dev/specs">/#/dev/specs</Link>}>
      <table className="live-table">
        <thead><tr><th>{t('manual.live.routes.code')}</th><th>{t('manual.live.routes.screen')}</th><th>{t('manual.live.routes.route')}</th></tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.path}><td><code>{r.spec.code}</code></td><td>{bi(r.spec.name)}</td><td className="muted"><code>{`/#${r.path}`}</code></td></tr>
          ))}
        </tbody>
      </table>
    </Frame>
  );
}

function Stats() {
  const { t } = useI18n();
  const { rows: profiles } = useTable('profiles');
  const { rows: memberships } = useTable('memberships');
  const { rows: sessions } = useTable('class_sessions');
  const { rows: teachers } = useTable('teachers');
  const { rows: bookings } = useTable('bookings');
  const now = Date.now();
  const week = sessions.filter((s) => {
    const at = new Date(String(s.starts_at)).getTime();
    return at >= now && at < now + 7 * MS.day;
  });
  const active = memberships.filter((m) => String(m.status) === 'active');
  const stats: [string, string][] = [
    [t('manual.live.stats.profiles'), String(profiles.length)],
    [t('manual.live.stats.memberships'), String(active.length)],
    [t('manual.live.stats.week'), String(week.length)],
    [t('manual.live.stats.teachers'), String(teachers.filter((x) => x.active !== false).length)],
    [t('manual.live.stats.bookings'), String(bookings.length)],
  ];
  return (
    <Frame title={t('manual.live.stats.title')} eyebrow={t('manual.live.stats.eyebrow')} source={<Link to="/admin">M-01</Link>}>
      <div className="live-stats">{stats.map(([k, v]) => <div key={k} className="live-stat"><div className="live-stat-v">{v}</div><div className="live-stat-k">{k}</div></div>)}</div>
    </Frame>
  );
}

const KPI_KEYS = ['occupancy', 'noshow', 'classes'] as const;

function Kpi({ name }: { name?: string }) {
  const { t } = useI18n();
  const { rows: sessions } = useTable('class_sessions');
  const { rows: bookings } = useTable('bookings');
  const past = sessions.filter((s) => String(s.status) === 'completed');
  const attended = bookings.filter((b) => String(b.status) === 'checked_in').length;
  const noShow = bookings.filter((b) => String(b.status) === 'no_show').length;
  const seats = past.length * tenant.studio.mats;
  const k = name as typeof KPI_KEYS[number] | undefined;
  if (!k || !KPI_KEYS.includes(k)) return <Unknown kind="kpi" arg={name} options={KPI_KEYS} />;
  const value = k === 'occupancy' ? (seats ? `${Math.round((attended / seats) * 100)} %` : '—')
    : k === 'noshow' ? (bookings.length ? `${Math.round((noShow / bookings.length) * 100)} %` : '—')
    : String(past.length);
  return (
    <Frame title={t(`manual.live.kpi.${k}`)} eyebrow={t('manual.live.kpi.eyebrow')} source={<Link to="/admin">M-01</Link>}>
      <p className="live-big">{value}</p>
      <p className="muted small">{t(`manual.live.kpi.${k}.hint`, { mats: tenant.studio.mats })}</p>
    </Frame>
  );
}

/** A directive whose name or argument the block does not know: says so and lists what exists. */
function Unknown({ kind, arg, options }: { kind: string; arg?: string; options: readonly string[] }) {
  const { t } = useI18n();
  return (
    <div className="live live-unknown">
      <p><code>{`{{${kind}${arg ? `:${arg}` : ''}}}`}</code> {t('manual.live.unknown')}</p>
      <p className="muted small">{t('manual.live.available')} {options.join(', ')}</p>
    </div>
  );
}

const KINDS = ['pricing', 'tenant', 'policy', 'tables', 'table', 'roles', 'routes', 'stats', 'kpi'] as const;

/**
 * One live-data block for the operations manual. A chapter writes `{{pricing:membresia}}` and this
 * renders the current value from the app's own sources — pricing.ts, tenant.ts, M-08 settings, the
 * table registry, the role list, the route manifest and the data layer — so the manual cannot go stale.
 * Every label is a `manual.live.*` string (src/modules/ops-manual/strings.ts).
 */
export function LiveBlock({ kind, arg }: LiveBlockProps) {
  switch (kind) {
    case 'pricing': return <Pricing family={arg} />;
    case 'tenant': return <TenantFacts what={arg} />;
    case 'policy': return <Policy field={arg} />;
    case 'tables': return <TablesBlock />;
    case 'table': return <TableBlock name={arg} />;
    case 'roles': return <RolesBlock />;
    case 'routes': return <RoutesBlock surface={arg} />;
    case 'stats': return <Stats />;
    case 'kpi': return <Kpi name={arg} />;
    default: return <Unknown kind={kind} arg={arg} options={KINDS} />;
  }
}
