import { useEffect, useMemo, useRef } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatDate, formatTime, isSameDay, MS } from '../../../i18n/format';
import type { MessageLogRow } from '../../../data/schema';
import { ChatBubble } from '../../molecule/ChatBubble/ChatBubble';
import { TIMELINE_ICON, type TimelineKind } from '../Timeline/Timeline';
import './MessageThread.css';

/** A non-message event shown inline as a system line: a booking, a payment, a check-in, a consent. */
export interface ThreadEvent { id: string; at: string; kind: TimelineKind; title: string; meta?: string }

export interface MessageThreadProps {
  messages: MessageLogRow[];
  events?: ThreadEvent[];
  /** Resolves a staff user id to "Camilo Duque · Recepción"; the member's rows use `personName`. */
  authorOf?: (userId: string | null) => string | undefined;
  personName?: string;
  emptyText?: string;
  /** Scroll to the newest message when the list grows (chat convention). */
  autoScroll?: boolean;
  /** Fixed height with its own scroll (inbox pane) instead of growing with the page (CRM tab). */
  scroll?: boolean;
}

/** When a message happened: the moment it was sent or received, else when the row was written. */
export const messageAt = (m: Pick<MessageLogRow, 'sent_at' | 'created_at'>) => m.sent_at ?? m.created_at;

/**
 * One conversation, oldest at the top and newest at the bottom, with day separators (Hoy · Ayer · date) and
 * system events inline. Messages render as ChatBubble; the caller supplies the composer underneath.
 */
export function MessageThread({ messages, events = [], authorOf, personName, emptyText, autoScroll = true, scroll = false }: MessageThreadProps) {
  const { t, lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const items = useMemo(() => [
    ...messages.map((m) => ({ kind: 'message' as const, at: messageAt(m), id: m.id, m })),
    ...events.map((e) => ({ kind: 'event' as const, at: e.at, id: e.id, e })),
  ].sort((a, b) => a.at.localeCompare(b.at)), [messages, events]);
  const last = items[items.length - 1]?.id;
  useEffect(() => {
    if (!autoScroll || !box.current) return;
    if (scroll) box.current.scrollTop = box.current.scrollHeight;
    else box.current.lastElementChild?.scrollIntoView({ block: 'nearest' });
  }, [last, autoScroll, scroll]);

  if (items.length === 0) return <p className="small muted thread-empty">{emptyText ?? t('core.msg.thread.empty')}</p>;
  const now = new Date();
  const dayLabel = (iso: string) => isSameDay(iso, now) ? t('core.msg.today') : isSameDay(iso, new Date(now.getTime() - MS.day)) ? t('core.msg.yesterday') : formatDate(iso, lang, { weekday: 'long', day: 'numeric', month: 'long' });

  let prevDay = '';
  return (
    <div ref={box} className={`thread ${scroll ? 'is-scroll' : ''}`} role="log" aria-label={t('core.msg.thread.label')}>
      {items.map((it) => {
        const day = dateKey(new Date(it.at)); // local day, never the UTC slice: 8 p. m. in Bogotá is already tomorrow in UTC
        const sep = day !== prevDay ? <div key={`d-${day}`} className="thread-day"><span>{dayLabel(it.at)}</span></div> : null;
        prevDay = day;
        if (it.kind === 'event') {
          return [sep, (
            <div key={it.id} className={`thread-event thread-event-${it.e.kind}`}>
              <span className="thread-event-glyph" aria-hidden>{TIMELINE_ICON[it.e.kind]}</span>
              <span className="thread-event-title">{it.e.title}</span>
              {it.e.meta && <span className="thread-event-meta">· {it.e.meta}</span>}
              <time className="thread-event-time" dateTime={it.at}>{formatTime(it.at, lang)}</time>
            </div>
          )];
        }
        const m = it.m;
        const author = m.direction === 'inbound' ? personName : m.sent_by ? authorOf?.(m.sent_by) : undefined;
        return [sep, <ChatBubble key={m.id} direction={m.direction} channel={m.channel} text={m.body} subject={m.subject} status={m.status} source={m.source} at={it.at} author={author} unread={m.direction === 'inbound' && !m.read_at} />];
      })}
    </div>
  );
}
