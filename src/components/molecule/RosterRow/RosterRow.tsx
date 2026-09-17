import type { ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Avatar } from '../../atom/Avatar/Avatar';
import { Badge, toneForStatus } from '../../atom/Badge/Badge';
import './RosterRow.css';

export type RosterStatus = 'booked' | 'checked_in' | 'no_show' | 'late_cancel' | 'cancelled' | 'waiting';

export interface RosterRowProps {
  name: string;
  initials?: string;
  phone?: string | null;
  /** Plan or how the spot was paid (membership, credit, single…). */
  plan?: string;
  status: RosterStatus;
  /** Arrived after the grace window. */
  late?: boolean;
  /** Discreet marker for the teacher (health flag, note). */
  flag?: string;
  /** Right-hand time (check-in time, position in waitlist…). */
  time?: string;
  actions?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

const LABEL: Record<RosterStatus, { es: string; en: string }> = {
  booked: { es: 'Esperado', en: 'Expected' },
  checked_in: { es: 'Llegó', en: 'Checked in' },
  no_show: { es: 'No vino', en: 'No-show' },
  late_cancel: { es: 'Canceló tarde', en: 'Late cancel' },
  cancelled: { es: 'Cancelada', en: 'Cancelled' },
  waiting: { es: 'En espera', en: 'Waiting' },
};

/** One person on a class roster: identity, how they paid, arrival state and the desk actions. */
export function RosterRow({ name, initials, phone, plan, status, late, flag, time, actions, selected, onClick }: RosterRowProps) {
  const { t, bi } = useI18n();
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`rosterrow rosterrow-${status} ${selected ? 'is-selected' : ''} ${onClick ? 'is-clickable' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <Avatar name={name} initials={initials} size={34} />
      <div className="grow rosterrow-id">
        <div className="row wrap rosterrow-name">
          <strong>{name}</strong>
          {flag && <span className="rosterrow-flag" title={flag} aria-label={flag}>⚑</span>}
        </div>
        <div className="xs muted rosterrow-sub">{[phone, plan].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="rosterrow-state">
        <Badge tone={toneForStatus(status)}>{bi(LABEL[status])}</Badge>
        {late && <Badge tone="warn">{t('core.status.late')}</Badge>}
        {time && <span className="xs muted mono">{time}</span>}
      </div>
      {actions && <div className="rosterrow-actions" onClick={(e) => e.stopPropagation()}>{actions}</div>}
    </Tag>
  );
}
