import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, matchPath, useLocation } from 'react-router-dom';
import type { RouteDef, Surface } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTheme } from '../../../design/ThemeProvider';
import { useTable } from '../../../data/DataContext';
import type { BaseRow, ProfileRow } from '../../../data/schema';
import { ROLE_LABEL } from '../../../auth/roles';
import { openInspector } from '../../../dev/inspectorBus';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { Toggle } from '../../atom/Toggle/Toggle';
import { RoleSwitcher } from '../../molecule/RoleSwitcher/RoleSwitcher';
import { Avatar } from '../../atom/Avatar/Avatar';
import { TopBar } from '../../organism/TopBar/TopBar';
import { GlobalSearch, type SearchItem } from '../../molecule/GlobalSearch/GlobalSearch';
import { NotificationBell } from '../../molecule/NotificationBell/NotificationBell';
import './DesktopShell.css';

export interface DesktopShellProps {
  surfaces: Surface[];
  routes: RouteDef[];
  /** i18n key of the label beside the sidebar wordmark (core.nav.group.staff, core.nav.docs…). */
  titleKey: string;
  children: ReactNode;
}

interface MsgRow extends BaseRow { user_id: string | null; status: string }

const KEY = 'hoyos.shell';
function read<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch { /* ignore */ }
  return fallback;
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

/** True while the viewport is narrower than the drawer breakpoint (900 px). */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false));
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

/**
 * Desktop-first shell (staff, admin, dev, docs).
 * Sidebar: 240 px cream lane that collapses to a 56 px icon rail (chevron in the footer or the `[` key,
 * remembered per surface in localStorage) and becomes an off-canvas drawer below 900 px. Nav groups come
 * from `RouteDef.nav.group` and fold with a caret (remembered per group; the active route's group stays open).
 * Top bar: sidebar toggle · wordmark · page name + code · global search · language, theme, notifications,
 * user switcher, dev mode and the spec chip.
 */
