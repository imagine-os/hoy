import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { addDaysKey, dateKey, formatCOP } from '../../../i18n/format';
import { useSession } from '../../../auth/SessionProvider';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Card } from '../../../components/molecule/Card/Card';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { batch, CosError, queryAll, refusalKey, type CosPort } from '../../transfers/launch/cos';
import { useAction, useCos, useLoad } from '../../transfers/launch/useCos';
import { byKey, createOps, datesSupported, opsDatesStored, editOps, undated, inForce, isAffiliateOnly, newPriceOps, PRODUCT_KINDS, validateProduct, type ProductData, type ProductRow } from './productMaster';

const readProducts = (cos: CosPort) => queryAll<ProductData>(cos, { entity: 'product' });
const readMaster = async (cos: CosPort) => { const [rows, dates] = await Promise.all([readProducts(cos), datesSupported(cos)]); return { rows, dates }; };
const blank = (): ProductData => ({ key: '', name: '', kind: 'pack', price: 0, credits: 1, validity_days: 30, freezable: false, audience: null, active: true, valid_from: dateKey(), valid_until: null });

type Editing = { mode: 'create'; draft: ProductData } | { mode: 'edit'; row: ProductRow; draft: ProductData } | { mode: 'price'; row: ProductRow; price: string; from: string };

/**
 * PR-01 / PR-02 / PR-03 / PR-05: the product master. Admin creates and edits; the front desk sees the same list
 * read-only (role matrix). A price change is a new period, never an edit of a row that may have sales.
 */
