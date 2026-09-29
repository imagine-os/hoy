import { useI18n } from '../../../i18n/I18nProvider';
import { formatCOP } from '../../../i18n/format';
import type { PriceItem } from '../../../tenant/pricing';
import { tenant } from '../../../tenant/tenant';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { Button } from '../../atom/Button/Button';
import './MembershipCard.css';
export function MembershipCard({ item, onSelect, saving = 0 }: { item: PriceItem; onSelect: () => void; saving?: number }) {
  const { t, bi, lang } = useI18n();
  const annual = item.period === 'year';
  return <article className={`membership-card ${annual ? 'is-annual' : ''}`} data-tone={annual ? 'moss' : 'river'}>
    <div className="membership-object" aria-hidden="true"><Wordmark height={36}/><span className="membership-orbit"/><span className="membership-object-label">{t('site.plans.club')}</span><span className="membership-object-name">{bi(item.name)}</span><span className="membership-object-footer">{annual ? '02 / 02' : '01 / 02'} <span>∞</span></span></div>
    <div className="membership-card-copy"><div className="row-between wrap"><p className="eyebrow">{t(annual ? 'site.plans.yearRitual' : 'site.plans.monthRitual')}</p>{item.badge && <span className="membership-badge">{bi(item.badge)}</span>}</div><h2>{bi(item.name)}</h2><p className="muted">{bi(item.description)}</p><div className="membership-price"><strong>{formatCOP(item.price ?? 0, lang)}</strong><span> COP {t(annual ? 'core.common.perYear' : 'core.common.perMonth')}</span></div>
    <p className="membership-saving small">{annual ? t('site.plans.save', { amount: formatCOP(saving, lang) }) : t('site.plans.monthlyNote')}</p>
    <ul className="membership-benefits"><li>{t('site.plans.daily', { n: tenant.studio.perPersonPerDay })}</li><li>{t('site.plans.practices')}</li><li>{t('site.plans.matBenefit')}</li></ul>
    <Button block size="lg" onClick={onSelect}>{t('site.plans.choose', { name: bi(item.name) })} <span aria-hidden>↗</span></Button></div>
  </article>;
}
