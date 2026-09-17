import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './ListRow.css';

export interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Right-hand slot: value, Badge, Toggle. When absent and the row navigates, a chevron shows. */
  trailing?: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  className?: string;
}

/** Settings-style row (icon · title/subtitle · trailing/chevron). 56px tall so the whole row is a ≥44px target. */
export function ListRow({ title, subtitle, icon, trailing, to, href, onClick, tone = 'default', disabled = false, className = '' }: ListRowProps) {
  const interactive = !!(to || href || onClick) && !disabled;
  const cls = `listrow listrow-${tone} ${interactive ? 'is-interactive' : ''} ${disabled ? 'is-disabled' : ''} ${className}`;
  const inner = (
    <>
      {icon && <span className="listrow-icon" aria-hidden>{icon}</span>}
      <span className="listrow-main">
        <span className="listrow-title">{title}</span>
        {subtitle && <span className="listrow-sub">{subtitle}</span>}
      </span>
      {trailing != null ? <span className="listrow-trailing">{trailing}</span> : interactive ? <span className="listrow-chevron" aria-hidden>›</span> : null}
    </>
  );
  if (to && !disabled) return <Link to={to} className={cls}>{inner}</Link>;
  if (href && !disabled) return <a href={href} className={cls} target="_blank" rel="noreferrer">{inner}</a>;
  if (onClick) return <button type="button" className={cls} onClick={onClick} disabled={disabled}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

/** Groups rows inside a Card with dividers. */
export function ListGroup({ children, title, className = '' }: { children: ReactNode; title?: ReactNode; className?: string }) {
  return (
    <section className={`listgroup ${className}`}>
      {title && <div className="eyebrow listgroup-title">{title}</div>}
      <div className="listgroup-body">{children}</div>
    </section>
  );
}
