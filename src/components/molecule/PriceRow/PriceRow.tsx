import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP } from '../../../i18n/format';
import type { PriceItem } from '../../../tenant/pricing';
import { Badge } from '../../atom/Badge/Badge';
import './PriceRow.css';

export function PriceRow({ item, onSelect }: { item: PriceItem; onSelect?: (item: PriceItem) => void }) {
  const { lang, bi, t } = useI18n();
  const price = item.price == null ? t('core.common.included') : formatCOP(item.price, lang);
  const per = item.period === 'month' ? t('core.common.perMonth') : item.period === 'year' ? t('core.common.perYear') : '';
  const Tag = onSelect ? 'button' : 'div';
  return (
    <Tag className={`pricerow ${onSelect ? 'is-clickable' : ''}`} onClick={onSelect ? () => onSelect(item) : undefined} type={onSelect ? 'button' : undefined}>
      <div className="grow">
        <div className="row"><span className="pricerow-name">{bi(item.name)}</span>{item.badge && <Badge tone="highlight">{bi(item.badge)}</Badge>}</div>
        <div className="muted small">{bi(item.description)}</div>
      </div>
      <div className="pricerow-price">
        {item.from && <span className="xs muted">{t('core.common.from')} </span>}
        <span className="pricerow-amount">{price}</span>
        {per && <span className="xs muted"> {per}</span>}
      </div>
    </Tag>
  );
}
