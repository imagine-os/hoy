import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP } from '../../../i18n/format';
import { FAMILY_LABEL, pricingByFamily, type PlanFamily, type PriceItem } from '../../../tenant/pricing';
import './PriceTable.css';

export interface PriceTableProps {
  /** The items to list, in order. */
  items: PriceItem[];
  /** Header of the first column ("Opción"); the second is always "Precio (COP)". */
  caption?: string;
  /** Group rows under their family name (the FAQ's "options" table spans three families). */
  grouped?: boolean;
}

/**
 * 0051 — the price list as the owner's documents print it: "Opción | Precio (COP)". Reads src/tenant/pricing.ts only,
 * so the FAQ, the plans page and the manual show the same numbers. Amounts are tabular, right-aligned.
 */
export function PriceTable({ items, caption, grouped = false }: PriceTableProps) {
  const { t, bi, lang } = useI18n();
  const families = grouped ? [...new Set(items.map((p) => p.family))] : [null];
  return (
    <div className="pricetable" role="region" aria-label={caption ?? t('core.price.option')}>
      <table>
        <thead><tr><th scope="col">{caption ?? t('core.price.option')}</th><th scope="col" className="pricetable-num">{t('core.price.column')}</th></tr></thead>
        {families.map((fam) => (
          <tbody key={fam ?? 'all'}>
            {fam && <tr className="pricetable-group"><th scope="rowgroup" colSpan={2}>{bi(FAMILY_LABEL[fam])}</th></tr>}
            {items.filter((p) => !fam || p.family === fam).map((p) => (
              <tr key={p.id}>
                <th scope="row"><span className="pricetable-name">{bi(p.name)}</span><span className="pricetable-desc">{bi(p.description)}</span></th>
                <td className="pricetable-num">{p.price == null ? t('core.common.included') : <>{p.perPerson && <span className="pricetable-plus" aria-hidden>+</span>}{formatCOP(p.price, lang)}</>}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** `{{pricing:bienvenida,paquetes}}` → the items of those families, in pricing.ts order. Unknown families are skipped. */
export function itemsForFamilies(arg: string): PriceItem[] {
  const fams = arg.split(',').map((s) => s.trim()).filter((s): s is PlanFamily => s in FAMILY_LABEL);
  return fams.flatMap((f) => pricingByFamily(f));
}
