import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { Badge } from '../../atom/Badge/Badge';
import { Chip } from '../../atom/Chip/Chip';
import { useTable } from '../../../data/DataContext';
import { TABLE_GROUPS, tableRegistry, tables } from '../../../data/schema';
import { ROLES, ROLE_HOME, ROLE_LABEL } from '../../../auth/roles';
import { getRoutes } from '../../../app/registry';
import { usePolicy } from '../../../modules/admin/settings';
import { FAMILY_LABEL, pricing, pricingByFamily, type PlanFamily, type PriceItem } from '../../../tenant/pricing';
import { tenant } from '../../../tenant/tenant';
import type { Bi, Surface } from '../../../specs/types';
import './LiveBlock.css';

/** COP, the way the studio writes it: `$ 520.000`. */
export const cop = (n: number): string => `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)}`;

/** What each plan family does for the business — the value model in one line per family. */
export const FAMILY_ROLE: Record<PlanFamily, Bi> = {
  bienvenida: { es: 'Adquisición — la puerta de entrada barata que alimenta la Membresía', en: 'Acquisition — the low-cost front door that feeds Membership' },
  membresia: { es: 'Ingreso recurrente — un solo nivel de acceso, mensual o anual', en: 'Recurring revenue — one access level, monthly or annual' },
  pausas: { es: 'Frecuencia — micro-sesiones de 15–30 min, costo marginal casi cero', en: 'Frequency — 15–30 min micro-sessions, near-zero marginal cost' },
  regalos: { es: 'Referido y comunidad — bonos y invitados de socios', en: 'Referral and community — vouchers and member guests' },
  espacio: { es: 'Ingreso B2B — alquiler del estudio fuera de horas pico', en: 'B2B revenue — studio rental off-peak' },
};

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
};

const POLICY_LABEL: Record<string, Bi> = {
  cancellationHours: { es: 'Ventana de cancelación sin costo', en: 'Free cancellation window' },
  waitlistClaimMin: { es: 'Reclamo de lista de espera', en: 'Waitlist claim window' },
  lateGraceMin: { es: 'Tolerancia de llegada tarde', en: 'Late-arrival grace' },
  noShowFee: { es: 'Cargo por inasistencia', en: 'No-show fee' },
  pauseDaysPerYear: { es: 'Días de pausa por año', en: 'Pause days per year' },
  maxPausesPerYear: { es: 'Pausas por año', en: 'Pauses per year' },
  paymentHoldMin: { es: 'Reserva sostenida durante el pago', en: 'Booking held during payment' },
  chargeNoticeDays: { es: 'Aviso antes de cada cobro', en: 'Notice before each charge' },
  lockoutAttempts: { es: 'Intentos antes de bloquear', en: 'Attempts before lockout' },
  lockoutMinutes: { es: 'Duración del bloqueo', en: 'Lockout duration' },
  quietHours: { es: 'Horas silenciosas', en: 'Quiet hours' },
  ivaPct: { es: 'IVA', en: 'IVA' },
  pricesIncludeIva: { es: 'Los precios publicados incluyen IVA', en: 'Published prices include IVA' },
};

const UNIT: Record<string, Bi> = {
  cancellationHours: { es: 'horas', en: 'hours' },
  waitlistClaimMin: { es: 'minutos', en: 'minutes' },
  lateGraceMin: { es: 'minutos', en: 'minutes' },
  pauseDaysPerYear: { es: 'días', en: 'days' },
  paymentHoldMin: { es: 'minutos', en: 'minutes' },
  chargeNoticeDays: { es: 'días', en: 'days' },
  lockoutMinutes: { es: 'minutos', en: 'minutes' },
};

export interface LiveBlockProps {
  /** Directive name: pricing | tenant | policy | tables | table | roles | routes | stats | kpi. */
  kind: string;
  /** Directive argument after the colon, when the chapter wrote one. */
  arg?: string;
}

