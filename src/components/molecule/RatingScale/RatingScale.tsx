import './RatingScale.css';

export interface RatingScaleProps {
  value: number | null;
  onChange?: (v: number) => void;
  max?: number;
  label: string;
  size?: 'md' | 'lg';
  readOnly?: boolean;
}

/** 1–5 star scale as a radiogroup. Each star is a ≥44px target. */
export function RatingScale({ value, onChange, max = 5, label, size = 'lg', readOnly = false }: RatingScaleProps) {
  return (
    <div className={`rating rating-${size}`} role="radiogroup" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} / ${max}`} disabled={readOnly} className={`rating-star ${value != null && n <= value ? 'is-on' : ''}`} onClick={() => onChange?.(n)}>★</button>
      ))}
    </div>
  );
}
