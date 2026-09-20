import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import pkg from '../../../package.json';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTheme } from '../../design/ThemeProvider';
import { ROLE_HOME, ROLE_LABEL, type Role } from '../../auth/roles';
import { demoUserByRole } from '../../auth/demoUsers';
import { tenant } from '../../tenant/tenant';
import { taglines } from '../../tenant/brand';
import { getRoutes } from '../../app/registry';
import { routeManifest } from '../../app/manifest';
import { liveFramesAllowed } from '../../app/frameSession';
import { componentCount, manualChapterCount } from '../../app/counts';
import { tableRegistry } from '../../data/schema';
import { listActions, useActions } from '../../actions';
import type { ThumbShape } from '../../app/thumbnails';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { Badge } from '../../components/atom/Badge/Badge';
import { Button } from '../../components/atom/Button/Button';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Icon, type IconName } from '../../components/atom/Icon/Icon';
import { Placeholder } from '../../components/atom/Placeholder/Placeholder';
import { LangToggle } from '../../components/molecule/LangToggle/LangToggle';
import { RoleSwitcher } from '../../components/molecule/RoleSwitcher/RoleSwitcher';
import { BreathingRings } from '../../components/organism/BreathingRings/BreathingRings';
import { LivePreviewBudget, PagePreview } from '../../components/organism/PagePreview/PagePreview';
import { hubSpec, HUB_SURFACES, HUB_TOOLS, type HubSurfaceKey, type HubToolKey } from './specs';
import { useUiScale } from './useUiScale';
import './hub.css';

interface SurfaceCard {
  key: HubSurfaceKey;
  /** Page code — drives the thumbnail folder and the dev-mode chip. */
  code: string;
  to: string;
  /** Entering the card switches to this role's demo user first. */
  role?: Role;
  icon: IconName;
  shape?: ThumbShape;
  featured?: boolean;
  secondary?: { to: string; key: string };
}

const BAND_OUTSIDE: SurfaceCard[] = [
  { key: 'app', code: 'C-01', to: '/app', role: 'customer', icon: 'smartphone', shape: 'phone', featured: true, secondary: { to: '/auth/sign-in', key: 'hub.signin' } },
  { key: 'site', code: 'W-01', to: '/site', icon: 'globe' },
  { key: 'teacher', code: 'S-03', to: '/teach', role: 'teacher', icon: 'sparkle' },
];

const BAND_TEAM: SurfaceCard[] = [
  { key: 'desk', code: 'S-02', to: '/staff/checkin', role: 'front_desk', icon: 'check' },
  { key: 'inbox', code: 'S-06', to: '/staff/inbox', role: 'front_desk', icon: 'inbox' },
  { key: 'pos', code: 'S-04', to: '/staff/register', role: 'front_desk', icon: 'receipt' },
  { key: 'admin', code: 'M-01', to: '/admin', role: 'admin', icon: 'gauge' },
  { key: 'crm', code: 'M-06', to: '/admin/crm', role: 'coordinator', icon: 'users' },
  { key: 'finance', code: 'M-09', to: '/admin/finance', role: 'finance', icon: 'wallet' },
];

const BAND_BUILD: SurfaceCard[] = [
  { key: 'manual', code: 'K-03', to: '/manual', icon: 'book' },
  { key: 'docs', code: 'K-02', to: '/docs', icon: 'file-text' },
  { key: 'kb', code: 'K-01', to: '/dev/knowledgebase', role: 'super_admin', icon: 'list-checks' },
  { key: 'dev', code: 'D-03', to: '/dev', role: 'super_admin', icon: 'code' },
];

const ALL_CARDS = [...BAND_OUTSIDE, ...BAND_TEAM, ...BAND_BUILD];

interface ToolCard { key: HubToolKey; to: string; icon: IconName; isNew?: boolean }

