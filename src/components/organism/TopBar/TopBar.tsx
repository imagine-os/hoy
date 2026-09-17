import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import './TopBar.css';

export interface TopBarProps {
  title?: ReactNode;
  /** Show the wordmark instead of a text title. */
  brand?: boolean;
  back?: string;
  actions?: ReactNode;
  sticky?: boolean;
  homeTo?: string;
}

export function TopBar({ title, brand = false, back, actions, sticky = true, homeTo }: TopBarProps) {
  return (
    <header className={`topbar ${sticky ? 'is-sticky' : ''}`}>
      <div className="topbar-left">
        {back && <Link to={back} className="topbar-back" aria-label="Back">‹</Link>}
        {brand ? (homeTo ? <Link to={homeTo} className="topbar-brand"><Wordmark height={24} /></Link> : <Wordmark height={24} />) : <h1 className="topbar-title">{title}</h1>}
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}
