import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, PaymentRow, ProfileRow, UserRow } from '../../data/schema';
import { formatCOP, formatTime } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { FAMILY_LABEL, priceItem, pricing, type PlanFamily, type PriceItem } from '../../tenant/pricing';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge } from '../../components/atom/Badge/Badge';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { PriceRow } from '../../components/molecule/PriceRow/PriceRow';
import { Receipt } from '../../components/organism/Receipt/Receipt';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useTodaySessions } from '../website/hooks';
import { splitTax, useSettings } from '../admin/settings';
import { useAudit } from './audit';
import { maskPhone, personMatches, usePeople } from './people';
import './staff.css';

type Method = 'cash' | 'datafono' | 'transfer' | 'nequi' | 'wompi';
const METHODS: Method[] = ['cash', 'datafono', 'transfer', 'nequi', 'wompi'];
const METHOD_DB: Record<Method, { method: string; provider: 'wompi' | 'manual' }> = {
  cash: { method: 'cash', provider: 'manual' }, datafono: { method: 'card', provider: 'manual' }, transfer: { method: 'transfer', provider: 'manual' }, nequi: { method: 'nequi', provider: 'manual' }, wompi: { method: 'card', provider: 'wompi' },
};
const SELLABLE: PlanFamily[] = ['bienvenida', 'membresia', 'pausas'];

interface Sale { payment: PaymentRow; number: string; subtotal: number; tax: number; total: number; customer: string; contact: string; item: PriceItem; checkedIn?: string; isNew: boolean }

const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

