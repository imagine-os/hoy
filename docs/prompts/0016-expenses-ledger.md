# 0016 — Expenses ledger and the Finance balance (2026-09-17)

- **Source**: Jas's design review document (PDF, page 6, point 9 — "Administrador"), relayed by Justin in the Slack thread; Justin's follow-up in the same thread
- **Date**: 2026-09-17
- **Requester**: Justin (project lead) · reviewer: Jas (design)
- **Changelog**: `docs/changelog/0016-expenses-ledger.md`

## Prompt (verbatim)

Jas, in the review document:

> Agregar la opción de registrar gastos quincenales recurrentes fijos y gastos variables de manera que se pueda tener un balance total de las finanzas de Hoy

Justin, in the thread:

> please continue doing things

The other half of the same page — the payroll settlement review page and the "15 días" period filter — already
shipped in v0.6.0 (M-09a, M-09b and the 15-day range in M-09), so this prompt is the expenses half only.

## Response

**Built (v0.6.1, codes M-09 and the new M-09c).**

**Two tables.** `expense_templates` — a recurring fixed cost (concept, category, amount per due date, cadence
`biweekly` | `monthly`, anchor day, vendor, active) — and `expenses` — every expense row (kind `fixed` |
`variable`, category, concept, amount, `incurred_on`, `paid_on` nullable, method cash | transfer | card,
vendor, note, `template_id`, `created_by`). Both are additive, bilingual, in the `commerce` group so M-03 lists
them, with a `TableDef.rls` access contract (admin / finance read + write; nobody else). `npm run sql`
regenerated `supabase/schema.sql` and `docs/data-model.md`: **42 → 44 tables**.

**One arithmetic.** `src/data/expenseCalc.ts` (no React, no provider) holds `dueDatesFor()` and
`fixedExpensesFor()` — a template falls due on its anchor day every month, a biweekly one also fifteen days
later (the Colombian quincena), one due day inside the period = one fixed row, and a due day that already has
its row is skipped. The seed and the page's generator both call it, the way `payrollCalc.ts` serves M-09a.

**M-09c `/admin/finance/expenses`** (DesktopShell; super_admin, admin, finance; nav entry "Gastos" under
Administración next to Finanzas and Nómina): the same 7 / 15 / 30 / 90 días / Todo chips as M-09; four
tiles (fijos, variables, pagado, por pagar); expenses by category (`BarList`); an add-expense form (tipo,
concepto, categoría, valor, fecha, pagado hoy / por pagar, método, proveedor, nota); the recurring-templates
panel with a period picker and **"Generar gastos fijos del periodo"** — idempotent: regenerating never
duplicates a row and a paid row is never deleted — plus activate / deactivate and a new-template form; and
the expenses table with **Marcar pagado** on every unpaid row (an unpaid row can also be deleted; a paid one
is history). Every write appends an `audit_log` row (`expense.create`, `expense.pay`, `expense.delete`,
`expense.generate`, `expense.template.create`, `expense.template.toggle`). New permissions `expenses.read` /
`expenses.write` gate it (finance, admin, super_admin). Only existing components are used — no new D-02 entry.

**M-09 Finance** gained a **Balance del periodo** card under the KPI row, for the selected range:
**Ingresos** (approved payments) − **Nómina** (every payroll run whose period overlaps the range, at its
current total) − **Gastos** (fixed + variable rows dated in the range, paid or not) = **Balance**, with the
margin on revenue and links to M-09a and M-09c. The existing cards are untouched.

**Seed.** Six templates a Medellín studio actually pays (arriendo 4.800.000 mensual, servicios públicos EPM
1.150.000, internet 189.900, aseo 700.000 por quincena, software 240.000, póliza 380.000) and, from them,
three months of fixed expenses through the same generator, plus fifteen variable expenses over the last 90
days (mats, calentadores, toallas, pauta, honorarios contables, comisiones Wompi…). Appended after every
existing seed pass so no other page's demo data shifts; everything due more than three days ago is paid.

**Docs.** Ops-manual chapter 14 (ES and EN) gained "Gastos y balance" with the M-09c and M-09 figures; page
doc `docs/pages/M-09c.md`; `docs/pages/M-09.md` names the balance card; screenshots of the four finance
routes retaken; kanban, ROADMAP (§A 0.6.1, §F item 21 done, 44 tables) and README updated; `package.json`
0.6.1.

**Deferred / for the owner.** Whether the studio wants expense categories beyond the eleven seeded, a CSV
export of the ledger for the accountant (M-09b has one; M-09c does not yet), and attaching the invoice or
receipt image to a row (needs Supabase Storage, like M-02d's upload).
