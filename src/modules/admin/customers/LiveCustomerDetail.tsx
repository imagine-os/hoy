import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '../../../data/DataContext';
import { useSession } from '../../../auth/SessionProvider';
import { useI18n } from '../../../i18n/I18nProvider';
import { cosRequest, errorCode, createActionKeys, type CosRequest } from '../../staff/desk/wire';
import { refusalCopy } from '../../../data/companyos/refusals';
import { Card } from '../../../components/molecule/Card/Card';
import { Field } from '../../../components/molecule/Field/Field';
import { Input } from '../../../components/atom/Input/Input';
import { Button } from '../../../components/atom/Button/Button';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { PRODUCTION_BUILD } from '../../../config/launch';
import { useCustomerRoute } from './useCustomerRoute';
import { readCustomer, saveCustomer, customerForm, customerErrors, type CustomerDetail, type CustomerForm } from './customerDetail';

/** A production client is a Company OS person with a member facet; its URL carries the person id, never a login id. */
export function LiveCustomerDetail({ embedded = false, personId }: { embedded?: boolean; personId?: string }) {
  const { id: routeId = '' } = useParams();
  const data = useData();
  const { user, role, can, viewAs } = useSession();
  const request = cosRequest(data);
  const route = useCustomerRoute(data,personId ?? routeId,user.id,JSON.stringify([role,viewAs,can('members.write')]),PRODUCTION_BUILD&&!personId);
  const { t } = useI18n();
  if (route.loading) return <EmptyState tone="loading" title={t('core.common.loading')} />;
  if (route.error || !route.ids) return <EmptyState tone="error" title={t('admin.client.title')} body={t('admin.client.identity')} action={<Button onClick={route.retry}>{t('core.common.retry')}</Button>} />;
  const id = route.ids.personId;
  return <CustomerDetailView key={`${id}:${user.id}:${role}:${viewAs ?? "live"}`} id={id} request={request} writable={!viewAs && can('members.write')} embedded={embedded} />;
}
function CustomerDetailView({ id, request, writable, embedded }: { id: string; request: CosRequest | null; writable: boolean; embedded: boolean }) {
  const { t, lang } = useI18n();
  const [record, setRecord] = useState<CustomerDetail | null>(null);
  const [form, setForm] = useState<CustomerForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  const saving = useRef(false);
  const keys = useRef(createActionKeys());
  const context = useRef({ request, writable });
  context.current = {request,writable};
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    setRecord(null); setForm(null); setError(null); setSaved(false); setLoading(true);
    if (!request) { setLoading(false); setError('disconnected'); return; }
    readCustomer(request,id).then(result => {
      if (current) { setRecord(result); setForm(customerForm(result.person)); setLoading(false); }
    }).catch(e => { if (current) { setError(errorCode(e)); setLoading(false); } });
    return () => { current = false; };
  }, [request,id,revision]);
  const message = (code: string) => {
    if (code === 'customer_missing') return t('admin.client.missing');
    if (code === 'customer_unconfirmed') return t('admin.client.unconfirmed');
    if (code === 'customer_validation') return t('admin.client.invalid');
    if (code === 'ifMatch mismatch' || code === 'ifmatch_mismatch' || code === 'conflict') return t('admin.client.stale');
    return refusalCopy(code,lang);
  };
  const reload = <Button variant="secondary" onClick={() => setRevision(n=>n+1)} disabled={busy}>{t('core.common.retry')}</Button>;
  const back = embedded ? null : <Link to="/admin/crm">← {t('admin.crm.title')}</Link>;
  if (loading) return <div className="stack">{back}<EmptyState tone="loading" title={t('core.common.loading')} /></div>;
  if (!record || !form) return <div className="stack">{back}<EmptyState tone="error" title={t('admin.client.title')} body={message(error ?? 'failed')} action={reload} /></div>;
  const invalid = customerErrors(form);
  return <div className="stack">
    {back}
    {!embedded && <div className="page-head"><div><h1>{String(record.person.data.name ?? '')}</h1><p className="muted small">{t('admin.client.title')}</p></div></div>}
    <Card title={embedded ? t('admin.client.title') : undefined}><form className="stack" onSubmit={async e => {
      e.preventDefault();
      if (!request || !writable || saving.current || Object.keys(invalid).length) return;
      saving.current=true; setBusy(true); setError(null); setSaved(false);
      const snapshot=record, values={...form}, intent=[id,snapshot,values];
      const cancelled=()=>!alive.current || context.current.request!==request || !context.current.writable;
      try {
        const result=await saveCustomer(request,snapshot,values,keys.current.keyFor(intent),cancelled);
        if (cancelled()) return;
        keys.current.done(intent); setRecord(result); setForm(customerForm(result.person)); setSaved(true);
      } catch (err) { if (!cancelled()) setError(errorCode(err)); }
      finally { saving.current=false; if (alive.current) setBusy(false); }
    }}>
      <div className="small"><strong>{t('admin.client.email')}: </strong>{String(record.person.data.email || '—')}</div>
      <p className="small muted">{t('admin.client.boundary')}</p>
      <div className="grid grid-2">{(['name','phone','dob','emergency_contact_name','emergency_contact_phone'] as const).map(field =>
        <Field key={field} label={t(`admin.client.${field}`)} required={field==='name'} error={invalid[field]?t('admin.client.invalid'):undefined}>
          {fieldId => <Input id={fieldId} type={field==='dob'?'date':field.includes('phone')?'tel':'text'} maxLength={field.includes('phone')?40:200} value={form[field]} disabled={!writable || busy} onChange={e=>{setForm({...form,[field]:e.target.value});setSaved(false);}} />}
        </Field>
      )}</div>
      {error && <Notice tone="danger">{message(error)}</Notice>}
      {saved && <Notice tone="success">{t('admin.client.saved')}</Notice>}
      {writable ? <div className="row wrap"><Button type="submit" disabled={busy || Object.keys(invalid).length>0} loading={busy}>{t('admin.client.save')}</Button>{reload}</div> : <Notice tone="info">{t('admin.client.readOnly')}</Notice>}
    </form></Card>
  </div>;
}
