import {useOperationalCatalog,useReviewedQuote} from '../../quotes/hooks';
import {QuoteNotice} from '../../../components/molecule/QuoteNotice/QuoteNotice';
import {quotedItem} from '../../../data/operationalQuotes';
import { acknowledgeRetainedMonetaryGift, discardRetainedMonetaryGift, executeRetainedMonetaryGift, readRetainedMonetaryGift, recoverRetainedMonetaryGift, retainMonetaryGift, type RetainedMonetaryGift, type RetainedMonetaryGiftResult } from '../retainedMonetaryGift';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatCOP, dateKey, isPhone } from '../../../i18n/format';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Wordmark } from '../../../components/atom/Wordmark/Wordmark';
import { OrderSummary } from '../../../components/molecule/OrderSummary/OrderSummary';
import { priceOf } from '../hooks';
import { policy } from '../policy';
import { PageHead } from '../ui';

const DESIGNS = ['cream', 'blue', 'yellow', 'sand'] as const;
type Design = (typeof DESIGNS)[number];
/** 0051: the two gift cards, at the class prices (pricing.ts `regalos`). */
const GIFTS = ['gift_single', 'gift_pack12'] as const;
const MAX_QTY = 10;

/** C-17 Gift card — which card and how many, recipient, delivery date, message, design, then pay. */
export function GiftPage() {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { user, role } = useSession();
  const location = useLocation(), path = location.pathname + location.search;
  const [amountId, setAmountId] = useState<string>('gift_single');
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(() => dateKey());
  const [message, setMessage] = useState('');
  const [design, setDesign] = useState<Design>('cream');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const operation = useRef<object | null>(null);
  const boundary = useRef({ data, userId: user.id, role, path });
  if (boundary.current.data !== data || boundary.current.userId !== user.id || boundary.current.role !== role || boundary.current.path !== path) { boundary.current = { data, userId: user.id, role, path }; operation.current = null; }
  const scope = boundary.current;
  type View = { scope: typeof scope; phase: 'checking' | 'ready' | 'retryable' | 'unknown' | 'blocked' | 'settled'; attempt?: RetainedMonetaryGift; result?: RetainedMonetaryGiftResult };
  const [view, setView] = useState<View | null>(null);
  const currentView: View = view?.scope === scope ? view : { scope, phase: 'checking' };
  const previewIsCurrent = view?.scope === scope;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const same = () => mounted.current && boundary.current === scope;
  useEffect(() => {
    let alive = true;
    const isCurrent = () => alive && mounted.current && boundary.current === scope;
    setBusy(false); setErrors({}); setName(''); setContact(''); setMessage(''); setDate(dateKey()); setQty(1); setAmountId('gift_single'); setDesign('cream'); setView({ scope, phase: 'checking' });
    void (async () => {
      try {
        const attempt = readRetainedMonetaryGift(user.id);
        if (!isCurrent()) return;
        if (!attempt) { setView({ scope, phase: 'ready' }); return; }
        setName(attempt.recipientName); setContact(attempt.recipientContact); setDate(attempt.deliveryDate); setQty(attempt.quote.quantity); setAmountId(attempt.quote.itemId);
        setView({ scope, phase: 'checking', attempt });
        const result = await recoverRetainedMonetaryGift(data, attempt, { isCurrent, role });
        if (isCurrent()) setView({ scope, phase: result ? 'settled' : 'retryable', attempt, ...(result ? { result } : {}) });
      } catch { if (isCurrent()) setView({ scope, phase: 'blocked' }); }
    })();
    return () => { alive = false; };
  }, [data, user.id, role, path, revision]);

  const catalog=useOperationalCatalog(),review=useReviewedQuote(catalog,amountId,qty,null);
  const quote = currentView.attempt?.quote ?? review.quote;
  const item = quote?quotedItem(quote):priceOf(amountId);
  const amount = quote?.chargedAmount??0;
  const label = qty > 1 ? `${qty} × ${bi(item.name)}` : bi(item.name);
  const today = dateKey();

  const buy = async () => {
    if(!same() || !review.available || !review.quote || currentView.phase !== 'ready' || operation.current)return;
    const e: Record<string, string> = {};
    if (qty < 1 || qty > MAX_QTY) e.amount = t('customer.gift.qty.err', { max: MAX_QTY });
    if (name.trim().length < 2) e.name = t('customer.form.required');
    if (!contact.includes('@') && !isPhone(contact)) e.contact = t('customer.gift.contact.err');
    if (date < today) e.date = t('customer.gift.date.past');
    setErrors(e); if (Object.keys(e).length) return;
    let attempt: RetainedMonetaryGift;
    try {
      attempt = retainMonetaryGift({ userId: user.id, role, quote: review.quote, recipientName: name, recipientContact: contact, deliveryDate: date });
    } catch { if (same()) setView({ scope, phase: 'blocked' }); return; }
    await act('execute', attempt);
  };
  async function act(action: 'execute' | 'check' | 'acknowledge' | 'discard', attempt: RetainedMonetaryGift) {
    if (!same() || operation.current) return;
    const ticket = {}; operation.current = ticket; setBusy(true);
    const isCurrent = () => same() && operation.current === ticket;
    try {
      if (action === 'acknowledge') {
        if (!currentView.result) return;
        await acknowledgeRetainedMonetaryGift(data, attempt, currentView.result, { isCurrent, role });
        if (isCurrent()) { setName(''); setContact(''); setDate(dateKey()); setMessage(''); setQty(1); setAmountId('gift_single'); setView({ scope, phase: 'ready' }); }
      } else if (action === 'discard') {
        await discardRetainedMonetaryGift(data, attempt, { isCurrent, role });
        if (isCurrent()) setView({ scope, phase: 'ready' });
      } else {
        setView({ scope, phase: 'checking', attempt });
        const result = action === 'check' ? await recoverRetainedMonetaryGift(data, attempt, { isCurrent, role }) : await executeRetainedMonetaryGift(data, attempt, { isCurrent, role, ivaRate: policy.ivaRate });
        if (isCurrent()) setView({ scope, phase: result ? 'settled' : 'retryable', attempt, ...(result ? { result } : {}) });
      }
    } catch { if (isCurrent()) setView({ scope, phase: 'unknown', attempt }); }
    finally { if (operation.current === ticket) { operation.current = null; if (same()) setBusy(false); } }
  }

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.gift.title')} sub={t('quotes.giftIntro')} />
      <div className="stack">
        {!currentView.attempt && <QuoteNotice catalog={catalog} review={review}/>}
        {!currentView.attempt && !review.available&&!catalog.loading&&<Notice tone="warn">{t('quotes.giftBlocked')}</Notice>}
        {errors.payment&&<Notice tone="danger">{errors.payment}</Notice>}
        <Notice tone="warn" title={t('vouchers.demo')}>{t('vouchers.demoBody')}</Notice>
        <Link to="/app/vouchers">{t('vouchers.giftLink')}</Link>
        <p className="small muted">{t('vouchers.giftSeparate')}</p>
        <div className={`cust-giftcard cust-giftcard-${design}`} role="img" aria-label={t('customer.gift.preview')}>
          <Wordmark variant={design === 'blue' ? 'cream' : 'blue'} height={28} />
          <strong>{formatCOP(amount, lang)}</strong>
          <span className="small">{previewIsCurrent && name ? t('customer.gift.for', { name }) : t('customer.gift.preview')}</span>
          {previewIsCurrent && message && <em className="xs">“{message}”</em>}
        </div>

        {currentView.phase !== 'ready' ? <div className="stack-sm" data-retained-gift-state={currentView.phase}>
          <Notice tone={currentView.phase === 'settled' ? 'success' : currentView.phase === 'checking' ? 'info' : 'warn'}>
            <p role={currentView.phase === 'checking' ? 'status' : undefined}>{t(`giftRetained.${currentView.phase === 'settled' ? currentView.result?.status === 'approved' ? 'saved' : 'declined' : currentView.phase}`)}</p>
            {currentView.result?.gift && <p>{t('vouchers.giftSimulated', { code: currentView.result.gift.code })}</p>}
          </Notice>
          {currentView.attempt && <Card className="stack-sm"><p>{t('giftRetained.snapshot')}</p><p>{currentView.attempt.recipientName} · {currentView.attempt.recipientContact}</p><p>{currentView.attempt.deliveryDate} · {label} · {formatCOP(amount, lang)}</p></Card>}
          {currentView.phase === 'checking' ? null : currentView.phase === 'settled' && currentView.attempt && currentView.result ? <Button loading={busy} onClick={() => void act('acknowledge', currentView.attempt!)}>{t('giftRetained.acknowledge')}</Button>
            : <Button loading={busy} onClick={() => currentView.attempt ? void act('check', currentView.attempt) : setRevision(n => n + 1)}>{t('giftRetained.check')}</Button>}
          {currentView.phase === 'retryable' && currentView.attempt && <div className="row wrap"><Button loading={busy} onClick={() => void act('execute', currentView.attempt!)}>{t('giftRetained.retry')}</Button><Button variant="secondary" disabled={busy} onClick={() => void act('discard', currentView.attempt!)}>{t('giftRetained.cancel')}</Button></div>}
          <p className="small muted">{t('giftRetained.boundary')}</p>
        </div> : (
          <>
            <Field label={`1 · ${t('customer.gift.amount')}`} error={errors.amount}>{() => (
              <div className="stack-sm">
                <div className="row wrap">
                  {GIFTS.map(id=>{const q=catalog.quote(id),p=q?quotedItem(q):priceOf(id);return <Chip key={id} selected={amountId===id} disabled={!q} onClick={()=>setAmountId(id)}>{q?formatCOP(q.amount,lang):t('quotes.unavailable')} · {bi(p.name)}</Chip>;})}
                </div>
                <div className="row wrap" role="group" aria-label={t('customer.gift.qty')}>
                  <span className="small">{t('customer.gift.qty')}</span>
                  <Button size="sm" variant="secondary" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t('customer.gift.qty.less')}>−</Button>
                  <strong className="cust-pass-price" aria-live="polite">{qty}</strong>
                  <Button size="sm" variant="secondary" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} disabled={qty >= MAX_QTY} aria-label={t('customer.gift.qty.more')}>+</Button>
                </div>
                <p className="xs muted">{t('quotes.giftQuantityHint')}</p>
              </div>
            )}</Field>
            <div className="eyebrow">2 · {t('customer.gift.to')}</div>
            <Field label={t('customer.form.name')} required error={errors.name}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <Field label={t('customer.gift.contact')} required hint={t('quotes.giftContactHint')} error={errors.contact}>{(id) => <Input id={id} value={contact} onChange={(e) => setContact(e.target.value)} />}</Field>
            <div className="eyebrow">3 · {t('customer.gift.delivery')}</div>
            <Field label={t('customer.gift.date')} hint={t('quotes.giftDateHint')} error={errors.date}>{(id) => <Input id={id} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            <Field label={t('customer.gift.message')} hint={`${message.length} / ${policy.giftMessageMax}`}>{(id) => <textarea id={id} className="input cust-textarea" maxLength={policy.giftMessageMax} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />}</Field>
            <Field label={t('customer.gift.design')}>{() => <div className="row wrap">{DESIGNS.map((d) => <button key={d} type="button" className={`cust-swatch cust-giftcard-${d} ${design === d ? 'is-active' : ''}`} aria-label={d} aria-pressed={design === d} onClick={() => setDesign(d)} />)}</div>}</Field>
            <OrderSummary lines={[{ label: `${t('customer.gift.title')} · ${label}`, amount }]} taxRate={policy.ivaRate} subtotalLabel={t('customer.checkout.subtotal')} taxLabel={t('customer.checkout.iva')} totalLabel={t('customer.checkout.total')} note={t('quotes.giftNote')} />
            <Card padding="sm"><Button block size="lg" disabled={!review.available} loading={busy} onClick={buy}>{t('customer.gift.cta', { amount: formatCOP(amount, lang) })}</Button></Card>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.pay.wompi.seam')}</p>
          </>
        )}
      </div>
    </div>
  );
}
