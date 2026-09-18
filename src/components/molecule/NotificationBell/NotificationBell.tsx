import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import './NotificationBell.css';

export interface NotificationBellProps {
  /** Unread count; 0 renders the plain bell. */
  count: number;
  /** Where the bell goes when clicked (the message log). */
  to?: string;
  onClick?: () => void;
  /** Cap the printed number. */
  max?: number;
  /** When the bell toggles a panel (InboxPopover): aria-expanded / aria-controls. */
  expanded?: boolean;
  controls?: string;
}

/** Bell with an unread badge. Count comes from the caller (unread inbound message_log rows, useUnreadInbound()). */
export function NotificationBell({ count, to, onClick, max = 9, expanded, controls }: NotificationBellProps) {
  const { t } = useI18n();
  const label = `${t('core.notifications.label')} · ${count > 0 ? t('core.notifications.count', { n: count }) : t('core.notifications.none')}`;
  const inner = (
    <>
      <span className="bell-glyph" aria-hidden>✽</span>
      {count > 0 && <span className="bell-badge" aria-hidden>{count > max ? `${max}+` : count}</span>}
    </>
  );
  if (to) return <Link to={to} className={`bell ${count > 0 ? 'has-unread' : ''}`} aria-label={label} title={label}>{inner}</Link>;
  return <button type="button" className={`bell ${count > 0 ? 'has-unread' : ''}`} aria-label={label} title={label} onClick={onClick} aria-expanded={expanded} aria-controls={expanded ? controls : undefined} aria-haspopup={controls ? 'dialog' : undefined}>{inner}</button>;
}
