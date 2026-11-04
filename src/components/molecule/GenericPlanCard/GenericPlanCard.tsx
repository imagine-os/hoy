import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP } from '../../../i18n/format';
import type { GenericPlan } from '../../../data/livePricing';
import { Button } from '../../atom/Button/Button';
import { Card } from '../Card/Card';

/** WEB-02b: a product of the master that has no card of its own, in the master's own words; on the website and in the app. */
export function GenericPlanCard({ plan, onSelect, disabled = false }: { plan: GenericPlan; onSelect: (plan: GenericPlan) => void; disabled?: boolean }) {
  const { t, bi, lang } = useI18n();
  const description = bi(plan.description);
  return (
    <Card data-generic-plan={plan.key} eyebrow={t(`core.plan.kind.${plan.kind}`)} title={bi(plan.name)}>
      <div className="stack-sm">
        {description && <p className="small muted">{description}</p>}
        <strong>{formatCOP(plan.price, lang)}</strong>
        <ul className="small">
          <li>{plan.classes === 1 ? t('core.plan.oneClass') : t('core.plan.classes', { n: plan.classes })}</li>
          {plan.validityDays != null && <li>{t('core.plan.validity', { days: plan.validityDays })}</li>}
          {plan.freezable && <li>{t('core.plan.freezable')}</li>}
        </ul>
        <Button block variant="secondary" disabled={disabled} onClick={() => onSelect(plan)}>{t(plan.kind === 'gift' ? 'core.plan.give' : 'core.plan.buy')}</Button>
      </div>
    </Card>
  );
}
