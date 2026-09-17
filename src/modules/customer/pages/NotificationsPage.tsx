import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import type { NotificationRow } from '../../../data/schema';
import { formatDate, formatTime, isSameDay } from '../../../i18n/format';
import { Button } from '../../../components/atom/Button/Button';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { SegmentedControl } from '../../../components/molecule/SegmentedControl/SegmentedControl';
import { NOTIF_CATEGORIES, NOTIF_CHANNELS, useMyNotifications, useNotificationPrefs, type NotifChannel } from '../hooks';
import { PageHead } from '../ui';

const ICON: Record<NotificationRow['kind'], string> = { booking: '◔', waitlist: '≡', payment: '$', class: '▦', event: '✦', review: '☆', invite: '✉', studio: '◎' };

/** C-24 Notifications — the `notifications` table is the inbox; `notification_prefs` is the mute switchboard. */
export function NotificationsPage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const { rows, loading, unread, markRead, markAllRead } = useMyNotifications();
  const prefs = useNotificationPrefs();
  const [channel, setChannel] = useState<NotifChannel>('whatsapp');

  const open = async (n: NotificationRow) => { await markRead(n); if (n.deep_link) nav(n.deep_link); };
  const today = rows.filter((n) => isSameDay(n.created_at, new Date()));
  const earlier = rows.filter((n) => !isSameDay(n.created_at, new Date()));

  const group = (list: NotificationRow[], title: string) => list.length === 0 ? null : (
    <ListGroup title={title}>
      {list.map((n) => (
        <ListRow key={n.id}
          icon={<span className={n.read_at ? '' : 'cust-unread'}>{ICON[n.kind] ?? '▣'}</span>}
          title={<span style={{ fontWeight: n.read_at ? 'var(--fw-regular)' : 'var(--fw-semibold)' }}>{bi(n.title)}</span>}
          subtitle={`${bi(n.body)} · ${t(`customer.notifications.via.${n.sent_via}`)} · ${isSameDay(n.created_at, new Date()) ? formatTime(n.created_at, lang) : formatDate(n.created_at, lang)}`}
          trailing={n.deep_link ? <Button size="sm" variant="secondary" onClick={() => { void open(n); }}>{t('customer.notifications.open')}</Button> : undefined}
          onClick={() => { void open(n); }} />
      ))}
    </ListGroup>
  );

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.notifications.title')} sub={unread > 0 ? t('customer.notifications.unread', { n: unread }) : undefined}
        actions={unread > 0 ? <Button size="sm" variant="ghost" onClick={() => { void markAllRead(); }}>{t('customer.notifications.markAll')}</Button> : undefined} />
      <div className="stack">
        {loading && rows.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && rows.length === 0 && <EmptyState icon="▣" title={t('customer.notifications.empty')} body={t('customer.notifications.empty.body')} />}
        {group(today, t('customer.notifications.today'))}
        {group(earlier, t('customer.notifications.earlier'))}

        <section className="stack-sm">
          <div><h2 className="cust-h2">{t('customer.notifications.prefs.title')}</h2><p className="small muted">{t('customer.notifications.prefs.sub')}</p></div>
          <SegmentedControl block ariaLabel={t('customer.notifications.prefs.title')} value={channel} onChange={setChannel}
            options={NOTIF_CHANNELS.map((c) => ({ value: c, label: t(`customer.notifications.channel.${c}`) }))} />
          <ListGroup>
            {NOTIF_CATEGORIES.map((cat) => (
              <ListRow key={cat} icon={cat === 'marketing' ? '✧' : '✓'} title={t(`customer.notifications.cat.${cat}`)} subtitle={t(`customer.notifications.cat.${cat}.sub`)}
                trailing={<Toggle size="sm" label="" checked={prefs.isEnabled(channel, cat)} onChange={(v) => { void prefs.set(channel, cat, v); }} />} />
            ))}
          </ListGroup>
          <p className="xs muted">{t('customer.notifications.prefs.note')}</p>
        </section>

        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.notifications.retention')}</p>
      </div>
    </div>
  );
}
