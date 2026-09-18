/**
 * The messaging seam: every page that sends a WhatsApp, an email or writes a staff note goes through
 * `useMessaging()`, and every list of conversations (S-06 inbox, the top-bar bell, the S-01 card) comes from
 * `useConversations()` / `useUnreadInbound()`. Today it writes `message_log` rows through the data provider
 * (simulated delivery: sent, or queued during quiet hours); the WhatsApp Cloud API and the email provider
 * plug in here — inbound webhooks insert `direction = inbound` rows and the pages need no change.
 */
import { useCallback, useMemo } from 'react';
import { useData, useTable } from './DataContext';
import type { MessageChannel, MessageLogRow, MessageSource } from './schema';
import { useSession } from '../auth/SessionProvider';
import { useI18n } from '../i18n/I18nProvider';
import { ROLE_LABEL, type Role } from '../auth/roles';
import type { ConversationSummary } from '../components/organism/ConversationList/ConversationList';
import { messageAt } from '../components/organism/MessageThread/MessageThread';
import type { ComposerMessage } from '../components/molecule/MessageComposer/MessageComposer';
import { inQuietHours, useSettings } from '../modules/admin/settings';
import { useAudit, type AuditSource } from '../modules/staff/audit';
import { usePeople, type Person } from '../modules/staff/people';

export interface SendInput { userId: string; text: string; templateKey?: string; source?: MessageSource; payload?: Record<string, unknown> }
export interface SendEmailInput extends SendInput { subject: string }

/** Rows a customer inbox shows: attached to a person and not a template test send from M-04/M-05. */
export const isConversationRow = (m: MessageLogRow) => !!m.user_id && m.payload?.test !== true;

export function useMessaging(auditSource: AuditSource = 'front_desk') {
  const data = useData();
  const { user } = useSession();
  const { settings } = useSettings();
  const audit = useAudit(auditSource);

  const send = useCallback(async (channel: Extract<MessageChannel, 'whatsapp' | 'email'>, input: SendInput & { subject?: string }) => {
    const now = new Date();
    // Quiet hours hold WhatsApp (Meta marketing/utility rules and the studio's own courtesy); email has no such window.
    const hold = channel === 'whatsapp' && inQuietHours(now, settings.quietHours);
    const row = await data.insert<MessageLogRow>('message_log', {
      user_id: input.userId, channel, direction: 'outbound', source: input.source ?? 'manual',
      template_key: input.templateKey ?? null, automation_id: null, subject: input.subject ?? null, body: input.text.trim(),
      status: hold ? 'queued' : 'sent', sent_at: hold ? null : now.toISOString(), sent_by: user.id,
      read_at: null, read_by: null, external_id: null, payload: input.payload ?? null,
    });
    await audit('member.message', 'message_log', row.id, { channel, user_id: input.userId, source: row.source, status: row.status });
    return row;
  }, [data, user.id, settings.quietHours, audit]);

  const sendWhatsApp = useCallback((input: SendInput) => send('whatsapp', input), [send]);
  const sendEmail = useCallback((input: SendEmailInput) => send('email', input), [send]);

  /** Internal note on the member's thread: never delivered, never visible to the member. */
  const addNote = useCallback(async ({ userId, text }: { userId: string; text: string }) => {
    const now = new Date().toISOString();
    const row = await data.insert<MessageLogRow>('message_log', {
      user_id: userId, channel: 'note', direction: 'internal', source: 'manual', template_key: null, automation_id: null,
      subject: null, body: text.trim(), status: 'sent', sent_at: now, sent_by: user.id, read_at: null, read_by: null, external_id: null, payload: null,
    });
    // The audit trail records that a note was written, not its content (the note lives on the thread).
    await audit('member.note', 'message_log', row.id, { user_id: userId });
    return row;
  }, [data, user.id, audit]);

  /** Staff read receipt: every unread inbound row of this person gets read_at / read_by now. */
  const markConversationRead = useCallback(async (userId: string) => {
    const rows = await data.list<MessageLogRow>('message_log', { where: { user_id: userId, direction: 'inbound' } });
    const now = new Date().toISOString();
    await Promise.all(rows.filter((m) => !m.read_at).map((m) => data.update<MessageLogRow>('message_log', m.id, { read_at: now, read_by: user.id })));
  }, [data, user.id]);

  /** What MessageComposer hands back → the right write for its channel. */
  const sendComposed = useCallback((userId: string, m: ComposerMessage) => (
    m.channel === 'note' ? addNote({ userId, text: m.text })
      : m.channel === 'email' ? sendEmail({ userId, subject: m.subject ?? '', text: m.text })
        : sendWhatsApp({ userId, text: m.text })
  ), [addNote, sendEmail, sendWhatsApp]);

  /** The hour quiet hours end, only while they are on (the composer's queue hint). */
  const quietUntil = inQuietHours(new Date(), settings.quietHours) ? settings.quietHours.to : undefined;

  return { sendWhatsApp, sendEmail, addNote, sendComposed, markConversationRead, quietUntil };
}

