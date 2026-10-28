import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatCOP } from '../../../i18n/format';
import { downloadCsv } from '../../../data/reportCsv';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Card } from '../../../components/molecule/Card/Card';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import type { ProductData } from '../../products/launch/productMaster';
import { memberNames, queryAll, refusalKey, type CosPort } from './cos';
import { paymentsReport, type InvoiceRec, type PaymentRec } from './payments';
import { useLoad } from './useCos';

const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export async function readReport(cos: CosPort, from: string, to: string) {
  const payments = await queryAll<PaymentRec['data']>(cos, { entity: 'payment', filter: { and: [{ field: 'status', op: 'eq', value: 'approved' }, { field: 'date', op: 'gte', value: from }, { field: 'date', op: 'lte', value: to }] } }, 20_000);
  const ids = payments.map((p) => p.id), personIds = [...new Set(payments.map((p) => p.data.person).filter((x): x is string => !!x))];
  const [invoices, products, members, persons] = await Promise.all([
    Promise.all(chunks(ids, 200).map((c) => queryAll<InvoiceRec['data']>(cos, { entity: 'invoice', filter: { field: 'payment', op: 'in', value: c } }))).then((x) => x.flat()),
    queryAll<ProductData>(cos, { entity: 'product' }),
    memberNames(cos),
    Promise.all(chunks(personIds, 200).map((c) => queryAll<{ name?: string; email?: string }>(cos, { entity: 'person', filter: { field: 'id', op: 'in', value: c } }))).then((x) => x.flat()),
  ]);
  return { payments, invoices, products, members, people: new Map(persons.map((p) => [p.id, p.data.name || p.data.email || ''])) };
}

/** PG-10: confirmed payments by date range — method, product, who recorded and who confirmed — as CSV for Excel. */
export function PaymentsReportPage() {
  const { t, lang } = useI18n();
  const today = dateKey();
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`), [to, setTo] = useState(today);
  const inverted = from > to;
  const { state, reload } = useLoad(inverted || !from || !to ? null : (c) => readReport(c, from, to), [from, to]);
  const report = state.status === 'ready' ? paymentsReport({ ...state.value, from, to, methodLabel: (m) => t(`payLaunch.method.${m || 'other'}`) }) : null;
  return <div className="stack">
    <h1>{t('payLaunch.report.title')}</h1>
    <Notice>{t('payLaunch.report.note')}</Notice>
    <div className="row wrap">
      <Field label={t('payLaunch.report.from')}>{(id) => <Input id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
      <Field label={t('payLaunch.report.to')}>{(id) => <Input id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
    </div>
    {inverted ? <p role="alert">{t('payLaunch.report.inverted')}</p>
      : state.status === 'loading' ? <EmptyState tone="loading" title={t('payLaunch.loading')} />
        : state.status === 'error' ? <EmptyState tone="error" title={t(refusalKey(state.code), { code: state.code })} action={<Button onClick={reload}>{t('payLaunch.retry')}</Button>} />
          : report && <Card>
            <div className="stack">
              <strong data-testid="report-summary">{t('payLaunch.report.count', { count: report.rows.length, total: formatCOP(report.total, lang) })}</strong>
              <Button disabled={report.rows.length === 0} onClick={() => downloadCsv(report.csv, `pagos-${from}-${to}.csv`)}>{t('payLaunch.report.download')}</Button>
              <div style={{ overflowX: 'auto' }}><table className="table">
                <thead><tr>{['date', 'number', 'customer', 'product', 'method', 'amount', 'confirmer'].map((c) => <th key={c}>{t(`payLaunch.report.col.${c}`)}</th>)}</tr></thead>
                <tbody>{report.rows.map((r) => <tr key={String(r[10])}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{formatCOP(r[5] as number, lang)}</td><td>{r[8]}</td></tr>)}</tbody>
              </table></div>
            </div>
          </Card>}
  </div>;
}
