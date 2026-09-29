import type { ReactNode } from 'react';
import './Notice.css';
import { renderIcon, type IconName } from '../../atom/Icon/Icon';

export type NoticeTone = 'info' | 'success' | 'warn' | 'danger';

export interface NoticeProps {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Optional action rendered on the right (Button, Link). */
  action?: ReactNode;
  /** An `IconName` or a node; replaces the tone glyph. */
  icon?: IconName | ReactNode;
  className?: string;
}

/** Inline banner for states the page must explain: cancelled class, declined payment, gateway down, saved. */
export function Notice({ tone = 'info', title, children, action, icon, className = '' }: NoticeProps) {
  const role = tone === 'danger' || tone === 'warn' ? 'alert' : 'status';
  const glyph = renderIcon(icon ?? (tone === 'danger' ? 'circle-alert' : tone === 'warn' ? 'alert' : tone === 'success' ? 'check' : 'info'), 'xs');
  return (
    <div className={`notice notice-${tone} ${className}`} role={role}>
      <span className="notice-icon" aria-hidden>{glyph}</span>
      <div className="notice-body">
        {title && <strong className="notice-title">{title}</strong>}
        {children && <div className="notice-text">{children}</div>}
      </div>
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}
