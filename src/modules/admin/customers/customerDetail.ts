import type { CosRequest, BatchOp } from '../../staff/desk/wire';
export interface CustomerPerson { id: string; data: Record<string, unknown> }
export interface CustomerDetail { person: CustomerPerson; memberId: string }
const FIELDS = ['name', 'phone', 'dob', 'emergency_contact_name', 'emergency_contact_phone'] as const;
export type CustomerForm = Record<(typeof FIELDS)[number], string>;
const text = (v: unknown) => typeof v === 'string' ? v : '';
export function customerForm(person: CustomerPerson): CustomerForm {
  return Object.fromEntries(FIELDS.map(k => [k, text(person.data[k])])) as CustomerForm;
}
export function customerErrors(form: CustomerForm): Partial<Record<keyof CustomerForm, boolean>> {
  const errors: Partial<Record<keyof CustomerForm, boolean>> = {};
  if (form.name.trim().length < 2 || form.name.length > 200) errors.name = true;
  for (const k of ['phone', 'emergency_contact_phone'] as const) {
    if (form[k] && (!/^[+()\d .-]+$/.test(form[k]) || form[k].replace(/\D/g, '').length < 7 || form[k].replace(/\D/g, '').length > 15)) errors[k] = true;
  }
  if (form.emergency_contact_name.length > 200) errors.emergency_contact_name = true;
  if (form.dob) {
    const [y,m,d] = form.dob.split('-').map(Number), date = new Date(0);
    date.setUTCFullYear(y,m-1,d); date.setUTCHours(0,0,0,0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob) || y < 1 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m-1 || date.getUTCDate() !== d) errors.dob = true;
  }
  return errors;
}
/** The request is the authenticated tenant-bound DataProvider seam. Never query another tenant or a whole client list. */
export async function readCustomer(request: CosRequest, id: string): Promise<CustomerDetail> {
  if (!id) throw Error('customer_missing');
  const [person, members] = await Promise.all([
    request<{data: CustomerPerson}>('GET', `/api/person/${encodeURIComponent(id)}`),
    request<{data: CustomerPerson[]}>('POST', '/query', {entity:'member', filter:{field:'person',op:'eq',value:id},limit:2}),
  ]);
  if (person.data?.id !== id || !person.data.data || !Array.isArray(members.data) || members.data.length !== 1 || members.data[0]?.data?.person !== id) throw Error('customer_missing');
  return {person:person.data,memberId:members.data[0].id};
}
/** Each changed field has its own comparison inside the same server transaction. Unrelated fields remain untouched. */
export async function saveCustomer(request: CosRequest, previous: CustomerDetail, form: CustomerForm, key: string, cancelled: () => boolean): Promise<CustomerDetail> {
  const check = () => { if (cancelled()) throw Error('customer_cancelled'); };
  check();
  if (Object.keys(customerErrors(form)).length) throw Error('customer_validation');
  const ops: BatchOp[] = FIELDS.flatMap(field => {
    const value = form[field].trim() || null;
    if ((previous.person.data[field] ?? null) === value) return [];
    return [{op:'update' as const,entity:'person',id:previous.person.id,data:{[field]:value},ifMatch:{field,value:previous.person.data[field]}}];
  });
  check();
  if (ops.length) await request('POST','/batch',{ops},{idempotencyKey:key});
  check();
  const after = await readCustomer(request,previous.person.id); check();
  if (FIELDS.some(field => (after.person.data[field] ?? null) !== (form[field].trim() || null))) throw Error('customer_unconfirmed');
  return after;
}
