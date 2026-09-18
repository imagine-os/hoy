import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatRelative } from '../../../i18n/format';
import type { MessageChannel } from '../../../data/schema';
import { Avatar } from '../../atom/Avatar/Avatar';
import { Badge } from '../../atom/Badge/Badge';
import { Chip } from '../../atom/Chip/Chip';
import { Input } from '../../atom/Input/Input';
import { EmptyState } from '../../molecule/EmptyState/EmptyState';
import { CHANNEL_GLYPH } from '../../molecule/ChatBubble/ChatBubble';
import './ConversationList.css';

/** One row of the inbox: the person and their latest message. */
export interface ConversationSummary {
  key: string;
  name: string;
  initials?: string;
  /** Latest message text (or subject), one line. */
  snippet: string;
  lastAt: string;
  unread: number;
  /** Channel of the latest message. */
  channel: MessageChannel;
  /** Every channel the thread has used. */
  channels?: MessageChannel[];
  /** Extra text the search matches (phone, email). */
  searchText?: string;
}

export type ConversationFilter = 'all' | 'unread' | 'whatsapp' | 'email';

export interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedKey?: string;
  /** Row target; rows render as links so the URL is the selection. */
  linkTo: (key: string) => string;
  /** Hide the search and filter bar (compact embeds). */
  compact?: boolean;
  /** Show at most this many rows. */
  limit?: number;
}

const FILTERS: ConversationFilter[] = ['all', 'unread', 'whatsapp', 'email'];

/**
 * The left pane of the inbox: search, filters (Todos · No leídos · WhatsApp · Email) and one row per person
 * with avatar, name, last message, relative time, channel glyph and the unread count. Unread threads come first.
 */
export function ConversationList({ conversations, selectedKey, linkTo, compact = false, limit }: ConversationListProps) {
  const { t, lang } = useI18n();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return conversations
      .filter((c) => filter === 'all' || (filter === 'unread' ? c.unread > 0 : (c.channels ?? [c.channel]).includes(filter)))
      .filter((c) => !needle || `${c.name} ${c.snippet} ${c.searchText ?? ''}`.toLowerCase().includes(needle))
      .sort((a, b) => (Number(b.unread > 0) - Number(a.unread > 0)) || b.lastAt.localeCompare(a.lastAt))
      .slice(0, limit ?? conversations.length);
  }, [conversations, q, filter, limit]);
  const unreadTotal = conversations.reduce((a, c) => a + c.unread, 0);

  return (
    <div className={`convlist ${compact ? 'is-compact' : ''}`}>
      {!compact && (
        <div className="convlist-tools">
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('core.msg.list.search')} aria-label={t('core.msg.list.search')} />
          <div className="row wrap convlist-filters" role="tablist" aria-label={t('core.msg.list.label')}>
            {FILTERS.map((f) => <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{f === 'whatsapp' || f === 'email' ? t(`core.msg.channel.${f}`) : t(`core.msg.list.filter.${f}`)}{f === 'unread' && unreadTotal > 0 ? ` · ${unreadTotal}` : ''}</Chip>)}
          </div>
        </div>
      )}
      {conversations.length === 0 && <EmptyState compact title={t('core.msg.list.empty')} body={t('core.msg.list.empty.body')} />}
      {conversations.length > 0 && rows.length === 0 && <p className="small muted convlist-nomatch">{t('core.msg.list.noMatch')}</p>}
      {rows.length > 0 && (
        <ul className="convlist-rows" aria-label={t('core.msg.list.label')}>
          {rows.map((c) => (
            <li key={c.key}>
              <Link to={linkTo(c.key)} className={`convrow ${c.key === selectedKey ? 'is-selected' : ''} ${c.unread > 0 ? 'is-unread' : ''}`} aria-current={c.key === selectedKey ? 'page' : undefined}>
                <Avatar name={c.name} initials={c.initials} size={40} />
                <span className="convrow-main">
                  <span className="convrow-top"><span className="convrow-name">{c.name}</span><time className="convrow-time xs" dateTime={c.lastAt}>{formatRelative(c.lastAt, lang)}</time></span>
                  <span className="convrow-bottom"><span className="convrow-glyph" aria-hidden>{CHANNEL_GLYPH[c.channel]}</span><span className="convrow-snippet">{c.snippet}</span>{c.unread > 0 && <Badge tone="primary" className="convrow-badge">{c.unread}</Badge>}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
