import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Tone } from '../../../design/tokens';
import './Chip.css';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  tone?: Tone;
  dot?: boolean;
  children?: ReactNode;
}

/** Selectable pill (filters, class-tone tags). Renders a button when onClick is set, else a span. */
export function Chip({ selected = false, tone, dot = false, className = '', children, onClick, ...rest }: ChipProps) {
  const cls = `chip ${selected ? 'is-selected' : ''} ${tone ? `chip-tone chip-${tone}` : ''} ${className}`;
  const inner = <>{dot && <span className="chip-dot" aria-hidden />}{children}</>;
  if (onClick) return <button type="button" data-tone={tone} className={cls} aria-pressed={selected} onClick={onClick} {...rest}>{inner}</button>;
  return <span data-tone={tone} className={cls}>{inner}</span>;
}
