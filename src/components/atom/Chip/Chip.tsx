import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Movement } from '../../../design/tokens';
import './Chip.css';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  movement?: Movement;
  dot?: boolean;
  children?: ReactNode;
}

/** Selectable pill (filters, intention picker, movement tags). Renders a button when onClick is set, else a span. */
export function Chip({ selected = false, movement, dot = false, className = '', children, onClick, ...rest }: ChipProps) {
  const cls = `chip ${selected ? 'is-selected' : ''} ${movement ? `chip-mv chip-${movement}` : ''} ${className}`;
  const inner = <>{dot && <span className="chip-dot" aria-hidden />}{children}</>;
  if (onClick) return <button type="button" className={cls} aria-pressed={selected} onClick={onClick} {...rest}>{inner}</button>;
  return <span className={cls}>{inner}</span>;
}
