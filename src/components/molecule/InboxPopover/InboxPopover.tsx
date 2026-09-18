import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatRelative } from '../../../i18n/format';
import { Avatar } from '../../atom/Avatar/Avatar';
import { Badge } from '../../atom/Badge/Badge';
import { NotificationBell } from '../NotificationBell/NotificationBell';
import './InboxPopover.css';

export interface InboxPopoverItem { key: string; name: string; initials?: string; snippet: string; lastAt: string; unread: number }

export interface InboxPopoverProps {
  /** Total unread inbound messages (the bell badge). */
  count: number;
  /** Unread threads, newest first; the panel lists the first `max`. */
  items: InboxPopoverItem[];
  itemTo: (key: string) => string;
  inboxTo: string;
  max?: number;
}

/**
 * The top-bar bell with a panel: up to five unread conversations (avatar, name, snippet, relative time, count)
 * each linking to its thread, and "Ver bandeja" to the inbox. Closes on Escape, outside click and navigation.
 */
export function InboxPopover({ count, items, itemTo, inboxTo, max = 5 }: InboxPopoverProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [open]);

  const shown = items.slice(0, max);
  return (
    <div ref={wrap} className="inboxpop">
      <NotificationBell count={count} onClick={() => setOpen((o) => !o)} expanded={open} controls={panelId} />
      {open && (
        <div id={panelId} className="inboxpop-panel" role="dialog" aria-label={t('core.notifications.title')}>
          <div className="inboxpop-head"><span className="eyebrow">{t('core.notifications.title')}</span>{count > 0 && <Badge tone="primary">{count}</Badge>}</div>
          {shown.length === 0 && <p className="inboxpop-empty small muted">{t('core.notifications.empty')}</p>}
          {shown.map((it) => (
            <Link key={it.key} to={itemTo(it.key)} className="inboxpop-item">
              <Avatar name={it.name} initials={it.initials} size={32} />
              <span className="inboxpop-main">
                <span className="inboxpop-top"><span className="inboxpop-name">{it.name}</span><time className="xs muted" dateTime={it.lastAt}>{formatRelative(it.lastAt, lang)}</time></span>
                <span className="inboxpop-snippet">{it.snippet}</span>
              </span>
              {it.unread > 1 && <Badge tone="primary">{it.unread}</Badge>}
            </Link>
          ))}
          {items.length > shown.length && <p className="inboxpop-more xs muted">{t('core.notifications.more', { n: items.length - shown.length })}</p>}
          <Link to={inboxTo} className="inboxpop-foot small">{t('core.notifications.viewInbox')} →</Link>
        </div>
      )}
    </div>
  );
}
