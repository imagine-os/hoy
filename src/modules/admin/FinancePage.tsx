import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, PaymentRow, PlanRow } from '../../data/schema';
import { formatCOP, formatDateTime } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { BarList } from '../../components/molecule/BarList/BarList';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import { usePeople } from '../staff/people';
import { useSettings } from './settings';
import './admin.css';

interface InvoiceRow extends BaseRow { payment_id: string; number: string; subtotal: number; tax: number; total: number; issued_at: string; dian_cufe: string | null }
type Range = '7d' | '30d' | '90d' | 'all';

/** M-09 — revenue by product and method, pending, refunds, Wompi payouts placeholder, invoices with the DIAN reference. */
export function FinancePage() {
  const { t, lang, bi } = useI18n();
  const data = useData();
  const { can } = useSession();
  const audit = useAudit('admin');
  const { settings } = useSettings();
  const { rows: payments, loading } = useTable<PaymentRow>('payments', { orderBy: { column: 'created_at', dir: 'desc' } });
  const { rows: invoices } = useTable<InvoiceRow>('invoices', { orderBy: { column: 'issued_at', dir: 'desc' } });
  const { rows: plans } = useTable<PlanRow>('plans');
  const { byId } = usePeople();
  const [range, setRange] = useState<Range>('30d');
  const since = range === 'all' ? 0 : Date.now() - Number(range.replace('d', '')) * 86400e3;
  const inRange = useMemo(() => payments.filter((p) => new Date(p.paid_at ?? p.created_at).getTime() >= since), [payments, since]);
  const approved = inRange.filter((p) => p.status === 'approved');
  const revenue = approved.reduce((a, p) => a + p.amount, 0);
  const pending = inRange.filter((p) => p.status === 'pending');
  const refunded = inRange.filter((p) => p.status === 'refunded');
  const planMap = new Map(plans.map((p) => [p.id, p]));
  const byProduct = useMemo(() => { const m = new Map<string, number>(); for (const p of approved) { const k = p.plan_id ?? '—'; m.set(k, (m.get(k) ?? 0) + p.amount); } return [...m.entries()].map(([id, value]) => ({ id, label: planMap.get(id) ? bi({ es: planMap.get(id)!.name_es, en: planMap.get(id)!.name_en }) : id, value })).sort((a, b) => b.value - a.value); }, [approved, planMap, bi]);
  const byMethod = useMemo(() => { const m = new Map<string, number>(); for (const p of approved) m.set(p.method, (m.get(p.method) ?? 0) + p.amount); return [...m.entries()].map(([id, value]) => ({ id, label: t(`admin.finance.method.${id}`), value })).sort((a, b) => b.value - a.value); }, [approved, t]);
  const wompiShare = revenue ? Math.round((approved.filter((p) => p.provider === 'wompi').reduce((a, p) => a + p.amount, 0) / revenue) * 100) : 0;
  const canRefund = can('payments.refund');
  const invByPayment = new Map(invoices.map((i) => [i.payment_id, i]));

  const refund = async (p: PaymentRow) => {
    if (!canRefund || !confirm(t('admin.finance.refund.confirm', { amount: formatCOP(p.amount, lang) }))) return;
    await data.update('payments', p.id, { status: 'refunded' });
    await audit('payment.refund', 'payments', p.id, { before: p.status, after: 'refunded', amount: p.amount, user_id: p.user_id });
  };

  const payCols: DataTableColumn<PaymentRow>[] = [
    { key: 'paid_at', label: t('admin.finance.col.when'), render: (p) => <span className="mono small">{formatDateTime(p.paid_at ?? p.created_at, lang)}</span> },
    { key: 'user_id', label: t('admin.finance.col.member'), render: (p) => byId.get(p.user_id)?.name ?? p.user_id },
    { key: 'plan_id', label: t('admin.finance.col.product'), render: (p) => planMap.get(p.plan_id ?? '')?.name_es ?? '—' },
    { key: 'amount', label: t('admin.finance.col.amount'), align: 'right', render: (p) => formatCOP(p.amount, lang) },
    { key: 'method', label: t('admin.finance.col.method'), render: (p) => `${t(`admin.finance.method.${p.method}`)} · ${p.provider}` },
    { key: 'status', label: t('admin.finance.col.status'), render: (p) => <Badge tone={toneForStatus(p.status)}>{p.status}</Badge> },
    { key: 'invoice', label: 'DIAN', sortable: false, render: (p) => { const inv = invByPayment.get(p.id); return inv ? <span className="xs mono">{inv.number}{inv.dian_cufe ? ` · ${inv.dian_cufe.slice(0, 10)}…` : ` · ${t('admin.finance.noCufe')}`}</span> : <span className="muted">—</span>; } },
    ...(canRefund ? [{ key: 'actions', label: '', sortable: false, render: (p: PaymentRow) => p.status === 'approved' ? <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); refund(p); }}>{t('admin.finance.refund')}</Button> : null }] : []),
  ];
  const invCols: DataTableColumn<InvoiceRow>[] = [
    { key: 'number', label: t('admin.finance.col.invoice'), mono: true },
    { key: 'issued_at', label: t('admin.finance.col.when'), render: (i) => <span className="mono small">{formatDateTime(i.issued_at, lang)}</span> },
    { key: 'subtotal', label: 'Subtotal', align: 'right', render: (i) => formatCOP(i.subtotal, lang) },
    { key: 'tax', label: `IVA ${settings.tax.ivaPct}%`, align: 'right', render: (i) => formatCOP(i.tax, lang) },
    { key: 'total', label: 'Total', align: 'right', render: (i) => formatCOP(i.total, lang) },
    { key: 'dian_cufe', label: t('admin.finance.col.cufe'), render: (i) => i.dian_cufe ? <code className="xs">{i.dian_cufe}</code> : <Badge tone={settings.tax.eInvoicing ? 'warn' : 'neutral'}>{settings.tax.eInvoicing ? t('admin.finance.cufe.pending') : t('admin.finance.cufe.off')}</Badge> },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.finance.title')}</h1><p className="muted small">{t('admin.finance.subtitle')}</p></div>
        <div className="row" role="tablist">{(['7d', '30d', '90d', 'all'] as Range[]).map((r) => <Chip key={r} selected={range === r} onClick={() => setRange(r)}>{t(`admin.finance.range.${r}`)}</Chip>)}</div>
      </div>
      {loading && payments.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      <div className="grid grid-4">
        <StatTile label={t('admin.finance.revenue')} value={formatCOP(revenue, lang)} hint={t('admin.finance.revenue.hint', { n: approved.length })} trend={revenue > 0 ? 'up' : 'flat'} />
        <StatTile label={t('admin.finance.pending')} value={formatCOP(pending.reduce((a, p) => a + p.amount, 0), lang)} hint={t('admin.finance.pending.hint', { n: pending.length })} />
        <StatTile label={t('admin.finance.refunded')} value={formatCOP(refunded.reduce((a, p) => a + p.amount, 0), lang)} hint={t('admin.finance.refunded.hint', { n: refunded.length })} trend={refunded.length ? 'down' : 'flat'} />
        <StatTile label={t('admin.finance.wompiShare')} value={`${wompiShare}%`} hint={t('admin.finance.wompiShare.hint')} />
      </div>
      <div className="grid grid-2">
        <Card title={t('admin.finance.byProduct')}><BarList items={byProduct} format={(v) => formatCOP(v, lang)} emptyText={t('admin.finance.emptyRange')} /></Card>
        <Card title={t('admin.finance.byMethod')}><BarList items={byMethod} format={(v) => formatCOP(v, lang)} emptyText={t('admin.finance.emptyRange')} /></Card>
      </div>
      <Card tone="muted" title={t('admin.finance.payouts')} eyebrow="Wompi" actions={<Badge tone={settings.integrations.wompi === 'connected' ? 'success' : 'warn'}>{settings.integrations.wompi}</Badge>}>
        <div className="grid grid-3">
          <StatTile label={t('admin.finance.payouts.next')} value="—" hint={t('admin.finance.payouts.placeholder')} />
          <StatTile label={t('admin.finance.payouts.settled')} value={formatCOP(approved.filter((p) => p.provider === 'wompi').reduce((a, p) => a + p.amount, 0), lang)} hint={t('admin.finance.payouts.settled.hint')} />
          <StatTile label={t('admin.finance.payouts.manual')} value={formatCOP(approved.filter((p) => p.provider === 'manual').reduce((a, p) => a + p.amount, 0), lang)} hint={t('admin.finance.payouts.manual.hint')} />
        </div>
        <p className="xs muted" style={{ marginTop: 12 }}>{t('admin.finance.payouts.body')} <Link to="/admin/settings">{t('core.nav.settings')}</Link></p>
      </Card>
      <section className="stack-sm">
        <div className="row-between wrap"><div className="eyebrow">{t('admin.finance.payments')}</div>{!canRefund && <span className="xs muted">{t('admin.finance.refund.noPermission')}</span>}</div>
        <DataTable columns={payCols} rows={inRange} rowKey={(p) => p.id} dense pageSize={25} emptyText={t('admin.finance.emptyRange')} />
      </section>
      <section className="stack-sm">
        <div className="row-between wrap"><div className="eyebrow">{t('admin.finance.invoices')}</div><span className="xs muted">{settings.tax.eInvoicing ? t('admin.finance.einv.on') : t('admin.finance.einv.off')}</span></div>
        <DataTable columns={invCols} rows={invoices.filter((i) => new Date(i.issued_at).getTime() >= since)} rowKey={(i) => i.id} dense pageSize={25} emptyText={t('admin.finance.emptyRange')} />
      </section>
    </div>
  );
}