const TOOLS: ToolCard[] = [
  { key: 'canvas', to: '/dev/canvas', icon: 'grid', isNew: true },
  { key: 'simulator', to: '/dev/simulator', icon: 'monitor', isNew: true },
  { key: 'specs', to: '/dev/specs', icon: 'file-text' },
  { key: 'layout', to: '/dev/layout/C-01', icon: 'layout' },
  { key: 'tables', to: '/admin/tables', icon: 'table' },
  { key: 'components', to: '/dev/components', icon: 'layers' },
  { key: 'tokens', to: '/dev/tokens', icon: 'palette' },
  { key: 'decisions', to: '/manual/decisions', icon: 'list-checks' },
  { key: 'screenshots', to: '/docs/screenshots', icon: 'camera' },
];

type Status = 'built' | 'stub' | 'planned';

/** One surface card: medallion, status, preview, and the one button that enters it. */
function SurfaceTile({ card, order, status, here, live, ui, onEnter }: {
  card: SurfaceCard; order: number; status: Status; here: boolean; live: boolean; ui: number;
  onEnter: (card: SurfaceCard) => void;
}) {
  const { t, bi } = useI18n();
  const { devMode } = useSession();
  const name = t(`hub.card.${card.key}`);
  const person = card.role ? demoUserByRole(card.role) : undefined;
  const tone = status === 'built' ? 'success' : status === 'stub' ? 'warn' : 'neutral';

  return (
    <article className={`hub-card ${card.featured ? 'is-featured' : ''}`} style={{ ['--hue' as string]: `var(--hue-${card.key})` }}>
      <div className="hub-card-body">
        <div className="hub-card-top">
          <span className="hub-medallion" aria-hidden><Icon name={card.icon} size={Math.round(22 * ui)} /></span>
          <div className="hub-card-badges">
            <Badge tone={tone}>{t(`hub.status.${status}`)}</Badge>
            {here && <Badge tone="primary">{t('hub.here')}</Badge>}
          </div>
        </div>
        <h3 className="hub-card-title">{name}</h3>
        <p className="hub-card-lead muted">{t(`hub.card.${card.key}.body`)}</p>
        <div className="hub-card-foot">
          <Button variant="secondary" onClick={() => onEnter(card)}>
            {person ? t('hub.enterAs', { name: person.name.split(' ')[0] }) : t('hub.open')}
          </Button>
          {card.secondary && <Link className="hub-card-secondary small" to={card.secondary.to}>{t(card.secondary.key)}</Link>}
        </div>
        <p className="hub-card-meta xs">
          <span>{card.role ? bi(ROLE_LABEL[card.role]) : bi(ROLE_LABEL.public)}</span>
          <span aria-hidden> · </span>
          <code>{card.to}</code>
          {devMode && <code className="hub-card-code">{card.code}</code>}
        </p>
      </div>
      <div className="hub-card-preview">
        <PagePreview
          code={card.code} route={card.to} name={name} shape={card.shape ?? 'desktop'}
          as={card.role} live={live} order={order} maxScale={card.shape === 'phone' ? ui : 1}
        />
      </div>
    </article>
  );
}

/** A band: 3fr header on the left, the card grid on the right. */
function Band({ id, eyebrow, title, body, tint, children }: {
  id: string; eyebrow: string; title: string; body: string; tint?: boolean; children: ReactNode;
}) {
  return (
    <section className={`hub-band-row ${tint ? 'is-tinted' : ''}`} aria-labelledby={id}>
      <div className="hub-wrap hub-band-inner">
        <header className="hub-band-head">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={id}>{title}</h2>
          <p className="muted hub-band-body">{body}</p>
        </header>
        <div className="hub-band-content">{children}</div>
      </div>
    </section>
  );
}

