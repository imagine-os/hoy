import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  /** Primary action (Button or Link). */
  action?: ReactNode;
  /** Secondary link under the action (E-01: "studio tour →"). */
  secondary?: ReactNode;
  /** empty = nothing to show, error = something failed, loading = waiting for data. */
  tone?: 'empty' | 'error' | 'loading';
  compact?: boolean;
}

/** The three spec states every page needs (empty, error, loading) rendered the same way everywhere. Teaches the next step instead of showing an empty container (E-01 rule). */
export function EmptyState({ title, body, icon, action, secondary, tone = 'empty', compact = false }: EmptyStateProps) {
  return (
    <div className={`emptystate emptystate-${tone} ${compact ? 'is-compact' : ''}`} role={tone === 'error' ? 'alert' : 'status'} aria-busy={tone === 'loading' || undefined}>
      <span className="emptystate-icon" aria-hidden>{icon ?? (tone === 'error' ? '!' : tone === 'loading' ? <span className="emptystate-spinner" /> : '○')}</span>
      <div className="emptystate-title">{title}</div>
      {body && <p className="emptystate-body small muted">{body}</p>}
      {(action || secondary) && <div className="emptystate-action">{action}{secondary}</div>}
    </div>
  );
}
