import { useId, type ReactNode } from 'react';
import './Field.css';

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Receives the generated id to wire the control. */
  children: (id: string) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="field-label">{label}{required && <span className="field-req" aria-hidden> *</span>}</label>
      {children(id)}
      {error ? <p className="field-msg field-error" role="alert">{error}</p> : hint ? <p className="field-msg muted">{hint}</p> : null}
    </div>
  );
}