/** One person's thread as the inbox lists it. */
export interface Conversation {
  userId: string;
  person: Person | undefined;
  messages: MessageLogRow[];
  lastMessage: MessageLogRow;
  lastAt: string;
  /** Inbound rows without a staff read receipt. */
  unread: number;
  channels: MessageChannel[];
}

/** Every customer thread, newest activity first, with its unread count. */
export function useConversations(): { conversations: Conversation[]; loading: boolean } {
  const { rows, loading } = useTable<MessageLogRow>('message_log');
  const { byId } = usePeople();
  const conversations = useMemo(() => {
    const groups = new Map<string, MessageLogRow[]>();
    for (const m of rows) {
      if (!isConversationRow(m)) continue;
      const list = groups.get(m.user_id!) ?? [];
      list.push(m);
      groups.set(m.user_id!, list);
    }
    return [...groups.entries()].map<Conversation>(([userId, list]) => {
      const messages = [...list].sort((a, b) => messageAt(a).localeCompare(messageAt(b)));
      const lastMessage = messages[messages.length - 1];
      return {
        userId, person: byId.get(userId), messages, lastMessage, lastAt: messageAt(lastMessage),
        unread: messages.filter((m) => m.direction === 'inbound' && !m.read_at).length,
        channels: [...new Set(messages.map((m) => m.channel))],
      };
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [rows, byId]);
  return { conversations, loading };
}

/** What the bell shows: how many inbound messages nobody has read, and the threads they belong to (newest first). */
export function useUnreadInbound(): { count: number; conversations: Conversation[] } {
  const { conversations } = useConversations();
  return useMemo(() => {
    const unread = conversations.filter((c) => c.unread > 0);
    return { count: unread.reduce((a, c) => a + c.unread, 0), conversations: unread };
  }, [conversations]);
}

/** "Camilo Duque · Recepción": the byline of a staff-written row, resolved from users × roles. */
export function useAuthorOf(): (userId: string | null) => string | undefined {
  const { byId } = usePeople();
  const { bi } = useI18n();
  return useCallback((userId) => {
    const p = userId ? byId.get(userId) : undefined;
    if (!p) return undefined;
    const role = ROLE_LABEL[p.role as Role];
    return role ? `${p.name} · ${bi(role)}` : p.name;
  }, [byId, bi]);
}

/** A conversation as ConversationList / InboxPopover rows want it. */
export function toSummary(c: Conversation): ConversationSummary {
  const m = c.lastMessage;
  return {
    key: c.userId, name: c.person?.name ?? c.userId, initials: c.person?.initials,
    snippet: (m.channel === 'email' && m.subject) || m.body || m.template_key || '', lastAt: c.lastAt, unread: c.unread,
    channel: m.channel, channels: c.channels, searchText: `${c.person?.phone ?? ''} ${c.person?.email ?? ''}`,
  };
}
