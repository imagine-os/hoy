import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import './NavBar.css';
import { renderIcon, type IconName } from '../../atom/Icon/Icon';

export interface NavItem { to: string; label: string; /** An `IconName` (drawn by the Icon atom) or a custom node. */ icon: IconName | ReactNode; end?: boolean }

export interface NavBarProps { items: NavItem[]; /** `dock` (default): the sticky bottom dock below 900 px. `top`: the horizontal row inside the AppShell top bar from 900 px. */ variant?: 'dock' | 'top' }

/** Primary navigation (3–5 items): the bottom dock on phones, a horizontal row in the top bar on desktop. */
export function NavBar({ items, variant = 'dock' }: NavBarProps) {
  const { t } = useI18n();
  return (
    <nav className={`navbar navbar-${variant}`} aria-label={t('core.nav.main')}>
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `navbar-item ${isActive ? 'is-active' : ''}`}>
          <span className="navbar-icon" aria-hidden>{renderIcon(it.icon, variant === 'dock' ? 'lg' : 'md')}</span>
          <span className="navbar-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
