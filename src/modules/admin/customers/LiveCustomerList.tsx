import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatDate } from '../../../i18n/format';
import { useMinWidth } from '../../../layout/useMinWidth';
import { Card } from '../../../components/molecule/Card/Card';
import { Input } from '../../../components/atom/Input/Input';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { DataTable, type DataTableColumn } from '../../../components/organism/DataTable/DataTable';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { useCosQueries, type CosRow } from '../../staff/desk/useCos';
import { deskErrorText } from '../../staff/desk/strings';
import { maskPhone, personMatches, type Person } from '../../staff/people';
import { BALANCE_QUERIES, customerListRows, type QueryRow } from './customerBalances';


/** AD-07 in the production build: every customer (a person with a member record), with package, classes left, expiry and vouchers. */
export function LiveCustomerList() {
  const { t, lang } = useI18n();
  const desktop = useMinWidth('shell');
  const [search, setSearch] = useState('');
  const q = useCosQueries({
    people: { entity: 'person', filter: { exists: 'member', via: 'person', where: { all: true } }, sort: [{ field: 'name', dir: 'asc' }] },
    products: { entity: 'product' },
    ...BALANCE_QUERIES,
  } as never);
  const rows = useMemo(() => {
    const r = q.rows as Record<'people' | 'products' | 'lots' | 'left' | 'vouchers', QueryRow[]> | null;
    if (!r) return [];
    return customerListRows(r, dateKey(new Date())).map((c) => {
      const person: Person = { id: c.id, name: c.name, initials: '', email: c.email, phone: c.phone, role: 'customer', profileId: null, birthday: null, notes: null, marketingOptin: false, whatsappVerified: false, createdAt: c.createdAt };
      return { ...person, plan_name: c.plan_name, remaining: c.remaining, expires: c.expires, frozen: c.frozen, vouchers: c.vouchers };
    }).filter(p => personMatches(p, search));
  }, [q.rows, search]);
  // The credit aggregate answers at most 1000 lots and the people query stops at 5000 rows: say so rather than undercount.
  const capped = !!q.rows && (((q.rows as Record<string, CosRow[]>).left?.length ?? 0) >= 1000 || ((q.rows as Record<string, CosRow[]>).people?.length ?? 0) >= 5000);
  type Row = (typeof rows)[number];
  const columns: DataTableColumn<Row>[] = [
    { key: 'name', label: t('admin.crm.col.member'), render: r => <span><span className="small">{r.name}</span><span className="xs muted"> · {maskPhone(r.phone)}</span></span> },
    { key: 'plan_name', label: t('admin.crm.col.plan'), render: r => r.plan_name ? <span className="row"><span className="small">{r.plan_name}</span>{r.frozen && <Badge tone="warn">{t('admin.crm.frozen')}</Badge>}</span> : <span className="muted small">{t('admin.crm.noPlan')}</span> },
    { key: 'remaining', label: t('admin.crm.col.remaining'), align: 'right' },
    { key: 'expires', label: t('admin.crm.col.expires'), render: r => r.expires ? formatDate(r.expires, lang) : '—' },
    { key: 'vouchers', label: t('admin.crm.col.vouchers'), align: 'right' },
  ];
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.crm.title')}</h1><p className="muted small">{t('admin.crm.subtitle')}</p></div>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.crm.search')} style={{ width: 260 }} aria-label={t('core.common.search')} />
      </div>
      {capped && <p className="xs register-diff" role="status">{t('admin.crm.live.capped')}</p>}
      {!q.request && <EmptyState compact tone="error" title={t('core.common.error')} body={deskErrorText('disconnected', t)} />}
      {q.error && <EmptyState compact tone="error" title={t('core.common.error')} body={deskErrorText(q.error, t)} action={<Button size="sm" onClick={q.reload}>{t('core.common.retry')}</Button>} />}
      {q.loading && !q.rows ? <EmptyState tone="loading" title={t('core.common.loading')} /> : q.rows && rows.length === 0 ? <EmptyState title={t('admin.crm.emptySeg')} /> : (
        desktop ? <DataTable<Row> columns={columns} rows={rows} rowKey={r => r.id} dense /> :
        <div className="stack-sm">{rows.map(r => <Card key={r.id} padding="sm">
          <strong className="crm-name">{r.name}</strong>
          <div className="small">{r.plan_name || t('admin.crm.noPlan')}{r.frozen && <Badge tone="warn">{t('admin.crm.frozen')}</Badge>}</div>
          <div className="row wrap small"><span>{t('admin.crm.col.remaining')}: <strong>{r.remaining}</strong></span><span>{t('admin.crm.col.vouchers')}: {r.vouchers}</span></div>
          <div className="small muted">{t('admin.crm.col.expires')}: {r.expires ? formatDate(r.expires, lang) : '—'}</div>
        </Card>)}</div>
      )}
    </div>
  );
}