/** Frame + bilingual "live from the system" caption every block shares. */
function Frame({ title, eyebrow, source, children }: { title: string; eyebrow?: ReactNode; source?: ReactNode; children: ReactNode }) {
  const { lang } = useI18n();
  return (
    <section className="live" aria-label={title}>
      <header className="live-head">
        <div className="grow">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h4 className="live-title">{title}</h4>
        </div>
        <Badge>{lang === 'en' ? 'live' : 'en vivo'}</Badge>
      </header>
      <div className="live-body">{children}</div>
      <footer className="live-foot">
        <span>Datos en vivo del sistema · Live from the system</span>
        {source && <span className="live-source">{source}</span>}
      </footer>
    </section>
  );
}

function PricingTable({ items }: { items: PriceItem[] }) {
  const { lang, bi } = useI18n();
  const period = (p: PriceItem) => {
    if (p.period === 'month') return lang === 'en' ? '/ month' : '/ mes';
    if (p.period === 'year') return lang === 'en' ? '/ year' : '/ año';
    return '';
  };
  const validity = (p: PriceItem) => {
    const bits: string[] = [];
    if (p.credits) bits.push(lang === 'en' ? `${p.credits} ${p.credits === 1 ? 'class' : 'classes'}` : `${p.credits} ${p.credits === 1 ? 'clase' : 'clases'}`);
    if (p.validityDays) bits.push(lang === 'en' ? `${p.validityDays} days` : `${p.validityDays} días`);
    if (p.period === 'month') bits.push(lang === 'en' ? 'renews monthly' : 'renueva cada mes');
    if (p.period === 'year') bits.push(lang === 'en' ? 'renews yearly' : 'renueva cada año');
    return bits.join(' · ') || '—';
  };
  return (
    <table className="live-table">
      <thead><tr>
        <th>{lang === 'en' ? 'Item' : 'Concepto'}</th>
        <th className="live-num">{lang === 'en' ? 'Price' : 'Precio'}</th>
        <th>{lang === 'en' ? 'Credits / validity' : 'Créditos / vigencia'}</th>
      </tr></thead>
      <tbody>
        {items.map((p) => (
          <tr key={p.id}>
            <td>
              <div className="live-item"><strong>{bi(p.name)}</strong>{p.badge && <Badge tone="success">{bi(p.badge)}</Badge>}</div>
              <div className="muted xs">{bi(p.description)}</div>
            </td>
            <td className="live-num">{p.price === null ? (lang === 'en' ? 'included' : 'incluido') : `${p.from ? (lang === 'en' ? 'from ' : 'desde ') : ''}${cop(p.price)}`}<span className="live-period">{period(p)}</span></td>
            <td className="muted">{validity(p)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pricing({ family }: { family?: string }) {
  const { lang, bi } = useI18n();
  const fam = family as PlanFamily | undefined;
  if (fam && !FAMILY_LABEL[fam]) return <Unknown kind="pricing" arg={family} options={Object.keys(FAMILY_LABEL)} />;
  const items = fam ? pricingByFamily(fam) : pricing;
  const title = fam ? bi(FAMILY_LABEL[fam]) : lang === 'en' ? 'Value model — five revenue lines' : 'Modelo de valor — cinco líneas de ingreso';
  const eyebrow = fam ? bi(FAMILY_ROLE[fam]) : lang === 'en' ? `${pricing.length} items · src/tenant/pricing.ts` : `${pricing.length} conceptos · src/tenant/pricing.ts`;
  return (
    <Frame title={title} eyebrow={eyebrow} source={<Link to="/site/plans">P-01</Link>}>
      {fam ? <PricingTable items={items} /> : (
        Object.keys(FAMILY_LABEL).map((k) => (
          <div key={k} className="live-group">
            <div className="live-group-head"><strong>{bi(FAMILY_LABEL[k as PlanFamily])}</strong><span className="muted small">{bi(FAMILY_ROLE[k as PlanFamily])}</span></div>
            <PricingTable items={pricingByFamily(k as PlanFamily)} />
          </div>
        ))
      )}
    </Frame>
  );
}

function TenantFacts({ what }: { what?: string }) {
  const { lang, bi } = useI18n();
  const rows: [string, ReactNode][] = [];
  const title = { hours: { es: 'Horario del estudio', en: 'Studio hours' }, contact: { es: 'Contacto del estudio', en: 'Studio contact' }, capacity: { es: 'Capacidad y disciplina', en: 'Capacity and discipline' }, all: { es: 'El estudio', en: 'The studio' } };
  const key = (what ?? 'all') as keyof typeof title;
  if (!title[key]) return <Unknown kind="tenant" arg={what} options={['hours', 'contact', 'capacity']} />;
  if (key === 'hours' || key === 'all') rows.push([lang === 'en' ? 'Opening hours' : 'Horario', bi(tenant.hours)], [lang === 'en' ? 'Time zone' : 'Zona horaria', `${tenant.timezone} · ${tenant.currency}`]);
  if (key === 'contact' || key === 'all') rows.push(
    ['WhatsApp', tenant.contact.whatsapp],
    [lang === 'en' ? 'Email' : 'Correo', tenant.contact.email],
    [lang === 'en' ? 'Address' : 'Dirección', tenant.contact.address],
    ['Instagram', tenant.contact.instagram],
    [lang === 'en' ? 'City' : 'Ciudad', tenant.city],
  );
  if (key === 'capacity' || key === 'all') rows.push(
    [lang === 'en' ? 'Mats per class' : 'Mats por clase', String(tenant.studio.mats)],
    [lang === 'en' ? 'Classes per day' : 'Clases por día', String(tenant.studio.classesPerDay)],
    [lang === 'en' ? 'Classes per person per day' : 'Clases por persona por día', String(tenant.studio.perPersonPerDay)],
    [lang === 'en' ? 'Rooms' : 'Salas', String(tenant.studio.rooms)],
    [lang === 'en' ? 'Seats per day' : 'Cupos por día', String(tenant.studio.mats * tenant.studio.classesPerDay)],
  );
  return (
    <Frame title={bi(title[key])} eyebrow={`${tenant.legalName} · src/tenant/tenant.ts`} source={<Link to="/admin/settings">{lang === 'en' ? 'Settings › General' : 'Ajustes › General'}</Link>}>
      <dl className="live-dl">{rows.map(([k, v]) => <div key={k} className="live-dl-row"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </Frame>
  );
}

function Policy({ field }: { field?: string }) {
  const { lang, bi } = useI18n();
  const p = usePolicy();
  const value = (k: string): ReactNode => {
    if (k === 'quietHours') return `${p.quietHours.from} – ${p.quietHours.to}`;
    if (k === 'ivaPct') return `${p.tax.ivaPct} %`;
    if (k === 'pricesIncludeIva') return p.tax.pricesIncludeIva ? (lang === 'en' ? 'yes' : 'sí') : 'no';
    if (k === 'noShowFee') return (p as unknown as Record<string, number>)[k] ? cop((p as unknown as Record<string, number>)[k]) : (lang === 'en' ? 'none' : 'sin cargo');
    const raw = (p as unknown as Record<string, unknown>)[k];
    const unit = UNIT[k] ? ` ${bi(UNIT[k])}` : '';
    return raw === undefined ? '—' : `${String(raw)}${unit}`;
  };
  const source = <Link to="/admin/settings">{lang === 'en' ? 'source: Settings › Policies (M-08a)' : 'fuente: Ajustes › Políticas (M-08a)'}</Link>;
  if (field) {
    const k = POLICY_ALIAS[field] ?? field;
    if (!POLICY_LABEL[k]) return <Unknown kind="policy" arg={field} options={Object.keys(POLICY_LABEL)} />;
    return (
      <Frame title={bi(POLICY_LABEL[k])} eyebrow={lang === 'en' ? 'Current policy value' : 'Valor vigente de la política'} source={source}>
        <p className="live-big">{value(k)}</p>
      </Frame>
    );
  }
  return (
    <Frame title={lang === 'en' ? 'Policies in force' : 'Políticas vigentes'} eyebrow={lang === 'en' ? 'M-08a Settings & policies' : 'M-08a Ajustes y políticas'} source={source}>
      <dl className="live-dl">
        {Object.keys(POLICY_LABEL).map((k) => <div key={k} className="live-dl-row"><dt>{bi(POLICY_LABEL[k])}</dt><dd>{value(k)}</dd></div>)}
      </dl>
    </Frame>
  );
}

function TablesBlock() {
  const { lang, bi } = useI18n();
  return (
    <Frame
      title={lang === 'en' ? `Data model — ${tables.length} tables` : `Modelo de datos — ${tables.length} tablas`}
      eyebrow={lang === 'en' ? 'src/data/schema.ts · supabase/schema.sql' : 'src/data/schema.ts · supabase/schema.sql'}
      source={<Link to="/admin/tables">M-03</Link>}
    >
      {TABLE_GROUPS.map((g) => {
        const list = tables.filter((t) => t.group === g.id);
        if (!list.length) return null;
        return (
          <div key={g.id} className="live-group">
            <div className="live-group-head"><strong>{bi(g.label)}</strong><span className="muted small">{list.length}</span></div>
            <div className="live-chips">{list.map((t) => <Chip key={t.name}>{t.name}<span className="live-cols">{tableRegistry[t.name].allColumns.length}</span></Chip>)}</div>
          </div>
        );
      })}
    </Frame>
  );
}

function TableBlock({ name }: { name?: string }) {
  const { lang, bi } = useI18n();
  const def = name ? tableRegistry[name] : undefined;
  if (!def) return <Unknown kind="table" arg={name} options={tables.map((t) => t.name)} />;
  return (
    <Frame title={`${def.name} · ${bi(def.label)}`} eyebrow={bi(def.description)} source={<Link to={`/admin/tables/${def.name}`}>M-03</Link>}>
      <table className="live-table">
        <thead><tr><th>{lang === 'en' ? 'Column' : 'Columna'}</th><th>{lang === 'en' ? 'Type' : 'Tipo'}</th><th>{lang === 'en' ? 'Notes' : 'Notas'}</th></tr></thead>
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
        <div className="eyebrow">{lang === 'en' ? 'Who may read / write' : 'Quién puede leer / escribir'}</div>
        {def.rls?.length ? <ul>{def.rls.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="muted small">{lang === 'en' ? 'No access contract written yet for this table.' : 'Esta tabla aún no tiene contrato de acceso escrito.'}</p>}
      </div>
    </Frame>
  );
}

function RolesBlock() {
  const { lang, bi } = useI18n();
  const routes = useMemo(() => getRoutes(), []);
  return (
    <Frame title={lang === 'en' ? 'Roles and where they land' : 'Roles y dónde entran'} eyebrow="src/auth/roles.ts" source={<Link to="/docs/roles">docs/roles.md</Link>}>
      <table className="live-table">
        <thead><tr><th>{lang === 'en' ? 'Role' : 'Rol'}</th><th><code>id</code></th><th>{lang === 'en' ? 'Home' : 'Entra en'}</th><th className="live-num">{lang === 'en' ? 'Routes' : 'Rutas'}</th></tr></thead>
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
  const { lang, bi } = useI18n();
  const routes = useMemo(() => getRoutes(), []);
  if (!surface || !SURFACES.includes(surface as Surface)) return <Unknown kind="routes" arg={surface} options={SURFACES} />;
  const list = routes.filter((r) => r.surface === surface).sort((a, b) => a.path.localeCompare(b.path));
  return (
    <Frame title={lang === 'en' ? `Screens of the ${surface} surface` : `Pantallas de la superficie ${surface}`} eyebrow={lang === 'en' ? `${list.length} routes · live route manifest` : `${list.length} rutas · manifiesto de rutas en vivo`} source={<Link to="/dev/specs">/#/dev/specs</Link>}>
      <table className="live-table">
        <thead><tr><th>{lang === 'en' ? 'Code' : 'Código'}</th><th>{lang === 'en' ? 'Screen' : 'Pantalla'}</th><th>{lang === 'en' ? 'Route' : 'Ruta'}</th></tr></thead>
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
  const { lang } = useI18n();
  const { rows: profiles } = useTable('profiles');
  const { rows: memberships } = useTable('memberships');
  const { rows: sessions } = useTable('class_sessions');
  const { rows: teachers } = useTable('teachers');
  const { rows: bookings } = useTable('bookings');
  const now = Date.now();
  const week = sessions.filter((s) => {
    const t = new Date(String(s.starts_at)).getTime();
    return t >= now && t < now + 7 * 864e5;
  });
  const active = memberships.filter((m) => String(m.status) === 'active');
  const stats: [string, string][] = [
    [lang === 'en' ? 'People with a profile' : 'Personas con perfil', String(profiles.length)],
    [lang === 'en' ? 'Active memberships' : 'Membresías activas', String(active.length)],
    [lang === 'en' ? 'Classes in the next 7 days' : 'Clases en los próximos 7 días', String(week.length)],
    [lang === 'en' ? 'Active teachers' : 'Maestros activos', String(teachers.filter((t) => t.active !== false).length)],
    [lang === 'en' ? 'Bookings on record' : 'Reservas registradas', String(bookings.length)],
  ];
  return (
    <Frame title={lang === 'en' ? 'The studio right now' : 'El estudio ahora mismo'} eyebrow={lang === 'en' ? 'Counted from the data layer at render time' : 'Contado en la capa de datos al renderizar'} source={<Link to="/admin">M-01</Link>}>
      <div className="live-stats">{stats.map(([k, v]) => <div key={k} className="live-stat"><div className="live-stat-v">{v}</div><div className="live-stat-k">{k}</div></div>)}</div>
    </Frame>
  );
}

function Kpi({ name }: { name?: string }) {
  const { lang, bi } = useI18n();
  const { rows: sessions } = useTable('class_sessions');
  const { rows: bookings } = useTable('bookings');
  const past = sessions.filter((s) => String(s.status) === 'completed');
  const attended = bookings.filter((b) => String(b.status) === 'checked_in').length;
  const noShow = bookings.filter((b) => String(b.status) === 'no_show').length;
  const seats = past.length * tenant.studio.mats;
  const KPIS: Record<string, { label: Bi; value: string; hint: Bi }> = {
    occupancy: {
      label: { es: 'Ocupación', en: 'Occupancy' },
      value: seats ? `${Math.round((attended / seats) * 100)} %` : '—',
      hint: { es: `asistentes / (${tenant.studio.mats} × clases dictadas)`, en: `attendees / (${tenant.studio.mats} × classes taught)` },
    },
    noshow: {
      label: { es: 'No-show', en: 'No-show' },
      value: bookings.length ? `${Math.round((noShow / bookings.length) * 100)} %` : '—',
      hint: { es: 'reservas marcadas como no-show sobre el total', en: 'bookings marked no-show over the total' },
    },
    classes: {
      label: { es: 'Clases dictadas', en: 'Classes taught' },
      value: String(past.length),
      hint: { es: 'sesiones con estado completed', en: 'sessions with status completed' },
    },
  };
  const k = name ? KPIS[name] : undefined;
  if (!k) return <Unknown kind="kpi" arg={name} options={Object.keys(KPIS)} />;
  return (
    <Frame title={bi(k.label)} eyebrow={lang === 'en' ? 'KPI · M-01 dashboard' : 'KPI · panel M-01'} source={<Link to="/admin">M-01</Link>}>
      <p className="live-big">{k.value}</p>
      <p className="muted small">{bi(k.hint)}</p>
    </Frame>
  );
}

/** A directive whose name or argument the block does not know: says so and lists what exists. */
function Unknown({ kind, arg, options }: { kind: string; arg?: string; options: readonly string[] }) {
  const { lang } = useI18n();
  return (
    <div className="live live-unknown">
      <p>
        <code>{`{{${kind}${arg ? `:${arg}` : ''}}}`}</code>{' '}
        {lang === 'en' ? 'is not a directive this manual can render.' : 'no es una directiva que este manual sepa renderizar.'}
      </p>
      <p className="muted small">{lang === 'en' ? 'Available:' : 'Disponibles:'} {options.join(', ')}</p>
    </div>
  );
}

const KINDS = ['pricing', 'tenant', 'policy', 'tables', 'table', 'roles', 'routes', 'stats', 'kpi'] as const;

/**
 * One live-data block for the operations manual. A chapter writes `{{pricing:membresia}}` and this
 * renders the current value from the app's own sources — pricing.ts, tenant.ts, M-08 settings, the
 * table registry, the role list, the route manifest and the data layer — so the manual cannot go stale.
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
