import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { RouteDef, Surface } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTheme } from '../../../design/ThemeProvider';
import { ROLE_LABEL } from '../../../auth/roles';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { Toggle } from '../../atom/Toggle/Toggle';
import { RoleSwitcher } from '../../molecule/RoleSwitcher/RoleSwitcher';
import { Avatar } from '../../atom/Avatar/Avatar';
import './DesktopShell.css';

export interface DesktopShellProps {
  surfaces: Surface[];
  routes: RouteDef[];
  title: string;
  children: ReactNode;
}

/** Desktop-first shell (staff, admin, dev, docs): collapsible sidebar with grouped nav, session and toggles. */
export function DesktopShell({ surfaces, routes, title, children }: DesktopShellProps) {
  const { t, bi } = useI18n();
  const { user, role, isSuperAdmin, devMode, setDevMode, hasRole } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const items = routes.filter((r) => surfaces.includes(r.surface) && r.nav && hasRole(r.roles)).sort((a, b) => a.nav!.order - b.nav!.order);
  const groups = [...new Set(items.map((r) => r.nav!.group ?? ''))];
  return (
    <div className={`deskshell ${open ? 'is-open' : ''}`}>
      <aside className="deskshell-side">
        <div className="deskshell-brand">
          <Link to="/" title={t('core.nav.hub')}><Wordmark height={26} /></Link>
          <span className="deskshell-title">{title}</span>
          <button type="button" className="deskshell-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>☰</button>
        </div>
        <nav className="deskshell-nav" aria-label="Sections">
          {groups.map((g) => (
            <div key={g} className="deskshell-group">
              {g && <div className="eyebrow deskshell-grouplabel">{g}</div>}
              {items.filter((r) => (r.nav!.group ?? '') === g).map((r) => (
                <NavLink key={r.path} to={r.path} end className={({ isActive }) => `deskshell-link ${isActive ? 'is-active' : ''}`} onClick={() => setOpen(false)}>
                  <span className="deskshell-icon" aria-hidden>{r.nav!.icon}</span><span>{t(r.nav!.labelKey)}</span>
                  {devMode && <code className="deskshell-code">{r.spec.code}</code>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="deskshell-foot">
          <div className="row"><Avatar name={user.name} initials={user.initials} size={32} /><div className="grow small"><div>{user.name}</div><div className="xs muted">{bi(ROLE_LABEL[role])}</div></div></div>
          <RoleSwitcher compact />
          <div className="row wrap">
            <LangToggle size="sm" />
            <button type="button" className="deskshell-iconbtn" onClick={toggleTheme} aria-label={t('core.theme.toggle')}>{theme === 'dark' ? '☾' : '☀'}</button>
            {isSuperAdmin && <Toggle size="sm" checked={devMode} onChange={setDevMode} label={t('core.dev.mode')} />}
          </div>
          <Link to="/" className="small">← {t('core.nav.hub')}</Link>
        </div>
      </aside>
      <main className="deskshell-main">{children}</main>
      {open && <div className="deskshell-scrim" onClick={() => setOpen(false)} aria-hidden />}
    </div>
  );
}
