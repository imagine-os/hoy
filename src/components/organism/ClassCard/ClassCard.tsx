import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatDate, formatTime, MS } from '../../../i18n/format';
import type { Movement } from '../../../design/tokens';
import { Card } from '../../molecule/Card/Card';
import { Chip } from '../../atom/Chip/Chip';
import { Button } from '../../atom/Button/Button';
import { CapacityMeter } from '../../molecule/CapacityMeter/CapacityMeter';
import './ClassCard.css';

export interface ClassCardProps {
  title: string; teacher: string; room?: string; startsAt: string; endsAt: string; movement: Movement;
  booked: number; capacity: number; level?: string;
  variant?: 'next' | 'default';
  cta?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
  onClick?: () => void;
}

function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const ms = new Date(iso).getTime() - now;
  return { ms, h: Math.floor(ms / MS.hour), m: Math.max(0, Math.floor((ms % MS.hour) / MS.min)) };
}

/** Rich class card; `variant="next"` is the NextClassCard with countdown (under 24h) or weekday. */
export function ClassCard({ title, teacher, room, startsAt, endsAt, movement, booked, capacity, level, variant = 'default', cta, onClick }: ClassCardProps) {
  const { lang } = useI18n();
  const cd = useCountdown(startsAt);
  const isNext = variant === 'next';
  const when = cd.ms > 0 && cd.ms < 24 * MS.hour
    ? (lang === 'es' ? `en ${cd.h > 0 ? `${cd.h} h ` : ''}${cd.m} min` : `in ${cd.h > 0 ? `${cd.h} h ` : ''}${cd.m} min`)
    : formatDate(startsAt, lang);
  return (
    <Card tone={isNext ? 'primary' : 'surface'} interactive={!!onClick} onClick={onClick} className={`classcard ${isNext ? 'is-next' : ''}`} padding="md">
      <div className="row-between">
        <Chip movement={movement} dot>{title}</Chip>
        {isNext && <span className="classcard-when">{when}</span>}
      </div>
      <div className="classcard-main">
        <div className="classcard-time">{formatTime(startsAt, lang)}<span className="classcard-end"> – {formatTime(endsAt, lang)}</span></div>
        <div className="classcard-meta">{teacher}{room ? ` · ${room}` : ''}{level && level !== 'all' ? ` · ${level}` : ''}</div>
        {!isNext && <div className="classcard-date muted small">{formatDate(startsAt, lang)}</div>}
      </div>
      <div className="row-between wrap">
        <CapacityMeter booked={booked} capacity={capacity} />
        {cta && <Button size="sm" variant={cta.variant ?? (isNext ? 'secondary' : 'primary')} onClick={(e) => { e.stopPropagation(); cta.onClick(); }}>{cta.label}</Button>}
      </div>
    </Card>
  );
}
