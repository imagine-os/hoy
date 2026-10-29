/**
 * Q-13 / M-09c on Company OS: the expense commands of `expenseLedger.ts` for the production provider. Company OS keeps
 * the tenant entities `expense` and `expense_template` (mapped in `src/data/companyos/mapping.ts`) and decides who may
 * read and write them; the browser ledger's audit receipts and actor reads do not apply (no `audit_log`, session ids are
 * Company OS ids). What stays: the role gate on the screens, the desk limits, the field checks and the before-state
 * comparison (stale) for pay, delete and toggle.
 *
 * Creates carry the intent's `requestId` as their `Idempotency-Key` (ADR 0040), so a retry of the same entry after a
 * lost answer is answered by the server instead of written twice; "generate" is one `/batch` under that key.
 */
import type { DataProvider } from '../../data/types';
import type { ExpenseRow, ExpenseTemplateRow } from '../../data/schema';
import { fixedExpensesFor } from '../../data/expenseCalc';
import type { ExpenseCommand, ExpenseControl, ExpenseIdentity, ExpenseOutcome } from './expenseLedger';

type Item = ExpenseOutcome['items'][number];
type Fail = (code: string) => never;
type Insert = (table: string, row: Record<string, unknown>, options?: { idempotencyKey?: string }) => Promise<{ id: string }>;

const expenseValue = (r: ExpenseRow) => ({ kind: r.kind, category: r.category, concept: r.concept, amount: r.amount, incurred_on: r.incurred_on, paid_on: r.paid_on, method: r.method, vendor: r.vendor ?? null, note: r.note ?? null, template_id: r.template_id ?? null });
const templateValue = (r: ExpenseTemplateRow) => ({ concept: r.concept, category: r.category, amount: r.amount, cadence: r.cadence, anchor_day: r.anchor_day, vendor: r.vendor ?? null, active: r.active, note: r.note ?? null });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const item = (table: Item['table'], id: string): Item => ({ table, id, digest: null });

export async function readServerWorkspace(data: DataProvider): Promise<{ expenses: ExpenseRow[]; templates: ExpenseTemplateRow[] }> {
  const [expenses, templates] = await Promise.all([data.list<ExpenseRow>('expenses'), data.list<ExpenseTemplateRow>('expense_templates')]);
  return { expenses: expenses.sort((a, b) => b.incurred_on.localeCompare(a.incurred_on)), templates: templates.sort((a, b) => a.anchor_day - b.anchor_day) };
}

/** Runs a validated command (`runExpenseCommand` checks role, shape and desk limits before calling this). */
export async function runServerCommand(data: DataProvider, c: ExpenseCommand & ExpenseIdentity, control: ExpenseControl, fail: Fail): Promise<ExpenseOutcome> {
  const insert = data.insert.bind(data) as Insert;
  const stop = () => { if (control.signal?.aborted) fail('cancelled'); };
  const one = (table: Item['table'], id: string, created: number, total: number): ExpenseOutcome => ({ items: [item(table, id)], created, skipped: 0, total });
  stop();
  switch (c.type) {
    case 'create': {
      const rec = await insert('expenses', { ...c.draft, template_id: null }, { idempotencyKey: c.requestId });
      return one('expenses', rec.id, 1, c.draft.amount);
    }
    case 'template.create': {
      const rec = await insert('expense_templates', { ...c.draft, active: true, note: null }, { idempotencyKey: c.requestId });
      return one('expense_templates', rec.id, 1, c.draft.amount);
    }
    case 'pay':
    case 'delete': {
      const row = await data.get<ExpenseRow>('expenses', c.id);
      if (!row) fail('stale');
      if (c.type === 'delete' && row!.paid_on) fail('paid_delete');
      if (!same(expenseValue(row!), expenseValue(c.before)) || (c.type === 'pay' && row!.paid_on)) fail('stale');
      stop();
      if (c.type === 'delete') await data.remove('expenses', c.id);
      else await data.update('expenses', c.id, { paid_on: c.paidOn });
      return one('expenses', c.id, 0, 0);
    }
    case 'template.toggle': {
      const row = await data.get<ExpenseTemplateRow>('expense_templates', c.id);
      if (!row || !same(templateValue(row), templateValue(c.before))) fail('stale');
      stop();
      await data.update('expense_templates', c.id, { active: !row!.active });
      return one('expense_templates', c.id, 0, 0);
    }
    case 'generate': {
      const workspace = await readServerWorkspace(data);
      const values = (xs: ExpenseTemplateRow[]) => xs.map((r) => ({ id: r.id, value: templateValue(r) })).sort((a, b) => a.id.localeCompare(b.id));
      if (!same(values(workspace.templates), values(c.templates))) fail('stale');
      const { drafts, skipped } = fixedExpensesFor(c.period, workspace.templates, workspace.expenses);
      stop();
      if (!drafts.length) return { items: [], created: 0, skipped, total: 0 };
      if (!data.atomic) fail('disconnected');
      const ids = await data.atomic!(async (tx) => {
        const out: string[] = [];
        for (const d of drafts) out.push((await tx.insert('expenses', { ...d, paid_on: null, method: 'transfer', note: null })).id);
        return out;
      }, { idempotencyKey: c.requestId });
      return { items: ids.map((id) => item('expenses', id)), created: ids.length, skipped, total: drafts.reduce((a, d) => a + d.amount, 0) };
    }
  }
  return fail('validation');
}
