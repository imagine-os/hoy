import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTable } from '../../../data/DataContext';
import type { BaseRow } from '../../../data/schema';
import { formatDate, formatTime, isSameDay } from '../../../i18n/format';
import { Button } from '../../../components/atom/Button/Button';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useAllSessionsJoined, useLocalPref, useMyBookings, type WaitlistRow } from '../hooks';
import { PageHead } from '../ui';

interface MessageLogRow extends BaseRow { user_id: string | null; channel: string; template_key: string | null; status: string; sent_at: string | null }
interface Item { id: string; icon: string; title: string; sub: string; at: string; to?: string; action?: string }

/** C-24 Notifications inbox — derived from message_log, waitlist offers and upcoming bookings until a notifications table exists. */
export function NotificationsPage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const { rows: log } = useTable<MessageLogRow>('message_log', { where: { user_id: user.id } });
  const { rows: waits } = useTable<WaitlistRow>('waitlist', { where: { user_id: user.id } });
  const { rows: bookings } = useMyBookings();
  const all = useAllSessionsJoined();
  const [read, setRead] = useLocalPref<string[]>('notifications.read', []);

  const items = useMemo<Item[]>(() => {
    const now = Date.now();
    const out: Item[] = [];
    for (const m of log) out.push({ id: `msg_${m.id}`, icon: m.channel === 'whatsapp' ? '◎' : '✉', title: t(`customer.notifications.tpl.${m.template_key ?? 'generic'}`), sub: `${m.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · ${t(`customer.notifications.status.${m.status}`)}`, at: m.sent_at ?? m.created_at });
    for (const w of waits) {
      const j = all.find((x) => x.session.id === w.session_id); if (!j) continue;
      if (w.status === 'offered' && w.claim_until && new Date(w.claim_until).getTime() > now) out.push({ id: `wl_${w.id}`, icon: '★', title: t('customer.notifications.released', { title: j.session.title }), sub: t('customer.notifications.released.sub', { time: formatTime(w.claim_until, lang) }), at: w.offered_at ?? w.updated_at, to: `/app/waitlist/${w.session_id}`, action: t('customer.waitlist.claim') });
      else if (w.status === 'waiting') out.push({ id: `wl_${w.id}`, icon: '≡', title: t('customer.notifications.waiting', { title: j.session.title }), sub: `${formatDate(j.session.starts_at, lang)} · ${t('customer.notifications.waiting.sub', { n: w.position })}`, at: w.created_at, to: `/app/waitlist/${w.session_id}` });
    }
    for (const b of bookings) {
      const j = all.find((x) => x.session.id === b.session_id); if (!j) continue;
      const start = new Date(j.session.starts_at).getTime();
      if (b.status === 'booked' && start > now && start - now < 24 * 3.6e6) out.push({ id: `bk_${b.id}`, icon: '◔', title: t('customer.notifications.upcoming', { title: j.session.title, time: formatTime(j.session.starts_at, lang) }), sub: t('customer.notifications.upcoming.sub'), at: new Date(start - 24 * 3.6e6).toISOString(), to: `/app/booking/${b.id}` });
      if (b.status === 'booked' && j.session.status === 'cancelled') out.push({ id: `cx_${b.id}`, icon: '!', title: t('customer.notifications.cancelled', { title: j.session.title }), sub: t('customer.cancelled.refund.body'), at: j.session.updated_at, to: `/app/booking/${b.id}`, action: t('customer.cancelled.alternatives') });
      if (b.status === 'checked_in' && !b.rated && now - new Date(j.session.ends_at).getTime() < 7 * 864e5) out.push({ id: `rt_${b.id}`, icon: '☆', title: t('customer.notifications.rate', { title: j.session.title }), sub: formatDate(j.session.starts_at, lang), at: j.session.ends_at, to: `/app/rate/${j.session.id}`, action: t('customer.booked.rate') });
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [log, waits, bookings, all, t, lang]);

  const isRead = (id: string) => read.includes(id);
  const open = (it: Item) => { if (!isRead(it.id)) setRead((r) => [...r, it.id]); if (it.to) nav(it.to); };
  const today = items.filter((i) => isSameDay(i.at, new Date()));
  const earlier = items.filter((i) => !isSameDay(i.at, new Date()));
  const unread = items.filter((i) => !isRead(i.id)).length;

  const group = (list: Item[], title: string) => list.length === 0 ? null : (
    <ListGroup title={title}>
      {list.map((it) => <ListRow key={it.id} icon={<span className={isRead(it.id) ? '' : 'cust-unread'}>{it.icon}</span>} title={<span style={{ fontWeight: isRead(it.id) ? 'var(--fw-regular)' : 'var(--fw-semibold)' }}>{it.title}</span>} subtitle={`${it.sub} · ${isSameDay(it.at, new Date()) ? formatTime(it.at, lang) : formatDate(it.at, lang)}`} trailing={it.action ? <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); open(it); }}>{it.action}</Button> : undefined} onClick={() => open(it)} />)}
    </ListGroup>
  );

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.notifications.title')} sub={unread > 0 ? t('customer.notifications.unread', { n: unread }) : undefined} actions={items.length > 0 && unread > 0 ? <Button size="sm" variant="ghost" onClick={() => setRead(items.map((i) => i.id))}>{t('customer.notifications.markAll')}</Button> : undefined} />
      <div className="stack">
        {items.length === 0 && <EmptyState icon="▣" title={t('customer.notifications.empty')} body={t('customer.notifications.empty.body')} />}
        {group(today, t('customer.notifications.today'))}
        {group(earlier, t('customer.notifications.earlier'))}
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.notifications.retention')} · <Link to="/app/profile">{t('customer.notifications.prefs')} →</Link></p>
      </div>
    </div>
  );
}
