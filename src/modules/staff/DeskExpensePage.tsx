import { useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData } from '../../data/DataContext';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseRow } from '../../data/schema';
import { dateKey } from '../../i18n/format';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { DESK_EXPENSE_MAX_COP, runExpenseCommand } from '../admin/expenseLedger';
import { LIMITS, clip } from '../../shared/limits';

const METHODS = ['cash', 'transfer', 'card'] as const;
/** Larger than any petty-cash expense; a bigger one is an administration entry (the command enforces it too). */
const DESK_MAX_COP = DESK_EXPENSE_MAX_COP;

/**
 * S-11 — reception records a fixed or variable expense paid today (Q-13, PL-05). Record only: no ledger, no totals, no income figures.
 * The command is the same one the admin ledger (M-09c) uses; `expenses.create` lets it create and nothing else.
 */
export function DeskExpensePage() {
  const { t } = useI18n();
  const data = useData();
  const { user, role, can } = useSession();
  const empty = { kind: 'variable' as ExpenseRow['kind'], concept: '', category: 'supplies' as ExpenseCategory, amount: 0, method: 'cash' as ExpenseRow['method'], vendor: '', note: '' };
  const [d, setD] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | ''>('');
  // One intent per entry: a retry after an error reuses the same ids, so the ledger's replay guard stores it once.
  const intent = useRef<{ requestId: string; id: string; key: string } | null>(null);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => { setD((x) => ({ ...x, [k]: v })); setStatus(''); };
  const conceptError = d.concept.trim() ? undefined : t('admin.expenses.concept.required');
  const amountError = d.amount > 0 && d.amount <= DESK_MAX_COP ? undefined : t('staff.expense.amountRange');
  const allowed = can('expenses.create');
  const valid = allowed && !conceptError && !amountError;

  const submit = async () => {
    setTouched(true);
    if (!valid || busy) return;
    setBusy(true);
    const today = dateKey(new Date());
    const draft = { kind: d.kind, category: d.category, concept: d.concept.trim(), amount: d.amount, incurred_on: today, paid_on: today, method: d.method, vendor: d.vendor.trim() || null, note: d.note.trim() || null };
    const key = JSON.stringify(draft);
    if (intent.current?.key !== key) intent.current = { requestId: crypto.randomUUID(), id: `exp_desk_${crypto.randomUUID()}`, key };
    try {
      await runExpenseCommand(data, { type: 'create', requestId: intent.current.requestId, id: intent.current.id, actorId: user.id, role, draft });
      intent.current = null; setD(empty); setTouched(false); setStatus('saved');
    } catch { setStatus('error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('staff.expense.title')}</h1><p className="muted small">{t('staff.expense.body')}</p></div></div>
      <Card>
        <div className="stack-sm" data-desk-expense-form>
          <Field label={t('admin.expenses.col.concept')} required error={touched ? conceptError : undefined}>
            {(id) => <Input id={id} disabled={!allowed || busy} maxLength={LIMITS.title} value={d.concept} placeholder={t('admin.expenses.concept.placeholder')} onBlur={() => setTouched(true)} onChange={(e) => set('concept', clip(e.target.value, LIMITS.title))} />}
          </Field>
          <div className="grid grid-2">
            <Field label={t('admin.expenses.col.kind')}>
              {(id) => <Select id={id} disabled={!allowed || busy} value={d.kind} onChange={(e) => set('kind', e.target.value as ExpenseRow['kind'])}><option value="variable">{t('admin.expenses.kind.variable')}</option><option value="fixed">{t('admin.expenses.kind.fixed')}</option></Select>}
            </Field>
            <Field label={t('admin.expenses.col.category')}>
              {(id) => <Select id={id} disabled={!allowed || busy} value={d.category} onChange={(e) => set('category', e.target.value as ExpenseCategory)}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`admin.expenses.cat.${c}`)}</option>)}</Select>}
            </Field>
            <Field label={t('admin.expenses.col.amount')} required error={touched ? amountError : undefined}>
              {(id) => <Input id={id} disabled={!allowed || busy} type="number" min={0} max={DESK_MAX_COP} step={1000} value={d.amount || ''} onChange={(e) => set('amount', Math.max(0, Math.round(Number(e.target.value) || 0)))} />}
            </Field>
            <Field label={t('admin.expenses.col.method')}>
              {(id) => <Select id={id} disabled={!allowed || busy} value={d.method} onChange={(e) => set('method', e.target.value as ExpenseRow['method'])}>{METHODS.map((m) => <option key={m} value={m}>{t(`admin.expenses.method.${m}`)}</option>)}</Select>}
            </Field>
            <Field label={t('admin.expenses.col.vendor')}>
              {(id) => <Input id={id} disabled={!allowed || busy} maxLength={LIMITS.name} value={d.vendor} onChange={(e) => set('vendor', clip(e.target.value, LIMITS.name))} />}
            </Field>
          </div>
          <Field label={t('admin.expenses.col.note')}>
            {(id) => <Input id={id} disabled={!allowed || busy} maxLength={LIMITS.note} value={d.note} onChange={(e) => set('note', clip(e.target.value, LIMITS.note))} />}
          </Field>
          <div className="row-between wrap">
            <span className="xs muted" role="status">{status === 'saved' ? t('staff.expense.saved') : status === 'error' ? t('staff.expense.error') : t('staff.expense.hint')}</span>
            <Button size="sm" loading={busy} disabled={!allowed || busy} onClick={() => void submit()}>{t('admin.expenses.form.save')}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
