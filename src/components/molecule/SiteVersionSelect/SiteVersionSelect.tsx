import { useI18n } from '../../../i18n/I18nProvider';
export function SiteVersionSelect({ value, onChange, videoEnabled = true }: { value: 'sanctuary' | 'classic'; videoEnabled?: boolean; onChange: (value: 'sanctuary' | 'classic', video?: boolean) => void }) {
  const { t } = useI18n();
  return <label className="site-version"><span className="sr-only">{t('site.edition.label')}</span><select value={value === 'classic' ? 'classic' : videoEnabled ? 'video' : 'still'} aria-label={t('site.edition.label')} onChange={e => onChange(e.target.value === 'classic' ? 'classic' : 'sanctuary', e.target.value !== 'still')}><option value="video">{t('site.edition.video')}</option><option value="still">{t('site.edition.still')}</option><option value="classic">{t('site.edition.classic')}</option></select></label>;
}
