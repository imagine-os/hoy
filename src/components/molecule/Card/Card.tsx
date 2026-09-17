import type { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  raised?: boolean;
  interactive?: boolean;
  tone?: 'surface' | 'primary' | 'highlight' | 'muted';
}

/** The physical surface everything sits on: highlight + contact + soft shadow, 16px radius. */
export function Card({ title, eyebrow, actions, padding = 'md', raised = false, interactive = false, tone = 'surface', className = '', children, ...rest }: CardProps) {
  return (
    <div className={`card card-pad-${padding} card-${tone} ${raised ? 'is-raised' : ''} ${interactive ? 'is-interactive' : ''} ${className}`} {...rest}>
      {(title || eyebrow || actions) && (
        <header className="card-head">
          <div className="grow">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
