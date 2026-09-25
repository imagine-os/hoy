import { useI18n } from '../../../i18n/I18nProvider';
export function SiteVersionSelect({ value, onChange }: { value: 'sanctuary' | 'classic'; onChange: (value: 'sanctuary' | 'classic') => void }) {
  const { t } = useI18n();
  return <label className="site-version"><span className="sr-only">{t('site.edition.label')}</span><select value={value} aria-label={t('site.edition.label')} onChange={event => onChange(event.target.value === 'classic' ? 'classic' : 'sanctuary')}><option value="sanctuary">{t('site.edition.new')}</option><option value="classic">{t('site.edition.classic')}</option></select></label>;
}