/** HUB-01 — the front door of the whole system. */
export function HubPage() {
  const { t, bi, setLang } = useI18n();
  const nav = useNavigate();
  const { role, isSuperAdmin, devMode, setDevMode, switchUser } = useSession();
  const { theme, toggleTheme, skin, toggleSkin } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const ui = useUiScale(root);

  // Live frames: never inside a frame, never with live=0 in the URL. Decided once per mount.
  const [live] = useState(() => liveFramesAllowed());

  const routes = useMemo(() => getRoutes(), []);
  const manifest = useMemo(() => routeManifest(routes), [routes]);
  const statusOf = useCallback((path: string): Status => manifest.find((m) => m.path === path)?.status ?? 'planned', [manifest]);

  const enter = useCallback((card: SurfaceCard) => {
    if (card.role) switchUser(card.role);
    nav(card.to);
  }, [switchUser, nav]);

  const stats = useMemo(() => {
    const codes = new Set(routes.map((r) => r.spec.code));
    return [
      { key: 'routes', value: routes.length },
      { key: 'codes', value: codes.size },
      { key: 'tables', value: Object.keys(tableRegistry).length },
      { key: 'components', value: componentCount },
      { key: 'actions', value: listActions().length },
      { key: 'chapters', value: manualChapterCount },
    ];
  }, [routes]);

  const handlers = useMemo(() => ({
    'hub.enterAs': (p?: Record<string, string>) => {
      const key = p?.surface as HubSurfaceKey | undefined;
      const card = ALL_CARDS.find((c) => c.key === key);
      // A bad parameter is a failure, not a result: `run()` turns a throw into { ok: false }, while a
      // returned string is reported as { ok: true } and an agent would read it as "done".
      if (!card) throw new Error(`unknown surface "${p?.surface ?? ''}" — one of ${HUB_SURFACES.join(', ')}`);
      enter(card);
      return `entered ${card.key} at ${card.to}`;
    },
    'hub.openCanvas': () => { nav('/dev/canvas'); return 'opened /dev/canvas'; },
    'hub.openSimulator': () => { nav('/dev/simulator'); return 'opened /dev/simulator'; },
    'hub.openTool': (p?: Record<string, string>) => {
      const tool = TOOLS.find((x) => x.key === p?.tool);
      if (!tool) throw new Error(`unknown tool "${p?.tool ?? ''}" — one of ${HUB_TOOLS.join(', ')}`);
      nav(tool.to);
      return `opened ${tool.to}`;
    },
    // `permission` on the spec is advisory metadata for agents; the gate that counts is here.
    'hub.toggleDevMode': () => {
      if (!isSuperAdmin) throw new Error('requires super_admin');
      setDevMode(!devMode); return `dev mode ${devMode ? 'off' : 'on'}`;
    },
    'hub.setLang': (p?: Record<string, string>) => {
      if (p?.lang !== 'es' && p?.lang !== 'en') throw new Error('lang must be es or en');
      setLang(p.lang);
      return `language ${p.lang}`;
    },
    'hub.toggleTheme': () => { toggleTheme(); return `theme ${theme === 'dark' ? 'light' : 'dark'}`; },
    'hub.toggleWireframe': () => {
      if (!isSuperAdmin) throw new Error('requires super_admin');
      toggleSkin(); return `skin ${skin === 'wireframe' ? 'styled' : 'wireframe'}`;
    },
  }), [enter, nav, setDevMode, devMode, setLang, toggleTheme, theme, toggleSkin, skin, isSuperAdmin]);
  useActions(hubSpec, handlers);

  // Document order decides who gets one of the six live frames first.
  const tile = (card: SurfaceCard) => (
    <SurfaceTile
      key={card.key} card={card} order={ALL_CARDS.indexOf(card)} status={statusOf(card.to)}
      here={ROLE_HOME[role] === card.to} live={live} ui={ui} onEnter={enter}
    />
  );

  return (
    <LivePreviewBudget max={6}>
      <div className="hub" ref={root}>
        <div className="hub-brandband">
          <div className="hub-wrap">
            <header className="hub-head">
              <div className="hub-head-brand">
                <Link to="/" aria-label={t('core.nav.hub')}><Wordmark height={Math.round(30 * ui)} variant="cream" /></Link>
                <Badge tone="highlight">{t('hub.version', { v: pkg.version })}</Badge>
              </div>
              <div className="hub-head-tools">
                <LangToggle />
                <button type="button" className="hub-iconbtn" onClick={toggleTheme} aria-label={t('core.theme.toggle')} title={t('core.theme.toggle')}>
                  <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={20} />
                </button>
                {isSuperAdmin && <Toggle size="sm" checked={skin === 'wireframe'} onChange={toggleSkin} label={t('hub.wireframe')} />}
                {isSuperAdmin && <Toggle size="sm" checked={devMode} onChange={setDevMode} label={t('core.dev.mode')} />}
              </div>
            </header>

            <section className="hub-hero">
              <div className="hub-hero-text">
                <p className="eyebrow">{tenant.legalName} · {tenant.city}</p>
                <h1>{t('hub.title')}</h1>
                <p className="hub-hero-lead">{t('hub.lead')}</p>
                <p className="hub-hero-tagline">{bi(taglines.start)}</p>
              </div>
              <div className="hub-hero-art" aria-hidden>
                <BreathingRings size={Math.round(340 * ui)} />
              </div>
            </section>
          </div>
        </div>

        <div className="hub-wrap">
          <div className="hub-sessionbar">
            <span className="eyebrow hub-sessionbar-label">{t('hub.session')}</span>
            <RoleSwitcher />
            {/* In-product annotations are not built yet: the control exists, says so, and blocks itself. */}
            <Placeholder what={t('hub.report')}>
              <Button size="sm" variant="ghost" icon={<Icon name="alert" size={16} />}>{t('hub.report')}</Button>
            </Placeholder>
            {devMode && <p className="small hub-devhint">{t('hub.devHint')}</p>}
          </div>
        </div>

        <main className="hub-main">
          <Band id="hub-band-outside" eyebrow={t('hub.band.outside.eyebrow')} title={t('hub.band.outside.title')} body={t('hub.band.outside.body')}>
            <div className="hub-grid hub-grid-outside">{BAND_OUTSIDE.map(tile)}</div>
          </Band>

          <Band id="hub-band-team" eyebrow={t('hub.band.team.eyebrow')} title={t('hub.band.team.title')} body={t('hub.band.team.body')}>
            <div className="hub-grid hub-grid-team">{BAND_TEAM.map(tile)}</div>
          </Band>

          <Band id="hub-band-build" eyebrow={t('hub.band.build.eyebrow')} title={t('hub.band.build.title')} body={t('hub.band.build.body')} tint>
            <div className="hub-grid hub-grid-build">{BAND_BUILD.map(tile)}</div>
          </Band>

          <Band id="hub-band-tools" eyebrow={t('hub.band.tools.eyebrow')} title={t('hub.band.tools.title')} body={t('hub.band.tools.body')}>
            <ul className="hub-tools">
              {TOOLS.map((tool) => (
                <li key={tool.key}>
                  <Link className="hub-tool" to={tool.to} style={{ ['--hue' as string]: 'var(--hue-dev)' }}>
                    <span className="hub-tool-icon" aria-hidden><Icon name={tool.icon} size={Math.round(20 * ui)} /></span>
                    <span className="hub-tool-text">
                      <span className="hub-tool-title">
                        {t(`hub.tool.${tool.key}`)}
                        {tool.isNew && <Badge tone="highlight">{t('hub.new')}</Badge>}
                      </span>
                      <span className="hub-tool-body muted xs">{t(`hub.tool.${tool.key}.body`)}</span>
                    </span>
                    <span className="hub-tool-go" aria-hidden><Icon name="arrow-right" size={18} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </Band>
        </main>

        <footer className="hub-foot">
          <div className="hub-wrap">
            <dl className="hub-stats" aria-label={t('hub.stats.label')}>
              {stats.map((s) => (
                <div key={s.key} className="hub-stat">
                  <dt className="eyebrow">{t(`hub.stat.${s.key}`)}</dt>
                  <dd className="hub-stat-value">{s.value}</dd>
                </div>
              ))}
            </dl>
            <p className="muted xs hub-footline">{t('hub.footer', { v: pkg.version })}</p>
          </div>
        </footer>
      </div>
    </LivePreviewBudget>
  );
}
