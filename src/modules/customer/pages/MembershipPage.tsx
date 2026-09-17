import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, formatDate, addDaysKey, dateKey } from '../../../i18n/format';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Select } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { StatTile } from '../../../components/molecule/StatTile/StatTile';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useEntitlements, useMyBookings } from '../hooks';
import { policy } from '../policy';
import { PageHead } from '../ui';

const REASONS = ['price', 'schedule', 'moving', 'injury', 'other'] as const;

/** C-22 Manage membership — pause, change, cancel without a phone call. */
export function MembershipPage() {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const ent = useEntitlements();
  const { rows: bookings } = useMyBookings();
  const [sheet, setSheet] = useState<'pause' | 'cancel' | null>(null);
  const [days, setDays] = useState(14);
  const [reason, setReason] = useState<string>('schedule');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const m = ent.membership;
  const usage = useMemo(() => { const now = new Date(); return bookings.filter((b) => (b.status === 'checked_in' || b.status === 'booked') && new Date(b.created_at).getMonth() === now.getMonth() && new Date(b.created_at).getFullYear() === now.getFullYear()).length; }, [bookings]);
  const paused = m?.status === 'paused';
  const pendingCancel = m?.status === 'cancelled' && m.ends_at && new Date(m.ends_at).getTime() > Date.now();

  if (!m || !ent.plan) {
    return (
      <div className="container page cust-page">
        <PageHead back="/app/profile" title={t('customer.membership.title')} />
        <Card padding="sm"><EmptyState title={t('customer.membership.none')} body={t('customer.membership.none.body')} action={<Link to="/app/plans"><Button size="lg">{t('customer.home.membership.cta')}</Button></Link>} secondary={<Link to="/app/passes" className="small">{t('customer.plans.skip.cta')} →</Link>} /></Card>
      </div>
    );
  }
  const plan = ent.plan;
  const renews = m.renews_at ?? m.starts_at;

  const pause = async () => {
    setBusy(true);
    try {
      const until = addDaysKey(dateKey(), days);
      await data.update('memberships', m.id, { status: 'paused', paused_until: until, renews_at: addDaysKey(renews, days) });
      setFlash(t('customer.membership.paused.ok', { date: formatDate(until, lang) })); setSheet(null);
    } finally { setBusy(false); }
  };
  const resume = async () => { await data.update('memberships', m.id, { status: 'active', paused_until: null }); setFlash(t('customer.membership.resumed')); };
  const cancel = async () => {
    setBusy(true);
    try { await data.update('memberships', m.id, { status: 'cancelled', ends_at: renews }); setFlash(t('customer.membership.cancelled.ok', { date: formatDate(renews, lang) })); setSheet(null); }
    finally { setBusy(false); }
  };
  const undoCancel = async () => { await data.update('memberships', m.id, { status: 'active', ends_at: null }); setFlash(t('customer.membership.undone')); };

  return (
    <div className="container page cust-page">
      <PageHead back="/app/profile" title={t('customer.membership.title')} />
      <div className="stack">
        {flash && <Notice tone="success">{flash}</Notice>}
        {paused && <Notice tone="warn" title={t('customer.membership.paused.title')} action={<Button size="sm" variant="secondary" onClick={resume}>{t('customer.membership.resume')}</Button>}>{t('customer.membership.paused.body', { date: m.paused_until ? formatDate(m.paused_until as string, lang) : '' })}</Notice>}
        {pendingCancel && <Notice tone="warn" title={t('customer.membership.pendingCancel.title')} action={<Button size="sm" variant="secondary" onClick={undoCancel}>{t('customer.membership.undo')}</Button>}>{t('customer.membership.pendingCancel.body', { date: formatDate(m.ends_at!, lang) })}</Notice>}
        <Card padding="lg" className="stack-sm">
          <div className="row-between wrap"><div className="eyebrow">{t('customer.membership.current')}</div><Badge tone={toneForStatus(m.status)}>{t(`customer.membership.status.${m.status}`)}</Badge></div>
          <h2 className="cust-h2">{bi({ es: plan.name_es, en: plan.name_en })}</h2>
          <p className="small muted">{t('customer.membership.renews', { date: formatDate(renews, lang) })} · {formatCOP(plan.price, lang)} {plan.period === 'year' ? t('core.common.perYear') : t('core.common.perMonth')}</p>
          <p className="xs muted">{t('customer.membership.notice', { days: policy.chargeNoticeDays })}</p>
          <div className="grid grid-2">
            <StatTile label={t('customer.membership.usage')} value={usage} hint={t('customer.membership.usage.hint')} />
            <StatTile label={t('customer.membership.since')} value={formatDate(m.starts_at, lang)} />
          </div>
        </Card>
        <ListGroup>
          <ListRow icon="❙❙" title={t('customer.membership.pause')} subtitle={t('customer.membership.pause.sub', { days: policy.pauseMaxDays })} onClick={() => setSheet('pause')} disabled={paused || !!pendingCancel} />
          <ListRow icon="⇄" title={t('customer.membership.change')} subtitle={t('customer.membership.change.sub')} to="/app/plans" />
          <ListRow icon="▤" title={t('customer.membership.billing')} subtitle={t('customer.membership.billing.sub')} to="/app/history?tab=payments" />
        </ListGroup>
        <ListGroup>
          <ListRow icon="×" tone="danger" title={t('customer.membership.cancel')} subtitle={t('customer.membership.cancel.sub')} onClick={() => setSheet('cancel')} disabled={!!pendingCancel} />
        </ListGroup>
      </div>

      <Drawer open={sheet === 'pause'} onClose={() => setSheet(null)} side="bottom" title={t('customer.membership.pause')}>
        <div className="stack">
          <p className="small muted">{t('customer.membership.pause.body', { days: policy.pauseMaxDays })}</p>
          <Field label={t('customer.membership.pause.days')}>{(id) => <Select id={id} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 14, 21, 30].filter((d) => d <= policy.pauseMaxDays).map((d) => <option key={d} value={d}>{t('customer.membership.pause.option', { n: d })}</option>)}</Select>}</Field>
          <p className="small">{t('customer.membership.pause.preview', { until: formatDate(addDaysKey(dateKey(), days), lang), renews: formatDate(addDaysKey(renews, days), lang) })}</p>
          <Button block size="lg" loading={busy} onClick={pause}>{t('customer.membership.pause.cta')}</Button>
        </div>
      </Drawer>
      <Drawer open={sheet === 'cancel'} onClose={() => setSheet(null)} side="bottom" title={t('customer.membership.cancel')}>
        <div className="stack">
          <Notice tone="info">{t('customer.membership.cancel.body', { date: formatDate(renews, lang) })}</Notice>
          <Field label={t('customer.membership.cancel.reason')}>{(id) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r} value={r}>{t(`customer.membership.reason.${r}`)}</option>)}</Select>}</Field>
          <Button block size="lg" variant="danger" loading={busy} onClick={cancel}>{t('customer.membership.cancel.cta')}</Button>
          <Button block variant="ghost" onClick={() => setSheet(null)}>{t('customer.change.keep')}</Button>
        </div>
      </Drawer>
    </div>
  );
}
