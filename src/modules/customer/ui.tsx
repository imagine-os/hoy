import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import type { Movement } from '../../design/tokens';
import { Chip } from '../../components/atom/Chip/Chip';
import type { JoinedSession } from './hooks';
import './customer.css';

/** Page header used by every inner customer page: optional back link, eyebrow, title, subtitle, actions. */
export function PageHead({ title, sub, back, eyebrow, actions }: { title: ReactNode; sub?: ReactNode; back?: string; eyebrow?: ReactNode; actions?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="cust-head">
      {back && <Link to={back} className="cust-back">‹ <span>{t('core.nav.back')}</span></Link>}
      <div className="row-between wrap">
        <div className="grow">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="cust-title">{title}</h1>
          {sub && <p className="muted small cust-sub">{sub}</p>}
        </div>
        {actions && <div className="row">{actions}</div>}
      </div>
    </header>
  );
}

/** Textured 16:9 placeholder for hero photos and videos, labelled so nobody mistakes it for content. */
export function MediaPlaceholder({ label, ratio = '16 / 9', movement, children }: { label: string; ratio?: string; movement?: Movement; children?: ReactNode }) {
  return (
    <div className={`cust-media ${movement ? `cust-media-${movement}` : ''}`} style={{ aspectRatio: ratio }} role="img" aria-label={label}>
      <span className="cust-media-label">{label}</span>
      {children}
    </div>
  );
}

/** Movement chip for a joined session (falls back to fluye). */
export function MovementChip({ j }: { j: JoinedSession }) {
  const { bi } = useI18n();
  const mv = j.modality?.movement ?? 'fluye';
  return <Chip movement={mv} dot>{j.modality ? bi({ es: j.modality.name_es, en: j.modality.name_en }) : j.session.title}</Chip>;
}

export const roomName = (j: JoinedSession) => j.room?.name ?? '';
export const teacherName = (j: JoinedSession) => j.teacher?.display_name ?? '';
export const movementOf = (j: JoinedSession): Movement => j.modality?.movement ?? 'fluye';
export const durationMin = (j: JoinedSession) => j.modality?.duration_min ?? Math.round((new Date(j.session.ends_at).getTime() - new Date(j.session.starts_at).getTime()) / 6e4);

/** Builds and downloads an .ics for a session (C-08 / C-23 AddToCalendar). */
export function downloadIcs(input: { title: string; startsAt: string; endsAt: string; location: string; description?: string }) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HoyOS//ES', 'BEGIN:VEVENT', `UID:${Date.now()}@hoyos`, `DTSTAMP:${fmt(new Date().toISOString())}`, `DTSTART:${fmt(input.startsAt)}`, `DTEND:${fmt(input.endsAt)}`, `SUMMARY:${input.title}`, `LOCATION:${input.location}`, input.description ? `DESCRIPTION:${input.description}` : '', 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${input.title.replace(/[^\w]+/g, '-')}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Web Share with clipboard fallback. Returns 'shared' | 'copied' | 'failed'. */
export async function shareText(text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === 'function') { await nav.share({ text, url }); return 'shared'; }
    await nav.clipboard.writeText(url ? `${text} ${url}` : text);
    return 'copied';
  } catch { return 'failed'; }
}

export function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
