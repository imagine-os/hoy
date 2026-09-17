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
import { demoEvents } from '../content';
import { priceOf, useEntitlements, useLocalPref } from '../hooks';
import { recordPayment, wompiCheckout } from '../payments';
import { policy } from '../policy';
import { MediaPlaceholder, PageHead, downloadIcs } from '../ui';

/** C-23 Events list (no events table yet: demo events from content.ts). */
export function EventsListPage() {
  const { t, bi, lang } = useI18n();
  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.events.title')} sub={t('customer.events.sub')} />
      <ListGroup>
        {demoEvents.map((e) => <ListRow key={e.id} icon="✦" title={bi(e.title)} subtitle={`${formatDate(e.startsAt, lang, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(e.startsAt, lang)} · ${bi(e.kind)}`} trailing={<span className="small muted">{e.capacity - e.taken} {t('customer.events.spots')}</span>} to={`/app/events/${e.id}`} />)}
      </ListGroup>
    </div>
  );
}

/** C-23 Event detail & RSVP. */
export function EventPage() {
  const { id } = useParams();
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const ent = useEntitlements();
  const ev = demoEvents.find((e) => e.id === id);
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const [rsvps, setRsvps] = useLocalPref<string[]>('events.rsvp', []);
  const [busy, setBusy] = useState(false);
  if (!ev) return <div className="container page cust-page"><PageHead back="/app/events" title={t('customer.events.notFound')} /><EmptyState title={t('customer.events.notFound')} action={<Link to="/app/events"><Button>{t('customer.events.title')}</Button></Link>} /></div>;

  const host = teachers.find((x) => x.id === ev.hostTeacherId);
  const going = rsvps.includes(ev.id);
  const isMember = ent.membership?.status === 'active';
  const publicPrice = priceOf(ev.publicPriceId).price ?? 0;
  const amount = isMember && ev.memberIncluded ? 0 : publicPrice;
  const taken = ev.taken + (going ? 1 : 0);
  const soldOut = taken >= ev.capacity && !going;
  const endsAt = new Date(new Date(ev.startsAt).getTime() + ev.durationMin * 6e4).toISOString();

  const reserve = async () => {
    setBusy(true);
    try {
      if (amount > 0) {
        const result = await wompiCheckout({ amount, method: 'card' }); // INTEGRATION SEAM: Wompi
        await recordPayment(data, { userId: user.id, planId: null, amount, method: 'card', result, ivaRate: policy.ivaRate });
        if (result.status !== 'approved') return;
      }
      setRsvps((r) => [...r, ev.id]);
    } finally { setBusy(false); }
  };

  return (
    <div className="container page cust-page cust-has-sticky">
      <PageHead back="/app/events" title={<span className="sr-only">{bi(ev.title)}</span>} />
      <div className="stack">
        <MediaPlaceholder label={t('customer.events.photo')} ratio="4 / 5" movement="libera" />
        <div className="stack-sm">
          <span className="eyebrow">{formatDate(ev.startsAt, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(ev.startsAt, lang)} · {tenant.name}</span>
          <h1 className="cust-title">{bi(ev.title)}</h1>
          <p className="small muted">{host ? t('customer.events.host', { name: host.display_name }) : ''}</p>
          <div className="row wrap"><Chip movement="libera" dot>{bi(ev.kind)}</Chip><Chip>{t('core.common.min', { n: ev.durationMin })}</Chip></div>
        </div>
        <p className="small">{bi(ev.body)}</p>
        <Card padding="sm" className="stack-sm">
          <div className="row-between"><span className="small">{t('customer.events.price.public')}</span><strong>{formatCOP(publicPrice, lang)}</strong></div>
          <div className="row-between"><span className="small">{t('customer.events.price.member')}</span><strong>{ev.memberIncluded ? t('core.common.included') : formatCOP(publicPrice, lang)}</strong></div>
          <CapacityMeter booked={taken} capacity={ev.capacity} />
        </Card>
        <Card tone="muted" eyebrow={t('customer.events.bring')}><ul className="cust-checklist small">{ev.bring.map((b, i) => <li key={i}>{bi(b)}</li>)}</ul></Card>
        <ListGroup>
          <ListRow icon="✉" title={t('customer.events.friend')} subtitle={t('customer.events.friend.sub')} to="/app/invite" />
          <ListRow icon="▦" title={t('customer.booked.addToCalendar')} onClick={() => downloadIcs({ title: `${bi(ev.title)} · ${tenant.name}`, startsAt: ev.startsAt, endsAt, location: tenant.name })} />
        </ListGroup>
        <div className="cust-sticky">
          {going ? <Notice tone="success" title={t('customer.events.going')} action={<Button size="sm" variant="ghost" onClick={() => setRsvps((r) => r.filter((x) => x !== ev.id))}>{t('customer.events.cancel')}</Button>}>{t('customer.events.going.body')}</Notice>
            : soldOut ? <Button block size="lg" variant="secondary" disabled>{t('customer.events.soldOut')}</Button>
              : <Button block size="lg" loading={busy} onClick={reserve}>{amount > 0 ? t('customer.checkout.payWompi', { amount: formatCOP(amount, lang) }) : t('customer.events.rsvp')}</Button>}
          {isMember && ev.memberIncluded && !going && <p className="xs muted" style={{ textAlign: 'center' }}><Badge tone="success">{t('customer.events.memberIncluded')}</Badge></p>}
          <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.events.policy')}</p>
        </div>
      </div>
    </div>
  );
}
