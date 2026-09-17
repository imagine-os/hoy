import { useI18n } from '../../../i18n/I18nProvider';
import { formatTime } from '../../../i18n/format';
import type { Movement } from '../../../design/tokens';
import { CapacityMeter } from '../CapacityMeter/CapacityMeter';
import { Badge } from '../../atom/Badge/Badge';
import './ClassRow.css';

export interface ClassRowProps {
  title: string;
  teacher: string;
  startsAt: string;
  durationMin: number;
  movement: Movement;
  booked: number;
  capacity: number;
  status?: 'scheduled' | 'cancelled' | 'completed';
  booked_by_me?: boolean;
  onClick?: () => void;
}

/** Dense one-line class entry for lists (today, schedule day, check-in). */
export function ClassRow({ title, teacher, startsAt, durationMin, movement, booked, capacity, status = 'scheduled', booked_by_me, onClick }: ClassRowProps) {
  const { lang, t } = useI18n();
  const Tag = onClick ? 'button' : 'div';
  // No spots left: the row states it as a pill and the capacity meter gives way to it (nothing left to meter).
  const full = status === 'scheduled' && booked >= capacity;
  return (
    <Tag className={`classrow classrow-${status} ${full ? 'is-full' : ''} ${onClick ? 'is-clickable' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className={`classrow-dot mv-${movement}`} aria-hidden />
      <div className="classrow-time"><strong>{formatTime(startsAt, lang)}</strong><span className="xs muted">{t('core.common.min', { n: durationMin })}</span></div>
      <div className="grow">
        <div className="row"><span className="classrow-title">{title}</span>{booked_by_me && <Badge tone="primary">{t('core.status.booked')}</Badge>}{status === 'cancelled' && <Badge tone="danger">{t('core.status.cancelled')}</Badge>}</div>
        <div className="muted small">{teacher}</div>
      </div>
      {status === 'scheduled' && (full ? <Badge tone="danger" className="classrow-full">{t('core.common.full')}</Badge> : <CapacityMeter booked={booked} capacity={capacity} compact />)}
    </Tag>
  );
}
