import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatCOP } from '../../../i18n/format';
import { Button } from '../../../components/atom/Button/Button';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { isAffiliateOnly, type ProductRow } from '../../products/launch/productMaster';
import { AffiliatePanel } from './AffiliatePanel';
import { CosError, refusalKey, type CosRecord } from './cos';
import { DESK_METHODS, deskOps, runPaymentOps, type PayMethod } from './payments';
import { useAction, useCos, useLoad } from './useCos';

type PersonRec = CosRecord<{ name?: string; email?: string }>;

/** Finds a customer by name or email (front desk reads every person). */
function PersonPicker({ value, onPick }: { value: PersonRec | null; onPick: (p: PersonRec | null) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const term = q.trim();
  const { state } = useLoad(term.length >= 2 ? async (c) => (await c.request<{ data: PersonRec[] }>('POST', '/query', { entity: 'person', filter: { or: [{ field: 'name', op: 'contains', value: term }, { field: 'email', op: 'contains', value: term }] }, limit: 20 })).data : null, [term]);
  if (value) return <div className="row wrap"><strong>{value.data.name ?? value.data.email}</strong><Button size="sm" variant="ghost" onClick={() => onPick(null)}>×</Button></div>;
  return <div className="stack-sm">
    <Input aria-label={t('payLaunch.desk.search')} placeholder={t('payLaunch.desk.search')} value={q} maxLength={80} onChange={(e) => setQ(e.target.value)} />
    {term.length >= 2 && state.status === 'ready' && (state.value.length === 0 ? <span className="small muted">{t('payLaunch.desk.noMatch')}</span>
      : <ul className="stack-sm">{state.value.map((p) => <li key={p.id}><Button size="sm" variant="secondary" onClick={() => onPick(p)}>{p.data.name ?? '—'} · {p.data.email ?? ''}</Button></li>)}</ul>)}
  </div>;
}

/**
 * PG-07 (and PG-06's other half): the desk takes the money — cash, card terminal or transfer — and records it
 * approved. For a held desk booking the server confirms the place in the same write; for a product it issues the pack.
 * The desk user is the payment's `createdBy`, which is "who took it" on the receipt and the report.
 */
export function DeskPaymentForm({ products, booking, person: fixedPerson, customerName, onDone }: { products: ProductRow[]; booking?: { id: string; person: string } | null; person?: string | null; customerName?: string; onDone: (paymentId: string) => void }) {
  const { t, lang } = useI18n();
  const cos = useCos();
  const action = useAction();
  const forBooking = !!booking;
  const choices = products.filter((p) => (forBooking ? p.data.key === 'single' : true));
  const [person, setPerson] = useState<PersonRec | null>(null);
  const [productId, setProductId] = useState(choices[0]?.id ?? '');
  const product = choices.find((p) => p.id === productId) ?? null;
  const [amount, setAmount] = useState(product ? String(product.data.price) : '');
  const [method, setMethod] = useState<PayMethod>('cash');
  const [reference, setReference] = useState(''), [reason, setReason] = useState('');
  const [affiliateOk, setAffiliateOk] = useState<boolean | null>(null);
  useEffect(() => { setAmount(product && product.data.kind !== 'private' ? String(product.data.price) : ''); setAffiliateOk(null); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  const payer = booking?.person ?? fixedPerson ?? person?.id ?? null;
  const differs = !!product && amount.trim() !== '' && Number(amount) !== product.data.price;
  const needsAffiliate = !!product && isAffiliateOnly(product);
  const locked = action.busy || action.uncertain;
  const edit = (f: () => void) => { f(); action.renew(); };
  const save = () => action.run(async (key) => {
    if (!cos) throw new CosError('disconnected');
    if (!payer || !product) throw new CosError('for_record_not_found');
    const id = await runPaymentOps(cos, deskOps({ person: payer, product, amount: Number(amount), method, reference, reason, today: dateKey(), booking: booking?.id ?? null, concept: product.data.name }), key);
    onDone(id);
  });
  return <form className="stack" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
    {forBooking ? <p>{t('payLaunch.desk.forBooking')}{customerName ? ` · ${customerName}` : ''}</p>
      : !fixedPerson && <Field label={t('payLaunch.desk.customer')} required>{() => <PersonPicker value={person} onPick={(p) => edit(() => setPerson(p))} />}</Field>}
    <Field label={t('payLaunch.desk.product')} required>{(id) => <Select id={id} name="product" value={productId} disabled={locked || forBooking} onChange={(e) => edit(() => setProductId(e.target.value))}>
      {choices.map((p) => <option key={p.id} value={p.id}>{p.data.name}{p.data.kind === 'private' ? '' : ` · ${formatCOP(p.data.price, lang)}`}</option>)}
    </Select>}</Field>
    {product?.data.kind === 'private' && <Notice>{t('payLaunch.desk.privateQuote')}</Notice>}
    {needsAffiliate && payer && <AffiliatePanel person={payer} onChange={setAffiliateOk} />}
    <Field label={t('payLaunch.desk.method')} required>{(id) => <Select id={id} name="method" value={method} disabled={locked} onChange={(e) => edit(() => setMethod(e.target.value as PayMethod))}>
      {DESK_METHODS.map((m) => <option key={m} value={m}>{t(`payLaunch.method.${m}`)}</option>)}
    </Select>}</Field>
    <Field label={t('payLaunch.desk.amount')} required>{(id) => <Input id={id} name="amount" type="number" inputMode="numeric" min={1} step={1} value={amount} disabled={locked} onChange={(e) => edit(() => setAmount(e.target.value))} />}</Field>
    {method !== 'cash' && <Field label={t('payLaunch.desk.reference')} required>{(id) => <Input id={id} name="reference" maxLength={120} value={reference} disabled={locked} onChange={(e) => edit(() => setReference(e.target.value))} />}</Field>}
    {differs && <><Notice tone="warn">{t('payLaunch.review.differs')}</Notice>
      <Field label={t('payLaunch.review.reason')} required>{(id) => <Input id={id} name="reason" maxLength={500} value={reason} disabled={locked} onChange={(e) => edit(() => setReason(e.target.value))} />}</Field></>}
    {needsAffiliate && affiliateOk === false && <Notice tone="warn">{t('payLaunch.affiliate.needed')}</Notice>}
    {action.uncertain ? <Notice tone="warn">{t('payLaunch.uncertain')}</Notice> : action.error && <p role="alert">{t(refusalKey(action.error), { code: action.error })}</p>}
    <Button type="submit" loading={action.busy} disabled={action.busy || !payer || !product || amount.trim() === '' || (needsAffiliate && affiliateOk === false)}>{t(action.uncertain ? 'payLaunch.retry' : 'payLaunch.desk.save')}</Button>
  </form>;
}
