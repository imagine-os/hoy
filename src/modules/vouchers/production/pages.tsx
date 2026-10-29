import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { addDaysKey, dateKey, formatCOP, formatDate, fromDateKey } from '../../../i18n/format';
import { useData, useTable } from '../../../data/DataContext';
import { useLiveUpdates } from '../../../data/companyos/hooks';
import type { BaseRow } from '../../../data/schema';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Field } from '../../../components/molecule/Field/Field';
import { Input } from '../../../components/atom/Input/Input';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Badge } from '../../../components/atom/Badge/Badge';
import { codeFromLink, useCosVouchers, useGiftProducts, useKeyedSubmit, type CosVoucherList } from './hooks';
import {
  PAYMENT_TABLE, VOUCHER_CHANGES, courtesyBody, courtesyErrors, createVoucher, giftCheckoutPath, giftPaymentNotes, giftValidUntil, giftsToIssue,
  giftBody, isCode, isEmail, normalizeCode, redeemVoucher, voucherState,
  type CosVoucher, type CourtesyForm, type GiftPayment, type GiftProduct, type RedeemedLot,
} from './model';
import '../vouchers.css';

/** A day key (`2026-11-30`, studio day) or an ISO instant, as a long date in studio time. */
const day = (value: string | null | undefined, lang: 'es' | 'en') =>
  value ? formatDate(/^\d{4}-\d{2}-\d{2}$/.test(value) ? fromDateKey(value) : value, lang, { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const classesText = (t: (k: string, v?: Record<string, string | number>) => string, n: number) => (n === 1 ? t('vouchers.cos.class1') : t('vouchers.cos.classes', { n }));

function RefusalNotice({ error }: { error: { key: string; code: string | null } | null }) {
  const { t } = useI18n();
  if (!error) return null;
  return <Notice tone="danger" title={t(`${error.key}.title`)}>{t(`${error.key}.body`)}{error.key.endsWith('generic') && error.code ? ` (${error.code})` : ''}</Notice>;
}

// ── C-28 · redeem (BO-04, BO-05) ─────────────────────────────────────────────────────────────────────────────────
/** `/app/vouchers/:code` is the emailed link. A visitor is sent to sign-in or sign-up first and comes back here (customerReturn). */
export function VoucherRedeemPage() {
  const { code: linked } = useParams();
  // A new link is a new redemption: nothing carries over from the previous code.
  return <RedeemCard key={linked ?? ''} linked={linked} />;
}

function RedeemCard({ linked }: { linked: string | undefined }) {
  const { t, lang } = useI18n();
  const data = useData();
  const [code, setCode] = useState(() => codeFromLink(linked) || normalizeCode(linked).slice(0, 8));
  const [done, setDone] = useState<RedeemedLot | null>(null);
  const submit = useKeyedSubmit();
  const valid = isCode(code);
  const redeem = async () => {
    if (!valid) return;
    const lot = await submit.run((key) => redeemVoucher(data, code, key));
    if (lot) setDone(lot);
  };
  return (
    <div className="container page cust-page">
      <h1>{t('vouchers.cos.redeem.title')}</h1>
      <div className="stack">
        {done ? (
          <Notice tone="success" title={t('vouchers.cos.redeem.done', { classes: classesText(t, done.quantity ?? 0) })}
            action={<Link className="btn btn-primary btn-sm" to="/app/schedule">{t('vouchers.cos.redeem.book')}</Link>}>
            {done.valid_until ? t('vouchers.cos.redeem.until', { date: day(done.valid_until, lang) }) : t('vouchers.cos.redeem.noEnd')}
          </Notice>
        ) : (
          <Card>
            <div className="stack">
              <p>{t('vouchers.cos.redeem.intro')}</p>
              <Field label={t('vouchers.cos.redeem.code')} hint={t('vouchers.cos.redeem.codeHint')} error={code && !valid ? t('vouchers.cos.err.code') : undefined} required>
                {(id) => <Input id={id} value={code} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12}
                  onChange={(e) => { const next = normalizeCode(e.target.value); if (next !== code) { setCode(next); submit.renew(); } submit.clearError(); }} />}
              </Field>
              <RefusalNotice error={submit.error} />
              <Button loading={submit.busy} disabled={!valid || submit.busy} onClick={redeem}>{t('vouchers.cos.redeem.cta')}</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── C-38 · buy a gift voucher (BO-01, BO-06) ─────────────────────────────────────────────────────────────────────
export function GiftVoucherPage() {
  const { t, bi, lang } = useI18n();
  const navigate = useNavigate();
  const { products, loading } = useGiftProducts();
  const [productId, setProductId] = useState('');
  const [name, setName] = useState(''), [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const product = products.find((p) => p.id === productId) ?? (products.length === 1 ? products[0] : undefined);
  const errors = { product: !product, name: name.trim().length < 2, email: !isEmail(email) };
  const go = () => {
    setTried(true);
    if (!product || errors.name || errors.email) return;
    const recipient = { name: name.trim(), email: email.trim().toLowerCase() };
    navigate(giftCheckoutPath(product.key), { state: { giftRecipient: recipient, paymentNotes: giftPaymentNotes(recipient) } });
  };
  return (
    <div className="container page cust-page">
      <h1>{t('vouchers.cos.gift.title')}</h1>
      <p className="muted">{t('vouchers.cos.gift.sub')}</p>
      <div className="stack">
        {!loading && !products.length && <Notice tone="warn">{t('vouchers.cos.gift.none')}</Notice>}
        {products.length > 0 && (
          <Card title={t('vouchers.cos.gift.which')}>
            <div className="stack" role="radiogroup" aria-label={t('vouchers.cos.gift.which')}>
              {products.map((p) => (
                <label key={p.id} className="row">
                  <input type="radio" name="gift-product" checked={product?.id === p.id} onChange={() => setProductId(p.id)} />
                  <span><strong>{bi(p.name)}</strong> · {classesText(t, p.classes)} · {formatCOP(p.price, lang)}</span>
                </label>
              ))}
              {tried && errors.product && <p className="small" role="alert">{t('vouchers.cos.err.product')}</p>}
            </div>
          </Card>
        )}
        <Card title={t('vouchers.cos.gift.who')}>
          <div className="stack">
            <Field label={t('vouchers.cos.recipientName')} error={tried && errors.name ? t('vouchers.cos.err.name') : undefined} required>
              {(id) => <Input id={id} value={name} maxLength={120} autoComplete="off" onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label={t('vouchers.cos.recipientEmail')} hint={t('vouchers.cos.gift.emailHint')} error={tried && errors.email ? t('vouchers.cos.err.email') : undefined} required>
              {(id) => <Input id={id} type="email" value={email} maxLength={254} autoComplete="off" onChange={(e) => setEmail(e.target.value)} />}
            </Field>
          </div>
        </Card>
        <Notice title={t('vouchers.cos.gift.howTitle')}>{t('vouchers.cos.gift.how')}</Notice>
        <Button disabled={!products.length} onClick={go}>{t('vouchers.cos.gift.cta')}</Button>
      </div>
    </div>
  );
}

// ── gift vouchers waiting for the desk (BO-01 → BO-02) ───────────────────────────────────────────────────────────
function GiftToIssue({ payment, product, recipient }: { payment: GiftPayment; product: GiftProduct; recipient: { name: string; email: string } | null }) {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const today = dateKey();
  const [name, setName] = useState(recipient?.name ?? ''), [email, setEmail] = useState(recipient?.email ?? '');
  const [until, setUntil] = useState(() => giftValidUntil(product, today, addDaysKey));
  // One key per payment for this card: a double click or a retry replays the same voucher instead of issuing a second one.
  const submit = useKeyedSubmit({ keepAfterSuccess: true });
  const [issued, setIssued] = useState<CosVoucher | null>(null);
  // The body is fixed with the key at the first submit: a retry after a lost answer resends it exactly, even if the
  // product or payment props refetch in between (a changed body under the same key would be refused, then re-issued).
  const sent = useRef<Record<string, unknown> | null>(null);
  const edit = (value: string, set: (v: string) => void) => (e: { target: { value: string } }) => {
    if (issued || e.target.value === value) return;
    set(e.target.value); submit.renew(); sent.current = null;
  };
  const issue = async () => {
    sent.current ??= giftBody(payment, product, { name, email }, until);
    const body = sent.current;
    const v = await submit.run((key) => createVoucher(data, body, key));
    if (v) setIssued(v); else if (!submit.keptKey()) sent.current = null;
  };
  const ok = name.trim().length >= 2 && isEmail(email) && (!until || until >= today);
  return (
    <Card title={`${bi(product.name)} · ${classesText(t, product.classes)}`} actions={<Badge tone="warn">{t('vouchers.cos.desk.waiting')}</Badge>}>
      <div className="stack">
        <p className="small muted">{t('vouchers.cos.desk.paid', { date: payment.date ? day(payment.date, lang) : '—', amount: payment.amount != null ? formatCOP(payment.amount, lang) : '—' })}</p>
        {!recipient && <Notice tone="warn">{t('vouchers.cos.desk.noRecipient')}</Notice>}
        <div className="voucher-grid">
          <Field label={t('vouchers.cos.recipientName')} required>{(id) => <Input id={id} value={name} maxLength={120} onChange={edit(name, setName)} />}</Field>
          <Field label={t('vouchers.cos.recipientEmail')} required error={email && !isEmail(email) ? t('vouchers.cos.err.email') : undefined}>{(id) => <Input id={id} type="email" value={email} maxLength={254} onChange={edit(email, setEmail)} />}</Field>
          <Field label={t('vouchers.cos.validUntil')} hint={t('vouchers.cos.noEndHint')}>{(id) => <Input id={id} type="date" min={today} value={until} onChange={edit(until, setUntil)} />}</Field>
        </div>
        <RefusalNotice error={submit.error} />
        {issued
          ? <Notice tone="success" title={t('vouchers.cos.desk.issued', { email: issued.recipient_email ?? '' })}>{t('vouchers.cos.courtesy.sentBody', { code: issued.code ?? '' })}</Notice>
          : <Button loading={submit.busy} disabled={!ok || submit.busy} onClick={issue}>{t('vouchers.cos.desk.issue')}</Button>}
      </div>
    </Card>
  );
}

type VoucherList = CosVoucherList;
/** Until the vouchers are read (again, after any change), an approved gift could look unissued: nothing is offered then. */
function GiftsToIssue({ list }: { list: VoucherList }) {
  const { t } = useI18n();
  const { products } = useGiftProducts();
  const { rows: payments, loading } = useTable<BaseRow>(PAYMENT_TABLE);
  const known = !list.loading && !list.stale && !list.failed && !loading;
  const waiting = known ? giftsToIssue(payments as unknown as Record<string, unknown>[], products, list.vouchers) : [];
  return (
    <section className="stack" aria-labelledby="gifts-to-issue">
      <h2 id="gifts-to-issue">{t('vouchers.cos.desk.title')}</h2>
      <p className="muted">{t('vouchers.cos.desk.sub')}</p>
      {list.failed && <Notice tone="warn">{t('vouchers.cos.list.failed')}</Notice>}
      {!known && !list.failed && <Notice>{t('vouchers.cos.list.loading')}</Notice>}
      {known && !waiting.length && <Notice>{t('vouchers.cos.desk.empty')}</Notice>}
      {waiting.map((w) => <GiftToIssue key={w.payment.id} {...w} />)}
    </section>
  );
}

// ── voucher list (BO-05, BO-06: sent and used, as the studio sees them) ─────────────────────────────────────────
function VoucherList({ list: { vouchers, loading, failed } }: { list: VoucherList }) {
  const { t, lang } = useI18n();
  const today = dateKey();
  return (
    <section className="stack" aria-labelledby="voucher-list">
      <h2 id="voucher-list">{t('vouchers.cos.list.title')}</h2>
      {loading && <Notice>{t('vouchers.cos.list.loading')}</Notice>}
      {!loading && !failed && !vouchers.length && <Notice>{t('vouchers.cos.list.empty')}</Notice>}
      {vouchers.map((v) => {
        const state = voucherState(v, today);
        return (
          <Card key={v.id} title={v.recipient_name || v.recipient_email || t(`vouchers.cos.kind.${v.kind}`)}
            actions={<Badge tone={state === 'active' ? 'success' : 'neutral'}>{t(`vouchers.cos.state.${state}`)}</Badge>}>
            <div className="stack-sm">
              <div className="row wrap">
                <Badge>{t(`vouchers.cos.kind.${v.kind}`)}</Badge>
                <strong>{classesText(t, v.classes)}</strong>
                <span>{t('vouchers.cos.list.uses', { uses: v.uses ?? 0, max: v.max_uses ?? 1 })}</span>
                {v.code && <code>{v.code}</code>}
              </div>
              <p className="small muted">
                {v.recipient_email && <>{t('vouchers.cos.list.sent', { email: v.recipient_email, date: day(v.created_at, lang) })} · </>}
                {v.valid_until ? t('vouchers.cos.list.until', { date: day(v.valid_until, lang) }) : t('vouchers.cos.list.noEnd')}
                {v.redeemed_at && <> · {t('vouchers.cos.list.used', { date: day(v.redeemed_at, lang) })}</>}
              </p>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

/** Approvals and redemptions happen elsewhere: the studio and desk lists poll while open (contract §1). */
const LIVE = [PAYMENT_TABLE, VOUCHER_CHANGES];

// ── M-13 · administration: courtesy vouchers (BO-03), gifts to issue, list ───────────────────────────────────────
const EMPTY: CourtesyForm = { classes: '1', validUntil: '', maxUses: '1', name: '', email: '' };

function CourtesyCard() {
  const { t } = useI18n();
  const data = useData();
  const today = dateKey();
  const [form, setForm] = useState<CourtesyForm>(() => ({ ...EMPTY, validUntil: addDaysKey(today, 29) }));
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<CosVoucher | null>(null);
  const submit = useKeyedSubmit();
  const errors = courtesyErrors(form, today);
  const set = (k: keyof CourtesyForm) => (e: { target: { value: string } }) => {
    if (e.target.value === form[k]) return;
    setForm((f) => ({ ...f, [k]: e.target.value })); setSent(null); submit.renew();
  };
  const err = (k: keyof CourtesyForm) => (tried && errors[k] ? t(errors[k]!) : undefined);
  const create = async () => {
    setTried(true);
    if (Object.keys(errors).length) return;
    const v = await submit.run((key) => createVoucher(data, courtesyBody(form), key));
    if (v) { setSent(v); setTried(false); setForm({ ...EMPTY, validUntil: addDaysKey(today, 29) }); }
  };
  return (
    <Card title={t('vouchers.cos.courtesy.title')}>
      <div className="stack">
        <p className="muted">{t('vouchers.cos.courtesy.sub')}</p>
        <div className="voucher-grid">
          <Field label={t('vouchers.cos.classesLabel')} error={err('classes')} required>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={100} step={1} value={form.classes} onChange={set('classes')} />}</Field>
          <Field label={t('vouchers.cos.validUntil')} error={err('validUntil')} required>{(id) => <Input id={id} type="date" min={today} value={form.validUntil} onChange={set('validUntil')} />}</Field>
          <Field label={t('vouchers.cos.maxUses')} hint={t('vouchers.cos.maxUsesHint')} error={err('maxUses')} required>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={500} step={1} value={form.maxUses} onChange={set('maxUses')} />}</Field>
          <Field label={t('vouchers.cos.recipientName')} error={err('name')} required>{(id) => <Input id={id} value={form.name} maxLength={120} onChange={set('name')} />}</Field>
          <Field label={t('vouchers.cos.recipientEmail')} error={err('email')} required>{(id) => <Input id={id} type="email" value={form.email} maxLength={254} onChange={set('email')} />}</Field>
        </div>
        {sent && <Notice tone="success" title={t('vouchers.cos.courtesy.sent', { email: sent.recipient_email ?? '' })}>{t('vouchers.cos.courtesy.sentBody', { code: sent.code ?? '' })}</Notice>}
        <RefusalNotice error={submit.error} />
        <Button loading={submit.busy} disabled={submit.busy} onClick={create}>{t('vouchers.cos.courtesy.cta')}</Button>
      </div>
    </Card>
  );
}

export function VoucherStudioPage() {
  const { t } = useI18n();
  const list = useCosVouchers();
  useLiveUpdates(LIVE);
  return (
    <div className="container page">
      <div className="page-head"><h1>{t('vouchers.title')}</h1><p className="muted">{t('vouchers.cos.studio.sub')}</p></div>
      <div className="stack">
        <CourtesyCard />
        <GiftsToIssue list={list} />
        <VoucherList list={list} />
      </div>
    </div>
  );
}

// ── S-08 · front desk: issue paid gift vouchers, see the list ────────────────────────────────────────────────────
export function VoucherDeskPage() {
  const { t } = useI18n();
  const list = useCosVouchers();
  useLiveUpdates(LIVE);
  return (
    <div className="container page">
      <div className="page-head"><h1>{t('vouchers.cos.desk.page')}</h1></div>
      <div className="stack">
        <GiftsToIssue list={list} />
        <VoucherList list={list} />
      </div>
    </div>
  );
}