/** S-04 — who · what · how, then a printable receipt. Prices from pricing.ts, IVA from M-08. */
export function RegisterPage() {
  const { t, lang, bi } = useI18n();
  const data = useData();
  const { user, can } = useSession();
  const audit = useAudit('front_desk');
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const { people } = usePeople();
  const today = useTodaySessions();
  const { rows: invoices } = useTable<BaseRow>('invoices');

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [form, setForm] = useState({ first: '', last: '', phone: '', email: '', birthday: '', emergency: '', consent: false });
  const [existingQ, setExistingQ] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const [itemId, setItemId] = useState('trial');
  const [method, setMethod] = useState<Method>('cash');
  const [receipt, setReceipt] = useState({ wa: true, email: true });
  const [paidRaw, setPaidRaw] = useState<string | null>(null); // null = untouched, so it follows the invoiced total
  const [note, setNote] = useState('');
  const [sessionId, setSessionId] = useState(params.get('session') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Sale | null>(null);

  const canWrite = can('payments.write');
  const item = priceItem(itemId) ?? pricing[0];
  const totals = splitTax(item.price ?? 0, settings.tax);
  const person = personId ? people.find((p) => p.id === personId) : undefined;
  const candidates = useMemo(() => (existingQ.trim().length < 2 ? [] : people.filter((p) => p.role === 'customer' && personMatches(p, existingQ)).slice(0, 6)), [people, existingQ]);
  const session = today.find((x) => x.session.id === sessionId);
  const upcoming = today.filter((x) => new Date(x.session.ends_at).getTime() > Date.now());
  const items = pricing.filter((p) => p.price != null && SELLABLE.includes(p.family));

  // Jas review: the desk can record a different amount received, but only with an observation attached.
  const amountPaid = paidRaw === null || paidRaw.trim() === '' ? totals.total : Math.max(0, Math.round(Number(paidRaw.replace(/[^\d]/g, '')) || 0));
  const paidDiffers = amountPaid !== totals.total;
  const noteOk = !paidDiffers || note.trim().length > 0;
  const valid = (mode === 'existing' ? !!person : form.first.trim() && form.phone.trim() && form.consent) && noteOk;
  const displayName = mode === 'existing' ? person?.name ?? '' : `${form.first.trim()} ${form.last.trim()}`.trim();

  const complete = async () => {
    if (!canWrite || !valid) return;
    setBusy(true); setError(null);
    try {
      const now = new Date();
      let userId = person?.id;
      let isNew = false;
      if (!userId) {
        isNew = true;
        const u = await data.insert<UserRow>('users', { email: form.email.trim() || `${form.phone.replace(/\D/g, '')}@sin-email.hoyos.test`, phone: form.phone.trim(), status: 'active', last_sign_in_at: null, locale: lang });
        userId = u.id;
        const initials = displayName.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
        await data.insert<ProfileRow>('profiles', { user_id: u.id, full_name: displayName, initials, photo_url: null, birthday: form.birthday || null, emergency_contact: form.emergency ? { name: form.emergency } : null, marketing_optin: receipt.wa, whatsapp_verified: false, notes: null } as Partial<ProfileRow>);
        await data.insert('user_roles', { user_id: u.id, role: 'customer', granted_by: user.id });
        await data.insert('consents', { user_id: u.id, legal_document_id: 'leg_terms_es', accepted_at: now.toISOString(), ip: null });
        await audit('user.create', 'users', u.id, { after: { name: displayName, phone: form.phone }, consent: 'leg_terms_es' });
      }
      const db = METHOD_DB[method];
      const pending = method === 'wompi';
      const payment = await data.insert<PaymentRow>('payments', { user_id: userId, plan_id: `plan_${item.id}`, amount: totals.total, amount_paid: amountPaid, note: paidDiffers ? note.trim() : null, currency: tenant.currency, method: db.method, provider: db.provider, provider_ref: pending ? `wmp_link_${Math.random().toString(36).slice(2, 8)}` : null, status: pending ? 'pending' : 'approved', paid_at: pending ? null : now.toISOString(), taken_by: user.id } as Partial<PaymentRow>);
      const number = `HOY-${1000 + invoices.length + 1}`;
      await data.insert('invoices', { payment_id: payment.id, number, subtotal: totals.subtotal, tax: totals.tax, total: totals.total, issued_at: now.toISOString(), pdf_url: null, dian_cufe: null });
      await audit('payment.take', 'payments', payment.id, { amount: totals.total, amount_paid: amountPaid, note: paidDiffers ? note.trim() : null, method, item: item.id, invoice: number, status: payment.status });

      if (item.family === 'membresia') {
        const m = await data.insert('memberships', { user_id: userId, plan_id: `plan_${item.id}`, status: pending ? 'past_due' : 'active', starts_at: dateOnly(now), renews_at: dateOnly(addMonths(now, item.period === 'year' ? 12 : 1)), ends_at: null, paused_until: null });
        await audit('membership.create', 'memberships', m.id, { plan: item.id, user_id: userId });
      } else if (item.credits) {
        const c = await data.insert('credits', { user_id: userId, plan_id: `plan_${item.id}`, payment_id: payment.id, delta: item.credits, reason: 'purchase', expires_at: item.validityDays ? dateOnly(addDays(now, item.validityDays)) : null });
        await audit('credits.purchase', 'credits', c.id, { delta: item.credits, user_id: userId });
      }

      let checkedIn: string | undefined;
      if (session && settings.features.autoCheckinOnSale) {
        const paidWith = item.family === 'membresia' ? 'membership' : item.id === 'trial' ? 'trial' : item.credits ? 'credit' : 'single';
        const b = await data.insert<BookingRow>('bookings', { user_id: userId, session_id: session.session.id, status: 'checked_in', paid_with: paidWith, credit_id: null, checked_in_at: now.toISOString(), cancelled_at: null, rated: false });
        await data.update('class_sessions', session.session.id, { booked_count: session.session.booked_count + 1 });
        if (paidWith === 'credit') await data.insert('credits', { user_id: userId, plan_id: `plan_${item.id}`, payment_id: payment.id, delta: -1, reason: 'booking', expires_at: null });
        await audit('booking.checkin', 'bookings', b.id, { after: 'checked_in', session_id: session.session.id, user_id: userId, source_sale: payment.id });
        checkedIn = `${session.session.title} · ${formatTime(session.session.starts_at, lang)}`;
      }
      for (const ch of [receipt.wa ? 'whatsapp' : null, receipt.email ? 'email' : null]) {
        if (ch) await data.insert('message_log', { user_id: userId, channel: ch, template_key: 'receipt', automation_id: null, status: 'sent', sent_at: now.toISOString(), payload: { invoice: number, amount: totals.total } });
      }
      const contact = mode === 'existing' ? maskPhone(person?.phone) : maskPhone(form.phone);
      setDone({ payment, number, subtotal: totals.subtotal, tax: totals.tax, total: totals.total, customer: displayName, contact, item, checkedIn, isNew });
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  };

  const reset = () => { setDone(null); setForm({ first: '', last: '', phone: '', email: '', birthday: '', emergency: '', consent: false }); setPersonId(null); setExistingQ(''); setMode('new'); setItemId('trial'); setMethod('cash'); setPaidRaw(null); setNote(''); };

  if (!canWrite) return <div className="stack"><div className="page-head"><h1>{t('staff.register.title')}</h1></div><EmptyState tone="error" title={t('staff.register.noPermission')} body={t('staff.register.noPermission.body')} /></div>;

  if (done) {
    return (
      <div className="stack">
        <div className="page-head"><div><h1>{t('staff.register.done')}</h1><p className="muted small">{done.isNew ? t('staff.register.done.new', { name: done.customer }) : t('staff.register.done.existing', { name: done.customer })}{done.checkedIn ? ` · ${t('staff.register.done.checkedIn', { cls: done.checkedIn })}` : ''}</p></div></div>
        <div className="register-done">
          <Receipt studio={tenant.legalName} number={done.number} issuedAt={done.payment.created_at} customer={done.customer} contact={done.contact} lines={[{ label: bi(done.item.name), amount: done.total }]} subtotal={done.subtotal} tax={done.tax} taxLabel={t('staff.register.iva', { pct: settings.tax.ivaPct })} total={done.total} method={t(`staff.register.method.${method}`)} status={done.payment.status} takenBy={`${user.name}`} dianRef={null} note={done.checkedIn ? t('staff.register.done.checkedIn', { cls: done.checkedIn }) : undefined} printLabel={t('staff.register.print')} />
          <div className="stack-sm">
            {done.payment.status === 'pending' && <Card tone="highlight"><p className="small">{t('staff.register.wompi.pending')}</p></Card>}
            <Button onClick={reset}>{t('staff.register.newSale')}</Button>
            <Link to={`/staff/checkin${sessionId ? `?session=${sessionId}` : ''}`}><Button block variant="secondary">{t('staff.home.openCheckin')}</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.register.title')}</h1><p className="muted small">{t('staff.register.subtitle')}</p></div></div>
      <div className="register">
        <div className="register-steps">
          <Card eyebrow={t('staff.register.step1')} title={t('staff.register.who')} actions={<div className="row" role="tablist"><Chip selected={mode === 'new'} onClick={() => setMode('new')}>{t('staff.register.new')}</Chip><Chip selected={mode === 'existing'} onClick={() => setMode('existing')}>{t('staff.register.existing')}</Chip></div>}>
            {mode === 'new' ? (
              <div className="grid grid-2 register-form">
                <Field label={t('staff.register.f.first')} required>{(id) => <Input id={id} value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} autoFocus />}</Field>
                <Field label={t('staff.register.f.last')}>{(id) => <Input id={id} value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} />}</Field>
                <Field label={t('staff.register.f.whatsapp')} required hint={t('staff.register.f.whatsapp.hint')}>{(id) => <Input id={id} inputMode="tel" placeholder="+57 300 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
                <Field label={t('staff.register.f.email')}>{(id) => <Input id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
                <Field label={t('staff.register.f.emergency')}>{(id) => <Input id={id} value={form.emergency} onChange={(e) => setForm({ ...form, emergency: e.target.value })} placeholder={t('staff.register.f.emergency.ph')} />}</Field>
                <Field label={t('staff.register.f.birthday')}>{(id) => <Input id={id} type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />}</Field>
                <div className="register-consent"><Toggle checked={form.consent} onChange={(on) => setForm({ ...form, consent: on })} label={t('staff.register.consent')} /><p className="xs muted">{t('staff.register.consent.hint', { staff: user.name })}</p></div>
              </div>
            ) : (
              <div className="stack-sm">
                {person ? (
                  <div className="register-found">
                    <Avatar name={person.name} initials={person.initials} size={44} />
                    <div className="grow"><strong>{person.name}</strong><div className="xs muted">{maskPhone(person.phone)} · {person.email}</div><div className="row wrap" style={{ marginTop: 4 }}>{person.plan ? <Badge tone="success">{bi({ es: person.plan.name_es, en: person.plan.name_en })}</Badge> : <Badge>{t('staff.checkin.noPlan')}</Badge>}{person.whatsappVerified && <Badge tone="primary">WhatsApp ✓</Badge>}</div></div>
                    <Button size="sm" variant="ghost" onClick={() => setPersonId(null)}>{t('core.common.edit')}</Button>
                  </div>
                ) : (
                  <>
                    <Input value={existingQ} onChange={(e) => setExistingQ(e.target.value)} placeholder={t('staff.register.search.ph')} autoFocus aria-label={t('core.common.search')} />
                    {candidates.map((p) => <button key={p.id} type="button" className="register-candidate" onClick={() => setPersonId(p.id)}><Avatar name={p.name} initials={p.initials} size={32} /><span className="grow"><span className="small">{p.name}</span><span className="xs muted"> · {maskPhone(p.phone)}</span></span>{p.plan && <Badge tone="success">{p.plan.name_es}</Badge>}</button>)}
                    {existingQ.trim().length >= 2 && candidates.length === 0 && <p className="small muted">{t('staff.register.search.none')} <button type="button" className="register-link" onClick={() => setMode('new')}>{t('staff.register.new')}</button></p>}
                  </>
                )}
              </div>
            )}
          </Card>

          <Card eyebrow={t('staff.register.step2')} title={t('staff.register.what')}>
            <p className="xs muted" style={{ marginBottom: 12 }}>{t('staff.register.what.hint')}</p>
            {SELLABLE.map((fam) => (
              <div key={fam} className="register-family">
                <div className="eyebrow">{bi(FAMILY_LABEL[fam])}</div>
                {items.filter((p) => p.family === fam).map((p) => <div key={p.id} className={`register-item ${p.id === itemId ? 'is-selected' : ''}`}><PriceRow item={p} onSelect={() => setItemId(p.id)} /></div>)}
              </div>
            ))}
          </Card>

          <Card eyebrow={t('staff.register.step3')} title={t('staff.register.how')}>
            <div className="register-methods" role="radiogroup">
              {METHODS.map((m) => <button key={m} type="button" role="radio" aria-checked={method === m} className={`register-method ${method === m ? 'is-selected' : ''}`} onClick={() => setMethod(m)}><strong className="small">{t(`staff.register.method.${m}`)}</strong><span className="xs muted">{t(`staff.register.method.${m}.hint`)}</span></button>)}
            </div>
            {method === 'wompi' && <p className="xs muted" style={{ marginTop: 8 }}>{t('staff.register.wompi.note')}</p>}
            <div className="row wrap" style={{ marginTop: 16 }}>
              <Toggle size="sm" checked={receipt.wa} onChange={(on) => setReceipt({ ...receipt, wa: on })} label={t('staff.register.receipt.wa')} />
              <Toggle size="sm" checked={receipt.email} onChange={(on) => setReceipt({ ...receipt, email: on })} label={t('staff.register.receipt.email')} />
            </div>
          </Card>
        </div>

        <aside className="register-rail">
          <Card title={t('staff.register.summary')} raised>
            <div className="stack-sm">
              <div className="row-between"><span className="small">{displayName || <span className="muted">{t('staff.register.summary.noone')}</span>}</span>{mode === 'new' && form.first && <Badge tone="primary">{t('core.common.new')}</Badge>}</div>
              <div className="row-between register-line"><span>{bi(item.name)}</span><strong>{formatCOP(item.price ?? 0, lang)}</strong></div>
              <div className="row-between register-line small muted"><span>Subtotal</span><span>{formatCOP(totals.subtotal, lang)}</span></div>
              <div className="row-between register-line small muted"><span>{t('staff.register.iva', { pct: settings.tax.ivaPct })}{settings.tax.pricesIncludeIva ? ` · ${t('staff.register.iva.included')}` : ''}</span><span>{formatCOP(totals.tax, lang)}</span></div>
              <div className="row-between register-total"><span>{t('staff.register.total')}</span><span>{formatCOP(totals.total, lang)}</span></div>
              <Field label={t('staff.register.paid')} hint={t('staff.register.paid.hint')}>
                {(id) => <Input id={id} inputMode="numeric" value={paidRaw ?? String(totals.total)} onChange={(e) => setPaidRaw(e.target.value)} onFocus={() => setPaidRaw((v) => v ?? String(totals.total))} />}
              </Field>
              {paidDiffers && (
                <>
                  <p className="xs register-diff">{t('staff.register.paid.diff', { amount: formatCOP(amountPaid - totals.total, lang) })}</p>
                  <Field label={t('staff.register.note')} required hint={t('staff.register.note.hint')}>
                    {(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('staff.register.note.ph')} invalid={!note.trim()} />}
                  </Field>
                </>
              )}
              <Field label={t('staff.register.checkinTo')} hint={settings.features.autoCheckinOnSale ? t('staff.register.checkinTo.hint') : t('staff.register.checkinTo.off')}>
                {(id) => <Select id={id} value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={!settings.features.autoCheckinOnSale}><option value="">{t('staff.register.checkinTo.none')}</option>{upcoming.map(({ session: s, teacher: te }) => <option key={s.id} value={s.id}>{formatTime(s.starts_at, lang)} · {s.title} · {te?.display_name} ({s.booked_count}/{s.capacity})</option>)}</Select>}
              </Field>
              {error && <EmptyState compact tone="error" title={t('core.common.error')} body={error} />}
              <Button block size="lg" disabled={!valid} loading={busy} onClick={complete}>{method === 'wompi' ? t('staff.register.cta.link') : t('staff.register.cta')}</Button>
              <p className="xs muted">{t('staff.register.audit', { staff: user.name })}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
