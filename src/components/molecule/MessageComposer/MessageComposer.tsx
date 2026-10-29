import { useState, type KeyboardEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageChannel } from '../../../data/schema';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl';
import { Input } from '../../atom/Input/Input';
import { Button } from '../../atom/Button/Button';
import './MessageComposer.css';
import { LIMITS } from '../../../shared/limits';
import { PRODUCTION_BUILD } from '../../../config/launch';

export type ComposerChannel = Extract<MessageChannel, 'whatsapp' | 'email' | 'note'>;
export interface ComposerMessage { channel: ComposerChannel; subject?: string; text: string }

export interface MessageComposerProps {
  onSend: (m: ComposerMessage) => Promise<unknown> | void;
  /** Channels offered; default WhatsApp · Email · Nota. */
  channels?: ComposerChannel[];
  defaultChannel?: ComposerChannel;
  /** WhatsApp cannot be sent (number unverified): the tab stays but the box is disabled with this hint. */
  whatsappBlocked?: string;
  /** Quiet hours are on: the WhatsApp tab shows the queue hint (`{to}` is the hour they end). */
  quietUntil?: string;
  /** The role may read but not write: everything disabled with the read-only hint. */
  readOnly?: boolean;
  /** Who is writing, shown next to the send button. */
  author?: string;
}

/**
 * The reply box under a conversation: pick WhatsApp / Email / Nota, write (subject too for email), send.
 * Ctrl+Enter sends. Clears itself after a successful send. Sending itself is the caller's job (useMessaging()).
 */
export function MessageComposer({ onSend, channels: offered = ['whatsapp', 'email', 'note'], defaultChannel, whatsappBlocked, quietUntil, readOnly = false, author }: MessageComposerProps) {
  const { t } = useI18n();
  // Production: no email channel from the staff composer at launch (sending by hand isn't wired; the launch emails are
  // automations, lane H-9). Without this the send fails and the draft is left behind.
  const channels = PRODUCTION_BUILD ? offered.filter((c) => c !== 'email') : offered;
  const [channel, setChannel] = useState<ComposerChannel>(defaultChannel && channels.includes(defaultChannel) ? defaultChannel : channels[0]);
  const [failed, setFailed] = useState(false);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const blocked = readOnly || (channel === 'whatsapp' && !!whatsappBlocked);
  const ready = !blocked && text.trim().length > 0 && (channel !== 'email' || subject.trim().length > 0);

  const send = async () => {
    if (!ready) return;
    setBusy(true); setFailed(false);
    try {
      await onSend({ channel, text: text.trim(), subject: channel === 'email' ? subject.trim() : undefined });
      setText(''); setSubject('');
    } catch {
      // A failed send keeps the draft and says so, instead of an unhandled rejection.
      setFailed(true);
    } finally { setBusy(false); }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send(); } };
  const hint = failed ? t('desk.compose.failed') : readOnly ? t('core.msg.compose.readonly') : channel === 'whatsapp' && whatsappBlocked ? whatsappBlocked : channel === 'whatsapp' && quietUntil ? t('core.msg.compose.quiet', { to: quietUntil }) : channel === 'note' ? t('core.msg.note.hint') : undefined;

  return (
    <div className={`composer composer-${channel} ${blocked ? 'is-blocked' : ''}`}>
      <div className="composer-top">
        <SegmentedControl size="sm" ariaLabel={t('core.msg.compose.channel')} value={channel} onChange={setChannel} options={channels.map((c) => ({ value: c, label: t(`core.msg.channel.${c}`) }))} />
        {hint && <p role={failed ? 'alert' : undefined} className={`composer-hint xs ${failed || (channel === 'whatsapp' && whatsappBlocked && !readOnly) ? 'is-warn' : 'muted'}`}>{hint}</p>}
      </div>
      {channel === 'email' && <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('core.msg.compose.subject')} aria-label={t('core.msg.compose.subject')} disabled={blocked} />}
      <textarea
        className="input composer-text" rows={channel === 'email' ? 5 : 3} maxLength={LIMITS.message} value={text} disabled={blocked}
        placeholder={t(`core.msg.compose.ph.${channel}`)} aria-label={t(`core.msg.channel.${channel}`)}
        onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
      />
      <div className="composer-foot">
        <span className="xs muted composer-author">{author}{author ? ' · ' : ''}<kbd className="composer-kbd">{t('core.msg.compose.kbd')}</kbd></span>
        <Button size="sm" disabled={!ready} loading={busy} onClick={() => void send()}>{channel === 'note' ? t('core.msg.compose.saveNote') : t('core.msg.compose.send')}</Button>
      </div>
    </div>
  );
}
