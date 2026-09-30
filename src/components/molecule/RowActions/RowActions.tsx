import type { ReactNode } from 'react';
import './RowActions.css';

export interface RowActionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * The action slot of a dense list row (RosterRow). Buttons inside it are compact: `size="sm"` is 36 px visible
 * (`--h-ctl-sm`) with a 44 px hit area, and no button carries a shadow, so ten rows read as a list and not as a
 * column of pills. Put the row's main action first (`variant="tonal"`), the secondary one second (`variant="outline"`).
 */
export function RowActions({ children, className = '' }: RowActionsProps) {
  return <div className={`row-actions is-dense ${className}`} onClick={(e) => e.stopPropagation()}>{children}</div>;
}
