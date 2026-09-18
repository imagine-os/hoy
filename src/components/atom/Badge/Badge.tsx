import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warn' | 'danger' | 'highlight';
export function Badge({ tone = 'neutral', children, className = '' }: { tone?: BadgeTone; children?: ReactNode; className?: string }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

/** Maps common status strings to a tone so tables and cards agree. */
export function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (/active|approved|scheduled|checked_in|delivered|read|sent|claimed|redeemed|enabled|on$/.test(s)) return 'success';
  if (/pending|paused|waiting|offered|invited|queued|draft|past_due/.test(s)) return 'warn';
  if (/cancel|declined|failed|locked|disabled|no_show|expired|refunded|rejected|voided|late/.test(s)) return 'danger';
  if (/completed|booked|received/.test(s)) return 'primary';
  return 'neutral';
}
