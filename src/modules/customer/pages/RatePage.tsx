import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useData } from '../../../data/DataContext';
import { formatDate } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { RatingScale } from '../../../components/molecule/RatingScale/RatingScale';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { useLocalPref, useMyBookings, useSessionJoined } from '../hooks';
import { PageHead, teacherName } from '../ui';

const GOOD = ['music', 'heat', 'pace', 'clarity'] as const;
const FIX = ['crowded', 'late', 'tooHard', 'tooEasy'] as const;
interface Stored { sessionId: string; stars: number; tags: string[]; note: string; anonymous: boolean; at: string }

/** C-10 Rate your class — under five seconds, with a skip that costs nothing. */
export function RatePage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { joined } = useSessionJoined(id);
  const { rows: bookings } = useMyBookings();
  const booking = bookings.find((b) => b.session_id === id && b.status !== 'cancelled');
  const [ratings, setRatings] = useLocalPref<Stored[]>('ratings', []);
  const [stars, setStars] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [done, setDone] = useState(false);

  if (!joined) return <div className="container page cust-page"><PageHead back="/app" title={t('customer.rate.title')} /><EmptyState title={t('customer.class.notFound')} action={<Link to="/app/history"><Button variant="secondary">{t('core.nav.history')}</Button></Link>} /></div>;
  const already = booking?.rated || ratings.some((r) => r.sessionId === id);
  const toggle = (k: string) => setTags((ts) => (ts.includes(k) ? ts.filter((x) => x !== k) : [...ts, k]));
  const submit = async () => {
    if (!stars) return;
    setRatings((r) => [...r, { sessionId: id!, stars, tags, note, anonymous, at: new Date().toISOString() }]);
    if (booking) await data.update('bookings', booking.id, { rated: true });
    setDone(true);
  };

  return (
    <div className="container page cust-page">
      <PageHead back="/app" title={t('customer.rate.title')} sub={`${joined.session.title} · ${teacherName(joined)} · ${formatDate(joined.session.starts_at, lang)}`} />
      <div className="stack">
        {(done || already) ? (
          <Card className="stack cust-center" padding="lg">
            <Notice tone="success" title={t('customer.rate.thanks')}>{t('customer.rate.thanks.body')}</Notice>
            {stars != null && stars >= 4 && <a href={`https://www.google.com/search?q=${encodeURIComponent(`${tenant.legalName} ${tenant.city}`)}`} target="_blank" rel="noreferrer"><Button variant="secondary">{t('customer.rate.public')}</Button></a>}
            <Button block onClick={() => nav('/app')}>{t('core.nav.home')}</Button>
          </Card>
        ) : (
          <>
            <Card className="stack cust-center" padding="lg">
              <strong>{t('customer.rate.prompt')}</strong>
              <RatingScale value={stars} onChange={setStars} label={t('customer.rate.title')} />
              <span className="xs muted">{stars ? t(`customer.rate.star.${stars}`) : t('customer.rate.sub')}</span>
            </Card>
            <section className="stack-sm">
              <div className="eyebrow">{t('customer.rate.good')}</div>
              <div className="row wrap">{GOOD.map((k) => <Chip key={k} selected={tags.includes(k)} onClick={() => toggle(k)}>{t(`customer.rate.tag.${k}`)}</Chip>)}</div>
              <div className="eyebrow">{t('customer.rate.fix')}</div>
              <div className="row wrap">{FIX.map((k) => <Chip key={k} selected={tags.includes(k)} onClick={() => toggle(k)}>{t(`customer.rate.tag.${k}`)}</Chip>)}</div>
            </section>
            <textarea className="input cust-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('customer.rate.note')} aria-label={t('customer.rate.note')} />
            <Toggle checked={anonymous} onChange={setAnonymous} label={t('customer.rate.anonymous')} />
            <Button block size="lg" disabled={!stars} onClick={submit}>{t('customer.rate.submit')}</Button>
            <Button block variant="ghost" onClick={() => nav('/app')}>{t('customer.rate.skip')}</Button>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.rate.privacy')}</p>
          </>
        )}
      </div>
    </div>
  );
}
