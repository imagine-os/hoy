import { useEffect, useState, type ReactNode } from 'react';
import './CountdownRing.css';

export interface CountdownRingProps {
  /** ISO time the countdown reaches zero. */
  until: string;
  /** ISO time it started (for the ring fill); defaults to now at mount. */
  from?: string;
  size?: number;
  tone?: 'primary' | 'warn' | 'danger' | 'success';
  label?: ReactNode;
  /** Called once when the countdown reaches zero. */
  onDone?: () => void;
  /** Show hours when over 60 min (default true). */
  showHours?: boolean;
}

function useCountdownMs(until: string, tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), tickMs); return () => clearInterval(id); }, [tickMs]);
  return Math.max(0, new Date(until).getTime() - now);
}

function formatCountdown(ms: number, showHours = true): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  if (showHours && h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Circular countdown (class starts in…, claim window, payment hold, lockout). The ring drains as time passes. */
export function CountdownRing({ until, from, size = 160, tone = 'primary', label, onDone, showHours = true }: CountdownRingProps) {
  const [start] = useState(() => (from ? new Date(from).getTime() : Date.now()));
  const ms = useCountdownMs(until);
  const total = Math.max(1, new Date(until).getTime() - start);
  const frac = Math.min(1, Math.max(0, ms / total));
  useEffect(() => { if (ms === 0) onDone?.(); }, [ms, onDone]);
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  return (
    <div className={`cdring cdring-${tone}`} style={{ width: size, height: size }} role="timer" aria-live="off" aria-label={formatCountdown(ms, showHours)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="cdring-track" cx={size / 2} cy={size / 2} r={r} />
        <circle className="cdring-fill" cx={size / 2} cy={size / 2} r={r} strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="cdring-center">
        <span className="cdring-time" style={{ fontSize: size * 0.19 }}>{formatCountdown(ms, showHours)}</span>
        {label && <span className="cdring-label">{label}</span>}
      </div>
    </div>
  );
}
