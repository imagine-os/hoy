import { useI18n } from '../../../i18n/I18nProvider';
import { formatDateTime } from '../../../i18n/format';
import './Timeline.css';
import { Icon, type IconName } from '../../atom/Icon/Icon';

export type TimelineKind = 'whatsapp' | 'email' | 'note' | 'system' | 'payment' | 'booking';

export interface TimelineItem {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  body?: string;
  /** Who / where it came from. */
  meta?: string;
}

/** Glyph per kind — shared with MessageThread's system lines so both streams draw the same event the same way. */
export const TIMELINE_ICON: Record<TimelineKind, IconName> = { whatsapp: 'whatsapp', email: 'mail', note: 'notes', system: 'settings', payment: 'payment', booking: 'user-check' };

/** Chronological stream (newest first) merging every channel: messages, notes, payments, bookings, system events. */
export function Timeline({ items, emptyText, limit }: { items: TimelineItem[]; emptyText?: string; limit?: number }) {
  const { lang, t } = useI18n();
  const sorted = [...items].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit ?? items.length);
  if (sorted.length === 0) return <p className="small muted timeline-empty">{emptyText ?? t('core.common.empty')}</p>;
  return (
    <ol className="timeline">
      {sorted.map((it) => (
        <li key={it.id} className={`timeline-item timeline-${it.kind}`}>
          <span className="timeline-dot" aria-hidden><Icon name={TIMELINE_ICON[it.kind]} size="xs" /></span>
          <div className="timeline-content">
            <div className="row-between wrap timeline-head">
              <strong className="timeline-title">{it.title}</strong>
              <time className="xs muted mono" dateTime={it.at}>{formatDateTime(it.at, lang)}</time>
            </div>
            {it.body && <p className="small timeline-body">{it.body}</p>}
            {it.meta && <div className="xs muted">{it.meta}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
