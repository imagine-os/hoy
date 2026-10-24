import { useI18n } from '../../../i18n/I18nProvider';
import { Notice } from '../Notice/Notice';
import { Button } from '../../atom/Button/Button';

/** Reviewing opens retained purchase details; this notice never starts a payment. */
export function PurchaseRecoveryNotice({ blocked = false, failed = false, onReview }: { blocked?: boolean; failed?: boolean; onReview?: () => void }) {
  const { t } = useI18n();
  return <Notice tone={blocked || failed ? 'danger' : 'warn'} title={t('customer.purchase.recovery.title')} action={onReview && <Button variant="secondary" onClick={onReview}>{t(blocked?'customer.purchase.refresh':'customer.purchase.review')}</Button>}>
    {t(blocked ? 'customer.purchase.blocked' : 'customer.purchase.uncertain')}
  </Notice>;
}