export function DesktopShell({ surfaces, routes, titleKey, children }: DesktopShellProps) {
  const { t, bi, dict } = useI18n();
  const title = t(titleKey);
  const { user, role, isSuperAdmin, devMode, setDevMode, hasRole, can } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const narrow = useNarrow();
  const surfaceKey = surfaces[0] ?? 'desktop';
  const collapsedKey = `${KEY}.${surfaceKey}.collapsed`;
  const groupsKey = `${KEY}.${surfaceKey}.groups`;

  const [collapsed, setCollapsed] = useState(() => read(collapsedKey, false));
  const [folded, setFolded] = useState<Record<string, boolean>>(() => read(groupsKey, {}));
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setCollapsed(read(collapsedKey, false)); setFolded(read(groupsKey, {})); }, [collapsedKey, groupsKey]);
  useEffect(() => { write(collapsedKey, collapsed); }, [collapsedKey, collapsed]);
  useEffect(() => { write(groupsKey, folded); }, [groupsKey, folded]);
  useEffect(() => { setDrawer(false); }, [pathname]);

  const toggleSidebar = useCallback(() => {
    if (narrow) setDrawer((o) => !o); else setCollapsed((c) => !c);
  }, [narrow]);

  // `[` collapses and expands the column (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '[' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return;
      e.preventDefault();
      if (narrow) setDrawer((o) => !o); else setCollapsed((c) => !c);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [narrow]);

  // A super admin sees the design-system (dev) routes from the staff and admin sidebars too.
  const shown = useMemo<Surface[]>(
    () => (isSuperAdmin && surfaces.includes('admin') && !surfaces.includes('dev') ? [...surfaces, 'dev'] : surfaces),
    [isSuperAdmin, surfaces],
  );
  const allowed = useMemo(() => routes.filter((r) => hasRole(r.roles)), [routes, hasRole]);
  const items = useMemo(() => allowed
    .filter((r) => shown.includes(r.surface) && r.nav)
    .map((r) => ({ to: r.nav!.to ?? r.path, route: r, group: r.nav!.group ?? '' }))
    .sort((a, b) => (shown.indexOf(a.route.surface) - shown.indexOf(b.route.surface)) || (a.route.nav!.order - b.route.nav!.order)),
  [allowed, shown]);
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);
  const label = useCallback((g: string) => (dict[g] ? t(g) : g), [dict, t]);

  const isRoot = (to: string) => to.split('/').filter(Boolean).length <= 1;
  const isOn = (to: string) => pathname === to || (!isRoot(to) && pathname.startsWith(`${to}/`));
  // The most specific nav item on the current path is the only active one: /admin/crm/deletions lights
  // "Eliminaciones", not "CRM" as well.
  const activeTo = useMemo(() => [...items].filter((i) => isOn(i.to)).sort((a, b) => b.to.length - a.to.length)[0]?.to ?? '', [items, pathname]);
  const activeGroup = useMemo(() => items.find((i) => i.to === activeTo)?.group ?? '', [items, activeTo]);

  const current = useMemo(() => allowed.find((r) => matchPath({ path: r.path, end: true }, pathname)) ?? null, [allowed, pathname]);

  // Global search: every route this role may open, plus members by name.
  const { rows: profiles } = useTable<ProfileRow>('profiles');
  const searchItems = useMemo<SearchItem[]>(() => {
    const pages = allowed.filter((r) => !r.path.includes(':')).map((r) => ({ id: `r:${r.path}`, group: t('core.search.pages'), label: bi(r.spec.name), hint: r.spec.code, to: r.path }));
    const people = can('members.read')
      ? profiles.map((p) => ({ id: `p:${p.id}`, group: t('core.search.people'), label: p.full_name, hint: p.initials ?? undefined, to: `/admin/crm/${p.user_id}` }))
      : [];
    return [...pages, ...people];
  }, [allowed, profiles, can, bi, t]);

  const { rows: messages } = useTable<MsgRow>('message_log', { where: { user_id: user.id } });
  const unread = messages.filter((m) => m.status === 'sent' || m.status === 'delivered' || m.status === 'queued').length;

  const sidebarLabel = narrow ? (drawer ? t('core.shell.closeMenu') : t('core.shell.menu')) : collapsed ? t('core.shell.expand') : t('core.shell.collapse');

  return (
    <div className={`deskshell ${collapsed ? 'is-rail' : ''} ${drawer ? 'is-open' : ''}`}>
      <aside className="deskshell-side" aria-label={t('core.shell.sections')}>
        <div className="deskshell-brand">
          <Link to="/" className="deskshell-mark" title={t('core.nav.hub')}><Wordmark height={collapsed ? 15 : 26} /></Link>
          {!collapsed && <span className="deskshell-title">{title}</span>}
        </div>
        <nav className="deskshell-nav" aria-label={t('core.shell.sections')}>
          {groups.map((g) => {
            const open = !g || g === activeGroup || !folded[g];
            return (
              <div key={g} className={`deskshell-group ${open ? '' : 'is-folded'}`}>
                {g && !collapsed && (
                  <button
                    type="button" className="deskshell-grouplabel eyebrow" aria-expanded={open}
                    title={t(open ? 'core.shell.group.collapse' : 'core.shell.group.expand', { group: label(g) })}
                    onClick={() => setFolded((f) => ({ ...f, [g]: !f[g] }))}
                  >
                    <span className="deskshell-caret" aria-hidden>{open ? '⌄' : '›'}</span>
                    <span className="deskshell-grouptext">{label(g)}</span>
                  </button>
                )}
                {g && collapsed && <hr className="deskshell-sep" aria-hidden />}
                {(open || collapsed) && items.filter((i) => i.group === g).map(({ to, route: r }) => (
                  <NavLink
                    key={`${r.path}-${to}`} to={to} end={isRoot(to)}
                    className={() => `deskshell-link ${to === activeTo ? 'is-active' : ''}`}
                    title={collapsed ? t(r.nav!.labelKey) : undefined}
                    onClick={() => setDrawer(false)}
                  >
                    <span className="deskshell-icon" aria-hidden>{r.nav!.icon}</span>
                    <span className="deskshell-linktext">{t(r.nav!.labelKey)}</span>
                    {devMode && !collapsed && <code className="deskshell-code">{r.spec.code}</code>}
                    {collapsed && <span className="deskshell-tip" aria-hidden>{t(r.nav!.labelKey)}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="deskshell-foot">
          <button
            type="button" className="deskshell-collapse" onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed} aria-label={collapsed ? t('core.shell.expand') : t('core.shell.collapse')}
            title={`${collapsed ? t('core.shell.expand') : t('core.shell.collapse')} · ${t('core.shell.collapseHint')}`}
          >
            <span className="deskshell-chev" aria-hidden>{collapsed ? '»' : '«'}</span>
            {!collapsed && <span className="small">{t('core.shell.collapse')}</span>}
          </button>
          {collapsed ? (
            <Link to="/" title={user.name} className="deskshell-me"><Avatar name={user.name} initials={user.initials} size={28} /></Link>
          ) : (
            <>
              <div className="row"><Avatar name={user.name} initials={user.initials} size={32} /><div className="grow small"><div className="deskshell-who">{user.name}</div><div className="xs muted">{bi(ROLE_LABEL[role])}</div></div></div>
              <Link to="/" className="small">← {t('core.nav.hub')}</Link>
            </>
          )}
        </div>
      </aside>
      <div className="deskshell-col">
        <TopBar
          brand homeTo="/" title={current ? (current.nav ? t(current.nav.labelKey) : bi(current.spec.name)) : title} code={current?.spec.code}
          leading={<button type="button" className="topbar-lead" onClick={toggleSidebar} aria-label={sidebarLabel} aria-expanded={narrow ? drawer : !collapsed} title={sidebarLabel}>☰</button>}
          center={<GlobalSearch items={searchItems} />}
          actions={
            <>
              <LangToggle size="sm" />
              <button type="button" className="deskshell-iconbtn" onClick={toggleTheme} aria-label={t('core.theme.toggle')} title={t('core.theme.toggle')}>{theme === 'dark' ? '☾' : '☀'}</button>
              {allowed.some((r) => r.path === '/admin/whatsapp') && <NotificationBell count={unread} to="/admin/whatsapp" />}
              <div className="deskshell-rs"><RoleSwitcher compact /></div>
              {isSuperAdmin && <span className="deskshell-devtoggle" title={t('core.dev.mode')}><Toggle size="sm" checked={devMode} onChange={setDevMode} label={t('core.dev.mode')} /></span>}
              {devMode && current && (
                <button type="button" className="deskshell-spec" onClick={openInspector} title="Ctrl+." aria-label={`${t('core.dev.spec')} ${current.spec.code}`}>
                  <span className="deskshell-specdot" aria-hidden />{current.spec.code}
                </button>
              )}
            </>
          }
        />
        <main className="deskshell-main">{children}</main>
      </div>
      {drawer && <div className="deskshell-scrim" onClick={() => setDrawer(false)} aria-hidden />}
    </div>
  );
}
