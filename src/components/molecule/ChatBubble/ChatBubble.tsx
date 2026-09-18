import { useI18n } from '../../../i18n/I18nProvider';
import { formatTime } from '../../../i18n/format';
import type { MessageChannel, MessageDirection, MessageSource, MessageStatus } from '../../../data/schema';
import { Badge, toneForStatus } from '../../atom/Badge/Badge';
import './ChatBubble.css';

export interface ChatBubbleProps {
  direction: MessageDirection;
  channel: MessageChannel;
  text: string | null;
  /** Email subject / newsletter title: renders the message as a card with a headline. */
  subject?: string | null;
  status?: MessageStatus;
  /** Who wrote it: "Camilo Duque · Recepción" for staff, the member's name for inbound; automations pass nothing. */
  author?: string;
  at: string;
  source?: MessageSource;
  /** Inbound row nobody on the team has read yet. */
  unread?: boolean;
}

export const CHANNEL_GLYPH: Record<MessageChannel, string> = { whatsapp: '☏', email: '✉', push: '◉', note: '✎' };

/**
 * One message in a conversation. WhatsApp and push rows are chat bubbles (member on the left, studio on the
 * right); emails are cards with a subject line and a source badge (Newsletter / Automático / Manual); internal
 * notes are a yellow card the member never sees. Status comes from the row (sent · delivered · read · failed).
 */
export function ChatBubble({ direction, channel, text, subject, status, author, at, source = 'manual', unread = false }: ChatBubbleProps) {
  const { t, lang } = useI18n();
  const kind = direction === 'internal' || channel === 'note' ? 'note' : channel === 'email' ? 'email' : 'chat';
  const side = direction === 'inbound' ? 'in' : 'out';
  const time = <time className="chatbubble-time" dateTime={at}>{formatTime(at, lang)}</time>;
  const who = author ?? (source !== 'manual' ? t(`core.msg.source.${source}`) : undefined);
  // Outbound only, and only when the state says more than "it went out": delivered, queued, failed.
  const showStatus = direction === 'outbound' && status && status !== 'sent' && status !== 'read' ? status : undefined;
  const statusBadge = showStatus && <Badge tone={toneForStatus(showStatus)} className="chatbubble-status">{t(`core.msg.status.${showStatus}`)}</Badge>;

  if (kind === 'note') {
    return (
      <article className="chatbubble chatbubble-note" aria-label={t('core.msg.note')}>
        <header className="chatbubble-head"><span className="chatbubble-glyph" aria-hidden>{CHANNEL_GLYPH.note}</span><strong>{t('core.msg.note')}</strong>{who && <span className="chatbubble-who">· {who}</span>}{time}</header>
        <p className="chatbubble-text">{text}</p>
      </article>
    );
  }
  if (kind === 'email') {
    return (
      <article className={`chatbubble chatbubble-email chatbubble-${side} ${unread ? 'is-unread' : ''}`}>
        <header className="chatbubble-head">
          <span className="chatbubble-glyph" aria-hidden>{CHANNEL_GLYPH.email}</span>
          <span className="chatbubble-who">{author ?? t('core.msg.channel.email')}</span>
          {source !== 'manual' && <Badge tone={source === 'newsletter' ? 'highlight' : 'neutral'}>{t(`core.msg.source.${source}`)}</Badge>}
          {unread && <Badge tone="primary">{t('core.msg.status.received')}</Badge>}
          {time}
        </header>
        {subject && <h4 className="chatbubble-subject">{subject}</h4>}
        {text && <p className="chatbubble-text">{text}</p>}
        {statusBadge && <footer className="chatbubble-foot">{statusBadge}</footer>}
      </article>
    );
  }
  return (
    <div className={`chatbubble chatbubble-chat chatbubble-${side} ${unread ? 'is-unread' : ''} ${source !== 'manual' ? 'is-auto' : ''}`}>
      {who && side === 'out' && <div className="chatbubble-who xs">{who}</div>}
      <div className="chatbubble-body">
        <p className="chatbubble-text">{text}</p>
        <span className="chatbubble-meta"><span className="chatbubble-glyph" aria-hidden>{CHANNEL_GLYPH[channel]}</span>{time}{statusBadge}</span>
      </div>
    </div>
  );
}
