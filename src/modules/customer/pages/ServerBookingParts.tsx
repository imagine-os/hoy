import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { useLivePricing } from '../../../data/livePricing';
import { usesMats } from '../../../data/mats';
import { dateKey, formatDateTime, formatTime } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Button } from '../../../components/atom/Button/Button';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Card } from '../../../components/molecule/Card/Card';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { CountdownRing } from '../../../components/molecule/CountdownRing/CountdownRing';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ReceiptUpload } from '../../../components/organism/ReceiptUpload/ReceiptUpload';
import { SavedPaymentInstructions } from '../../../components/organism/PaymentInstructions/PaymentInstructions';
import type { ReceiptImage } from '../../transfers/receipts';
import { useAllSessionsJoined, useNow, type JoinedSession } from '../hooks';
import { teacherName, toneOf } from '../ui';
import { useBookingPolicy } from '../booking/bookingPolicy';
import { cancelOnServer, moveOnServer, sendHoldReceipt, useSubmitKey } from '../booking/serverCommands';
import { refusalMessage } from '../booking/refusals';
import { classPhase, holdView, moveDeadline, moveOpen, type ServerBookingRow } from '../booking/serverBooking';

/** The server's answer, in the customer's language. */
function Refusal({ error }: { error: unknown }) {
  const { t } = useI18n();
  if (!error) return null;
  const r = refusalMessage(error);
  return <Notice tone="danger" title={t('customer.srv.refused')}>{t(r.key, r.vars)}</Notice>;
}

/**
 * A receipt payment whose image didn't upload, remembered on this device per booking so a reload still offers to resend the
 * image to that payment (a pending payment freezes the hold, so without it reception would see a receipt with no image).
 */
const UNSENT_KEY = (bookingId: string) => `hoyos.customer.unsentReceipt.${bookingId}`;
const readUnsent = (bookingId: string) => { try { return localStorage.getItem(UNSENT_KEY(bookingId)); } catch { return null; } };
const writeUnsent = (bookingId: string, paymentId: string | null) => {
  try { if (paymentId) localStorage.setItem(UNSENT_KEY(bookingId), paymentId); else localStorage.removeItem(UNSENT_KEY(bookingId)); } catch { /* ignore */ }
};

/**
 * PG-03 / J1 / J1c — a held single class: the countdown, the "clock starts at 8:00" notice outside reception hours, the
 * transfer receipt that keeps the spot (through the class when sent before it), and the released state. Display only:
 * the server holds, freezes and releases.
 */