export function ProductMasterPage() {
  const { t, lang } = useI18n();
  const { role } = useSession();
  const canEdit = role === 'admin' || role === 'super_admin';
  const cos = useCos();
  const { state, reload } = useLoad(readMaster, []);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const action = useAction();
  const today = dateKey();

  if (state.status === 'loading') return <EmptyState tone="loading" title={t('payLaunch.loading')} />;
  if (state.status === 'error') return <EmptyState tone="error" title={t(refusalKey(state.code), { code: state.code })} action={<Button onClick={reload}>{t('payLaunch.retry')}</Button>} />;
  const { rows, dates } = state.value, groups = byKey(rows), live = new Set(inForce(rows, today).map((r) => r.id));

  const save = () => action.run(async (key) => {
    if (!cos || !editing) throw new CosError('disconnected');
    setProblem(null); setSaved(null);
    let ops;
    try {
      if (editing.mode === 'price') {
        if (!dates) throw new Error('dates_unsupported');
        const price = Number(editing.price);
        if (!Number.isInteger(price) || price < 0) throw new Error('price');
        ops = newPriceOps(editing.row, price, editing.from, rows);
      } else {
        const draft = dates ? editing.draft : undated(editing.draft);
        const p = validateProduct(draft, rows, editing.mode === 'edit' ? editing.row.id : null);
        if (p) throw new Error(p);
        ops = editing.mode === 'create' ? createOps(draft) : editOps(editing.row, draft);
      }
    } catch (e) { setProblem(e instanceof Error ? e.message : 'invalid'); return; }
    const ids = await batch(cos, ops, key);
    // G1: the server drops fields it doesn't know. Re-read and say so instead of claiming the dates were kept.
    if (!opsDatesStored(ops, ids, await readProducts(cos))) setProblem('datesNotStored');
    else setSaved('products.launch.saved');
    setEditing(null); reload();
  });

  const draftField = (patch: Partial<ProductData>) => { if (editing && editing.mode !== 'price') setEditing({ ...editing, draft: { ...editing.draft, ...patch } }); action.renew(); };

  return <div className="stack products-page">
    <div className="page-head"><h1>{t('products.title')}</h1>{canEdit && <Button onClick={() => { setProblem(null); setEditing({ mode: 'create', draft: blank() }); }}>{t('products.launch.add')}</Button>}</div>
    {!canEdit && <Notice>{t('products.launch.readOnly')}</Notice>}
    {saved && <p role="status">{t(saved)}</p>}
    {canEdit && !dates && <Notice tone="warn">{t('payLaunch.code.dates_unsupported')}</Notice>}
    {problem && !editing && <p role="alert">{t(`products.launch.error.${problem}`)}</p>}
    {groups.length === 0 ? <EmptyState title={t('products.empty')} /> : <div className="grid grid-2" data-testid="product-list">
      {groups.map((g) => { const current = g.rows.find((r) => live.has(r.id)) ?? null, head = current ?? g.rows[0]; return <Card key={g.key} title={head.data.name} data-testid={`product-${g.key}`}>
        <div className="stack-sm">
          <span className="small">{g.key} · {t(`products.launch.kind.${head.data.kind}`)}{head.data.credits ? ` · ${head.data.credits} ${t('products.classes')}` : ''}{head.data.validity_days ? ` · ${head.data.validity_days} ${t('products.validity')}` : ''}</span>
          {isAffiliateOnly(head) && <Badge tone="highlight">{t('products.launch.affiliateOnly')}</Badge>}
          {head.data.kind === 'private' && <Badge>{t('products.launch.noPublicPrice')}</Badge>}
          <strong>{current ? formatCOP(current.data.price, lang) : t('products.launch.notOnSale')}</strong>
          <ul className="stack-sm">{g.rows.map((r) => <li key={r.id} className="small" data-testid="price-period">
            {formatCOP(r.data.price, lang)} · {r.data.valid_from ?? '…'} – {r.data.valid_until ?? '∞'} {r.data.active === false ? `· ${t('products.inactive')}` : live.has(r.id) ? `· ${t('products.launch.inForce')}` : ''}
            {canEdit && <> <Button size="sm" variant="ghost" onClick={() => { setProblem(null); setEditing({ mode: 'edit', row: r, draft: { ...r.data } }); }}>{t('products.launch.edit')}</Button>
              {dates && live.has(r.id) && <Button size="sm" variant="ghost" onClick={() => { setProblem(null); setEditing({ mode: 'price', row: r, price: String(r.data.price), from: addDaysKey(today, 1) }); }}>{t('products.launch.newPrice')}</Button>}</>}
          </li>)}</ul>
        </div>
      </Card>; })}
    </div>}
    {editing && <Card title={t(editing.mode === 'create' ? 'products.launch.add' : editing.mode === 'price' ? 'products.launch.newPrice' : 'products.launch.edit')}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate><fieldset className="stack" disabled={action.busy}>
        {editing.mode === 'price' ? <>
          <p className="small">{t('products.launch.newPriceNote')}</p>
          <div className="grid grid-2">
            <Field label={t('products.amount')} required>{(id) => <Input id={id} name="price" type="number" min={0} step={1} value={editing.price} onChange={(e) => { setEditing({ ...editing, price: e.target.value }); action.renew(); }} />}</Field>
            <Field label={t('products.starts')} required>{(id) => <Input id={id} name="from" type="date" value={editing.from} onChange={(e) => { setEditing({ ...editing, from: e.target.value }); action.renew(); }} />}</Field>
          </div>
        </> : <>
          <div className="grid grid-2">
            <Field label={t('products.code')} required>{(id) => <Input id={id} name="key" maxLength={40} value={editing.draft.key} disabled={editing.mode === 'edit'} onChange={(e) => draftField({ key: e.target.value.toLowerCase() })} />}</Field>
            <Field label={t('products.launch.name')} required>{(id) => <Input id={id} name="name" maxLength={100} value={editing.draft.name} onChange={(e) => draftField({ name: e.target.value })} />}</Field>
            <Field label={t('products.type')} required>{(id) => <Select id={id} name="kind" value={editing.draft.kind} disabled={editing.mode === 'edit'} onChange={(e) => draftField({ kind: e.target.value as ProductData['kind'] })}>{PRODUCT_KINDS.map((k) => <option key={k} value={k}>{t(`products.launch.kind.${k}`)}</option>)}</Select>}</Field>
            <Field label={t('products.amount')} required>{(id) => <Input id={id} name="price" type="number" min={0} step={1} value={editing.draft.price} disabled={editing.mode === 'edit'} onChange={(e) => draftField({ price: Number(e.target.value) })} />}</Field>
            <Field label={t('products.classes')}>{(id) => <Input id={id} name="credits" type="number" min={0} step={1} value={editing.draft.credits ?? ''} onChange={(e) => draftField({ credits: e.target.value === '' ? null : Number(e.target.value) })} />}</Field>
            <Field label={t('products.validity')}>{(id) => <Input id={id} name="validity" type="number" min={0} step={1} value={editing.draft.validity_days ?? ''} onChange={(e) => draftField({ validity_days: e.target.value === '' ? null : Number(e.target.value) })} />}</Field>
            {dates && <Field label={t('products.starts')}>{(id) => <Input id={id} name="valid_from" type="date" value={editing.draft.valid_from ?? ''} onChange={(e) => draftField({ valid_from: e.target.value || null })} />}</Field>}
            {dates && <Field label={t('products.ends')}>{(id) => <Input id={id} name="valid_until" type="date" value={editing.draft.valid_until ?? ''} onChange={(e) => draftField({ valid_until: e.target.value || null })} />}</Field>}
          </div>
          <Toggle label={t('products.launch.affiliateOnly')} checked={isAffiliateOnly({ data: editing.draft })} onChange={(on) => draftField({ audience: on ? 'affiliate' : null })} />
          <Toggle label={t('products.launch.freezable')} checked={!!editing.draft.freezable} onChange={(on) => draftField({ freezable: on })} />
          <Toggle label={t('products.launch.active')} checked={editing.draft.active !== false} onChange={(on) => draftField({ active: on })} />
          {editing.mode === 'edit' && <p className="small muted">{t('products.launch.priceLocked')}</p>}
        </>}
        {problem && <p role="alert">{t(`products.launch.error.${problem}`)}</p>}
        {action.error && <p role="alert">{t(refusalKey(action.error), { code: action.error })}</p>}
        <div className="row wrap"><Button type="submit" loading={action.busy}>{t('products.launch.save')}</Button><Button type="button" variant="ghost" onClick={() => { setEditing(null); setProblem(null); }}>{t('products.cancel')}</Button></div>
      </fieldset></form>
    </Card>}
  </div>;
}
