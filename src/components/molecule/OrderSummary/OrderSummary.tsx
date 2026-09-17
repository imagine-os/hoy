import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP } from '../../../i18n/format';
import './OrderSummary.css';
import { splitIva } from '../../../data/tax';

export interface OrderLine { label: string; amount: number; muted?: boolean }

export interface OrderSummaryProps {
  lines: OrderLine[];
  /** IVA rate as a fraction (0.19). The tax is computed here, never typed. */
  taxRate: number;
  /** Prices in HoyOS are IVA-inclusive; when true the summary backs the tax out of the total. */
  taxIncluded?: boolean;
  totalLabel: string;
  taxLabel: string;
  subtotalLabel: string;
  note?: string;
}

/** Subtotal, IVA and total of the lines — the split itself lives in src/data/tax.ts. */
const computeOrder = (lines: OrderLine[], taxRate: number, taxIncluded = true) => splitIva(lines.reduce((a, l) => a + l.amount, 0), taxRate, taxIncluded);

export function OrderSummary({ lines, taxRate, taxIncluded = true, totalLabel, taxLabel, subtotalLabel, note }: OrderSummaryProps) {
  const { lang } = useI18n();
  const { subtotal, tax, total } = computeOrder(lines, taxRate, taxIncluded);
  return (
    <div className="ordersum" role="table" aria-label={totalLabel}>
      {lines.map((l, i) => <div key={i} className={`ordersum-line ${l.muted ? 'muted' : ''}`} role="row"><span role="cell">{l.label}</span><span role="cell">{formatCOP(l.amount, lang)}</span></div>)}
      <div className="ordersum-line muted small" role="row"><span role="cell">{subtotalLabel}</span><span role="cell">{formatCOP(subtotal, lang)}</span></div>
      <div className="ordersum-line muted small" role="row"><span role="cell">{taxLabel} {Math.round(taxRate * 100)}%</span><span role="cell">{formatCOP(tax, lang)}</span></div>
      <div className="ordersum-total" role="row"><span role="cell">{totalLabel}</span><span role="cell">{formatCOP(total, lang)}</span></div>
      {note && <p className="xs muted ordersum-note">{note}</p>}
    </div>
  );
}
