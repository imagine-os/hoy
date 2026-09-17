import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** empty = nothing to show, error = something failed, loading = waiting for data. */
  tone?: 'empty' | 'error' | 'loading';
  compact?: boolean;
}

/** The three spec states every page needs (empty, error, loading) rendered the same way everywhere. */
export function EmptyState({ title, body, icon, action, tone = 'empty', compact = false }: EmptyStateProps) {
  return (
    <div className={`emptystate emptystate-${tone} ${compact ? 'is-compact' : ''}`} role={tone === 'error' ? 'alert' : 'status'} aria-busy={tone === 'loading' || undefined}>
      <span className="emptystate-icon" aria-hidden>{icon ?? (tone === 'error' ? '!' : tone === 'loading' ? <span className="emptystate-spinner" /> : '·')}</span>
      <div className="emptystate-title">{title}</div>
      {body && <p className="emptystate-body small muted">{body}</p>}
      {action && <div className="emptystate-action">{action}</div>}
    </div>
  );
}
