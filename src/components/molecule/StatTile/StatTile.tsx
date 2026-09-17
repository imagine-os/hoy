import type { ReactNode } from 'react';
import './StatTile.css';

export function StatTile({ label, value, hint, trend }: { label: string; value: ReactNode; hint?: string; trend?: 'up' | 'down' | 'flat' }) {
  return (
    <div className="stat">
      <div className="eyebrow">{label}</div>
      <div className="stat-value">{value}{trend && <span className={`stat-trend stat-${trend}`} aria-hidden>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>}</div>
      {hint && <div className="stat-hint muted small">{hint}</div>}
    </div>
  );
}
