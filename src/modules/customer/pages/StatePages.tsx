/** Demo routes for the edge states so they are reachable and appear in /#/dev/specs: E-01, E-02, E-03. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { useAllSessionsJoined, priceOf } from '../hooks';
import { DECLINE_REASONS } from '../payments';
import { MINUTE, policy } from '../policy';
import { PageHead, movementOf, roomName, teacherName } from '../ui';
import { DeclinedBlock, EmptyHomeBlock, StudioCancelledBlock, type DeclinedState } from './blocks';

export function EmptyHomePage() {
  const { t } = useI18n();
  return (
    <div className="container page cust-page">
      <Notice tone="info">{t('customer.state.demo', { code: 'E-01' })}</Notice>
      <EmptyHomeBlock />
    </div>
  );
}

export function DeclinedDemoPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const all = useAllSessionsJoined();
  const next = useMemo(() => all.find((x) => x.session.status === 'scheduled' && new Date(x.session.starts_at).getTime() > Date.now() && x.session.booked_count < x.session.capacity) ?? null, [all]);
  const [state, setState] = useState<DeclinedState>(() => ({ reason: DECLINE_REASONS.insufficient_funds, holdUntil: new Date(Date.now() + policy.paymentHoldMinutes * MINUTE).toISOString(), attempts: 1, method: 'card' }));
  const amount = priceOf('single').price ?? 0;
  return (
    <div className="container page cust-page">
      <PageHead back="/app" title={t('customer.declined.title')} />
      <Notice tone="info">{t('customer.state.demo', { code: 'E-02' })}</Notice>
      <div className="stack">
        {next && <ClassCard title={next.session.title} teacher={teacherName(next)} room={roomName(next)} startsAt={next.session.starts_at} endsAt={next.session.ends_at} movement={movementOf(next)} booked={next.session.booked_count} capacity={next.session.capacity} />}
        <DeclinedBlock state={state} amount={amount}
          onRetry={(m) => (next ? nav(`/app/checkout/${next.session.id}?pass=single`) : setState((s) => ({ ...s, method: m, attempts: s.attempts + 1 })))}
          onRelease={() => nav('/app/schedule')} />
      </div>
    </div>
  );
}

export function CancelledDemoPage() {
  const { t } = useI18n();
  const all = useAllSessionsJoined();
  const now = Date.now();
  const picked = useMemo(() => {
    const cancelled = all.find((x) => x.session.status === 'cancelled' && new Date(x.session.starts_at).getTime() > now);
    if (cancelled) return cancelled;
    const any = all.find((x) => x.session.status === 'scheduled' && new Date(x.session.starts_at).getTime() > now);
    return any ? { ...any, session: { ...any.session, status: 'cancelled' as const, cancel_reason: 'Profesor enfermo' } } : null;
  }, [all, now]);
  return (
    <div className="container page cust-page">
      <PageHead back="/app" title={t('customer.cancelled.title')} />
      <Notice tone="info">{t('customer.state.demo', { code: 'E-03' })}</Notice>
      {picked ? <StudioCancelledBlock joined={picked} booking={{ paid_with: 'credit' } as never} /> : <EmptyState title={t('core.common.empty')} />}
    </div>
  );
}
