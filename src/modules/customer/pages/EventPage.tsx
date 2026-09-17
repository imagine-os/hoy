import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { TeacherRow } from '../../../data/schema';
import { formatCOP, formatDate, formatTime } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { CapacityMeter } from '../../../components/molecule/CapacityMeter/CapacityMeter';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useEntitlements, useEventRsvp, useEvents } from '../hooks';
import { recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { MediaPlaceholder, PageHead, downloadIcs } from '../ui';

/** C-23 Events list — rows from the `events` table (published only), with live RSVP counts. */
export function EventsListPage() {
  const { t, bi, lang } = useI18n();
  const { events, loading } = useEvents();
  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.events.title')} sub={t('customer.events.sub')} />
      <div className="stack">
        {loading && events.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && events.length === 0 && <EmptyState icon="✦" title={t('customer.events.empty')} body={t('customer.events.empty.body')} />}
        {events.length > 0 && (
          <ListGroup>
            {events.map(({ event: e, taken, mine }) => (
              <ListRow key={e.id} icon="✦" title={bi(e.title)}
                subtitle={`${formatDate(e.starts_at, lang, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(e.starts_at, lang)} · ${bi(e.kind)}`}
                trailing={mine ? <Badge tone="success">{t('customer.events.going')}</Badge> : <span className="small muted">{Math.max(0, e.capacity - taken)} {t('customer.events.spots')}</span>}
                to={`/app/events/${e.id}`} />
            ))}
          </ListGroup>
        )}
      </div>
    </div>
  );
}

/** C-23 Event detail & RSVP — `event_rsvps` row, paid through the same Wompi seam as a class. */
export function EventPage() {
  const { id } = useParams();
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const ent = useEntitlements();
  const { events } = useEvents();
  const { going, cancel } = useEventRsvp();
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const [busy, setBusy] = useState(false);
  const entry = events.find((x) => x.event.id === id || x.event.slug === id);
  if (!entry) return <div className="container page cust-page"><PageHead back="/app/events" title={t('customer.events.notFound')} /><EmptyState title={t('customer.events.notFound')} action={<Link to="/app/events"><Button>{t('customer.events.title')}</Button></Link>} /></div>;

  const ev = entry.event;
  const host = teachers.find((x) => x.id === ev.host_teacher_id);
  const mine = entry.mine;
  const isMember = ent.membership?.status === 'active';
  const amount = isMember ? ev.member_price_cop : ev.price_cop;
  const memberIncluded = ev.member_price_cop === 0;
  const soldOut = entry.taken >= ev.capacity && !mine;
  const durationMin = Math.round((new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime()) / 6e4);

  const reserve = async () => {
    setBusy(true);
    try {
      let paymentId: string | null = null;
      if (amount > 0) {
        const result = await wompiCheckout({ amount, method: 'card' }); // INTEGRATION SEAM: Wompi
        const payment = await recordPayment(data, { userId: user.id, planId: null, amount, method: 'card', result, ivaRate: policy.ivaRate });
        if (result.status !== 'approved') return;
        paymentId = payment.id;
      }
      await going(ev, paymentId);
    } finally { setBusy(false); }
  };

  return (
    <div className="container page cust-page cust-has-sticky">
      <PageHead back="/app/events" title={<span className="sr-only">{bi(ev.title)}</span>} />
      <div className="stack">
        <MediaPlaceholder slotKey="event.cover" label={t('customer.events.photo')} ratio="4 / 5" movement="libera" />
        <div className="stack-sm">
          <span className="eyebrow">{formatDate(ev.starts_at, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(ev.starts_at, lang)} · {tenant.name}</span>
          <h1 className="cust-title">{bi(ev.title)}</h1>
          <p className="small muted">{host ? t('customer.events.host', { name: host.display_name }) : ''}</p>
          <div className="row wrap"><Chip movement="libera" dot>{bi(ev.kind)}</Chip><Chip>{t('core.common.min', { n: durationMin })}</Chip></div>
        </div>
        <p className="small">{bi(ev.description)}</p>
        <Card padding="sm" className="stack-sm">
          <div className="row-between"><span className="small">{t('customer.events.price.public')}</span><strong>{formatCOP(ev.price_cop, lang)}</strong></div>
          <div className="row-between"><span className="small">{t('customer.events.price.member')}</span><strong>{memberIncluded ? t('core.common.included') : formatCOP(ev.member_price_cop, lang)}</strong></div>
          <CapacityMeter booked={entry.taken} capacity={ev.capacity} />
        </Card>
        {ev.bring && ev.bring.length > 0 && <Card tone="muted" eyebrow={t('customer.events.bring')}><ul className="cust-checklist small">{ev.bring.map((b, i) => <li key={i}>{bi(b)}</li>)}</ul></Card>}
        <ListGroup>
          <ListRow icon="✉" title={t('customer.events.friend')} subtitle={t('customer.events.friend.sub')} to="/app/invite" />
          <ListRow icon="▦" title={t('customer.booked.addToCalendar')} onClick={() => downloadIcs({ title: `${bi(ev.title)} · ${tenant.name}`, startsAt: ev.starts_at, endsAt: ev.ends_at, location: tenant.name })} />
        </ListGroup>
        <div className="cust-sticky">
          {mine ? <Notice tone="success" title={t('customer.events.going')} action={<Button size="sm" variant="ghost" onClick={() => { void cancel(mine); }}>{t('customer.events.cancel')}</Button>}>{t('customer.events.going.body')}</Notice>
            : soldOut ? <Button block size="lg" variant="secondary" disabled>{t('customer.events.soldOut')}</Button>
              : <Button block size="lg" loading={busy} onClick={reserve}>{amount > 0 ? t('customer.checkout.payWompi', { amount: formatCOP(amount, lang) }) : t('customer.events.rsvp')}</Button>}
          {isMember && memberIncluded && !mine && <p className="xs muted" style={{ textAlign: 'center' }}><Badge tone="success">{t('customer.events.memberIncluded')}</Badge></p>}
          <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.events.policy')}</p>
        </div>
      </div>
    </div>
  );
}
