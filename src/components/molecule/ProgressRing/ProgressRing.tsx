import type { ReactNode } from 'react';
import './ProgressRing.css';

export interface ProgressRingProps {
  /** Done so far. */
  value: number;
  /** Total; 0 draws an empty ring with "—". */
  max: number;
  /** Diameter in px (scales with the `--ui` band through rem-based text only). */
  size?: number;
  tone?: 'primary' | 'success' | 'warn';
  /** Line under the number, e.g. "obligatorios leídos". */
  label?: ReactNode;
  /** Accessible name; defaults to "value / max". */
  ariaLabel?: string;
}

/** A static progress ring: N of M (chapters read, training items done). Not a timer — see CountdownRing for that. */
export function ProgressRing({ value, max, size = 112, tone = 'primary', label, ariaLabel }: ProgressRingProps) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const done = max > 0 && value >= max;
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  return (
    <div
      className={`pring pring-${done ? 'success' : tone}`} style={{ width: size }}
      role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-label={ariaLabel ?? `${value} / ${max}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="pring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={8} fill="none" />
        <circle className="pring-fill" cx={size / 2} cy={size / 2} r={r} strokeWidth={8} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="pring-center" style={{ width: size, height: size }}>
        <span className="pring-value">{max > 0 ? `${Math.min(value, max)}/${max}` : '—'}</span>
      </div>
      {label && <div className="pring-label">{label}</div>}
    </div>
  );
}
