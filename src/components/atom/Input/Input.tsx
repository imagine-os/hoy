import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { invalid?: boolean }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className = '', ...rest }, ref) {
  return <input ref={ref} className={`input ${invalid ? 'is-invalid' : ''} ${className}`} aria-invalid={invalid || undefined} {...rest} />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { invalid?: boolean }
export function Select({ invalid, className = '', children, ...rest }: SelectProps) {
  return <select className={`input input-select ${invalid ? 'is-invalid' : ''} ${className}`} aria-invalid={invalid || undefined} {...rest}>{children}</select>;
}
