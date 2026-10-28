import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP, formatDate, formatDateTime } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { memberNames, myPerson, queryAll, refusalKey, type CosPort } from '../../transfers/launch/cos';
import type { InvoiceRec, PaymentRec } from '../../transfers/launch/payments';
import type { ProductData } from '../../products/launch/productMaster';
import { useLoad } from '../../transfers/launch/useCos';

export interface ReceiptView { payment: PaymentRec; invoice: InvoiceRec | null; product: string | null; customer: string | null; recorder: string | null }

/**
 * PG-08: the "Nota de compra" (J9, no VAT). The server numbers it when the payment is approved (payments
 * `payment_document: receipt`); the browser never numbers, prices or re-totals it. Comms emails the same document
 * on `payment.approved` (H-9 owns the template).
 */
export async function readReceipt(cos: CosPort, paymentId: string, staff: boolean): Promise<ReceiptView> {
  const payment = (await cos.request<{ data: PaymentRec }>('GET', `/api/payment/${encodeURIComponent(paymentId)}`)).data;
  const [invoices, product, person, members] = await Promise.all([
    queryAll<InvoiceRec['data']>(cos, { entity: 'invoice', filter: { field: 'payment', op: 'eq', value: payment.id } }),
    payment.data.product ? cos.request<{ data: { data: ProductData } }>('GET', `/api/product/${encodeURIComponent(payment.data.product)}`).then((r) => r.data.data.name, () => null) : Promise.resolve(null),
    payment.data.person ? cos.request<{ data: { data: { name?: string } } }>('GET', `/api/person/${encodeURIComponent(payment.data.person)}`).then((r) => r.data.data.name ?? null, () => null) : Promise.resolve(null),
    // Members' names are staff information: a customer's screen never asks for the list.
    staff ? memberNames(cos).catch(() => new Map<string, string>()) : Promise.resolve(new Map<string, string>()),
  ]);
  const invoice = invoices.find((i) => (i.data.kind ?? 'invoice') === 'receipt') ?? null;
  return { payment, invoice, product, customer: person, recorder: payment.createdBy ? members.get(payment.createdBy) ?? null : null };
}

export function NotaDeCompra({ view }: { view: ReceiptView }) {
  const { t, lang } = useI18n();
  const { payment, invoice } = view;
  if (payment.data.status !== 'approved') return <Notice>{t('payLaunch.receipt.pending')}</Notice>;
  if (!invoice) return <Notice tone="warn">{t('payLaunch.receipt.notIssued')}</Notice>;
  return <Card data-launch-receipt>
    <div className="stack-sm receipt" data-testid="nota-de-compra">
      <strong>{tenant.name}</strong>
      <h2>{t('payLaunch.receipt.number', { number: invoice.data.number ?? '' })}</h2>
      <span className="small">{t('payLaunch.receipt.noVat')}</span>
      <span>{t('payLaunch.receipt.issued')}: {invoice.data.issued_at ? formatDateTime(invoice.data.issued_at, lang) : formatDate(`${payment.data.date}T12:00:00Z`, lang, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      {view.customer && <span>{t('payLaunch.receipt.customer')}: {view.customer}</span>}
      <span>{t('payLaunch.receipt.item')}: {view.product ?? payment.data.concept ?? ''}</span>
      <span>{t('payLaunch.receipt.method')}: {t(`payLaunch.method.${payment.data.method ?? 'other'}`)}</span>
      <strong data-testid="receipt-total">{t('payLaunch.receipt.total')}: {formatCOP(invoice.data.total ?? payment.data.amount, lang)}</strong>
      {view.recorder && <span className="small">{t('launchReceipt.recorder.named', { name: view.recorder })}</span>}
      <span className="small muted">{t('payLaunch.receipt.emailed')}</span>
    </div>
  </Card>;
}

function ReceiptPage({ staff }: { staff: boolean }) {
  const { paymentId = '' } = useParams();
  const { t } = useI18n();
  const { state, reload } = useLoad((c) => readReceipt(c, paymentId, staff), [paymentId, staff]);
  if (state.status === 'loading') return <EmptyState tone="loading" title={t('payLaunch.loading')} />;
  if (state.status === 'error') return <EmptyState tone="error" title={t(refusalKey(state.code), { code: state.code })} action={<Button onClick={reload}>{t('payLaunch.retry')}</Button>} />;
  return <div className="stack">
    <div className="page-head"><h1>{t('payLaunch.receipt.title')}</h1><Button variant="secondary" onClick={() => window.print()}>{t('payLaunch.receipt.print')}</Button></div>
    <NotaDeCompra view={state.value} />
  </div>;
}
export const CustomerReceiptPage = () => <ReceiptPage staff={false} />;
export const StaffReceiptPage = () => <ReceiptPage staff />;

/** The customer's own payments (row policies limit the query to theirs), each linking to its Nota de compra. */
export function MyReceiptsPage() {
  const { t, lang } = useI18n();
  const { state, reload } = useLoad(async (c) => {
    const me = await myPerson(c);
    return me ? queryAll<PaymentRec['data']>(c, { entity: 'payment', filter: { field: 'person', op: 'eq', value: me.id } }) : [];
  }, []);
  if (state.status === 'loading') return <EmptyState tone="loading" title={t('payLaunch.loading')} />;
  if (state.status === 'error') return <EmptyState tone="error" title={t(refusalKey(state.code), { code: state.code })} action={<Button onClick={reload}>{t('payLaunch.retry')}</Button>} />;
  const rows = [...state.value].sort((a, b) => (b.data.date ?? '').localeCompare(a.data.date ?? ''));
  return <div className="stack">
    <h1>{t('payLaunch.receipts.title')}</h1>
    {rows.length === 0 ? <EmptyState title={t('payLaunch.receipts.empty')} /> : rows.map((p) => <Card key={p.id}>
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div className="stack-sm"><span>{p.data.concept ?? ''}</span><span className="small">{p.data.date} · {formatCOP(p.data.amount, lang)}</span></div>
        <div className="row"><Badge tone={p.data.status === 'approved' ? 'success' : p.data.status === 'pending' ? 'warn' : 'neutral'}>{t(`payLaunch.status.${p.data.status ?? 'approved'}`)}</Badge>
          {p.data.status === 'approved' && <Link className="btn btn-secondary" to={`/app/receipts/${p.id}`}>{t('payLaunch.receipt.title')}</Link>}</div>
      </div>
    </Card>)}
  </div>;
}
