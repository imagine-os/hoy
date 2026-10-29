import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { LIMITS } from '../../../shared/limits';
import './Input.css';

/** PL-07: every text field is bounded. A screen may pass a tighter `maxLength`; without one, the type's default applies. */
const DEFAULT_MAX: Record<string, number> = { text: LIMITS.note, search: LIMITS.title, email: LIMITS.email, tel: LIMITS.phone, url: LIMITS.url, password: 128 };

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { invalid?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className = '', maxLength, ...rest }, ref) {
  const max = maxLength ?? DEFAULT_MAX[rest.type ?? 'text'];
  return <input ref={ref} className={`input ${invalid ? 'is-invalid' : ''} ${className}`} aria-invalid={invalid || undefined} maxLength={max} {...rest} />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { invalid?: boolean }
export function Select({ invalid, className = '', children, ...rest }: SelectProps) {
  return <select className={`input input-select ${invalid ? 'is-invalid' : ''} ${className}`} aria-invalid={invalid || undefined} {...rest}>{children}</select>;
}
