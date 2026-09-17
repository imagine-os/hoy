import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import './NavBar.css';

export interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

/** Bottom navigation for mobile shells (3–5 items). */
export function NavBar({ items }: { items: NavItem[] }) {
  return (
    <nav className="navbar" aria-label="Main">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `navbar-item ${isActive ? 'is-active' : ''}`}>
          <span className="navbar-icon" aria-hidden>{it.icon}</span>
          <span className="navbar-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
