import './ViewAsBanner.css';
import { useI18n } from '../../../i18n/I18nProvider';
import { Icon } from '../../atom/Icon/Icon';
import { Button } from '../../atom/Button/Button';

export interface ViewAsBannerProps {
  /** The viewed role's label, already in the current language. */
  role: string;
  /** The sample person whose data is shown; null when the role has no one to sample. */
  person: string | null;
  onExit: () => void;
}

/**
 * The bar a super admin sees while viewing the studio as another role (production view-as, Hoy all-roles lane D):
 * "Viewing as <role> · with <person>'s data · Read-only · Exit". Sticky at the top of every screen.
 */
export function ViewAsBanner({ role, person, onExit }: ViewAsBannerProps) {
  const { t } = useI18n();
  return (
    <div className="viewas-banner" role="status" data-view-as-banner>
      <span className="viewas-banner-icon" aria-hidden><Icon name="eye" size="sm" /></span>
      <p className="viewas-banner-text">
        <strong>{t('hub.viewAs.label')} {role}</strong>
        <span className="viewas-banner-person"> · {person ? t('hub.viewAs.person', { name: person }) : t('hub.viewAs.noPerson')}</span>
        <span className="viewas-banner-ro"> · {t('hub.viewAs.readOnly')}</span>
      </p>
      <Button size="sm" variant="secondary" onClick={onExit} aria-label={t('hub.viewAs.exitLabel')}>{t('hub.viewAs.exit')}</Button>
    </div>
  );
}