export function HoldBlock({ booking, joined }: { booking: ServerBookingRow; joined: Pick<JoinedSession, 'session'> }) {
  const { t, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const policy = useBookingPolicy();
  const pricing = useLivePricing();
  const now = useNow(1_000);
  const [image, setImage] = useState<ReceiptImage | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [sentOn, setSentOn] = useState<string | null>(null);
  const [unsent, setUnsent] = useState<string | null>(() => readUnsent(booking.id));
  const inFlight = useRef(false);
  const key = useSubmitKey(`receipt:${booking.id}:${image?.fileName ?? ''}:${image?.bytes ?? 0}`);
  const view = holdView(booking, joined.session.starts_at, policy, now);
  if (!view) return null;
  const at = (iso: string | null) => (iso ? formatTime(iso, lang) : '');

  const send = async () => {
    if (!image || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      await sendHoldReceipt(data, { bookingId: booking.id, userId: user.id, planId: 'plan_single', amount: pricing.item('single')?.price ?? null, image, paymentId: unsent }, key.take());
      key.settle(); writeUnsent(booking.id, null); setUnsent(null); setSentOn(booking.updated_at);
    } catch (e) {
      // The payment exists but its image didn't upload: keep it, so the retry uploads to it (no second payment).
      const saved = (e as { paymentId?: string }).paymentId;
      if (saved) { writeUnsent(booking.id, saved); setUnsent(saved); } else key.settle(e);
      setError(e);
    }
    finally { inFlight.current = false; setBusy(false); }
  };

  // "Sent" is shown while the row is the one we sent on (no clock comparison); once the server row changes, it decides
  // (frozen → waiting for reception; declined → the clock restarts and the upload shows again).
  const justSent = sentOn != null && sentOn === booking.updated_at;
  const picker = (
    <section className="stack-sm">
      <ReceiptUpload value={image} onChange={(next) => { setImage(next); setError(null); }} />
      <Refusal error={error} />
      <Button block loading={busy} disabled={!image || busy} onClick={() => void send()}>{t('customer.srv.hold.send')}</Button>
    </section>
  );
  if ((view.phase === 'waiting_reception' || justSent) && !unsent) return (
    <Notice tone="success" title={t('customer.srv.hold.frozen.title')}>{t('customer.srv.hold.frozen.body')}</Notice>
  );
  if (view.phase === 'waiting_reception' && unsent) return (
    <div className="stack-sm">
      <Notice tone="warn" title={t('customer.srv.hold.unsent.title')}>{t('customer.srv.hold.unsent.body')}</Notice>
      {picker}
    </div>
  );
  if (view.phase === 'expired') return (
    <Notice tone="warn" title={t('customer.srv.hold.expired.title')} action={<Link to="/app/schedule"><Button size="sm" variant="secondary">{t('customer.class.backToSchedule')}</Button></Link>}>{t('customer.srv.hold.expired.body')}</Notice>
  );

  return (
    <div className="stack">
      <div className="cust-center stack-sm">
        {view.phase === 'not_started'
          ? <Card tone="primary" className="cust-center" padding="lg"><strong>{t('customer.srv.hold.notStarted.ring', { time: at(view.clockStartsAt) })}</strong></Card>
          : <CountdownRing until={view.until!} size={160} tone="danger" label={t('customer.srv.hold.ring')} showHours={false} />}
      </div>
      <Notice tone={view.phase === 'running' ? 'warn' : 'info'} title={t(`customer.srv.hold.${view.phase}.title`, { time: at(view.until) })}>
        {t(`customer.srv.hold.${view.phase}.${view.method}`, { min: view.minutes, start: at(view.clockStartsAt), time: at(view.until), class: at(joined.session.starts_at) })}
      </Notice>
      {view.method === 'transfer' && (
        <section className="stack-sm">
          <SavedPaymentInstructions />
          {picker}
          <p className="xs muted">{t('customer.srv.hold.keeps')}</p>
        </section>
      )}
    </div>
  );
}

/** C-08b in the production build: move the booking (RS-09, J3b) or cancel it with the J3 warning, every time. */
export function ServerChangeSheet({ open, onClose, booking, joined, onResult }: { open: boolean; onClose: () => void; booking: ServerBookingRow; joined: JoinedSession; onResult: (f: { tone: 'success' | 'warn'; text: string }) => void }) {
  const { t, lang } = useI18n();
  const data = useData();
  const policy = useBookingPolicy();
  const all = useAllSessionsJoined();
  const now = useNow(1_000);
  const s = joined.session;
  const [mode, setMode] = useState<'menu' | 'move' | 'cancel'>('menu');
  const [day, setDay] = useState(() => dateKey(new Date(s.starts_at)));
  const [target, setTarget] = useState<string | null>(null);
  const [mat, setMat] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null);
  const inFlight = useRef(false);
  const moveKey = useSubmitKey(`move:${booking.id}:${target ?? ''}:${mat ?? ''}`);
  const cancelKey = useSubmitKey(`cancel:${booking.id}`);
  const held = booking.status === 'held';
  const canMove = moveOpen(booking, s.starts_at, policy, now);
  const deadline = moveDeadline(booking, s.starts_at, policy);
  const hours = booking.policy_reschedule_hours ?? policy.rescheduleHours;
  const alts = useMemo(() => all.filter((a) => a.session.id !== s.id && classPhase(a.session, now) === 'open' && dateKey(new Date(a.session.starts_at)) === day), [all, s.id, day, now]);
  const chosen = alts.find((a) => a.session.id === target) ?? null;
  const needsMat = !!chosen && usesMats(chosen.modality);
  const close = () => { if (busy) return; setMode('menu'); setError(null); setTarget(null); setMat(null); onClose(); };

  const act = async (write: () => Promise<unknown>, key: ReturnType<typeof useSubmitKey>, done: { tone: 'success' | 'warn'; text: string }) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try { await write(); key.settle(); onResult(done); setMode('menu'); onClose(); }
    catch (e) { key.settle(e); setError(e); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const move = () => chosen && act(() => moveOnServer(data, { bookingId: booking.id, toSessionId: chosen.session.id, matNumber: needsMat ? mat : null }, moveKey.take()), moveKey,
    { tone: 'success', text: t('customer.srv.move.done', { when: formatDateTime(chosen.session.starts_at, lang) }) });
  const cancel = () => act(() => cancelOnServer(data, { bookingId: booking.id }, cancelKey.take()), cancelKey,
    { tone: 'warn', text: t(held ? 'customer.srv.cancel.held.done' : 'customer.srv.cancel.done') });

  return (
    <Drawer open={open} onClose={close} side="bottom" title={mode === 'cancel' ? t('customer.change.cancel.title') : mode === 'move' ? t('customer.change.move.title') : t('customer.change.title')}>
      <div className="stack">
        <Card padding="sm"><ClassRow title={s.title} teacher={teacherName(joined)} startsAt={s.starts_at} durationMin={joined.modality?.duration_min ?? 60} tone={toneOf(joined)} booked={s.booked_count} capacity={s.capacity} booked_by_me /></Card>
        {mode === 'menu' && (
          <ListGroup>
            <ListRow icon="move" title={t('customer.change.move')} disabled={!canMove || busy} onClick={() => setMode('move')}
              subtitle={canMove && deadline != null ? t('customer.srv.move.until', { when: formatDateTime(new Date(deadline).toISOString(), lang), h: hours }) : hours > 0 ? t('customer.srv.move.closed', { h: hours }) : t('customer.srv.move.off')} />
            <ListRow icon="cancel" tone="danger" title={t(held ? 'customer.srv.cancel.held.menu' : 'customer.change.drop')} subtitle={t(held ? 'customer.srv.cancel.held.sub' : 'customer.srv.cancel.sub')} disabled={busy} onClick={() => setMode('cancel')} />
          </ListGroup>
        )}
        {mode === 'move' && (
          <section className="stack-sm">
            {!canMove ? <Notice tone="warn">{t('customer.srv.move.closed', { h: hours })}</Notice> : <>
              <Field label={t('customer.change.move.day')}>{(id) => <Input id={id} type="date" value={day} min={dateKey(new Date(now))} disabled={busy} onChange={(e) => { setDay(e.target.value); setTarget(null); setError(null); }} />}</Field>
              <div className="eyebrow">{t('customer.change.pick')}</div>
              {alts.length === 0
                ? <Notice tone="info" title={t('customer.change.noAlt')}>{t('customer.change.noAlt.body')}</Notice>
                : <Card padding="sm" className="stack-sm">{alts.map((a) => (
                  <div key={a.session.id} role="radio" aria-checked={target === a.session.id} className={target === a.session.id ? 'is-active' : undefined}>
                    <ClassRow title={a.session.title} teacher={a.teacher?.display_name ?? ''} startsAt={a.session.starts_at} durationMin={a.modality?.duration_min ?? 60} tone={a.modality?.tone ?? 'river'} booked={a.session.booked_count} capacity={a.session.capacity} booked_by_me={target === a.session.id} onClick={() => { if (!busy) { setTarget(a.session.id); setMat(null); setError(null); } }} />
                  </div>))}</Card>}
              {needsMat && <Field label={t('site.mat.title')} hint={t('customer.srv.move.mat')}>{(id) => (
                <Select id={id} value={mat ?? ''} onChange={(e) => setMat(Number(e.target.value) || null)}>
                  <option value="">—</option>
                  {Array.from({ length: Math.min(chosen!.session.capacity, tenant.studio.mats) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{t('site.mat.number', { n })}</option>)}
                </Select>)}</Field>}
              <Refusal error={error} />
              <Button block loading={busy} disabled={!chosen || busy || (needsMat && !mat)} onClick={() => void move()}>{t('customer.srv.move.confirm')}</Button>
              <p className="xs muted">{t('customer.srv.move.note')}</p>
            </>}
          </section>
        )}
        {mode === 'cancel' && (
          <section className="stack-sm">
            <Notice tone="danger" title={t(held ? 'customer.srv.cancel.held.title' : 'customer.srv.cancel.title')}>{t(held ? 'customer.srv.cancel.held.body' : 'customer.srv.cancel.body')}</Notice>
            {!held && canMove && <p className="small">{t('customer.srv.cancel.tryMove')} <Button size="sm" variant="ghost" onClick={() => { setError(null); setMode('move'); }}>{t('customer.change.move')}</Button></p>}
            <Refusal error={error} />
            <Button block variant="danger" loading={busy} disabled={busy} onClick={() => void cancel()}>{t(held ? 'customer.srv.cancel.held.confirm' : 'customer.srv.cancel.confirm')}</Button>
          </section>
        )}
        <Button block disabled={busy} variant={mode === 'menu' ? 'secondary' : 'ghost'} onClick={mode === 'menu' ? close : () => { setMode('menu'); setError(null); }}>{mode === 'menu' ? t('customer.change.keep') : t('core.nav.back')}</Button>
      </div>
    </Drawer>
  );
}
