import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useTable } from '../../../data/DataContext';
import type { PlanRow } from '../../../data/schema';
import { dateKey, formatCOP, formatTime, parseDigits } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { useTodaySessions } from '../../website/hooks';
import { maskPhone, personMatches, usePeople } from '../people';
import { DESK_CONSENTS, type DeskMethod, type SaleResult } from './deskCommands';
import { deskErrorText } from './strings';
import { useActionKeys, useDeskCommands } from './useDesk';
import { errorCode } from './wire';
import '../staff.css';

const METHODS: { id: DeskMethod; label: string }[] = [{ id: 'cash', label: 'staff.register.method.cash' }, { id: 'card_terminal', label: 'staff.register.method.datafono' }, { id: 'transfer', label: 'staff.register.method.transfer' }];

/**
 * S-04 in the production build (RC-05, RC-10): who · what · how, one server batch. A new person is registered with
 * verbal consent; the sale is an approved payment of a product (the server prices it and issues the classes); with a
 * class chosen the person is booked from those classes and, if ticked, checked in. Price, trial-once, audience,
 * capacity and the one-class-a-day rule are the server's; its refusal is shown and nothing is written.
 */
export function DeskSalePage() {
  const { t, lang, bi } = useI18n();
  const { can, user } = useSession();
  const desk = useDeskCommands();
  const keys = useActionKeys();
  const [params] = useSearchParams();
  const { people } = usePeople();
  const today = useTodaySessions();
  const { rows: plans } = useTable<PlanRow>('plans', { where: { active: true } });
  const priceDay = dateKey(new Date());
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [form, setForm] = useState({ name: '', phone: '', email: '', consent: false });
  const [q, setQ] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [method, setMethod] = useState<DeskMethod>('cash');
  const [paidRaw, setPaidRaw] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const busyRef = useRef(false);
  // Hoy's payments recipe asks for a reference on a card-terminal payment only (methods_requiring_reference).
  const needsReference = method === 'card_terminal';
  // The studio day is fixed when the action's key is first created, so a retry after midnight sends the same body,
  // and the first sale of a new day carries that day.
  const saleDays = useRef(new Map<string, string>());
  const [sessionId, setSessionId] = useState(params.get('session') ?? '');
  const [checkIn, setCheckIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<(SaleResult & { name: string }) | null>(null);

  // Today's price row only (payments 2.8.0 dated prices), as the website's price list reads it (livePricing.ts).
  const products = useMemo(() => plans.filter(p => p.family !== 'regalos' && (!p.valid_from || p.valid_from <= priceDay) && (!p.valid_until || priceDay <= p.valid_until)).sort((a, b) => a.sort - b.sort), [plans, priceDay]);
  const product = products.find(p => p.id === productId);
  const price = product?.price ?? 0;
  const amount = paidRaw === null || paidRaw.trim() === '' ? price : parseDigits(paidRaw);
  const differs = !!product && amount !== price;
  const person = personId ? people.find(p => p.id === personId) : undefined;
  const candidates = useMemo(() => (q.trim().length < 2 ? [] : people.filter(p => p.role === 'customer' && personMatches(p, q)).slice(0, 6)), [people, q]);
  const whoOk = mode === 'existing' ? !!person : form.name.trim().length > 1 && form.phone.replace(/\D/g, '').length >= 7 && form.consent;
  // A product without a price (the private class, quoted by the studio) needs the amount charged and a reason.
  const quoted = !!product && price === 0;
  const valid = !!desk?.sell && whoOk && !!product && amount >= 0 && (!quoted || amount > 0) && (!differs || reason.trim().length > 0) && (!needsReference || reference.trim().length > 0);
  const intent = [mode, personId, form, productId, amount, reason.trim(), method, needsReference ? reference.trim() : '', sessionId, checkIn];

  if (!can('payments.write')) return <div className="stack"><div className="page-head"><h1>{t('staff.register.title')}</h1></div><EmptyState tone="error" title={t('staff.register.noPermission')} body={t('staff.register.noPermission.body')} /></div>;

  const complete = async () => {
    if (!valid || busyRef.current || !desk?.sell || !product) return;
    busyRef.current = true; setBusy(true); setError(null);
    const intentKey = JSON.stringify(intent);
    const saleDay = saleDays.current.get(intentKey) ?? dateKey(new Date());
    saleDays.current.set(intentKey, saleDay);
    const action = [...intent, saleDay];
    try {
      const result = await desk.sell({
        person: mode === 'existing' ? { id: person!.id } : { new: { name: form.name, phone: form.phone, email: form.email }, consents: DESK_CONSENTS },
        productId: product.id, price, amountReceived: amount, concept: bi({ es: product.name_es, en: product.name_en }), reference: needsReference ? reference : undefined, today: saleDay, reason: differs ? reason.trim() : undefined, method,
        sessionId: sessionId || undefined, checkIn: !!sessionId && checkIn, key: keys.keyFor(action),
      });
      keys.done(action); saleDays.current.delete(intentKey);
      setDone({ ...result, name: mode === 'existing' ? person!.name : form.name.trim() });
    } catch (e) { setError(deskErrorText(errorCode(e), t)); } finally { busyRef.current = false; setBusy(false); }
  };
  const reset = () => { setDone(null); setReference(''); setForm({ name: '', phone: '', email: '', consent: false }); setPersonId(null); setQ(''); setMode('new'); setProductId(''); setPaidRaw(null); setReason(''); setError(null); };

  if (done) return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.register.done')}</h1><p className="muted small">{t('staff.register.done.existing', { name: done.name })}{done.checkedIn ? ` · ${t('staff.register.done.checkedIn', { cls: today.find(x => x.session.id === sessionId)?.session.title ?? '' })}` : ''}</p></div></div>
      {done.checkInError && <EmptyState compact tone="error" title={t('desk.sale.checkInFailed')} body={deskErrorText(done.checkInError, t)} />}
      <div className="row wrap">
        <Button onClick={reset} icon="sell">{t('staff.register.newSale')}</Button>
        <Link to={`/staff/checkin${sessionId ? `?session=${sessionId}` : ''}`}><Button variant="secondary" icon="checkin">{t('staff.home.openCheckin')}</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.register.title')}</h1><p className="muted small">{t('staff.register.subtitle')}</p></div></div>
      <p className="xs muted">{t('desk.server.rules')}</p>
      <div className="register">
        <div className="register-steps">
          <Card eyebrow={t('staff.register.step1')} title={t('staff.register.who')} actions={<div className="row wrap" role="tablist"><Chip selected={mode === 'new'} onClick={() => setMode('new')}>{t('staff.register.new')}</Chip><Chip selected={mode === 'existing'} onClick={() => setMode('existing')}>{t('staff.register.existing')}</Chip></div>}>
            {mode === 'new' ? (
              <div className="grid grid-2 register-form">
                <Field label={t('staff.register.f.first')} required>{id => <Input id={id} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />}</Field>
                <Field label={t('staff.register.f.whatsapp')} required>{id => <Input id={id} inputMode="tel" placeholder={`${tenant.dialCode} 300 000 0000`} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />}</Field>
                <Field label={t('staff.register.f.email')}>{id => <Input id={id} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />}</Field>
                <div className="register-consent"><Toggle checked={form.consent} onChange={on => setForm({ ...form, consent: on })} label={t('desk.walkin.consent')} /><p className="xs muted">{t('staff.register.consent.hint', { staff: user.name })}</p></div>
              </div>
            ) : person ? (
              <div className="row-between"><span><strong>{person.name}</strong> <span className="xs muted">{maskPhone(person.phone)} · {person.email}</span></span><Button size="sm" variant="ghost" onClick={() => setPersonId(null)}>{t('core.common.edit')}</Button></div>
            ) : (
              <div className="stack-sm">
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('staff.register.search.ph')} autoFocus aria-label={t('core.common.search')} />
                {candidates.map(p => <button key={p.id} type="button" className="register-candidate" onClick={() => setPersonId(p.id)}><span className="grow"><span className="small">{p.name}</span><span className="xs muted"> · {maskPhone(p.phone)}</span></span></button>)}
                {q.trim().length >= 2 && candidates.length === 0 && <p className="small muted">{t('staff.register.search.none')}</p>}
              </div>
            )}
          </Card>
          <Card eyebrow={t('staff.register.step2')} title={t('staff.register.what')}>
            <Select aria-label={t('staff.register.what')} value={productId} onChange={e => { setProductId(e.target.value); setPaidRaw(null); }}>
              <option value="">—</option>
              {products.map(p => <option key={p.id} value={p.id}>{bi({ es: p.name_es, en: p.name_en })} · {formatCOP(p.price, lang)}</option>)}
            </Select>
          </Card>
          <Card eyebrow={t('staff.register.step3')} title={t('staff.register.how')}>
            <div className="register-methods" role="radiogroup">
              {METHODS.map(m => <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className={`register-method ${method === m.id ? 'is-selected' : ''}`} onClick={() => setMethod(m.id)}><strong className="small">{t(m.label)}</strong></button>)}
            </div>
            {needsReference && <Field label={t('desk.sale.reference')} required>{id => <Input id={id} value={reference} onChange={e => setReference(e.target.value)} invalid={!reference.trim()} />}</Field>}
          </Card>
        </div>
        <aside className="register-rail">
          <Card title={t('staff.register.summary')} raised>
            <div className="stack-sm">
              <div className="row-between register-total"><span>{t('staff.register.total')}</span><span>{formatCOP(price, lang)}</span></div>
              <Field label={t('staff.register.paid')}>{id => <Input id={id} inputMode="numeric" value={paidRaw ?? String(price)} onChange={e => setPaidRaw(e.target.value)} />}</Field>
              {quoted && amount <= 0 && <p className="xs muted" role="note">{t('desk.sale.quoted')}</p>}
              {differs && <Field label={t('staff.register.note')} required>{id => <Input id={id} value={reason} onChange={e => setReason(e.target.value)} placeholder={t('staff.register.note.ph')} invalid={!reason.trim()} />}</Field>}
              <Field label={t('staff.register.checkinTo')}>{id => <Select id={id} value={sessionId} onChange={e => setSessionId(e.target.value)}><option value="">{t('staff.register.checkinTo.none')}</option>{today.map(({ session: s, teacher: te }) => <option key={s.id} value={s.id}>{formatTime(s.starts_at, lang)} · {s.title}{te ? ` · ${te.display_name}` : ''} ({s.booked_count}/{s.capacity})</option>)}</Select>}</Field>
              {sessionId && <Toggle size="sm" checked={checkIn} onChange={setCheckIn} label={t('staff.checkin.checkin')} />}
              {error && <EmptyState compact tone="error" title={t('core.common.error')} body={error} />}
              <Button block size="lg" disabled={!valid} loading={busy} onClick={complete} icon="payment">{t('staff.register.cta')}</Button>
              <p className="xs muted">{t('staff.register.audit', { staff: user.name })}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
