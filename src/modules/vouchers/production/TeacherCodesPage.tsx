import { useEffect, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { addDaysKey, dateKey, formatDate, fromDateKey } from '../../../i18n/format';
import { useData, useTable } from '../../../data/DataContext';
import { useLiveUpdates } from '../../../data/companyos/hooks';
import type { BaseRow } from '../../../data/schema';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Field } from '../../../components/molecule/Field/Field';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Badge } from '../../../components/atom/Badge/Badge';
import { useCosVouchers, useKeyedSubmit } from './hooks';
import { PAYMENT_TABLE, VOUCHER_CHANGES, createVoucher, voucherState, type CosVoucher } from './model';
import { listVoucherLots, teacherCodeBody, teacherCodeErrors, teacherCodeLink, teacherFunnel, withUnknownCoaches, type TeacherCodeForm, type VoucherLot } from './teacherCodes';
import '../vouchers.css';

const LIVE = [PAYMENT_TABLE, VOUCHER_CHANGES];
const day = (value: string | null | undefined, lang: 'es' | 'en') =>
  value ? formatDate(/^\d{4}-\d{2}-\d{2}$/.test(value) ? fromDateKey(value) : value, lang, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
/** The app's address as the browser has it (hash routing): `https://host/base`, without the hash. */
const appBase = () => (typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`);

interface Teacher { id: string; name: string; active: boolean }
function useTeachers(): { teachers: Teacher[]; loading: boolean } {
  const { rows, loading } = useTable<BaseRow>('teachers');
  const teachers = (rows as unknown as { id: string; display_name?: string; active?: boolean }[])
    .map((r) => ({ id: r.id, name: r.display_name?.trim() || r.id, active: r.active !== false }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { teachers, loading };
}

function RefusalNotice({ error }: { error: { key: string; code: string | null } | null }) {
  const { t } = useI18n();
  if (!error) return null;
  return <Notice tone="danger" title={t(`${error.key}.title`)}>{t(`${error.key}.body`)}{error.key.endsWith('generic') && error.code ? ` (${error.code})` : ''}</Notice>;
}

const EMPTY: TeacherCodeForm = { coach: '', classes: '1', validUntil: '', maxUses: '100' };

function CreateCard({ teachers }: { teachers: Teacher[] }) {
  const { t } = useI18n();
  const data = useData();
  const today = dateKey();
  const fresh = (): TeacherCodeForm => ({ ...EMPTY, validUntil: addDaysKey(today, 89) });
  const [form, setForm] = useState<TeacherCodeForm>(fresh);
  const [tried, setTried] = useState(false);
  const [created, setCreated] = useState<CosVoucher | null>(null);
  const submit = useKeyedSubmit();
  const errors = teacherCodeErrors(form, today);
  const set = (k: keyof TeacherCodeForm) => (e: { target: { value: string } }) => {
    if (e.target.value === form[k]) return;
    setForm((f) => ({ ...f, [k]: e.target.value })); setCreated(null); submit.renew();
  };
  const err = (k: keyof TeacherCodeForm) => (tried && errors[k] ? t(errors[k]!) : undefined);
  const create = async () => {
    setTried(true);
    if (Object.keys(errors).length) return;
    const v = await submit.run((key) => createVoucher(data, teacherCodeBody(form), key));
    if (v) { setCreated(v); setTried(false); setForm({ ...fresh(), coach: form.coach }); }
  };
  const active = teachers.filter((x) => x.active);
  return (
    <Card title={t('vouchers.teachers.new')}>
      <div className="stack">
        <p className="muted">{t('vouchers.teachers.rule')}</p>
        {!active.length && <Notice tone="warn">{t('vouchers.teachers.noTeachers')}</Notice>}
        <div className="voucher-grid">
          <Field label={t('vouchers.teachers.teacher')} error={err('coach')} required>
            {(id) => (
              <Select id={id} value={form.coach} onChange={set('coach')} invalid={!!err('coach')}>
                <option value="">{t('vouchers.teachers.teacher.choose')}</option>
                {active.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label={t('vouchers.cos.classesLabel')} error={err('classes')} required>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={100} step={1} value={form.classes} onChange={set('classes')} />}</Field>
          <Field label={t('vouchers.cos.maxUses')} hint={t('vouchers.cos.maxUsesHint')} error={err('maxUses')} required>{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={500} step={1} value={form.maxUses} onChange={set('maxUses')} />}</Field>
          <Field label={t('vouchers.cos.validUntil')} error={err('validUntil')} required>{(id) => <Input id={id} type="date" min={today} value={form.validUntil} onChange={set('validUntil')} />}</Field>
        </div>
        {created && <Notice tone="success" title={t('vouchers.teachers.created', { code: created.code ?? '' })}>{teacherCodeLink(appBase(), created.code ?? '')}</Notice>}
        <RefusalNotice error={submit.error} />
        <Button loading={submit.busy} disabled={submit.busy} onClick={create}>{t('vouchers.teachers.create')}</Button>
      </div>
    </Card>
  );
}

function CodeRow({ v }: { v: CosVoucher }) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const link = teacherCodeLink(appBase(), v.code ?? '');
  const state = voucherState(v, dateKey());
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied('ok'); } catch { setCopied('failed'); }
  };
  return (
    <li className="stack-sm">
      <div className="row wrap">
        <code>{v.code}</code>
        <Badge tone={state === 'active' ? 'success' : 'neutral'}>{t(`vouchers.cos.state.${state}`)}</Badge>
        <span>{t('vouchers.cos.list.uses', { uses: v.uses ?? 0, max: v.max_uses ?? 1 })}</span>
        <span className="small muted">{v.valid_until ? t('vouchers.cos.list.until', { date: day(v.valid_until, lang) }) : t('vouchers.cos.list.noEnd')}</span>
      </div>
      <div className="row wrap">
        <input className="input" readOnly value={link} aria-label={t('vouchers.teachers.copy')} onFocus={(e) => e.currentTarget.select()} />
        <Button variant="secondary" size="sm" onClick={copy}>{t('vouchers.teachers.copy')}</Button>
        {copied && <span className="small" role="status">{t(copied === 'ok' ? 'vouchers.teachers.copied' : 'vouchers.teachers.copyFailed')}</span>}
      </div>
    </li>
  );
}

function FunnelSection({ teachers, vouchers, listLoading }: { teachers: Teacher[]; vouchers: CosVoucher[]; listLoading: boolean }) {
  const { t } = useI18n();
  const data = useData();
  const { rows: payments, loading: payLoading, error: payError } = useTable<BaseRow>(PAYMENT_TABLE);
  const [lots, setLots] = useState<VoucherLot[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Redemptions come from the credit lots; read again whenever the vouchers list changes (a redemption raises `uses`).
  const marker = vouchers.map((v) => `${v.id}:${v.uses ?? 0}`).join('|');
  useEffect(() => {
    let alive = true;
    listVoucherLots(data).then((l) => { if (alive) { setLots(l); setFailed(false); } }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [data, marker]);
  const known = lots != null && !listLoading && !payLoading && !payError;
  const withCodes = new Set(vouchers.map((v) => v.coach).filter(Boolean));
  const coaches = withUnknownCoaches(teachers.filter((x) => x.active || withCodes.has(x.id)), vouchers, t('vouchers.teachers.unknown'));
  const rows = known ? teacherFunnel({ coaches, vouchers, lots, payments: payments as unknown as Record<string, unknown>[], names: new Map() }) : [];
  return (
    <section className="stack" aria-labelledby="teacher-funnel">
      <h2 id="teacher-funnel">{t('vouchers.teachers.funnel.title')}</h2>
      <p className="muted">{t('vouchers.teachers.funnel.sub')}</p>
      {(failed || !!payError) && <Notice tone="warn">{t('vouchers.teachers.funnel.failed')}</Notice>}
      {!known && !failed && !payError && <Notice>{t('vouchers.teachers.funnel.loading')}</Notice>}
      {rows.map((r) => (
        <Card key={r.coach} title={r.name}>
          <div className="stack-sm">
            <div className="row wrap">
              <span>{t('vouchers.teachers.funnel.codes')}: <strong>{r.codes.length}</strong></span>
              <span>{t('vouchers.teachers.funnel.redeemed')}: <strong>{r.redeemed}</strong></span>
              <span>{t('vouchers.teachers.funnel.bought')}: <strong>{r.bought}</strong></span>
            </div>
            {r.people.length > 0 && (
              <details>
                <summary>{t('vouchers.teachers.funnel.people')}</summary>
                <ul className="stack-sm">
                  {r.people.map((p) => <li key={p.person}>{p.name} · <Badge tone={p.boughtLater ? 'success' : 'neutral'}>{t(p.boughtLater ? 'vouchers.teachers.funnel.bought.yes' : 'vouchers.teachers.funnel.bought.no')}</Badge></li>)}
                </ul>
              </details>
            )}
          </div>
        </Card>
      ))}
    </section>
  );
}

/** M-14 · Administration: teacher codes (create, share link, funnel). */
export function TeacherCodesPage() {
  const { t } = useI18n();
  const list = useCosVouchers();
  const { teachers } = useTeachers();
  useLiveUpdates(LIVE);
  const mine = list.vouchers.filter((v) => !!v.coach);
  return (
    <div className="container page">
      <div className="page-head"><h1>{t('vouchers.teachers.title')}</h1><p className="muted">{t('vouchers.teachers.sub')}</p></div>
      <div className="stack">
        <CreateCard teachers={teachers} />
        <section className="stack" aria-labelledby="teacher-codes">
          <h2 id="teacher-codes">{t('vouchers.teachers.codes')}</h2>
          {list.failed && <Notice tone="warn">{t('vouchers.cos.list.failed')}</Notice>}
          {!list.loading && !list.failed && !mine.length && <Notice>{t('vouchers.teachers.noCodes')}</Notice>}
          {withUnknownCoaches(teachers, mine, t('vouchers.teachers.unknown')).filter((x) => mine.some((v) => v.coach === x.id)).map((x) => (
            <Card key={x.id} title={x.name}><ul className="stack">{mine.filter((v) => v.coach === x.id).map((v) => <CodeRow key={v.id} v={v} />)}</ul></Card>
          ))}
        </section>
        <FunnelSection teachers={teachers} vouchers={mine} listLoading={list.loading} />
      </div>
    </div>
  );
}
