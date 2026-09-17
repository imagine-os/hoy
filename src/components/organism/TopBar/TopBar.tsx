import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import './TopBar.css';

export interface TopBarProps {
  title?: ReactNode;
  /** Show the wordmark (with the title beside it, when both are given). */
  brand?: boolean;
  back?: string;
  actions?: ReactNode;
  sticky?: boolean;
  homeTo?: string;
  /** Left-most slot, before the brand: the sidebar/drawer toggle in DesktopShell. */
  leading?: ReactNode;
  /** Page code chip next to the title (M-01, C-02…). */
  code?: string;
  /** Middle slot, e.g. GlobalSearch. */
  center?: ReactNode;
}

/** Top bar: leading slot, title or wordmark with an optional code chip, a middle slot and actions. */
export function TopBar({ title, brand = false, back, actions, sticky = true, homeTo, leading, code, center }: TopBarProps) {
  const { t } = useI18n();
  return (
    <header className={`topbar ${sticky ? 'is-sticky' : ''} ${center ? 'has-center' : ''}`}>
      <div className="topbar-left">
        {leading}
        {back && <Link to={back} className="topbar-back" aria-label={t('core.nav.back')}>‹</Link>}
        {brand && (homeTo ? <Link to={homeTo} className="topbar-brand"><Wordmark height={24} /></Link> : <span className="topbar-brand"><Wordmark height={24} /></span>)}
        {title && (brand ? <span className="topbar-page">{title}</span> : <h1 className="topbar-title">{title}</h1>)}
        {code && <code className="topbar-code">{code}</code>}
      </div>
      {center && <div className="topbar-center">{center}</div>}
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}
